import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { ContextoDaRequisicao } from '../../src/shared/kernel/contexto-da-requisicao.js';
import { UnidadeDeTrabalho } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import { UnidadeDeTrabalhoMikroOrm } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.mikro-orm.js';
import { abrirOrmDeTeste } from './orm-de-teste.js';
import type { OrmDeTeste } from './orm-de-teste.js';

const INSTITUICAO_A = 'a0000000-0000-0000-0000-000000000000';
const INSTITUICAO_B = 'b0000000-0000-0000-0000-000000000000';

async function semearDuasInstituicoes(banco: BancoDeTeste): Promise<void> {
  await banco.owner.query('insert into shared.instituicao (id, nome) values ($1, $2), ($3, $4)', [
    INSTITUICAO_A,
    'Casa A',
    INSTITUICAO_B,
    'Casa B',
  ]);

  for (const [instituicaoId, nome, email] of [
    [INSTITUICAO_A, 'Usuário A', 'usuario@casaa.example'],
    [INSTITUICAO_B, 'Usuário B', 'usuario@casab.example'],
  ] as const) {
    await banco.app.query("select set_config('app.instituicao_id', $1, false)", [instituicaoId]);
    await banco.app.query(
      'insert into identidade.usuario (instituicao_id, nome, email, situacao) values ($1, $2, $3, $4)',
      [instituicaoId, nome, email, 'ATIVO'],
    );
  }

  await banco.app.query("select set_config('app.instituicao_id', '', false)");
}

function comContexto<T>(instituicaoId: string | undefined, fn: () => Promise<T>): Promise<T> {
  if (instituicaoId === undefined) {
    return fn();
  }
  return ContextoDaRequisicao.executar({ correlacaoId: randomUUID(), instituicaoId }, fn);
}

describe('UnidadeDeTrabalho · borda transacional (Documento 7 §5, §8, §22)', () => {
  let banco: BancoDeTeste;
  let orm: OrmDeTeste;
  let unidade: UnidadeDeTrabalho;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await semearDuasInstituicoes(banco);
    orm = await abrirOrmDeTeste(banco);
    unidade = new UnidadeDeTrabalhoMikroOrm(orm);
  });

  afterEach(async () => {
    await orm.close(true);
    await derrubarBancoDeTeste(banco);
  });

  it('A lê só o próprio usuário; sem contexto, a leitura fecha em zero', async () => {
    const comoA = await comContexto(INSTITUICAO_A, () =>
      unidade.transacao('leitura', ({ em }) =>
        em.execute<{ id: string }[]>('select id from identidade.usuario'),
      ),
    );
    expect(comoA).toHaveLength(1);

    const semContexto = await comContexto(undefined, () =>
      unidade.transacao('leitura', ({ em }) =>
        em.execute<{ id: string }[]>('select id from identidade.usuario'),
      ),
    );
    expect(semContexto).toHaveLength(0);
  });

  it('escrita em nome de outra instituição é barrada pela RLS (42501)', async () => {
    await expect(
      comContexto(INSTITUICAO_A, () =>
        unidade.transacao('escrita', ({ em }) =>
          em.execute(
            "insert into identidade.usuario (instituicao_id, nome, email, situacao) values (?, 'Invasor', 'invasor@casaa.example', 'ATIVO')",
            [INSTITUICAO_B],
          ),
        ),
      ),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('transação de leitura recusa escrita (25006)', async () => {
    await expect(
      unidade.transacao('leitura', ({ em }) =>
        em.execute("insert into shared.instituicao (id, nome) values (?, 'não deveria gravar')", [
          randomUUID(),
        ]),
      ),
    ).rejects.toMatchObject({ code: '25006' });
  });

  it('rollback em erro não deixa nada gravado', async () => {
    const chave = randomUUID();

    await expect(
      comContexto(INSTITUICAO_A, () =>
        unidade.transacao('escrita', async ({ em }) => {
          await em.execute(
            "insert into shared.chave_de_idempotencia (instituicao_id, chave, rota, status_http, resposta) values (?, ?, '/x', 200, '{}'::jsonb)",
            [INSTITUICAO_A, chave],
          );
          throw new Error('falha proposital');
        }),
      ),
    ).rejects.toThrow('falha proposital');

    const linhas = await comContexto(INSTITUICAO_A, () =>
      unidade.transacao('leitura', ({ em }) =>
        em.execute<{ chave: string }[]>('select chave from shared.chave_de_idempotencia where chave = ?', [
          chave,
        ]),
      ),
    );
    expect(linhas).toHaveLength(0);
  });

  it('escrita roda em READ COMMITTED mesmo com o banco alterado para REPEATABLE READ por padrão', async () => {
    await banco.owner.query(
      `alter database ${banco.nomeDoBanco} set default_transaction_isolation = 'repeatable read'`,
    );
    await orm.close(true);
    orm = await abrirOrmDeTeste(banco);
    unidade = new UnidadeDeTrabalhoMikroOrm(orm);

    const linhas = await unidade.transacao('escrita', ({ em }) =>
      em.execute<{ nivel: string }[]>("select current_setting('transaction_isolation') as nivel"),
    );

    expect(linhas[0]?.nivel).toBe('read committed');
  });

  it('int8 vira number e date vira YYYY-MM-DD sem passar por fuso; acima do limite seguro é recusado', async () => {
    const linhas = await unidade.transacao('leitura', ({ em }) =>
      em.execute<{ grande: number; hoje: string }[]>(
        'select 9007199254740991::int8 as grande, current_date as hoje',
      ),
    );

    expect(typeof linhas[0]?.grande).toBe('number');
    expect(linhas[0]?.grande).toBe(9007199254740991);
    expect(typeof linhas[0]?.hoje).toBe('string');
    expect(linhas[0]?.hoje).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    await expect(
      unidade.transacao('leitura', ({ em }) => em.execute('select 9223372036854775807::int8 as grande')),
    ).rejects.toThrow();
  });

  it('acesso ao EntityManager fora da unidade de trabalho lança', async () => {
    await expect(orm.em.flush()).rejects.toThrow();
  });

  it('pool de tamanho 1: a requisição sem contexto não herda o contexto da anterior', async () => {
    await orm.close(true);
    orm = await abrirOrmDeTeste(banco, 1);
    unidade = new UnidadeDeTrabalhoMikroOrm(orm);

    const daPrimeira = await comContexto(INSTITUICAO_A, () =>
      unidade.transacao('leitura', ({ em }) =>
        em.execute<{ id: string }[]>('select id from identidade.usuario'),
      ),
    );
    expect(daPrimeira).toHaveLength(1);

    const daSegunda = await comContexto(undefined, () =>
      unidade.transacao('leitura', ({ em }) =>
        em.execute<{ id: string }[]>('select id from identidade.usuario'),
      ),
    );
    expect(daSegunda).toHaveLength(0);
  });
});
