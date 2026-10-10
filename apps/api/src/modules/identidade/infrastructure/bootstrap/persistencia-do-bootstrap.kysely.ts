import { Injectable } from '@nestjs/common';
import type { UsuarioId } from '@cdd/contracts';
import { sql } from 'kysely';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { PersistenciaDoBootstrap } from '../../application/bootstrap/persistencia-do-bootstrap.js';

export const CHAVE_DO_TRAVAMENTO_DO_BOOTSTRAP = 'identidade.bootstrap';

@Injectable()
export class PersistenciaDoBootstrapKysely extends PersistenciaDoBootstrap {
  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {
    super();
  }

  adquirirTravaGlobal(): Promise<void> {
    return this.unidadeDeTrabalho.transacao('escrita', async ({ kysely }) => {
      await sql`select pg_advisory_xact_lock(hashtextextended(${CHAVE_DO_TRAVAMENTO_DO_BOOTSTRAP}, 0))`.execute(kysely);
    });
  }

  jaFoiExecutado(): Promise<boolean> {
    return this.unidadeDeTrabalho.transacao('escrita', async ({ kysely }) => {
      const { rows } = await sql<{ executado: boolean }>`
        select (
          exists (select 1 from identidade.bootstrap_executado)
          or exists (select 1 from shared.instituicao)
        ) as executado`.execute(kysely);
      return rows[0]?.executado === true;
    });
  }

  criarInstituicao(id: string, nome: string): Promise<void> {
    return this.unidadeDeTrabalho.transacao('escrita', async ({ kysely }) => {
      await kysely.insertInto('shared.instituicao').values({ id, nome }).execute();
    });
  }

  registrarExecucao(adminUsuarioId: UsuarioId, em: Date): Promise<void> {
    return this.unidadeDeTrabalho.transacao('escrita', async ({ kysely }) => {
      await kysely
        .insertInto('identidade.bootstrap_executado')
        .values({ criado_em: em, admin_usuario_id: adminUsuarioId })
        .execute();
    });
  }
}
