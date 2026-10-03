import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { abrirOrmDeTeste } from '../unidade-de-trabalho/orm-de-teste.js';
import type { OrmDeTeste } from '../unidade-de-trabalho/orm-de-teste.js';
import { ContextoDaRequisicao } from '../../src/shared/infrastructure/contexto-da-requisicao.js';
import { UnidadeDeTrabalho } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import { UnidadeDeTrabalhoMikroOrm } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.mikro-orm.js';
import { RepositorioDoOutboxPostgres } from '../../src/shared/infrastructure/eventos/repositorio-do-outbox.postgres.js';
import { SinalizadorDeEventos } from '../../src/shared/infrastructure/eventos/sinalizador-de-eventos.js';
import { INSTITUICAO_A, criarEvento, semearInstituicoes } from './apoio.js';

function comContexto<T>(instituicaoId: string, fn: () => Promise<T>): Promise<T> {
  return ContextoDaRequisicao.executar({ correlacaoId: randomUUID(), instituicaoId }, fn);
}

describe('RepositorioDoOutbox · gravação na mesma transação do agregado (Documento 7 §9)', () => {
  let banco: BancoDeTeste;
  let orm: OrmDeTeste;
  let unidade: UnidadeDeTrabalho;
  let repositorio: RepositorioDoOutboxPostgres;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
    orm = await abrirOrmDeTeste(banco);
    unidade = new UnidadeDeTrabalhoMikroOrm(orm);
    repositorio = new RepositorioDoOutboxPostgres(new SinalizadorDeEventos());
  });

  afterEach(async () => {
    await orm.close(true);
    await derrubarBancoDeTeste(banco);
  });

  it('grava o evento junto com o comando; consulta como owner confirma a linha', async () => {
    const evento = criarEvento({ dados: { valor: 42 } });

    await comContexto(INSTITUICAO_A, () =>
      unidade.transacao('escrita', (contexto) => repositorio.gravar(contexto, [evento])),
    );

    const linhas = await banco.owner.query(
      'select instituicao_id, tipo, payload, publicado_em, tentativas from shared.outbox where evento_id = $1',
      [evento.eventoId],
    );

    expect(linhas.rows).toEqual([
      {
        instituicao_id: INSTITUICAO_A,
        tipo: evento.tipo,
        payload: { valor: 42 },
        publicado_em: null,
        tentativas: 0,
      },
    ]);
  });

  it('rollback do comando não deixa evento no outbox', async () => {
    const evento = criarEvento();

    await expect(
      comContexto(INSTITUICAO_A, () =>
        unidade.transacao('escrita', async (contexto) => {
          await repositorio.gravar(contexto, [evento]);
          throw new Error('falha proposital no comando');
        }),
      ),
    ).rejects.toThrow('falha proposital no comando');

    const linhas = await banco.owner.query('select 1 from shared.outbox where evento_id = $1', [
      evento.eventoId,
    ]);
    expect(linhas.rows).toEqual([]);
  });
});
