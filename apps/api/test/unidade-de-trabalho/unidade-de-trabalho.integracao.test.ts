import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { ContextoDaRequisicao } from '../../src/shared/infrastructure/contexto-da-requisicao.js';
import { UnidadeDeTrabalho } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import { UnidadeDeTrabalhoMikroOrm } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.mikro-orm.js';
import { abrirOrmDeTeste } from './orm-de-teste.js';
import type { OrmDeTeste } from './orm-de-teste.js';

const INSTITUICAO_A = 'a0000000-0000-0000-0000-000000000000';
const INSTITUICAO_B = 'b0000000-0000-0000-0000-000000000000';

async function semearUsuarioDaInstituicao(
  banco: BancoDeTeste,
  instituicaoId: string,
  nome: string,
  email: string,
): Promise<void> {
  await banco.app.query("select set_config('app.instituicao_id', $1, false)", [instituicaoId]);
  await banco.app.query(
    'insert into identidade.usuario (instituicao_id, nome, email, situacao) values ($1, $2, $3, $4)',
    [instituicaoId, nome, email, 'ATIVO'],
  );
}

async function semearDuasInstituicoes(banco: BancoDeTeste): Promise<void> {
  await banco.owner.query('insert into shared.instituicao (id, nome) values ($1, $2), ($3, $4)', [
    INSTITUICAO_A,
    'Casa A',
    INSTITUICAO_B,
    'Casa B',
  ]);

  await semearUsuarioDaInstituicao(banco, INSTITUICAO_A, 'Usuário A', 'usuario@casaa.example');
  await semearUsuarioDaInstituicao(banco, INSTITUICAO_B, 'Usuário B', 'usuario@casab.example');

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

  it('escrita continua gravável quando o banco muda o padrão para read only', async () => {
    await banco.owner.query(`alter database ${banco.nomeDoBanco} set default_transaction_read_only = on`);
    await orm.close(true);
    orm = await abrirOrmDeTeste(banco);
    unidade = new UnidadeDeTrabalhoMikroOrm(orm);
    const chave = randomUUID();

    await comContexto(INSTITUICAO_A, () =>
      unidade.transacao('escrita', ({ em }) =>
        em.execute(
          "insert into shared.chave_de_idempotencia (instituicao_id, chave, rota, status_http, resposta) values (?, ?, '/x', 200, '{}'::jsonb)",
          [INSTITUICAO_A, chave],
        ),
      ),
    );

    const linhas = await comContexto(INSTITUICAO_A, () =>
      unidade.transacao('leitura', ({ em }) =>
        em.execute<{ chave: string }[]>('select chave from shared.chave_de_idempotencia where chave = ?', [
          chave,
        ]),
      ),
    );
    expect(linhas).toHaveLength(1);
  });

  describe('transação aninhada', () => {
    it('reusa a transação ativa em vez de abrir uma segunda, e o rollback externo desfaz a escrita interna', async () => {
      const chave = randomUUID();

      await expect(
        comContexto(INSTITUICAO_A, () =>
          unidade.transacao('escrita', async ({ em: emExterno }) => {
            await unidade.transacao('escrita', async ({ em: emInterno }) => {
              expect(emInterno).toBe(emExterno);
              await emInterno.execute(
                "insert into shared.chave_de_idempotencia (instituicao_id, chave, rota, status_http, resposta) values (?, ?, '/x', 200, '{}'::jsonb)",
                [INSTITUICAO_A, chave],
              );
            });
            throw new Error('falha proposital na transação externa');
          }),
        ),
      ).rejects.toThrow('falha proposital na transação externa');

      const linhas = await comContexto(INSTITUICAO_A, () =>
        unidade.transacao('leitura', ({ em }) =>
          em.execute<{ chave: string }[]>('select chave from shared.chave_de_idempotencia where chave = ?', [
            chave,
          ]),
        ),
      );
      expect(linhas).toHaveLength(0);
    });

    it('com pool de tamanho 1, a chamada aninhada não trava esperando uma segunda conexão', async () => {
      await orm.close(true);
      orm = await abrirOrmDeTeste(banco, 1);
      unidade = new UnidadeDeTrabalhoMikroOrm(orm);

      const resultado = await Promise.race([
        unidade.transacao('escrita', ({ em: emExterno }) =>
          unidade.transacao('leitura', ({ em: emInterno }) => {
            expect(emInterno).toBe(emExterno);
            return emInterno.execute<{ um: number }[]>('select 1 as um');
          }),
        ),
        new Promise<never>((_resolver, rejeitar) =>
          setTimeout(() => rejeitar(new Error('travou esperando uma segunda conexão')), 5000),
        ),
      ]);

      expect(resultado).toStrictEqual([{ um: 1 }]);
    });

    it('escrita pedida dentro de uma leitura já aberta lança, sem travar', async () => {
      await expect(
        unidade.transacao('leitura', () =>
          unidade.transacao('escrita', ({ em }) => em.execute('select 1')),
        ),
      ).rejects.toThrow();
    });
  });
  describe('ganchos de confirmação', () => {
    const INSERIR_CHAVE =
      "insert into shared.chave_de_idempotencia (instituicao_id, chave, rota, status_http, resposta) values (?, ?, '/x', 200, '{}'::jsonb)";

    async function contarChaveEmConexaoSeparada(chave: string): Promise<number> {
      await banco.owner.query("select set_config('app.instituicao_id', $1, false)", [INSTITUICAO_A]);
      const resultado = await banco.owner.query(
        'select count(*)::int as total from shared.chave_de_idempotencia where chave = $1',
        [chave],
      );
      return (resultado.rows[0] as { total: number }).total;
    }

    async function fazerCadaConfirmacaoDemorarParaCompletar(): Promise<void> {
      await banco.owner.query(
        `create function shared.demorar_na_confirmacao() returns trigger language plpgsql as
         $$ begin perform pg_sleep(0.3); return null; end $$`,
      );
      await banco.owner.query(
        `create constraint trigger demorar_na_confirmacao after insert on shared.chave_de_idempotencia
         deferrable initially deferred for each row execute function shared.demorar_na_confirmacao()`,
      );
    }

    it('rodam só depois do commit: uma conexão separada já enxerga a escrita', async () => {
      await fazerCadaConfirmacaoDemorarParaCompletar();
      const chave = randomUUID();
      let leituraDoGancho: Promise<number> = Promise.resolve(-1);

      await comContexto(INSTITUICAO_A, () =>
        unidade.transacao('escrita', async ({ em, aoConfirmar }) => {
          await em.execute(INSERIR_CHAVE, [INSTITUICAO_A, chave]);
          aoConfirmar(() => {
            leituraDoGancho = contarChaveEmConexaoSeparada(chave);
          });
        }),
      );

      expect(await leituraDoGancho).toBe(1);
    });

    it('um gancho que lança não derruba o chamador, não desfaz o commit e não impede o gancho seguinte', async () => {
      const chave = randomUUID();
      const registroDeErros = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      const ganchoSeguinte = vi.fn();

      const resultado = await comContexto(INSTITUICAO_A, () =>
        unidade.transacao('escrita', async ({ em, aoConfirmar }) => {
          await em.execute(INSERIR_CHAVE, [INSTITUICAO_A, chave]);
          aoConfirmar(() => {
            throw new Error('gancho quebrado');
          });
          aoConfirmar(ganchoSeguinte);
          return 'resultado-da-transacao';
        }),
      );

      expect(resultado).toBe('resultado-da-transacao');
      expect(ganchoSeguinte).toHaveBeenCalledOnce();
      expect(registroDeErros).toHaveBeenCalledOnce();
      expect(await contarChaveEmConexaoSeparada(chave)).toBe(1);
      registroDeErros.mockRestore();
    });
  });
});
