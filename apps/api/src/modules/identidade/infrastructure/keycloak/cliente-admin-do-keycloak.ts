import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Relogio } from '../../../../shared/infrastructure/relogio.js';
import { CONFIGURACAO_DO_KEYCLOAK } from './configuracao-do-keycloak.js';
import type { ConfiguracaoDoKeycloak } from './configuracao-do-keycloak.js';
import { KeycloakIndisponivel, KeycloakRecusou, UsuarioNaoExisteNoKeycloak } from './erros-do-keycloak.js';

const MARGEM_DE_VALIDADE_DO_TOKEN_EM_MS = 30_000;
const MILISSEGUNDOS_POR_SEGUNDO = 1_000;
const STATUS_TIMEOUT_DO_SERVIDOR = 408;
const STATUS_EXCESSO_DE_REQUISICOES = 429;
const STATUS_NAO_AUTORIZADO = 401;
const STATUS_NAO_ENCONTRADO = 404;
const PRIMEIRO_STATUS_DE_ERRO_DO_SERVIDOR = 500;
const LIMITE_INFERIOR_DO_SUCESSO = 200;
const LIMITE_SUPERIOR_DO_SUCESSO = 300;

const RespostaDeToken = z.object({ access_token: z.string().min(1), expires_in: z.number().positive() });

export interface PedidoAoKeycloak {
  readonly metodo: 'GET' | 'POST' | 'PUT';
  readonly caminho: string;
  readonly consulta?: Readonly<Record<string, string>>;
  readonly corpo?: unknown;
  readonly aceitar?: readonly number[];
}

export interface RespostaDoKeycloak {
  readonly status: number;
  readonly location: string | null;
  json(): unknown;
}

export interface SessaoNoKeycloak {
  requisitar(pedido: PedidoAoKeycloak): Promise<RespostaDoKeycloak>;
}

export interface OpcoesDaOperacao {
  readonly renovarTokenEm401: boolean;
}

interface ContextoDaOperacao extends OpcoesDaOperacao {
  readonly orcamento: AbortSignal;
}

interface TokenEmCache {
  readonly valor: string;
  readonly validoAteEmMs: number;
}

@Injectable()
export class ClienteAdminDoKeycloak {
  private tokenEmCache: TokenEmCache | undefined;
  private tokenEmVoo: Promise<string> | undefined;

  constructor(
    @Inject(CONFIGURACAO_DO_KEYCLOAK) private readonly configuracao: ConfiguracaoDoKeycloak,
    private readonly relogio: Relogio,
  ) {}

  executar<T>(opcoes: OpcoesDaOperacao, operacao: (sessao: SessaoNoKeycloak) => Promise<T>): Promise<T> {
    const contexto: ContextoDaOperacao = {
      ...opcoes,
      orcamento: AbortSignal.timeout(this.configuracao.orcamentoDaOperacaoEmMs),
    };
    return operacao({ requisitar: (pedido) => this.requisitar(contexto, pedido) });
  }

  private async requisitar(contexto: ContextoDaOperacao, pedido: PedidoAoKeycloak): Promise<RespostaDoKeycloak> {
    const resposta = await this.enviar(contexto, pedido);
    if (resposta.status !== STATUS_NAO_AUTORIZADO) return this.aceitarOuRecusar(resposta, pedido.aceitar);

    this.tokenEmCache = undefined;
    if (!contexto.renovarTokenEm401) throw new KeycloakIndisponivel('token recusado');
    const segundaTentativa = await this.enviar(contexto, pedido);
    if (segundaTentativa.status === STATUS_NAO_AUTORIZADO) this.tokenEmCache = undefined;
    return this.aceitarOuRecusar(segundaTentativa, pedido.aceitar);
  }

  private async enviar(contexto: ContextoDaOperacao, pedido: PedidoAoKeycloak): Promise<RespostaDoKeycloak> {
    if (contexto.orcamento.aborted) throw new KeycloakIndisponivel('timeout');
    const token = await aguardarAte(this.obterToken(), contexto.orcamento);
    const cabecalhos: Record<string, string> = { authorization: `Bearer ${token}` };
    if (pedido.corpo !== undefined) cabecalhos['content-type'] = 'application/json';
    return this.chamar([contexto.orcamento], this.urlDoAdmin(pedido), {
      method: pedido.metodo,
      headers: cabecalhos,
      body: pedido.corpo === undefined ? undefined : JSON.stringify(pedido.corpo),
    });
  }

  private urlDoAdmin({ caminho, consulta }: PedidoAoKeycloak): string {
    const base = `${this.configuracao.urlBase}/admin/realms/${this.configuracao.realm}${caminho}`;
    return consulta === undefined ? base : `${base}?${new URLSearchParams(consulta).toString()}`;
  }

  private obterToken(): Promise<string> {
    const emCache = this.tokenEmCache;
    if (emCache !== undefined && this.relogio.agora().getTime() < emCache.validoAteEmMs) {
      return Promise.resolve(emCache.valor);
    }
    this.tokenEmVoo ??= this.requisitarToken().finally(() => {
      this.tokenEmVoo = undefined;
    });
    return this.tokenEmVoo;
  }

  private async requisitarToken(): Promise<string> {
    const { urlBase, realm, clientId, segredo } = this.configuracao;
    const resposta = await this.chamar([], `${urlBase}/realms/${realm}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: segredo }),
    });
    if (resposta.status === STATUS_NAO_ENCONTRADO) throw new KeycloakRecusou(resposta.status);
    this.aceitarOuRecusar(resposta);
    const token = RespostaDeToken.safeParse(resposta.json());
    if (!token.success) throw new KeycloakIndisponivel('resposta de token inválida');
    const validoAteEmMs =
      this.relogio.agora().getTime() +
      token.data.expires_in * MILISSEGUNDOS_POR_SEGUNDO -
      MARGEM_DE_VALIDADE_DO_TOKEN_EM_MS;
    this.tokenEmCache = { valor: token.data.access_token, validoAteEmMs };
    return token.data.access_token;
  }

  private async chamar(
    sinaisExternos: readonly AbortSignal[],
    url: string,
    init: RequestInit,
  ): Promise<RespostaDoKeycloak> {
    const sinal = AbortSignal.any([...sinaisExternos, AbortSignal.timeout(this.configuracao.timeoutPorChamadaEmMs)]);
    try {
      const resposta = await fetch(url, { ...init, redirect: 'manual', signal: sinal });
      const texto = await resposta.text();
      return {
        status: resposta.status,
        location: resposta.headers.get('location'),
        json: () => lerJson(texto),
      };
    } catch {
      throw new KeycloakIndisponivel(sinal.aborted ? 'timeout' : 'rede');
    }
  }

  private aceitarOuRecusar(resposta: RespostaDoKeycloak, aceitar: readonly number[] = []): RespostaDoKeycloak {
    const { status } = resposta;
    const teveSucesso = status >= LIMITE_INFERIOR_DO_SUCESSO && status < LIMITE_SUPERIOR_DO_SUCESSO;
    if (teveSucesso || aceitar.includes(status)) return resposta;
    if (status === STATUS_NAO_ENCONTRADO) throw new UsuarioNaoExisteNoKeycloak();
    const transitorio =
      status >= PRIMEIRO_STATUS_DE_ERRO_DO_SERVIDOR ||
      status === STATUS_TIMEOUT_DO_SERVIDOR ||
      status === STATUS_EXCESSO_DE_REQUISICOES;
    if (transitorio) throw new KeycloakIndisponivel(`status ${status}`);
    throw new KeycloakRecusou(status);
  }
}

function lerJson(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    throw new KeycloakIndisponivel('resposta não é JSON');
  }
}

function aguardarAte<T>(promessa: Promise<T>, sinal: AbortSignal): Promise<T> {
  return new Promise<T>((resolver, rejeitar) => {
    const estourou = (): void => rejeitar(new KeycloakIndisponivel('timeout'));
    promessa.then(resolver, rejeitar).finally(() => sinal.removeEventListener('abort', estourou));
    if (sinal.aborted) {
      estourou();
      return;
    }
    sinal.addEventListener('abort', estourou, { once: true });
  });
}
