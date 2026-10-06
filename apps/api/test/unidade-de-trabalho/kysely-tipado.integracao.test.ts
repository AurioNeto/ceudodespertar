import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from 'vitest';
import { sql } from 'kysely';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { UnidadeDeTrabalho } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import { UnidadeDeTrabalhoMikroOrm } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.mikro-orm.js';
import { abrirOrmDeTeste } from './orm-de-teste.js';
import type { OrmDeTeste } from './orm-de-teste.js';

const INSTITUICAO = '00000000-0000-0000-0000-0000000000f1';

async function semearEventoNoOutbox(banco: BancoDeTeste, eventoId: string): Promise<void> {
  await banco.owner.query('insert into shared.instituicao (id, nome) values ($1, $2)', [
    INSTITUICAO,
    'Casa do teste de tipos',
  ]);
  await banco.app.query(
    `insert into shared.outbox (evento_id, instituicao_id, tipo, agregado_tipo, agregado_id, payload)
     values ($1, $2, 'teste.EventoDeTipos', 'teste.Agregado', $3, '{}'::jsonb)`,
    [eventoId, INSTITUICAO, randomUUID()],
  );
}

describe('ContextoDaTransacao.kysely tipado pelo banco migrado (F13)', () => {
  let banco: BancoDeTeste;
  let orm: OrmDeTeste;
  let unidade: UnidadeDeTrabalho;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    orm = await abrirOrmDeTeste(banco);
    unidade = new UnidadeDeTrabalhoMikroOrm(orm);
  });

  afterEach(async () => {
    await orm.close(true);
    await derrubarBancoDeTeste(banco);
  });

  it('lê o id (int8) de shared.outbox como number, batendo com o tipo gerado', async () => {
    const eventoId = randomUUID();
    await semearEventoNoOutbox(banco, eventoId);

    const linha = await unidade.transacao('leitura', ({ kysely }) =>
      kysely
        .selectFrom('shared.outbox')
        .select(['id'])
        .where('evento_id', '=', eventoId)
        .executeTakeFirstOrThrow(),
    );

    expectTypeOf(linha.id).toEqualTypeOf<number>();
    expect(typeof linha.id).toBe('number');
    expect(Number.isInteger(linha.id)).toBe(true);
  });

  it('lê uma coluna date pelo Kysely tipado como string YYYY-MM-DD, sem passar por fuso', async () => {
    const eventoId = randomUUID();
    await semearEventoNoOutbox(banco, eventoId);

    const linha = await unidade.transacao('leitura', ({ kysely }) =>
      kysely
        .selectFrom('shared.outbox')
        .select(['id', sql<string>`ocorrido_em::date`.as('dia')])
        .where('evento_id', '=', eventoId)
        .executeTakeFirstOrThrow(),
    );

    expectTypeOf(linha.dia).toEqualTypeOf<string>();
    expect(typeof linha.dia).toBe('string');
    expect(linha.dia).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
