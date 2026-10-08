import { Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { IsolationLevel } from '@mikro-orm/postgresql';
import type { MikroORM, TransactionOptions } from '@mikro-orm/postgresql';
import { err, ok } from '../../kernel/result.js';
import { ContextoDaRequisicao } from '../contexto-da-requisicao.js';
import {
  ErroDeModoDeTransacaoIncompativel,
  OPCOES_DE_TRANSACAO_POR_MODO,
  UnidadeDeTrabalhoMikroOrm,
  VARIAVEL_DE_SESSAO_DA_INSTITUICAO,
} from './unidade-de-trabalho.mikro-orm.js';

const KYSELY_FALSO = { marcador: 'kysely' };

class EntityManagerFalso {
  opcoesRecebidas: TransactionOptions | undefined;
  execucoes: Array<{ sql: string; parametros: unknown[] }> = [];
  vezesQueAbriuTransacao = 0;

  fork(): this {
    return this;
  }

  desfeitas = 0;
  confirmadas = 0;

  async transactional<T>(cb: (em: this) => Promise<T>, opcoes: TransactionOptions): Promise<T> {
    this.vezesQueAbriuTransacao += 1;
    this.opcoesRecebidas = opcoes;
    try {
      const resultado = await cb(this);
      this.confirmadas += 1;
      return resultado;
    } catch (erro) {
      this.desfeitas += 1;
      throw erro;
    }
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
        const gravacaoDaInstituicao = em.execucoes.find((execucao) => execucao.sql.includes('set_config'));
        expect(gravacaoDaInstituicao).toStrictEqual({
          sql: expect.stringContaining('set_config'),
          parametros: [VARIAVEL_DE_SESSAO_DA_INSTITUICAO, 'inst-a'],
        });
      }),
    );

    const gravacaoDaInstituicao = em.execucoes.find((execucao) => execucao.sql.includes('set_config'));
    expect(gravacaoDaInstituicao?.sql).toContain('true');
    expect(gravacaoDaInstituicao?.sql).not.toContain('false');
  });

  it.each(['escrita', 'leitura-que-grava'] as const)(
    'declara READ WRITE explicitamente no modo %s, antes de qualquer outra instrução',
    async (modo) => {
      const em = new EntityManagerFalso();
      const unidade = new UnidadeDeTrabalhoMikroOrm(ormFalsoCom(em));

      await unidade.transacao(modo, async () => undefined);

      expect(em.execucoes[0]?.sql).toContain('read write');
    },
  );

  it('não declara READ WRITE no modo leitura', async () => {
    const em = new EntityManagerFalso();
    const unidade = new UnidadeDeTrabalhoMikroOrm(ormFalsoCom(em));

    await unidade.transacao('leitura', async () => undefined);

    expect(em.execucoes.some((execucao) => execucao.sql.includes('read write'))).toBe(false);
  });

  it('uma transação aninhada reusa a mesma em/kysely e não abre uma segunda transação', async () => {
    const em = new EntityManagerFalso();
    const unidade = new UnidadeDeTrabalhoMikroOrm(ormFalsoCom(em));

    const resultado = await unidade.transacao('escrita', (contextoExterno) =>
      unidade.transacao('escrita', (contextoInterno) => {
        expect(contextoInterno.em).toBe(contextoExterno.em);
        expect(contextoInterno.kysely).toBe(contextoExterno.kysely);
        return Promise.resolve('ok');
      }),
    );

    expect(resultado).toBe('ok');
    expect(em.vezesQueAbriuTransacao).toBe(1);
  });

  it('leitura aninhada dentro de escrita reusa a transação aberta', async () => {
    const em = new EntityManagerFalso();
    const unidade = new UnidadeDeTrabalhoMikroOrm(ormFalsoCom(em));

    await unidade.transacao('escrita', () => unidade.transacao('leitura', () => Promise.resolve(undefined)));

    expect(em.vezesQueAbriuTransacao).toBe(1);
  });

  it('pedir escrita dentro de uma leitura já aberta lança, sem abrir nova transação', async () => {
    const em = new EntityManagerFalso();
    const unidade = new UnidadeDeTrabalhoMikroOrm(ormFalsoCom(em));

    await expect(
      unidade.transacao('leitura', () => unidade.transacao('escrita', () => Promise.resolve(undefined))),
    ).rejects.toBeInstanceOf(ErroDeModoDeTransacaoIncompativel);

    expect(em.vezesQueAbriuTransacao).toBe(1);
  });

  it('roda o gancho de aoConfirmar depois que a transação commitou', async () => {
    const em = new EntityManagerFalso();
    const unidade = new UnidadeDeTrabalhoMikroOrm(ormFalsoCom(em));
    const ordem: string[] = [];

    await unidade.transacao('escrita', async (contexto) => {
      contexto.aoConfirmar(() => ordem.push('gancho'));
      ordem.push('dentro-da-transacao');
    });

    expect(ordem).toEqual(['dentro-da-transacao', 'gancho']);
  });

  it('não roda o gancho de aoConfirmar quando a transação rejeita (rollback)', async () => {
    const em = new EntityManagerFalso();
    const unidade = new UnidadeDeTrabalhoMikroOrm(ormFalsoCom(em));
    const gancho = vi.fn();

    await expect(
      unidade.transacao('escrita', async (contexto) => {
        contexto.aoConfirmar(gancho);
        throw new Error('falha proposital');
      }),
    ).rejects.toThrow('falha proposital');

    expect(gancho).not.toHaveBeenCalled();
  });

  it('um gancho de aoConfirmar que lança não derruba o chamador nem impede os ganchos seguintes', async () => {
    const em = new EntityManagerFalso();
    const unidade = new UnidadeDeTrabalhoMikroOrm(ormFalsoCom(em));
    const ganchoSeguinte = vi.fn();
    const registroDeErros = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const resultado = await unidade.transacao('escrita', async (contexto) => {
      contexto.aoConfirmar(() => {
        throw new Error('gancho quebrado');
      });
      contexto.aoConfirmar(ganchoSeguinte);
      return 'resultado-da-transacao';
    });

    expect(resultado).toBe('resultado-da-transacao');
    expect(ganchoSeguinte).toHaveBeenCalledOnce();
    expect(registroDeErros).toHaveBeenCalledOnce();
    registroDeErros.mockRestore();
  });

  it('uma transação aninhada registra o gancho na mesma lista da transação externa', async () => {
    const em = new EntityManagerFalso();
    const unidade = new UnidadeDeTrabalhoMikroOrm(ormFalsoCom(em));
    const gancho = vi.fn();

    await unidade.transacao('escrita', (contextoExterno) =>
      unidade.transacao('escrita', (contextoInterno) => {
        contextoInterno.aoConfirmar(gancho);
        expect(contextoInterno).toBe(contextoExterno);
        return Promise.resolve(undefined);
      }),
    );

    expect(gancho).toHaveBeenCalledOnce();
  });

  describe('Result de erro devolvido por fn', () => {
    it('desfaz a transação sem confirmar e devolve o mesmo Result ao chamador', async () => {
      const em = new EntityManagerFalso();
      const unidade = new UnidadeDeTrabalhoMikroOrm(ormFalsoCom(em));
      const falha = err('REGRA_VIOLADA');

      const resultado = await unidade.transacao('escrita', async () => falha);

      expect(resultado).toBe(falha);
      expect(em.desfeitas).toBe(1);
      expect(em.confirmadas).toBe(0);
    });

    it('Result ok confirma a transação', async () => {
      const em = new EntityManagerFalso();
      const unidade = new UnidadeDeTrabalhoMikroOrm(ormFalsoCom(em));

      await unidade.transacao('escrita', async () => ok(1));

      expect(em.confirmadas).toBe(1);
      expect(em.desfeitas).toBe(0);
    });

    it('objeto parecido com Result mas sem o discriminante confirma', async () => {
      const em = new EntityManagerFalso();
      const unidade = new UnidadeDeTrabalhoMikroOrm(ormFalsoCom(em));

      await unidade.transacao('escrita', async () => ({ erro: 'x' }));

      expect(em.confirmadas).toBe(1);
    });

    it('não dispara os ganchos de confirmação registrados antes do Result de erro', async () => {
      const em = new EntityManagerFalso();
      const unidade = new UnidadeDeTrabalhoMikroOrm(ormFalsoCom(em));
      const gancho = vi.fn();

      await unidade.transacao('escrita', async ({ aoConfirmar }) => {
        aoConfirmar(gancho);
        return err('REGRA_VIOLADA');
      });

      expect(gancho).not.toHaveBeenCalled();
    });

    it('Result de erro de transação aninhada não desfaz a de fora: quem decide é a de fora', async () => {
      const em = new EntityManagerFalso();
      const unidade = new UnidadeDeTrabalhoMikroOrm(ormFalsoCom(em));
      const falhaInterna = err('REGRA_VIOLADA');

      const resultadoInterno = await unidade.transacao('escrita', async () => {
        const interno = await unidade.transacao('escrita', async () => falhaInterna);
        expect(em.desfeitas).toBe(0);
        return ok(interno);
      });

      expect(resultadoInterno).toStrictEqual(ok(falhaInterna));
      expect(em.vezesQueAbriuTransacao).toBe(1);
      expect(em.confirmadas).toBe(1);
    });

    it('a de fora que repassa o Result de erro da de dentro desfaz tudo', async () => {
      const em = new EntityManagerFalso();
      const unidade = new UnidadeDeTrabalhoMikroOrm(ormFalsoCom(em));

      const resultado = await unidade.transacao('escrita', () =>
        unidade.transacao('escrita', async () => err('REGRA_VIOLADA')),
      );

      expect(resultado).toStrictEqual(err('REGRA_VIOLADA'));
      expect(em.desfeitas).toBe(1);
    });
  });
});
