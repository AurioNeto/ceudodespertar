import type { GrupoId, Permissao, PessoaId, Usuario, UsuarioId } from '@cdd/contracts';
import { dataHora } from '@cdd/contracts';
import { id } from './ids';
import { gruposIniciais } from './pessoas';

/**
 * Sessão de exemplo enquanto não há Keycloak. O front-end trabalha com
 * fixtures tipadas; o backend implementa o mesmo contrato depois (Doc 1 §8.1).
 */
export const usuarioAtual: Usuario = {
  id: id<UsuarioId>('u-aurio'),
  pessoaId: id<PessoaId>('p-aurio'),
  nome: 'Aurio Neto',
  email: 'aurio@ceudodespertar.org',
  grupoId: id<GrupoId>('g-tesouraria'),
  grupoNome: 'Tesouraria',
  situacao: 'ATIVO',
  ultimoAcesso: dataHora('2026-09-02T09:12:00-03:00'),
};

/** Competência em foco nas telas financeiras. */
export const competenciaAtual = '2026-08';
export const competenciaAnterior = '2026-07';

/** "Hoje" das telas — os protótipos foram desenhados em 02/09/2026. */
export const hoje = '2026-09-02';

const GRUPO_DE_ACESSO_DO_USUARIO: Readonly<Record<string, string>> = {
  'g-tesouraria': 'tesouraria',
  'g-secretaria': 'secretaria',
  'g-registro': 'rapido',
  'g-leitura': 'leitura',
};

export function permissoesDoGrupo(grupoId: GrupoId): readonly Permissao[] {
  const grupo = gruposIniciais.find((g) => g.id === GRUPO_DE_ACESSO_DO_USUARIO[grupoId]);
  return grupo?.permissoes ?? [];
}
