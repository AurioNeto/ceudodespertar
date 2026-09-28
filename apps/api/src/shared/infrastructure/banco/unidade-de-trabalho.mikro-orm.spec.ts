import { describe, expect, it } from 'vitest';
import { IsolationLevel } from '@mikro-orm/postgresql';
import type { MikroORM, TransactionOptions } from '@mikro-orm/postgresql';
import { ContextoDaRequisicao } from '../../kernel/contexto-da-requisicao.js';
import {
  OPCOES_DE_TRANSACAO_POR_MODO,
  UnidadeDeTrabalhoMikroOrm,
  VARIAVEL_DE_SESSAO_DA_INSTITUICAO,
} from './unidade-de-trabalho.mikro-orm.js';

const KYSELY_FALSO = { marcador: 'kysely' };

class EntityManagerFalso {
  opcoesRecebidas: TransactionOptions | undefined;
  execucoes: Array<{ sql: string; parametros: unknown[] }> = [];

  fork(): this {
    return this;
  }

  async transactional<T>(cb: (em: this) => Promise<T>, opcoes: TransactionOptions): Promise<T> {
    this.opcoesRecebidas = opcoes;
    return cb(this);
  }

  async execute(sql: string, parametros: unknown[]): Promise<void> {
    this.execucoes.push({ sql, parametros });
  }

  getKysely(): typeof KYSELY_FALSO {
    return KYSELY_FALSO;
  }
}

function ormFalsoCom(em: EntityManagerFalso): MikroORM {
  return { em } as unknown as MikroORM;
}

describe('OPCOES_DE_TRANSACAO_POR_MODO', () => {
  it('escrita roda em READ COMMITTED, gravável', () => {
    expect(OPCOES_DE_TRANSACAO_POR_MODO.escrita).toStrictEqual({
      isolationLevel: IsolationLevel.READ_COMMITTED,
      readOnly: false,
    });
  });

  it('leitura roda em REPEATABLE READ, somente leitura', () => {
    expect(OPCOES_DE_TRANSACAO_POR_MODO.leitura).toStrictEqual({
      isolationLevel: IsolationLevel.REPEATABLE_READ,
      readOnly: true,
    });
  });

  it('leitura-que-grava roda em READ COMMITTED, gravável', () => {
    expect(OPCOES_DE_TRANSACAO_POR_MODO['leitura-que-grava']).toStrictEqual({
      isolationLevel: IsolationLevel.READ_COMMITTED,
      readOnly: false,
    });
  });
});

describe('UnidadeDeTrabalhoMikroOrm', () => {
  it('abre a transação com as opções do modo e entrega em/kysely presos a ela', async () => {
    const em = new EntityManagerFalso();
    const unidade = new UnidadeDeTrabalhoMikroOrm(ormFalsoCom(em));

    const resultado = await unidade.transacao('leitura', async (contexto) => {
      expect(contexto.em).toBe(em);
      expect(contexto.kysely).toBe(KYSELY_FALSO);
      return 'ok';
    });

    expect(resultado).toBe('ok');
    expect(em.opcoesRecebidas).toStrictEqual(OPCOES_DE_TRANSACAO_POR_MODO.leitura);
  });

  it('não grava app.instituicao_id quando não há contexto de requisição', async () => {
    const em = new EntityManagerFalso();
    const unidade = new UnidadeDeTrabalhoMikroOrm(ormFalsoCom(em));

    await unidade.transacao('leitura', async () => undefined);

    expect(em.execucoes).toStrictEqual([]);
  });

  it('grava app.instituicao_id local à transação (set_config com true) antes de devolver o contexto', async () => {
    const em = new EntityManagerFalso();
    const unidade = new UnidadeDeTrabalhoMikroOrm(ormFalsoCom(em));

    await ContextoDaRequisicao.executar({ correlacaoId: 'c-1', instituicaoId: 'inst-a' }, () =>
      unidade.transacao('escrita', async () => {
        expect(em.execucoes).toStrictEqual([
          { sql: expect.stringContaining('set_config'), parametros: [VARIAVEL_DE_SESSAO_DA_INSTITUICAO, 'inst-a'] },
        ]);
      }),
    );

    expect(em.execucoes[0]?.sql).toContain('true');
    expect(em.execucoes[0]?.sql).not.toContain('false');
  });
});
