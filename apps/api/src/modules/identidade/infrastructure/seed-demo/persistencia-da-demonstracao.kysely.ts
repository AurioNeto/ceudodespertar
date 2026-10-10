import { Injectable } from '@nestjs/common';
import type { UsuarioId } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { PersistenciaDaDemonstracao } from '../../application/seed-demo/persistencia-da-demonstracao.js';
import type { UsuarioExistenteDaDemonstracao } from '../../application/seed-demo/persistencia-da-demonstracao.js';

@Injectable()
export class PersistenciaDaDemonstracaoKysely extends PersistenciaDaDemonstracao {
  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {
    super();
  }

  instituicaoExiste(id: string): Promise<boolean> {
    return this.unidadeDeTrabalho.transacao('leitura', async ({ kysely }) => {
      const linha = await kysely.selectFrom('shared.instituicao').select('id').where('id', '=', id).executeTakeFirst();
      return linha !== undefined;
    });
  }

  existeInstituicaoAlemDe(id: string): Promise<boolean> {
    return this.unidadeDeTrabalho.transacao('leitura', async ({ kysely }) => {
      const linha = await kysely.selectFrom('shared.instituicao').select('id').where('id', '<>', id).executeTakeFirst();
      return linha !== undefined;
    });
  }

  usuarioPorEmail(email: string): Promise<UsuarioExistenteDaDemonstracao | undefined> {
    return this.unidadeDeTrabalho.transacao('leitura', async ({ kysely }) => {
      const linha = await kysely
        .selectFrom('identidade.usuario')
        .select(['id', 'subject_id'])
        .where('email', '=', email)
        .executeTakeFirst();
      return linha === undefined ? undefined : { id: linha.id as UsuarioId, subjectId: linha.subject_id };
    });
  }
}
