import { Injectable } from '@nestjs/common';
import { dataHora } from '@cdd/contracts';
import type { GrupoResumido, SituacaoUsuario, UsuarioId } from '@cdd/contracts';
import { sql } from 'kysely';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { LeitorDeUsuarios } from '../../application/usuarios/leitor-de-usuarios.js';
import type { ConsultaDeUsuarios, UsuarioComPosicao } from '../../application/usuarios/leitor-de-usuarios.js';

const FORMATO_DO_INSTANTE = 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"';
const CARACTERES_CURINGA_DO_LIKE = /[\\%_]/g;

interface LinhaDeUsuario {
  readonly id: string;
  readonly nome: string;
  readonly email: string;
  readonly situacao: string;
  readonly versao: number;
  readonly ultimo_acesso_em: string | null;
  readonly chave_de_nome: string;
  readonly grupos: GrupoResumido[];
}

export function escaparCuringasDoLike(texto: string): string {
  return texto.replace(CARACTERES_CURINGA_DO_LIKE, (caractere) => `\\${caractere}`);
}

function paraUsuarioComPosicao(linha: LinhaDeUsuario): UsuarioComPosicao {
  return {
    usuario: {
      id: linha.id as UsuarioId,
      nome: linha.nome,
      email: linha.email,
      situacao: linha.situacao as SituacaoUsuario,
      grupos: linha.grupos,
      versao: linha.versao,
      ultimoAcessoEm: linha.ultimo_acesso_em === null ? null : dataHora(linha.ultimo_acesso_em),
    },
    posicao: { chaveDeNome: linha.chave_de_nome, id: linha.id },
  };
}

@Injectable()
export class LeitorDeUsuariosKysely extends LeitorDeUsuarios {
  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {
    super();
  }

  ler(consulta: ConsultaDeUsuarios): Promise<UsuarioComPosicao[]> {
    return this.unidadeDeTrabalho.transacao('leitura', async ({ kysely }) => {
      let consultaSql = kysely
        .selectFrom('identidade.usuario as usuario')
        .select([
          'usuario.id',
          'usuario.nome',
          'usuario.email',
          'usuario.situacao',
          'usuario.versao',
          sql<string | null>`to_char(${sql.ref('usuario.ultimo_acesso_em')} at time zone 'UTC', ${FORMATO_DO_INSTANTE})`.as(
            'ultimo_acesso_em',
          ),
          sql<string>`lower(${sql.ref('usuario.nome')})`.as('chave_de_nome'),
          sql<GrupoResumido[]>`coalesce((
            select json_agg(json_build_object('id', grupo.id, 'nome', grupo.nome) order by lower(grupo.nome), grupo.id)
              from identidade.usuario_grupo atribuicao
              join identidade.grupo grupo on grupo.id = atribuicao.grupo_id
             where atribuicao.usuario_id = ${sql.ref('usuario.id')}
               and grupo.ativo
          ), '[]'::json)`.as('grupos'),
        ]);
      if (consulta.usuarioId !== undefined) consultaSql = consultaSql.where('usuario.id', '=', consulta.usuarioId);
      if (consulta.situacao !== undefined) consultaSql = consultaSql.where('usuario.situacao', '=', consulta.situacao);
      if (consulta.grupoId !== undefined) {
        const grupoId = consulta.grupoId;
        consultaSql = consultaSql.where(({ exists, selectFrom }) =>
          exists(
            selectFrom('identidade.usuario_grupo as filtro')
              .innerJoin('identidade.grupo as grupo_filtrado', 'grupo_filtrado.id', 'filtro.grupo_id')
              .select('filtro.grupo_id')
              .whereRef('filtro.usuario_id', '=', 'usuario.id')
              .where('filtro.grupo_id', '=', grupoId)
              .where('grupo_filtrado.ativo', '=', true),
          ),
        );
      }
      if (consulta.busca !== undefined) {
        const padrao = `%${escaparCuringasDoLike(consulta.busca)}%`;
        consultaSql = consultaSql.where(
          sql<boolean>`(${sql.ref('usuario.nome')} ilike ${padrao} escape '\\' or ${sql.ref('usuario.email')} ilike ${padrao} escape '\\')`,
        );
      }
      if (consulta.depois !== null) {
        consultaSql = consultaSql.where(
          sql<boolean>`(lower(${sql.ref('usuario.nome')}), ${sql.ref('usuario.id')}) > (${consulta.depois.chaveDeNome}, ${consulta.depois.id}::uuid)`,
        );
      }
      const linhas = await consultaSql
        .orderBy(sql`lower(${sql.ref('usuario.nome')})`)
        .orderBy('usuario.id')
        .limit(consulta.limite)
        .execute();
      return linhas.map(paraUsuarioComPosicao);
    });
  }
}
