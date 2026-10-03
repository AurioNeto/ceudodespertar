import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { UnidadeDeTrabalho } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import type { ContextoDaTransacao, ModoDeTransacao } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import { UnidadeDeTrabalhoMikroOrm } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.mikro-orm.js';
import {
  Despachante,
  TETO_DE_TENTATIVAS,
} from '../../src/shared/infrastructure/eventos/despachante.js';
import { SinalizadorDeEventos } from '../../src/shared/infrastructure/eventos/sinalizador-de-eventos.js';
import type { RegistroDeConsumidores } from '../../src/shared/infrastructure/eventos/registro-de-consumidores.js';
import { abrirOrmDeTeste } from '../unidade-de-trabalho/orm-de-teste.js';
import type { OrmDeTeste } from '../unidade-de-trabalho/orm-de-teste.js';
import { INSTITUICAO_A, linhaDoOutbox, semearInstituicoes } from './apoio.js';

const TIPO_DO_EVENTO = 'teste.EventoQueNuncaTermina';
const TIMEOUT_DO_CONSUMIDOR_EM_MS = 100;
const SEGUNDOS_EM_MS = 1000;
const TETO_DO_BACKOFF_EM_MS = 300 * SEGUNDOS_EM_MS;

class UnidadeDeTrabalhoComIntervencaoNoRegistroDaFalha extends UnidadeDeTrabalho {
  private chamadas = 0;

  constructor(
    private readonly real: UnidadeDeTrabalhoMikroOrm,
    private readonly intervencao: () => Promise<void>,
  ) {
    super();
  }

  async transacao<T>(modo: ModoDeTransacao, fn: (contexto: ContextoDaTransacao) => Promise<T>): Promise<T> {
    this.chamadas += 1;
    const ehORegistroDaFalha = this.chamadas === 2;
    if (ehORegistroDaFalha) {
      await this.intervencao();
    }
    return this.real.transacao(modo, fn);
  }
}

describe('Despachante · aborto por timeout do consumidor', () => {
  let banco: BancoDeTeste;
  let orm: OrmDeTeste;
  let eventoId: string;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
    orm = await abrirOrmDeTeste(banco, 2);
    eventoId = randomUUID();
    await banco.owner.query(
      `insert into shared.outbox (evento_id, instituicao_id, tipo, agregado_tipo, agregado_id, payload)
       values ($1, $2, $3, 'AgregadoDeTeste', gen_random_uuid(), '{}')`,
      [eventoId, INSTITUICAO_A, TIPO_DO_EVENTO],
    );
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await orm.close(true);
    await derrubarBancoDeTeste(banco);
  });

  function criarDespachanteComIntervencaoNoIntervalo(intervencao: () => Promise<void>): Despachante {
    const registro = {
      consumidoresPara: (tipo: string) =>
        tipo === TIPO_DO_EVENTO
          ? [{ consumidor: 'ConsumidorQueNuncaTermina.reagir', reagir: () => new Promise<void>(() => undefined) }]
          : [{ consumidor: 'ConsumidorQueConclui.reagir', reagir: () => Promise.resolve() }],
    } as unknown as RegistroDeConsumidores;
    return new Despachante(
      new UnidadeDeTrabalhoComIntervencaoNoRegistroDaFalha(new UnidadeDeTrabalhoMikroOrm(orm), intervencao),
      registro,
      new SinalizadorDeEventos(),
      TIMEOUT_DO_CONSUMIDOR_EM_MS,
    );
  }

  it('depois de abortar o evento preso, o mesmo ciclo segue e entrega o evento de outro agregado', async () => {
    const eventoSeguinte = randomUUID();
    await banco.owner.query(
      `insert into shared.outbox (evento_id, instituicao_id, tipo, agregado_tipo, agregado_id, payload)
       values ($1, $2, 'teste.EventoQueConclui', 'AgregadoDeTeste', gen_random_uuid(), '{}')`,
      [eventoSeguinte, INSTITUICAO_A],
    );
    const despachante = criarDespachanteComIntervencaoNoIntervalo(async () => undefined);

    await despachante.executarCiclo();

    expect((await linhaDoOutbox(banco, eventoId))?.publicado_em).toBeNull();
    expect((await linhaDoOutbox(banco, eventoSeguinte))?.publicado_em).not.toBeNull();
  });

  it('o backoff e o teto seguem as tentativas que o outro despachante já somou, não a leitura antiga', async () => {
    const erros = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const despachante = criarDespachanteComIntervencaoNoIntervalo(async () => {
      await banco.owner.query('update shared.outbox set tentativas = $2 where evento_id = $1', [
        eventoId,
        TETO_DE_TENTATIVAS - 1,
      ]);
    });
    const antes = Date.now();

    await despachante.executarCiclo();

    const linha = await linhaDoOutbox(banco, eventoId);
    expect(linha?.tentativas).toBe(TETO_DE_TENTATIVAS);
    expect(linha?.proxima_tentativa_em?.getTime()).toBeGreaterThanOrEqual(antes + TETO_DO_BACKOFF_EM_MS);
    expect(erros.mock.calls.map((chamada) => String(chamada[0])).join('\n')).toContain('esgotou o teto');
  });

  it('um evento que o outro despachante já publicou no intervalo não é alterado pela falha', async () => {
    const despachante = criarDespachanteComIntervencaoNoIntervalo(async () => {
      await banco.owner.query('update shared.outbox set publicado_em = now() where evento_id = $1', [eventoId]);
    });

    await expect(despachante.executarCiclo()).resolves.toBeUndefined();

    const linha = await linhaDoOutbox(banco, eventoId);
    expect(linha?.publicado_em).not.toBeNull();
    expect(linha?.tentativas).toBe(0);
    expect(linha?.ultimo_erro).toBeNull();
    expect(linha?.proxima_tentativa_em).toBeNull();
  });
});
