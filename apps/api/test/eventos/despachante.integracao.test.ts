import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { INestApplicationContext } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { ContextoDaRequisicao } from '../../src/shared/infrastructure/contexto-da-requisicao.js';
import { UnidadeDeTrabalho } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import { Despachante } from '../../src/shared/infrastructure/eventos/despachante.js';
import { ReageA } from '../../src/shared/infrastructure/eventos/reage-a.decorator.js';
import { RepositorioDoOutbox } from '../../src/shared/infrastructure/eventos/repositorio-do-outbox.js';
import { SinalizadorDeEventos } from '../../src/shared/infrastructure/eventos/sinalizador-de-eventos.js';
import type { EventoDeDominio } from '../../src/shared/kernel/evento-de-dominio.js';
import {
  INSTITUICAO_A,
  INSTITUICAO_B,
  criarEvento,
  encerrarContextoDeEventos,
  semearInstituicoes,
  subirContextoDeEventos,
} from './apoio.js';

function comContexto<T>(instituicaoId: string, fn: () => Promise<T>): Promise<T> {
  return ContextoDaRequisicao.executar({ correlacaoId: randomUUID(), instituicaoId }, fn);
}

async function gravarEvento(
  app: INestApplicationContext,
  evento: EventoDeDominio,
  instituicaoId: string = INSTITUICAO_A,
): Promise<void> {
  const unidade = app.get(UnidadeDeTrabalho);
  const repositorio = app.get(RepositorioDoOutbox);
  await comContexto(instituicaoId, () =>
    unidade.transacao('escrita', (contexto) => repositorio.gravar(contexto, [evento])),
  );
}

async function linhaDoOutbox(banco: BancoDeTeste, eventoId: string) {
  const resultado = await banco.owner.query(
    'select publicado_em, tentativas, ultimo_erro, proxima_tentativa_em from shared.outbox where evento_id = $1',
    [eventoId],
  );
  return resultado.rows[0] as
    | { publicado_em: Date | null; tentativas: number; ultimo_erro: string | null; proxima_tentativa_em: Date | null }
    | undefined;
}

async function linhasDeEventoProcessado(banco: BancoDeTeste, eventoId: string): Promise<string[]> {
  const resultado = await banco.owner.query(
    'select consumidor from shared.evento_processado where evento_id = $1 order by consumidor',
    [eventoId],
  );
  return resultado.rows.map((linha: { consumidor: string }) => linha.consumidor);
}

@Injectable()
class ConsumidorRegistraChamadas {
  readonly eventos: EventoDeDominio[] = [];

  @ReageA('teste.EventoFeliz', 'ConsumidorRegistraChamadas.reagir')
  async reagir(evento: EventoDeDominio): Promise<void> {
    this.eventos.push(evento);
  }
}

@Injectable()
class ConsumidorSempreFalha {
  contagem = 0;

  @ReageA('teste.EventoQueFalha', 'ConsumidorSempreFalha.reagir')
  async reagir(): Promise<void> {
    this.contagem += 1;
    throw new Error('falha proposital do consumidor');
  }
}

@Injectable()
class ConsumidorLeContextoDaInstituicao {
  instituicoesVistas: (string | null)[] = [];

  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {}

  @ReageA('teste.EventoComContexto', 'ConsumidorLeContextoDaInstituicao.reagir')
  async reagir(): Promise<void> {
    const linhas = await this.unidadeDeTrabalho.transacao('escrita', ({ em }) =>
      em.execute<{ instituicaoId: string | null }[]>(
        "select current_setting('app.instituicao_id', true) as \"instituicaoId\"",
      ),
    );
    this.instituicoesVistas.push(linhas[0]?.instituicaoId ?? null);
  }
}

describe('Despachante · entrega do outbox (Documento 7 §9)', () => {
  let banco: BancoDeTeste;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
  });

  afterEach(async () => {
    await derrubarBancoDeTeste(banco);
  });

  it('entrega o evento ao consumidor e marca publicado_em', async () => {
    const app = await subirContextoDeEventos(banco, [ConsumidorRegistraChamadas]);
    try {
      const evento = criarEvento({ tipo: 'teste.EventoFeliz' });
      await gravarEvento(app, evento);

      await app.get(Despachante).executarCiclo();

      const consumidor = app.get(ConsumidorRegistraChamadas);
      expect(consumidor.eventos.map((e) => e.eventoId)).toEqual([evento.eventoId]);

      const linha = await linhaDoOutbox(banco, evento.eventoId);
      expect(linha?.publicado_em).not.toBeNull();
      expect(linha?.tentativas).toBe(0);
    } finally {
      await encerrarContextoDeEventos(app);
    }
  });

  it('entrega dupla do mesmo evento produz um único efeito (evento_processado)', async () => {
    const app = await subirContextoDeEventos(banco, [ConsumidorRegistraChamadas]);
    try {
      const evento = criarEvento({ tipo: 'teste.EventoFeliz' });
      await gravarEvento(app, evento);

      const despachante = app.get(Despachante);
      await despachante.executarCiclo();

      await banco.owner.query('update shared.outbox set publicado_em = null where evento_id = $1', [
        evento.eventoId,
      ]);
      await despachante.executarCiclo();

      const consumidor = app.get(ConsumidorRegistraChamadas);
      expect(consumidor.eventos).toHaveLength(1);
      expect(await linhasDeEventoProcessado(banco, evento.eventoId)).toEqual([
        'ConsumidorRegistraChamadas.reagir',
      ]);
    } finally {
      await encerrarContextoDeEventos(app);
    }
  });

  it('falha do consumidor incrementa tentativas, grava ultimo_erro e agenda backoff exponencial', async () => {
    const app = await subirContextoDeEventos(banco, [ConsumidorSempreFalha]);
    try {
      const evento = criarEvento({ tipo: 'teste.EventoQueFalha' });
      await gravarEvento(app, evento);

      const despachante = app.get(Despachante);
      const antesDaPrimeiraTentativa = Date.now();
      await despachante.executarCiclo();

      const primeiraLinha = await linhaDoOutbox(banco, evento.eventoId);
      expect(primeiraLinha?.publicado_em).toBeNull();
      expect(primeiraLinha?.tentativas).toBe(1);
      expect(primeiraLinha?.ultimo_erro).toBe('Error: Error - falha proposital do consumidor');
      const primeiroAtraso =
        (primeiraLinha?.proxima_tentativa_em?.getTime() ?? 0) - antesDaPrimeiraTentativa;
      expect(primeiroAtraso).toBeGreaterThanOrEqual(900);
      expect(primeiroAtraso).toBeLessThan(2000);

      await banco.owner.query(
        'update shared.outbox set proxima_tentativa_em = now() - interval \'1 second\' where evento_id = $1',
        [evento.eventoId],
      );
      const antesDaSegundaTentativa = Date.now();
      await despachante.executarCiclo();

      const segundaLinha = await linhaDoOutbox(banco, evento.eventoId);
      expect(segundaLinha?.tentativas).toBe(2);
      const segundoAtraso =
        (segundaLinha?.proxima_tentativa_em?.getTime() ?? 0) - antesDaSegundaTentativa;
      expect(segundoAtraso).toBeGreaterThanOrEqual(1900);
      expect(segundoAtraso).toBeLessThan(3000);

      expect(app.get(ConsumidorSempreFalha).contagem).toBe(2);
    } finally {
      await encerrarContextoDeEventos(app);
    }
  });

  it('savepoint isola o consumidor que falha: o outro consumidor do mesmo evento não é desfeito', async () => {
    @Injectable()
    class ConsumidorGrava {
      constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {}

      @ReageA('teste.EventoComDoisConsumidores', 'ConsumidorGrava.reagir')
      async reagir(): Promise<void> {
        await this.unidadeDeTrabalho.transacao('escrita', ({ em }) =>
          em.execute(
            "insert into shared.chave_de_idempotencia (instituicao_id, chave, rota, status_http, resposta) values (?, 'marca-do-consumidor-ok', '/x', 200, '{}'::jsonb)",
            [INSTITUICAO_A],
          ),
        );
      }
    }

    @Injectable()
    class ConsumidorFalha {
      @ReageA('teste.EventoComDoisConsumidores', 'ConsumidorFalha.reagir')
      async reagir(): Promise<void> {
        throw new Error('falha proposital do segundo consumidor');
      }
    }

    const app = await subirContextoDeEventos(banco, [ConsumidorGrava, ConsumidorFalha]);
    try {
      const evento = criarEvento({ tipo: 'teste.EventoComDoisConsumidores' });
      await gravarEvento(app, evento);

      await app.get(Despachante).executarCiclo();

      await banco.owner.query("select set_config('app.instituicao_id', $1, false)", [INSTITUICAO_A]);
      const linhaDaChave = await banco.owner.query(
        "select 1 from shared.chave_de_idempotencia where chave = 'marca-do-consumidor-ok'",
      );
      expect(linhaDaChave.rows).toHaveLength(1);

      const linha = await linhaDoOutbox(banco, evento.eventoId);
      expect(linha?.publicado_em).toBeNull();
      expect(linha?.tentativas).toBe(1);
      expect(await linhasDeEventoProcessado(banco, evento.eventoId)).toEqual(['ConsumidorGrava.reagir']);
    } finally {
      await encerrarContextoDeEventos(app);
    }
  });

  it('savepoint isola violação de constraint adiável: SET CONSTRAINTS ALL IMMEDIATE a antecipa para dentro do savepoint', async () => {
    await banco.owner.query('create table teste_pai_deferravel (id integer primary key)');
    await banco.owner.query(
      `create table teste_filho_deferravel (
         id integer primary key,
         pai_id integer not null references teste_pai_deferravel(id) deferrable initially deferred
       )`,
    );
    await banco.owner.query('grant select, insert on teste_pai_deferravel, teste_filho_deferravel to cdd_app');

    @Injectable()
    class ConsumidorViolaConstraintAdiavel {
      constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {}

      @ReageA('teste.EventoComConstraintAdiavel', 'ConsumidorViolaConstraintAdiavel.reagir')
      async reagir(): Promise<void> {
        await this.unidadeDeTrabalho.transacao('escrita', ({ em }) =>
          em.execute('insert into teste_filho_deferravel (id, pai_id) values (1, 999)'),
        );
      }
    }

    const app = await subirContextoDeEventos(banco, [ConsumidorViolaConstraintAdiavel]);
    try {
      const evento = criarEvento({ tipo: 'teste.EventoComConstraintAdiavel' });
      await gravarEvento(app, evento);

      await expect(app.get(Despachante).executarCiclo()).resolves.toBeUndefined();

      const linha = await linhaDoOutbox(banco, evento.eventoId);
      expect(linha?.publicado_em).toBeNull();
      expect(linha?.tentativas).toBe(1);
      expect(linha?.ultimo_erro).toMatch(/foreign key|violat/i);
      expect(await linhasDeEventoProcessado(banco, evento.eventoId)).toEqual([]);
    } finally {
      await encerrarContextoDeEventos(app);
    }
  });

  it('não entrega o evento n+1 do mesmo agregado enquanto o n está pendente', async () => {
    const app = await subirContextoDeEventos(banco, [ConsumidorSempreFalha, ConsumidorRegistraChamadas]);
    try {
      const agregadoId = randomUUID();
      const primeiro = criarEvento({ tipo: 'teste.EventoQueFalha', agregadoId });
      const segundo = criarEvento({ tipo: 'teste.EventoFeliz', agregadoId });
      await gravarEvento(app, primeiro);
      await gravarEvento(app, segundo);

      await app.get(Despachante).executarCiclo();

      expect(app.get(ConsumidorRegistraChamadas).eventos).toEqual([]);
      const linhaDoSegundo = await linhaDoOutbox(banco, segundo.eventoId);
      expect(linhaDoSegundo?.publicado_em).toBeNull();
      expect(linhaDoSegundo?.tentativas).toBe(0);

      const linhaDoPrimeiro = await linhaDoOutbox(banco, primeiro.eventoId);
      expect(linhaDoPrimeiro?.tentativas).toBe(1);
    } finally {
      await encerrarContextoDeEventos(app);
    }
  });

  it('dois despachantes rodando em paralelo não duplicam a entrega', async () => {
    const appA = await subirContextoDeEventos(banco, [ConsumidorRegistraChamadas]);
    const appB = await subirContextoDeEventos(banco, [ConsumidorRegistraChamadas]);
    try {
      const evento = criarEvento({ tipo: 'teste.EventoFeliz' });
      await gravarEvento(appA, evento);

      await Promise.all([appA.get(Despachante).executarCiclo(), appB.get(Despachante).executarCiclo()]);

      const chamadasA = appA.get(ConsumidorRegistraChamadas).eventos.length;
      const chamadasB = appB.get(ConsumidorRegistraChamadas).eventos.length;
      expect(chamadasA + chamadasB).toBe(1);

      expect(await linhasDeEventoProcessado(banco, evento.eventoId)).toHaveLength(1);
    } finally {
      await encerrarContextoDeEventos(appA);
      await encerrarContextoDeEventos(appB);
    }
  });

  it('SKIP LOCKED deixa outro despachante avançar para o próximo evento em vez de esperar a linha travada', async () => {
    let avisarQueComecou: () => void = () => {};
    const comecou = new Promise<void>((resolver) => {
      avisarQueComecou = resolver;
    });
    let liberar: () => void = () => {};
    const liberado = new Promise<void>((resolver) => {
      liberar = resolver;
    });

    @Injectable()
    class ConsumidorLento {
      @ReageA('teste.EventoLento', 'ConsumidorLento.reagir')
      async reagir(): Promise<void> {
        avisarQueComecou();
        await liberado;
      }
    }

    const appA = await subirContextoDeEventos(banco, [ConsumidorLento]);
    const appB = await subirContextoDeEventos(banco, [ConsumidorRegistraChamadas]);
    try {
      const eventoLento = criarEvento({ tipo: 'teste.EventoLento' });
      const eventoRapido = criarEvento({ tipo: 'teste.EventoFeliz' });
      await gravarEvento(appA, eventoLento);
      await gravarEvento(appA, eventoRapido);

      const cicloA = appA.get(Despachante).executarCiclo();
      await comecou;

      const cicloB = appB.get(Despachante).executarCiclo();
      const resultado = await Promise.race([
        cicloB.then(() => 'concluiu' as const),
        new Promise<'travou'>((resolver) => setTimeout(() => resolver('travou'), 1500)),
      ]);
      expect(resultado).toBe('concluiu');

      expect(appB.get(ConsumidorRegistraChamadas).eventos.map((e) => e.eventoId)).toEqual([
        eventoRapido.eventoId,
      ]);

      liberar();
      await cicloA;
      await cicloB;
    } finally {
      await encerrarContextoDeEventos(appA);
      await encerrarContextoDeEventos(appB);
    }
  });

  it('restabelece o contexto da instituição do evento antes de entregar ao consumidor', async () => {
    const app = await subirContextoDeEventos(banco, [ConsumidorLeContextoDaInstituicao]);
    try {
      const evento = criarEvento({ tipo: 'teste.EventoComContexto' });
      await gravarEvento(app, evento);

      await app.get(Despachante).executarCiclo();

      expect(app.get(ConsumidorLeContextoDaInstituicao).instituicoesVistas).toEqual([INSTITUICAO_A]);
    } finally {
      await encerrarContextoDeEventos(app);
    }
  });

  it('consumidor que grava um evento derivado tem instituição no ContextoDaRequisicao e o derivado é despachado', async () => {
    @Injectable()
    class ConsumidorEncadeia {
      contextoVisto: unknown;
      instituicaoNoBanco: string | null = null;

      constructor(
        private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
        private readonly repositorio: RepositorioDoOutbox,
      ) {}

      @ReageA('teste.EventoOrigem', 'ConsumidorEncadeia.reagir')
      async reagir(evento: EventoDeDominio): Promise<void> {
        this.contextoVisto = ContextoDaRequisicao.atual();
        await this.unidadeDeTrabalho.transacao('escrita', async (contexto) => {
          const [linha] = await contexto.em.execute<{ instituicao: string | null }[]>(
            "select current_setting('app.instituicao_id', true) as instituicao",
          );
          this.instituicaoNoBanco = linha?.instituicao ?? null;
          await this.repositorio.gravar(contexto, [
            criarEvento({ tipo: 'teste.EventoDerivado', agregadoId: evento.agregadoId }),
          ]);
        });
      }
    }

    @Injectable()
    class ConsumidorDoDerivado {
      eventos: EventoDeDominio[] = [];

      @ReageA('teste.EventoDerivado', 'ConsumidorDoDerivado.reagir')
      async reagir(evento: EventoDeDominio): Promise<void> {
        this.eventos.push(evento);
      }
    }

    const app = await subirContextoDeEventos(banco, [ConsumidorEncadeia, ConsumidorDoDerivado]);
    try {
      const origem = criarEvento({ tipo: 'teste.EventoOrigem' });
      await gravarEvento(app, origem);

      const despachante = app.get(Despachante);
      await despachante.executarCiclo();
      await despachante.executarCiclo();

      expect(app.get(ConsumidorEncadeia).contextoVisto).toMatchObject({ instituicaoId: INSTITUICAO_A });
      expect(app.get(ConsumidorEncadeia).instituicaoNoBanco).toBe(INSTITUICAO_A);
      expect(app.get(ConsumidorDoDerivado).eventos.map((e) => e.agregadoId)).toEqual([origem.agregadoId]);
    } finally {
      await encerrarContextoDeEventos(app);
    }
  });

  it('o ciclo acordado pelo sinal de quem gravou não herda o ContextoDaRequisicao dessa requisição', async () => {
    const app = await subirContextoDeEventos(banco, [ConsumidorRegistraChamadas]);
    try {
      const despachante = app.get(Despachante);
      const executarCicloOriginal = despachante.executarCiclo.bind(despachante);
      const contextosAoIniciarCiclo: unknown[] = [];
      vi.spyOn(despachante, 'executarCiclo').mockImplementation(() => {
        contextosAoIniciarCiclo.push(ContextoDaRequisicao.atual());
        return executarCicloOriginal();
      });

      await gravarEvento(app, criarEvento({ tipo: 'teste.EventoFeliz' }), INSTITUICAO_B);

      await vi.waitFor(() => expect(contextosAoIniciarCiclo.length).toBeGreaterThan(0), { timeout: 2000 });
      expect(contextosAoIniciarCiclo).toStrictEqual(contextosAoIniciarCiclo.map(() => undefined));
    } finally {
      await encerrarContextoDeEventos(app);
    }
  });

  it('respeita o teto de tentativas: 9 ainda é elegível, 10 não é mais entregue', async () => {
    const app = await subirContextoDeEventos(banco, [ConsumidorRegistraChamadas]);
    try {
      const noLimite = criarEvento({ tipo: 'teste.EventoFeliz' });
      await gravarEvento(app, noLimite);
      await banco.owner.query('update shared.outbox set tentativas = 9 where evento_id = $1', [
        noLimite.eventoId,
      ]);

      const esgotado = criarEvento({ tipo: 'teste.EventoFeliz' });
      await gravarEvento(app, esgotado);
      await banco.owner.query('update shared.outbox set tentativas = 10 where evento_id = $1', [
        esgotado.eventoId,
      ]);

      await app.get(Despachante).executarCiclo();

      const entreguesIds = app.get(ConsumidorRegistraChamadas).eventos.map((e) => e.eventoId);
      expect(entreguesIds).toContain(noLimite.eventoId);
      expect(entreguesIds).not.toContain(esgotado.eventoId);
    } finally {
      await encerrarContextoDeEventos(app);
    }
  });

  it('sem FOR UPDATE, um segundo despachante processaria o mesmo evento que o primeiro ainda segura (M17)', async () => {
    let avisarQueComecou: () => void = () => {};
    const comecou = new Promise<void>((resolver) => {
      avisarQueComecou = resolver;
    });
    let liberar: () => void = () => {};
    const liberado = new Promise<void>((resolver) => {
      liberar = resolver;
    });

    const chamadas: string[] = [];
    const criarConsumidorLentoNomeado = (nome: string) => {
      @Injectable()
      class ConsumidorLentoNomeado {
        @ReageA('teste.EventoUnicoLento', nome)
        async reagir(): Promise<void> {
          chamadas.push(nome);
          avisarQueComecou();
          await liberado;
        }
      }
      return ConsumidorLentoNomeado;
    };

    const appA = await subirContextoDeEventos(banco, [criarConsumidorLentoNomeado('ConsumidorLentoA')]);
    const appB = await subirContextoDeEventos(banco, [criarConsumidorLentoNomeado('ConsumidorLentoB')]);
    try {
      const evento = criarEvento({ tipo: 'teste.EventoUnicoLento' });
      await gravarEvento(appA, evento);

      const cicloA = appA.get(Despachante).executarCiclo();
      await comecou;

      const cicloB = appB.get(Despachante).executarCiclo();
      const resultado = await Promise.race([
        cicloB.then(() => 'concluiu' as const),
        new Promise<'nao-concluiu'>((resolver) => setTimeout(() => resolver('nao-concluiu'), 300)),
      ]);

      expect(resultado).toBe('concluiu');
      expect(chamadas).toEqual(['ConsumidorLentoA']);

      liberar();
      await cicloA;
      await cicloB;

      expect(chamadas).toEqual(['ConsumidorLentoA']);
      expect(await linhasDeEventoProcessado(banco, evento.eventoId)).toEqual(['ConsumidorLentoA']);
    } finally {
      await encerrarContextoDeEventos(appA);
      await encerrarContextoDeEventos(appB);
    }
  }, 10000);

  it('set_config local ao commit: não vaza para a conexão reaproveitada no pool (M5, pool = 1)', async () => {
    const app = await subirContextoDeEventos(banco, [ConsumidorRegistraChamadas], 1);
    try {
      const eventoDeB = criarEvento({ tipo: 'teste.EventoFeliz' });
      await gravarEvento(app, eventoDeB, INSTITUICAO_B);

      await app.get(Despachante).executarCiclo();

      const unidade = app.get(UnidadeDeTrabalho);
      const linhas = await unidade.transacao('leitura', ({ em }) =>
        em.execute<{ i: string | null }[]>('select shared.instituicao_atual() as i'),
      );

      expect(linhas[0]?.i ?? null).toBeNull();
    } finally {
      await encerrarContextoDeEventos(app);
    }
  });

  it('entrega eventos por polling periódico mesmo sem nenhum sinal de gravação (M11)', async () => {
    const app = await subirContextoDeEventos(banco, [ConsumidorRegistraChamadas]);
    try {
      const evento = criarEvento({ tipo: 'teste.EventoFeliz' });
      await banco.owner.query(
        `insert into shared.outbox
           (evento_id, instituicao_id, tipo, agregado_tipo, agregado_id, payload, ocorrido_em)
         values ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
        [
          evento.eventoId,
          INSTITUICAO_A,
          evento.tipo,
          evento.agregadoTipo,
          evento.agregadoId,
          JSON.stringify(evento.dados),
          evento.ocorridoEm,
        ],
      );

      await vi.waitFor(
        () => {
          expect(app.get(ConsumidorRegistraChamadas).eventos.map((e) => e.eventoId)).toEqual([evento.eventoId]);
        },
        { timeout: 3000, interval: 100 },
      );
    } finally {
      await encerrarContextoDeEventos(app);
    }
  }, 6000);

  it('sinaliza depois do commit: latência commit -> entrega bem abaixo de 1s, e rollback não sinaliza (M8/M15)', async () => {
    let chegou: (t: number) => void = () => {};
    @Injectable()
    class ConsumidorDeLatencia {
      @ReageA('teste.EventoDeLatencia', 'ConsumidorDeLatencia.reagir')
      async reagir(): Promise<void> {
        chegou(Date.now());
      }
    }

    const app = await subirContextoDeEventos(banco, [ConsumidorDeLatencia]);
    try {
      const unidade = app.get(UnidadeDeTrabalho);
      const repositorio = app.get(RepositorioDoOutbox);

      const eventoDoRollback = criarEvento({ tipo: 'teste.EventoDeLatencia' });
      let sinalizouNoRollback = false;
      const pararDeOuvir = app.get(SinalizadorDeEventos).aoNotificar(() => {
        sinalizouNoRollback = true;
      });
      await expect(
        comContexto(INSTITUICAO_A, () =>
          unidade.transacao('escrita', async (contexto) => {
            await repositorio.gravar(contexto, [eventoDoRollback]);
            throw new Error('rollback proposital');
          }),
        ),
      ).rejects.toThrow('rollback proposital');
      pararDeOuvir();
      expect(sinalizouNoRollback).toBe(false);

      const p = new Promise<number>((resolver) => {
        chegou = resolver;
      });
      const t0 = Date.now();
      await gravarEvento(app, criarEvento({ tipo: 'teste.EventoDeLatencia' }));
      const latencia = (await p) - t0;

      expect(latencia).toBeLessThan(200);
    } finally {
      await encerrarContextoDeEventos(app);
    }
  }, 10000);

  it('onModuleDestroy espera o ciclo em andamento e, depois disso, mais nenhum evento é processado (M9/M16)', async () => {
    let comecou: () => void = () => {};
    const pComecou = new Promise<void>((resolver) => {
      comecou = resolver;
    });
    let liberar: () => void = () => {};
    const liberado = new Promise<void>((resolver) => {
      liberar = resolver;
    });

    @Injectable()
    class ConsumidorLentoParaFechamento {
      @ReageA('teste.EventoLentoFechamento', 'ConsumidorLentoParaFechamento.reagir')
      async reagir(): Promise<void> {
        comecou();
        await liberado;
      }
    }

    const app = await subirContextoDeEventos(banco, [ConsumidorLentoParaFechamento]);
    const despachante = app.get(Despachante);
    try {
      const primeiro = criarEvento({ tipo: 'teste.EventoLentoFechamento' });
      await gravarEvento(app, primeiro);
      await pComecou;

      const segundo = criarEvento({ tipo: 'teste.EventoLentoFechamento' });
      await gravarEvento(app, segundo);

      let destruiuAntesDeLiberar = false;
      const destruicao = despachante.onModuleDestroy().then(() => {
        destruiuAntesDeLiberar = true;
      });

      await new Promise((resolver) => setTimeout(resolver, 200));
      expect(destruiuAntesDeLiberar).toBe(false);

      liberar();
      await destruicao;
      expect(destruiuAntesDeLiberar).toBe(true);

      const linhaDoSegundo = await linhaDoOutbox(banco, segundo.eventoId);
      expect(linhaDoSegundo?.publicado_em).toBeNull();
    } finally {
      await encerrarContextoDeEventos(app);
    }
  }, 10000);

  it('timeout do consumidor: um consumidor que nunca resolve não trava o despachante', async () => {
    process.env.TIMEOUT_DO_CONSUMIDOR_EM_MS = '50';
    @Injectable()
    class ConsumidorQueNuncaResolve {
      @ReageA('teste.EventoSemFim', 'ConsumidorQueNuncaResolve.reagir')
      async reagir(): Promise<void> {
        await new Promise(() => {});
      }
    }

    const app = await subirContextoDeEventos(banco, [ConsumidorQueNuncaResolve]);
    try {
      const evento = criarEvento({ tipo: 'teste.EventoSemFim' });
      await gravarEvento(app, evento);

      await expect(app.get(Despachante).executarCiclo()).resolves.toBeUndefined();

      const linha = await linhaDoOutbox(banco, evento.eventoId);
      expect(linha?.publicado_em).toBeNull();
      expect(linha?.tentativas).toBe(1);
      expect(linha?.ultimo_erro).toContain('ErroDeTimeoutDoConsumidor');
    } finally {
      await encerrarContextoDeEventos(app);
      delete process.env.TIMEOUT_DO_CONSUMIDOR_EM_MS;
    }
  });
});
