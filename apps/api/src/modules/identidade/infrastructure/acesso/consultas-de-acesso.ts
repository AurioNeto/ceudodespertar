import type { GrupoId, Permissao, SituacaoUsuario } from '@cdd/contracts';
import type { Kysely } from 'kysely';
import type { DB } from '../../../../shared/infrastructure/banco/banco-cdd.gerado.js';
import type { CodigoDeRecusa } from '../../../../shared/infrastructure/autenticacao/contexto-de-acesso.js';
import { ehPermissaoDoCatalogo } from '../../domain/permissao/catalogo-de-permissoes.js';
import { PermissoesEfetivas } from '../../domain/permissao/permissoes-efetivas.js';

export const CODIGO_DE_RECUSA_POR_SITUACAO: Record<Exclude<SituacaoUsuario, 'ATIVO'>, CodigoDeRecusa> = {
  CONVITE_PENDENTE: 'USUARIO_CONVITE_PENDENTE',
  SUSPENSO: 'USUARIO_SUSPENSO',
  REVOGADO: 'USUARIO_REVOGADO',
};

export interface GrupoAtivoDoUsuario {
  readonly id: GrupoId;
  readonly nome: string;
  readonly permissoes: readonly Permissao[];
}

export async function gruposAtivosDoUsuario(kysely: Kysely<DB>, usuarioId: string): Promise<GrupoAtivoDoUsuario[]> {
  const linhas = await kysely
    .selectFrom('identidade.usuario_grupo as atribuicao')
    .innerJoin('identidade.grupo as grupo', 'grupo.id', 'atribuicao.grupo_id')
    .leftJoin('identidade.grupo_permissao as concessao', 'concessao.grupo_id', 'grupo.id')
    .select(['grupo.id as grupoId', 'grupo.nome as grupoNome', 'concessao.permissao as permissao'])
    .where('atribuicao.usuario_id', '=', usuarioId)
    .where('grupo.ativo', '=', true)
    .orderBy('grupo.nome')
    .orderBy('grupo.id')
    .execute();

  const porGrupo = new Map<string, { id: GrupoId; nome: string; permissoes: Permissao[] }>();
  for (const linha of linhas) {
    const grupo = porGrupo.get(linha.grupoId) ?? { id: linha.grupoId as GrupoId, nome: linha.grupoNome, permissoes: [] };
    if (linha.permissao !== null && ehPermissaoDoCatalogo(linha.permissao)) grupo.permissoes.push(linha.permissao);
    porGrupo.set(linha.grupoId, grupo);
  }
  return [...porGrupo.values()];
}

export function permissoesEfetivasDosGrupos(grupos: readonly GrupoAtivoDoUsuario[]): readonly Permissao[] {
  return PermissoesEfetivas.dosGrupos(grupos.map((grupo) => ({ ativo: true, permissoes: grupo.permissoes }))).lista;
}
