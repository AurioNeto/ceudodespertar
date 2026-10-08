import { Injectable } from '@nestjs/common';
import type { InstituicaoId } from '@cdd/contracts';
import { sql } from 'kysely';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { TravaDaAdministracao } from '../../application/administracao/trava-da-administracao.js';

export const CHAVE_DO_TRAVAMENTO_DA_ADMINISTRACAO = 'identidade.administracao';

@Injectable()
export class TravaDaAdministracaoAdvisory extends TravaDaAdministracao {
  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {
    super();
  }

  adquirir(instituicaoId: InstituicaoId): Promise<void> {
    return this.unidadeDeTrabalho.transacao('escrita', async ({ kysely }) => {
      await sql`select pg_advisory_xact_lock(hashtextextended(${CHAVE_DO_TRAVAMENTO_DA_ADMINISTRACAO + instituicaoId}, 0))`.execute(
        kysely,
      );
    });
  }
}
