import { InMemoryWebStorage, UserManager, WebStorageStateStore } from 'oidc-client-ts';
import type { User, UserManagerSettings } from 'oidc-client-ts';
import type { GerenciadorDeUsuario } from './credencialOidc';

export const CAMINHO_DA_ENTRADA = '/entrar';
export const CAMINHO_DE_RETORNO = '/entrar/retorno';
export const ESCOPO_OIDC = 'openid';

export interface AmbienteOidc {
  readonly emissor: string;
  readonly cliente: string;
  readonly origem: string;
}

export class ErroDeConfiguracaoOidc extends Error {
  constructor(variavel: string) {
    super(`Variável de ambiente ausente: ${variavel}`);
    this.name = 'ErroDeConfiguracaoOidc';
  }
}

export class ErroDeEntrada extends Error {
  override readonly cause: unknown;

  constructor(causa: unknown) {
    super('Não foi possível concluir a entrada');
    this.name = 'ErroDeEntrada';
    this.cause = causa;
  }
}

export function lerAmbienteOidc(env: ImportMetaEnv, origem: string): AmbienteOidc {
  const emissor = env.VITE_OIDC_EMISSOR;
  if (!emissor) throw new ErroDeConfiguracaoOidc('VITE_OIDC_EMISSOR');
  const cliente = env.VITE_OIDC_CLIENTE;
  if (!cliente) throw new ErroDeConfiguracaoOidc('VITE_OIDC_CLIENTE');
  return { emissor, cliente, origem };
}

export function configuracaoOidc(ambiente: AmbienteOidc): UserManagerSettings {
  return {
    authority: ambiente.emissor,
    client_id: ambiente.cliente,
    redirect_uri: `${ambiente.origem}${CAMINHO_DE_RETORNO}`,
    post_logout_redirect_uri: `${ambiente.origem}${CAMINHO_DA_ENTRADA}`,
    response_type: 'code',
    scope: ESCOPO_OIDC,
    userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
    stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
    automaticSilentRenew: false,
    monitorSession: false,
  };
}

export function criarGerenciadorOidc(ambiente: AmbienteOidc): UserManager {
  return new UserManager(configuracaoOidc(ambiente));
}

export interface GerenciadorDeEntrada extends GerenciadorDeUsuario {
  signinRedirect(argumentos?: { state?: unknown }): Promise<void>;
  signinCallback(url?: string): Promise<User | undefined | void>;
  signoutRedirect(): Promise<void>;
}

export interface ServicoDeEntrada {
  existeUsuario(): Promise<boolean>;
  iniciarEntrada(destino: string): Promise<void>;
  concluirEntrada(urlDeRetorno: string): Promise<unknown>;
  sair(): Promise<void>;
}

export function criarServicoDeEntrada(gerenciador: GerenciadorDeEntrada): ServicoDeEntrada {
  const retornosEmAndamento = new Map<string, Promise<unknown>>();

  async function concluir(urlDeRetorno: string): Promise<unknown> {
    try {
      const usuario = await gerenciador.signinCallback(urlDeRetorno);
      if (!usuario) throw new Error('retorno sem usuário');
      return usuario.state;
    } catch (causa) {
      throw new ErroDeEntrada(causa);
    }
  }

  return {
    existeUsuario: async () => (await gerenciador.getUser()) !== null,
    iniciarEntrada: (destino) => gerenciador.signinRedirect({ state: destino }),
    concluirEntrada(urlDeRetorno) {
      const emAndamento = retornosEmAndamento.get(urlDeRetorno);
      if (emAndamento) return emAndamento;
      const retorno = concluir(urlDeRetorno);
      retornosEmAndamento.set(urlDeRetorno, retorno);
      return retorno;
    },
    sair: () => gerenciador.signoutRedirect(),
  };
}
