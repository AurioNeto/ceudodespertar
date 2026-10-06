import type { FonteDeCredencial, ResultadoDaRenovacao } from './credencial';
import { ErroDaApi, ErroDeRede, codigoDeFallback, erroDaResposta } from './erros';

export const BASE_DA_API = '/api/v1';

export type MetodoHttp = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface OpcoesDeRequisicao {
  readonly metodo: MetodoHttp;
  readonly caminho: string;
  readonly corpo?: unknown;
  readonly versao?: number | string;
  readonly chaveDeIdempotencia?: string;
  readonly sinal?: AbortSignal;
}

export interface ClienteHttp {
  requisitar<Saida>(opcoes: OpcoesDeRequisicao): Promise<Saida>;
}

export interface DependenciasDoClienteHttp {
  readonly credencial: FonteDeCredencial;
  readonly fetch?: typeof globalThis.fetch;
  readonly base?: string;
  readonly gerarChave?: () => string;
}

interface RespostaLida {
  readonly tokenUsado: string | null;
  readonly status: number;
  readonly ok: boolean;
  readonly texto: string;
}

function ehAbortamento(erro: unknown): boolean {
  return erro instanceof DOMException && erro.name === 'AbortError';
}

function unirCaminho(base: string, caminho: string): string {
  return `${base.replace(/\/+$/, '')}/${caminho.replace(/^\/+/, '')}`;
}

export function criarClienteHttp(dependencias: DependenciasDoClienteHttp): ClienteHttp {
  const { credencial } = dependencias;
  const base = dependencias.base ?? BASE_DA_API;
  const gerarChave = dependencias.gerarChave ?? (() => crypto.randomUUID());
  const chamarFetch = (entrada: string, init: RequestInit) =>
    (dependencias.fetch ?? globalThis.fetch)(entrada, init);

  let renovacaoEmAndamento: Promise<ResultadoDaRenovacao> | null = null;

  function renovarCompartilhando(): Promise<ResultadoDaRenovacao> {
    if (renovacaoEmAndamento) return renovacaoEmAndamento;
    const renovacao = credencial
      .renovar()
      .catch((): ResultadoDaRenovacao => 'indisponivel')
      .then((resultado) => {
        if (resultado === 'sessao-encerrada') credencial.aoSessaoEncerrada();
        return resultado;
      })
      .finally(() => {
        renovacaoEmAndamento = null;
      });
    renovacaoEmAndamento = renovacao;
    return renovacao;
  }

  async function enviarUmaVez(
    opcoes: OpcoesDeRequisicao,
    chaveDeIdempotencia: string | undefined,
  ): Promise<RespostaLida> {
    const token = await credencial.tokenAtual();
    const cabecalhos: Record<string, string> = { Accept: 'application/json' };
    if (token) cabecalhos['Authorization'] = `Bearer ${token}`;
    if (opcoes.corpo !== undefined) cabecalhos['Content-Type'] = 'application/json';
    if (chaveDeIdempotencia) cabecalhos['Idempotency-Key'] = chaveDeIdempotencia;
    if (opcoes.versao !== undefined) cabecalhos['If-Match'] = String(opcoes.versao);

    try {
      const resposta = await chamarFetch(unirCaminho(base, opcoes.caminho), {
        method: opcoes.metodo,
        headers: cabecalhos,
        body: opcoes.corpo === undefined ? null : JSON.stringify(opcoes.corpo),
        signal: opcoes.sinal ?? null,
      });
      const texto = await resposta.text();
      return { tokenUsado: token, status: resposta.status, ok: resposta.ok, texto };
    } catch (erro) {
      if (ehAbortamento(erro)) throw erro;
      throw new ErroDeRede(erro);
    }
  }

  function lerSucesso<Saida>(resposta: RespostaLida): Saida {
    if (resposta.texto === '') return undefined as Saida;
    try {
      return JSON.parse(resposta.texto) as Saida;
    } catch {
      throw new ErroDaApi({ status: resposta.status, codigo: codigoDeFallback(500) });
    }
  }

  async function requisitar<Saida>(opcoes: OpcoesDeRequisicao): Promise<Saida> {
    const chaveDeIdempotencia =
      opcoes.chaveDeIdempotencia ?? (opcoes.metodo === 'POST' ? gerarChave() : undefined);

    const primeira = await enviarUmaVez(opcoes, chaveDeIdempotencia);
    if (primeira.ok) return lerSucesso<Saida>(primeira);

    const erro = erroDaResposta(primeira.status, primeira.texto);
    if (!erro.ehFalhaDeAutenticacao) throw erro;

    const tokenJaMudou = (await credencial.tokenAtual()) !== primeira.tokenUsado;
    if (!tokenJaMudou) {
      const resultado = await renovarCompartilhando();
      if (resultado === 'sessao-encerrada') throw erro;
      if (resultado === 'indisponivel') throw new ErroDeRede(erro);
    }

    const segunda = await enviarUmaVez(opcoes, chaveDeIdempotencia);
    if (segunda.ok) return lerSucesso<Saida>(segunda);
    throw erroDaResposta(segunda.status, segunda.texto);
  }

  return { requisitar };
}
