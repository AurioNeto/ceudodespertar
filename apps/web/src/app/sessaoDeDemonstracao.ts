import type { Eu, GrupoId, InstituicaoId, UsuarioId } from '@cdd/contracts';
import { id } from '../mocks/ids';
import { gruposIniciais } from '../mocks/pessoas';
import type { ServicoDeEntrada } from '../dados/oidc';

const GRUPO_DA_DEMONSTRACAO = 'tesouraria';

export const MARCA_DA_SESSAO_DE_DEMONSTRACAO = 'sessao-de-demonstracao-somente-desenvolvimento';

export const euDeDemonstracao: Eu = {
  usuario: {
    id: id<UsuarioId>('u-demonstracao'),
    nome: 'Aurio Neto (demonstração)',
    email: 'demonstracao@cdd.local',
  },
  instituicao: { id: id<InstituicaoId>('i-demonstracao'), nome: 'Céu do Despertar' },
  grupos: [{ id: id<GrupoId>('g-tesouraria'), nome: 'Tesouraria' }],
  permissoes: gruposIniciais.find((grupo) => grupo.id === GRUPO_DA_DEMONSTRACAO)?.permissoes ?? [],
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
