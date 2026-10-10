import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { ContextoDaRequisicao } from '../../../../shared/infrastructure/contexto-da-requisicao.js';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { gerarUuidV7 } from '../../../../shared/kernel/ids.js';
import { SemeadorDeGrupos } from '../../application/bootstrap/semeador-de-grupos.js';
import { GRUPOS_DE_SISTEMA } from '../../domain/grupo/grupos-de-sistema.js';

const CHAVE_DO_TRAVAMENTO_DO_SEED = 'identidade.semear-grupos-de-sistema';

@Injectable()
export class SemeadorDeGruposDeSistema extends SemeadorDeGrupos {
  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {
    super();
  }

  semear(instituicaoId: string): Promise<void> {
    return ContextoDaRequisicao.executar({ correlacaoId: randomUUID(), instituicaoId }, () =>
      this.unidadeDeTrabalho.transacao('escrita', async ({ kysely }) => {
        await sql`select pg_advisory_xact_lock(hashtextextended(${CHAVE_DO_TRAVAMENTO_DO_SEED + instituicaoId}, 0))`.execute(
          kysely,
        );
        const gruposNovos = await kysely
          .insertInto('identidade.grupo')
          .values(
            GRUPOS_DE_SISTEMA.map((grupo) => ({
              id: gerarUuidV7(),
              instituicao_id: instituicaoId,
              codigo_sistema: grupo.codigoSistema,
              nome: grupo.nome,
              descricao: grupo.descricao,
              protegido: true,
            })),
          )
          .onConflict((conflito) => conflito.columns(['instituicao_id', 'codigo_sistema']).doNothing())
          .returning(['id', 'codigo_sistema'])
          .execute();

        const idPorCodigo = new Map(gruposNovos.map((grupo) => [grupo.codigo_sistema, grupo.id]));
        const permissoesDosGruposNovos = GRUPOS_DE_SISTEMA.flatMap((grupo) =>
          idPorCodigo.has(grupo.codigoSistema)
            ? grupo.permissoes.map((permissao) => ({
                instituicao_id: instituicaoId,
                grupo_id: idPorCodigo.get(grupo.codigoSistema)!,
                permissao,
              }))
            : [],
        );
        if (permissoesDosGruposNovos.length === 0) return;
        await kysely.insertInto('identidade.grupo_permissao').values(permissoesDosGruposNovos).execute();
      }),
    );
  }
}
