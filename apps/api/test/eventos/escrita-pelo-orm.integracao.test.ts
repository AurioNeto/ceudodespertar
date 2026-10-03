import { randomUUID } from 'node:crypto';
import { MikroORM, defineEntity } from '@mikro-orm/postgresql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { construirOpcoesDoOrm } from '../../src/shared/infrastructure/banco/configuracao-do-orm.js';
import { UnidadeDeTrabalhoMikroOrm } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.mikro-orm.js';
import {
  Despachante,
  TETO_DE_TENTATIVAS,
} from '../../src/shared/infrastructure/eventos/despachante.js';
import { SinalizadorDeEventos } from '../../src/shared/infrastructure/eventos/sinalizador-de-eventos.js';
import type {
  ConsumidorRegistrado,
  RegistroDeConsumidores,
} from '../../src/shared/infrastructure/eventos/registro-de-consumidores.js';
import { urlDoAppPara } from '../unidade-de-trabalho/orm-de-teste.js';
import { INSTITUICAO_A, linhaDoOutbox, linhasDeEventoProcessado, semearInstituicoes } from './apoio.js';

const TIPO_DO_EVENTO = 'teste.EventoQueGravaPeloOrm';
const TIMEOUT_DO_CONSUMIDOR_EM_MS = 200;

const EfeitoDoOrm = defineEntity({
  name: 'EfeitoDoOrm',
  schema: 'shared',
  tableName: 'efeito_do_orm',
  properties: (p) => ({
    id: p.uuid().primary(),
    chave: p.string(),
  }),
});

async function criarTabelaDeEfeitos(banco: BancoDeTeste): Promise<void> {
  await banco.owner.query(
    'create table shared.efeito_do_orm (id uuid primary key, chave text not null unique)',
  );
  await banco.owner.query('grant select, insert on shared.efeito_do_orm to cdd_app');
}

async function chavesGravadas(banco: BancoDeTeste): Promise<string[]> {
  const resultado = await banco.owner.query('select chave from shared.efeito_do_orm order by chave');
  return resultado.rows.map((linha: { chave: string }) => linha.chave);
}

async function liberarParaNovaTentativa(banco: BancoDeTeste, eventoId: string): Promise<void> {
  await banco.owner.query('update shared.outbox set proxima_tentativa_em = null where evento_id = $1', [
    eventoId,
  ]);
}

describe('Despachante · escrita pelo ORM dentro do savepoint do consumidor', () => {
  let banco: BancoDeTeste;
  let orm: MikroORM;
  let unidadeDeTrabalho: UnidadeDeTrabalhoMikroOrm;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
    await criarTabelaDeEfeitos(banco);
    orm = await MikroORM.init({
      ...construirOpcoesDoOrm({ BANCO_URL: urlDoAppPara(banco), BANCO_POOL_MAXIMO: '2' }),
      entities: [EfeitoDoOrm],
    });
    unidadeDeTrabalho = new UnidadeDeTrabalhoMikroOrm(orm);
  });

  afterEach(async () => {
    await orm.close(true);
    await derrubarBancoDeTeste(banco);
  });

  function persistirPeloOrm(chave: string): Promise<void> {
    return unidadeDeTrabalho.transacao('escrita', async ({ em }) => {
      em.persist(em.create(EfeitoDoOrm, { id: randomUUID(), chave }));
    });
  }

  function criarDespachante(consumidores: ConsumidorRegistrado[]): Despachante {
    const registro = {
      consumidoresPara: (tipo: string) => (tipo === TIPO_DO_EVENTO ? consumidores : []),
    } as unknown as RegistroDeConsumidores;
    return new Despachante(unidadeDeTrabalho, registro, new SinalizadorDeEventos(), TIMEOUT_DO_CONSUMIDOR_EM_MS);
  }

  async function gravarEventoNoOutbox(): Promise<string> {
    const eventoId = randomUUID();
    await banco.owner.query(
      `insert into shared.outbox (evento_id, instituicao_id, tipo, agregado_tipo, agregado_id, payload)
       values ($1, $2, $3, 'AgregadoDeTeste', gen_random_uuid(), '{}')`,
      [eventoId, INSTITUICAO_A, TIPO_DO_EVENTO],
    );
    return eventoId;
  }

  it('persist seguido de erro não deixa linha, e a nova tentativa bem-sucedida grava exatamente uma', async () => {
    let falhar = true;
    const despachante = criarDespachante([
      {
        consumidor: 'ConsumidorQuePersisteELanca.reagir',
        reagir: async () => {
          await persistirPeloOrm('efeito-do-persist');
          if (falhar) {
            throw new Error('falhou depois do persist');
          }
        },
      },
    ]);
    const eventoId = await gravarEventoNoOutbox();

    await despachante.executarCiclo();

    expect(await chavesGravadas(banco)).toEqual([]);
    expect((await linhaDoOutbox(banco, eventoId))?.tentativas).toBe(1);

    falhar = false;
    await liberarParaNovaTentativa(banco, eventoId);
    await despachante.executarCiclo();

    expect(await chavesGravadas(banco)).toEqual(['efeito-do-persist']);
    expect((await linhaDoOutbox(banco, eventoId))?.publicado_em).not.toBeNull();
  });

  it('persist que só falha no flush conta como falha do consumidor: incrementa tentativas e agenda backoff', async () => {
    await banco.owner.query("insert into shared.efeito_do_orm (id, chave) values (gen_random_uuid(), 'chave-ja-usada')");
    const despachante = criarDespachante([
      { consumidor: 'ConsumidorQueViolaUnicidade.reagir', reagir: () => persistirPeloOrm('chave-ja-usada') },
    ]);
    const eventoId = await gravarEventoNoOutbox();

    await expect(despachante.executarCiclo()).resolves.toBeUndefined();

    const linha = await linhaDoOutbox(banco, eventoId);
    expect(linha?.tentativas).toBe(1);
    expect(linha?.publicado_em).toBeNull();
    expect(linha?.ultimo_erro).toContain('23505');
    expect(linha?.proxima_tentativa_em?.getTime()).toBeGreaterThan(Date.now());
    expect(await linhasDeEventoProcessado(banco, eventoId)).toEqual([]);
  });

  it('o flush também roda sob o limite de duração: tabela travada cancela a escrita no timeout', async () => {
    const despachante = criarDespachante([
      { consumidor: 'ConsumidorQuePersisteComTabelaTravada.reagir', reagir: () => persistirPeloOrm('efeito-travado') },
    ]);
    const eventoId = await gravarEventoNoOutbox();
    await banco.owner.query('begin');
    await banco.owner.query('lock table shared.efeito_do_orm in access exclusive mode');
    try {
      const inicio = performance.now();
      await despachante.executarCiclo();

      expect(performance.now() - inicio).toBeLessThan(TIMEOUT_DO_CONSUMIDOR_EM_MS + 1500);
      const linha = await linhaDoOutbox(banco, eventoId);
      expect(linha?.tentativas).toBe(1);
      expect(linha?.ultimo_erro).toContain('57014');
    } finally {
      await banco.owner.query('rollback');
    }
  });

  it('o teto de tentativas vale para a falha que só aparece no flush', async () => {
    await banco.owner.query("insert into shared.efeito_do_orm (id, chave) values (gen_random_uuid(), 'chave-ja-usada')");
    let invocacoes = 0;
    const despachante = criarDespachante([
      {
        consumidor: 'ConsumidorQueViolaUnicidade.reagir',
        reagir: () => {
          invocacoes += 1;
          return persistirPeloOrm('chave-ja-usada');
        },
      },
    ]);
    const eventoId = await gravarEventoNoOutbox();
    await banco.owner.query('update shared.outbox set tentativas = $2 where evento_id = $1', [
      eventoId,
      TETO_DE_TENTATIVAS - 1,
    ]);

    await despachante.executarCiclo();
    await liberarParaNovaTentativa(banco, eventoId);
    await despachante.executarCiclo();

    expect(invocacoes).toBe(1);
    expect((await linhaDoOutbox(banco, eventoId))?.tentativas).toBe(TETO_DE_TENTATIVAS);
  });

  it('o consumidor vizinho do mesmo evento que persistiu com sucesso mantém o efeito', async () => {
    const despachante = criarDespachante([
      { consumidor: 'ConsumidorVizinho.reagir', reagir: () => persistirPeloOrm('efeito-do-vizinho') },
      {
        consumidor: 'ConsumidorQuePersisteELanca.reagir',
        reagir: async () => {
          await persistirPeloOrm('efeito-do-que-falha');
          throw new Error('falhou depois do persist');
        },
      },
    ]);
    const eventoId = await gravarEventoNoOutbox();

    await despachante.executarCiclo();

    expect(await chavesGravadas(banco)).toEqual(['efeito-do-vizinho']);
    expect(await linhasDeEventoProcessado(banco, eventoId)).toEqual(['ConsumidorVizinho.reagir']);
    expect((await linhaDoOutbox(banco, eventoId))?.tentativas).toBe(1);
  });
});
