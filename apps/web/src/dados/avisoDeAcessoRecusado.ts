import type { ErroDaApi } from './erros';

const STATUS_DE_NAO_AUTORIZADO = 401;
const CODIGOS_DE_ACESSO_RECUSADO: ReadonlySet<string> = new Set(['USUARIO_SUSPENSO', 'USUARIO_REVOGADO']);

export const ehAcessoRecusado = (erro: ErroDaApi): boolean =>
  erro.status === STATUS_DE_NAO_AUTORIZADO && CODIGOS_DE_ACESSO_RECUSADO.has(erro.codigo);

export interface AvisoDeAcessoRecusado {
  avisar(): void;
  aoRecusar(ouvinte: () => void): () => void;
}

export function criarAvisoDeAcessoRecusado(): AvisoDeAcessoRecusado {
  const ouvintes = new Set<() => void>();
  return {
    avisar() {
      for (const ouvinte of ouvintes) ouvinte();
    },
    aoRecusar(ouvinte) {
      ouvintes.add(ouvinte);
      return () => {
        ouvintes.delete(ouvinte);
      };
    },
  };
}
