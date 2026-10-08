import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import type { CodigoGrupo, GrupoDaGestao, GrupoId, Permissao } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { LeitorDeGrupos } from '../../application/grupos/leitor-de-grupos.js';
import { ehPermissaoDoCatalogo } from '../../domain/permissao/catalogo-de-permissoes.js';

@Injectable()
export class LeitorDeGruposKysely extends LeitorDeGrupos {
  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {
    super();
  }

  listar(): Promise<GrupoDaGestao[]> {
    return this.unidadeDeTrabalho.transacao('leitura', async ({ kysely }) => {
      const grupos = await kysely
        .selectFrom('identidade.grupo as grupo')
        .select((eb) => [
          'grupo.id',
          'grupo.codigo_sistema as codigoSistema',
          'grupo.nome',
          'grupo.descricao',
          'grupo.protegido',
          'grupo.versao',
          eb
            .selectFrom('identidade.usuario_grupo as atribuicao')
            .innerJoin('identidade.usuario as membro', 'membro.id', 'atribuicao.usuario_id')
            .whereRef('atribuicao.grupo_id', '=', 'grupo.id')
            .where('membro.situacao', '=', 'ATIVO')
            .select(sql<number>`count(*)::int`.as('total'))
            .as('usuarios'),
        ])
        .where('grupo.ativo', '=', true)
        .orderBy(sql`lower(grupo.nome)`)
        .orderBy('grupo.id')
        .execute();
      const concessoes = await kysely
        .selectFrom('identidade.grupo_permissao as concessao')
        .innerJoin('identidade.grupo as grupo', 'grupo.id', 'concessao.grupo_id')
        .where('grupo.ativo', '=', true)
        .select(['concessao.grupo_id as grupoId', 'concessao.permissao'])
        .orderBy('concessao.permissao')
        .execute();

      const permissoesPorGrupo = new Map<string, Permissao[]>();
      for (const { grupoId, permissao } of concessoes) {
        if (!ehPermissaoDoCatalogo(permissao)) continue;
        permissoesPorGrupo.set(grupoId, [...(permissoesPorGrupo.get(grupoId) ?? []), permissao]);
      }

      return grupos.map((grupo) => ({
        id: grupo.id as GrupoId,
        codigoSistema: grupo.codigoSistema as CodigoGrupo | null,
        nome: grupo.nome,
        descricao: grupo.descricao,
        permissoes: permissoesPorGrupo.get(grupo.id) ?? [],
        protegido: grupo.protegido,
        usuarios: grupo.usuarios ?? 0,
        versao: grupo.versao,
      }));
    });
  }
}
