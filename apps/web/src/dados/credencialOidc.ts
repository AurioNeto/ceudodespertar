import { ErrorResponse } from 'oidc-client-ts';
import type { User } from 'oidc-client-ts';
import type { FonteDeCredencial, ResultadoDaRenovacao } from './credencial';
import { ESPERA_DA_RENOVACAO_SILENCIOSA_EM_SEGUNDOS } from './oidc';

export type UsuarioOidc = Pick<User, 'access_token' | 'refresh_token' | 'expires_in'>;

export interface ArgumentosDaRenovacaoSilenciosa {
  readonly forceIframeAuth?: boolean;
  readonly silentRequestTimeoutInSeconds: number;
}

export interface GerenciadorDeUsuario {
  getUser(): Promise<UsuarioOidc | null>;
  signinSilent(argumentos?: ArgumentosDaRenovacaoSilenciosa): Promise<UsuarioOidc | null>;
  removeUser(): Promise<void>;
}

export interface CredencialOidc extends FonteDeCredencial {
  aoEncerrar(ouvinte: () => void): () => void;
}

export const MARGEM_DE_RENOVACAO_EM_SEGUNDOS = 30;

export interface OpcoesDaCredencialOidc {
  readonly margemDeRenovacaoEmSegundos?: number;
  readonly esperaDaRenovacaoEmSegundos?: number;
}

export function criarCredencialOidc(
  gerenciador: GerenciadorDeUsuario,
  opcoes: OpcoesDaCredencialOidc = {},
): CredencialOidc {
  const margem = opcoes.margemDeRenovacaoEmSegundos ?? MARGEM_DE_RENOVACAO_EM_SEGUNDOS;
  const ouvintes = new Set<() => void>();
  const espera = opcoes.esperaDaRenovacaoEmSegundos ?? ESPERA_DA_RENOVACAO_SILENCIOSA_EM_SEGUNDOS;
  let renovacaoEmAndamento: Promise<ResultadoDaRenovacao> | null = null;

  const venceEmBreve = (usuario: UsuarioOidc): boolean =>
    usuario.expires_in !== undefined && usuario.expires_in <= margem;

  async function recuperarPeloSso(): Promise<ResultadoDaRenovacao> {
    try {
      const recuperado = await gerenciador.signinSilent({
        forceIframeAuth: true,
        silentRequestTimeoutInSeconds: espera,
      });
      return recuperado === null ? 'sessao-encerrada' : 'renovado';
    } catch (erro) {
      return erro instanceof ErrorResponse ? 'sessao-encerrada' : 'indisponivel';
    }
  }

  async function tentarRenovar(): Promise<ResultadoDaRenovacao> {
    const usuario = await gerenciador.getUser();
    if (!usuario?.refresh_token) return 'sessao-encerrada';
    try {
      const renovado = await gerenciador.signinSilent({ silentRequestTimeoutInSeconds: espera });
      return renovado === null ? 'sessao-encerrada' : 'renovado';
    } catch (erro) {
      if (erro instanceof ErrorResponse) return recuperarPeloSso();
      return 'indisponivel';
    }
  }

  function renovar(): Promise<ResultadoDaRenovacao> {
    if (renovacaoEmAndamento) return renovacaoEmAndamento;
    const renovacao = tentarRenovar()
      .then((resultado) => {
        if (resultado === 'sessao-encerrada') aoSessaoEncerrada();
        return resultado;
      })
      .finally(() => {
        renovacaoEmAndamento = null;
      });
    renovacaoEmAndamento = renovacao;
    return renovacao;
  }

  function aoSessaoEncerrada(): void {
    void gerenciador.removeUser().catch(() => undefined);
    for (const ouvinte of ouvintes) ouvinte();
  }

  async function tokenAtual(): Promise<string | null> {
    const usuario = await gerenciador.getUser();
    if (!usuario) return null;
    if (!venceEmBreve(usuario)) return usuario.access_token;
    const resultado = await renovar();
    if (resultado === 'sessao-encerrada') return null;
    return (await gerenciador.getUser())?.access_token ?? null;
  }

  function aoEncerrar(ouvinte: () => void): () => void {
    ouvintes.add(ouvinte);
    return () => {
      ouvintes.delete(ouvinte);
    };
  }

  return { tokenAtual, renovar, aoSessaoEncerrada, aoEncerrar };
}
