import { Injectable } from '@nestjs/common';
import { dataHora } from '@cdd/contracts';
import type { DetalheDeAuditoria, OperacaoAuditada, RegistroAuditoriaId, RegistroDeAuditoria, UsuarioId } from '@cdd/contracts';
import { sql } from 'kysely';
import type { ContextoDaTransacao } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { LeitorDeAuditoria } from '../../application/auditoria/leitor-de-auditoria.js';
import type { ConsultaDaTrilha } from '../../application/auditoria/leitor-de-auditoria.js';

const FORMATO_DO_INSTANTE = 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"';
const AUTOR_SISTEMA = { nome: 'Sistema', grupo: 'Automação' };
const AUTOR_LINK_PUBLICO = { nome: 'Link público', grupo: 'Público' };
const AUTOR_DESCONHECIDO = 'Usuário desconhecido';
const ALVO_POR_AGREGADO_SEM_NOME: Record<string, string> = { Auditoria: 'Trilha de auditoria' };

interface LinhaDaTrilha {
  readonly id: string;
  readonly em: string;
  readonly autor_tipo: string;
  readonly autor_usuario_id: string | null;
  readonly operacao: string;
  readonly agregado_tipo: string;
  readonly agregado_id: string;
  readonly detalhes: unknown;
  readonly sensivel: boolean;
  readonly autor_nome: string | null;
  readonly autor_grupo: string | null;
  readonly alvo_nome: string | null;
}

function autorDaLinha(linha: LinhaDaTrilha): { nome: string; grupo: string } {
  if (linha.autor_tipo === 'SISTEMA') return AUTOR_SISTEMA;
  if (linha.autor_tipo === 'LINK_PUBLICO') return AUTOR_LINK_PUBLICO;
  return { nome: linha.autor_nome ?? AUTOR_DESCONHECIDO, grupo: linha.autor_grupo ?? '' };
}

function paraRegistro(linha: LinhaDaTrilha): RegistroDeAuditoria {
  const autor = autorDaLinha(linha);
  const comuns = {
    id: linha.id as RegistroAuditoriaId,
    em: dataHora(linha.em),
    autorNome: autor.nome,
    autorGrupo: autor.grupo,
    operacao: linha.operacao as OperacaoAuditada,
    alvo: linha.alvo_nome ?? ALVO_POR_AGREGADO_SEM_NOME[linha.agregado_tipo] ?? linha.agregado_tipo,
    referencia: linha.agregado_id,
    detalhes: linha.detalhes as DetalheDeAuditoria[],
    sensivel: linha.sensivel,
  };
  return linha.autor_tipo === 'USUARIO'
    ? { ...comuns, autorTipo: 'USUARIO', autorId: linha.autor_usuario_id as UsuarioId }
    : { ...comuns, autorTipo: linha.autor_tipo as 'SISTEMA' | 'LINK_PUBLICO' };
}

@Injectable()
export class LeitorDeAuditoriaKysely extends LeitorDeAuditoria {
  async ler({ kysely }: ContextoDaTransacao, consulta: ConsultaDaTrilha): Promise<RegistroDeAuditoria[]> {
    let consultaSql = kysely
      .selectFrom('identidade.registro_de_auditoria as r')
      .leftJoin('identidade.usuario as autor', 'autor.id', 'r.autor_usuario_id')
      .leftJoin('identidade.usuario as usuario_alvo', (juncao) =>
        juncao.onRef('usuario_alvo.id', '=', 'r.agregado_id').on('r.agregado_tipo', '=', 'Usuario'),
      )
      .leftJoin('identidade.grupo as grupo_alvo', (juncao) =>
        juncao.onRef('grupo_alvo.id', '=', 'r.agregado_id').on('r.agregado_tipo', '=', 'Grupo'),
      )
      .select([
        'r.id',
        sql<string>`to_char(${sql.ref('r.em')} at time zone 'UTC', ${FORMATO_DO_INSTANTE})`.as('em'),
        'r.autor_tipo',
        'r.autor_usuario_id',
        'r.operacao',
        'r.agregado_tipo',
        'r.agregado_id',
        'r.detalhes',
        'r.sensivel',
        'autor.nome as autor_nome',
        sql<string | null>`(
          select string_agg(grupo.nome, ', ' order by grupo.nome)
            from identidade.grupo grupo
           where grupo.id = any(${sql.ref('r.autor_grupos')}::uuid[])
        )`.as('autor_grupo'),
        sql<string | null>`coalesce(${sql.ref('usuario_alvo.nome')}, ${sql.ref('grupo_alvo.nome')})`.as('alvo_nome'),
      ]);
    if (consulta.de !== undefined) consultaSql = consultaSql.where('r.em', '>=', consulta.de);
    if (consulta.ate !== undefined) consultaSql = consultaSql.where('r.em', '<=', consulta.ate);
    if (consulta.operacao !== undefined) consultaSql = consultaSql.where('r.operacao', '=', consulta.operacao);
    if (consulta.depois !== null) {
      consultaSql = consultaSql.where(
        sql<boolean>`(${sql.ref('r.em')}, ${sql.ref('r.id')}) < (${consulta.depois.em}, ${consulta.depois.id}::uuid)`,
      );
    }
    const linhas = await consultaSql.orderBy('r.em', 'desc').orderBy('r.id', 'desc').limit(consulta.limite).execute();
    return linhas.map(paraRegistro);
  }
}
