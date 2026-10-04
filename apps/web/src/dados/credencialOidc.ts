import type { User } from 'oidc-client-ts';
import type { FonteDeCredencial } from './credencial';

export type UsuarioOidc = Pick<User, 'access_token' | 'refresh_token' | 'expires_in'>;

export interface GerenciadorDeUsuario {
  getUser(): Promise<UsuarioOidc | null>;
  signinSilent(): Promise<UsuarioOidc | null>;
  removeUser(): Promise<void>;
}

export interface CredencialOidc extends FonteDeCredencial {
  aoEncerrar(ouvinte: () => void): () => void;
}

export const MARGEM_DE_RENOVACAO_EM_SEGUNDOS = 30;

export interface OpcoesDaCredencialOidc {
  readonly margemDeRenovacaoEmSegundos?: number;
}

export function criarCredencialOidc(
  gerenciador: GerenciadorDeUsuario,
  opcoes: OpcoesDaCredencialOidc = {},
): CredencialOidc {
  const margem = opcoes.margemDeRenovacaoEmSegundos ?? MARGEM_DE_RENOVACAO_EM_SEGUNDOS;
  const ouvintes = new Set<() => void>();
  let renovacaoEmAndamento: Promise<boolean> | null = null;

  const venceEmBreve = (usuario: UsuarioOidc): boolean =>
    usuario.expires_in !== undefined && usuario.expires_in <= margem;

  async function tentarRenovar(): Promise<boolean> {
    const usuario = await gerenciador.getUser();
    if (!usuario?.refresh_token) return false;
    try {
      const renovado = await gerenciador.signinSilent();
      return renovado !== null;
    } catch {
      return false;
    }
  }

  function renovar(): Promise<boolean> {
    if (renovacaoEmAndamento) return renovacaoEmAndamento;
    const renovacao = tentarRenovar()
      .then((renovou) => {
        if (!renovou) aoSessaoEncerrada();
        return renovou;
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
    if (!(await renovar())) return null;
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
