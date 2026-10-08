import { PERMISSOES, type Eu, type GrupoId, type InstituicaoId, type UsuarioId } from '@cdd/contracts';
import { id } from '../mocks/ids';
import type { ServicoDeEntrada } from '../dados/oidc';

export const MARCA_DA_SESSAO_DE_DEMONSTRACAO = 'sessao-de-demonstracao-somente-desenvolvimento';

export const euDeDemonstracao: Eu = {
  usuario: {
    id: id<UsuarioId>('u-demonstracao'),
    nome: 'Aurio Neto (demonstração)',
    email: 'demonstracao@cdd.local',
  },
  instituicao: { id: id<InstituicaoId>('i-demonstracao'), nome: 'Céu do Despertar' },
  grupos: [{ id: id<GrupoId>('g-administrador'), nome: 'Administrador' }],
  permissoes: PERMISSOES,
};

export function criarEntradaDeDemonstracao(): ServicoDeEntrada {
  let ativa = true;
  return {
    recuperarSessao: () => Promise.resolve(ativa),
    iniciarEntrada: () => {
      ativa = true;
      return Promise.resolve();
    },
    concluirEntrada: () => Promise.resolve('/'),
    sair: () => {
      ativa = false;
      return Promise.resolve();
    },
  };
}

export const buscarEuDeDemonstracao = (): Promise<Eu> => Promise.resolve(euDeDemonstracao);
