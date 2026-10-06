import { randomUUID } from 'node:crypto';
import { setImmediate as proximoTurno } from 'node:timers/promises';
import { Injectable, Logger } from '@nestjs/common';
import type { INestApplicationContext } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { UnidadeDeTrabalho } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import { Despachante } from '../../src/shared/infrastructure/eventos/despachante.js';
import { ReageA } from '../../src/shared/infrastructure/eventos/reage-a.decorator.js';
import {
  INSTITUICAO_A,
  criarEvento,
  encerrarContextoDeEventos,
  gravarEvento,
  linhaDoOutbox,
  linhasDeEventoProcessado,
  semearInstituicoes,
  subirContextoDeEventos,
} from './apoio.js';

const TIMEOUT_DO_CONSUMIDOR_EM_MS = 200;
const INSERIR_EFEITO =
  "insert into shared.chave_de_idempotencia (instituicao_id, chave, rota, status_http, resposta) values (?, ?, '/x', 200, '{}'::jsonb)";

const INSERIR_SEM_ISOLAMENTO_POR_CASA =
  'insert into shared.evento_processado (consumidor, evento_id) values (?, ?)';

async function contarEscritasSemIsolamentoPorCasa(
  banco: BancoDeTeste,
  prefixoDoConsumidor: string,
): Promise<number> {
  const resultado = await banco.owner.query(
    'select count(*)::int as total from shared.evento_processado where consumidor like $1',
    [`${prefixoDoConsumidor}%`],
  );
  return (resultado.rows[0] as { total: number }).total;
}

async function contarEfeitos(banco: BancoDeTeste, prefixoDaChave: string): Promise<number> {
  await banco.owner.query("select set_config('app.instituicao_id', $1, false)", [INSTITUICAO_A]);
  const resultado = await banco.owner.query(
    'select count(*)::int as total from shared.chave_de_idempotencia where chave like $1',
    [`${prefixoDaChave}%`],
  );
  return (resultado.rows[0] as { total: number }).total;
}

async function liberarParaNovaTentativa(banco: BancoDeTeste, eventoId: string): Promise<void> {
  await banco.owner.query('update shared.outbox set proxima_tentativa_em = null where evento_id = $1', [
    eventoId,
  ]);
}

async function medirEmMs(acao: () => Promise<unknown>): Promise<number> {
  const inicio = performance.now();
  await acao();
  return performance.now() - inicio;
}

@Injectable()
class ConsumidorComQueryLenta {
  lento = true;

  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {}

  @ReageA('teste.EventoComQueryLenta', 'ConsumidorComQueryLenta.reagir')
  async reagir(): Promise<void> {
    await this.unidadeDeTrabalho.transacao('escrita', async ({ em }) => {
      if (this.lento) {
        this.lento = false;
        await em.execute('select pg_sleep(0.8)');
      }
      await em.execute(INSERIR_EFEITO, [INSTITUICAO_A, 'efeito-lento']);
    });
  }
}

@Injectable()
class ConsumidorVizinhoDoLento {
  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {}

  @ReageA('teste.EventoComQueryLenta', 'ConsumidorVizinhoDoLento.reagir')
  async reagir(): Promise<void> {
    await this.unidadeDeTrabalho.transacao('escrita', ({ em }) =>
      em.execute(INSERIR_EFEITO, [INSTITUICAO_A, 'efeito-vizinho']),
    );
  }
}

@Injectable()
class ConsumidorQueEsperaLock {
  esperaLock = true;

  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {}

  @ReageA('teste.EventoComLock', 'ConsumidorQueEsperaLock.reagir')
  async reagir(): Promise<void> {
    await this.unidadeDeTrabalho.transacao('escrita', ({ em }) =>
      em.execute(INSERIR_EFEITO, [INSTITUICAO_A, 'efeito-lock']),
    );
  }
}

@Injectable()
class ConsumidorPresoForaDoBanco {
  preso = true;
  liberar: () => void = () => undefined;
  gravacaoTardia: Promise<'gravou' | 'rejeitada'> = Promise.resolve('rejeitada');

  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {}

  @ReageA('teste.EventoPresoEmJs', 'ConsumidorPresoForaDoBanco.reagir')
  async reagir(): Promise<void> {
    if (!this.preso) {
      await this.unidadeDeTrabalho.transacao('escrita', ({ em }) =>
        em.execute(INSERIR_EFEITO, [INSTITUICAO_A, 'efeito-preso']),
      );
      return;
    }
    this.preso = false;
    await this.unidadeDeTrabalho.transacao('escrita', async ({ em }) => {
      await em.execute(INSERIR_SEM_ISOLAMENTO_POR_CASA, ['estranho-preso-antes-do-timeout', randomUUID()]);
      this.gravacaoTardia = new Promise((resolver) => {
        this.liberar = () => {
          em.execute(INSERIR_SEM_ISOLAMENTO_POR_CASA, [
            'estranho-preso-depois-do-timeout',
            randomUUID(),
          ]).then(
            () => resolver('gravou'),
            () => resolver('rejeitada'),
          );
        };
      });
      await new Promise<void>(() => undefined);
    });
  }
}

@Injectable()
class ConsumidorVizinhoDoPreso {
  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {}

  @ReageA('teste.EventoPresoEmJs', 'ConsumidorVizinhoDoPreso.reagir')
  async reagir(): Promise<void> {
    await this.unidadeDeTrabalho.transacao('escrita', ({ em }) =>
      em.execute(INSERIR_EFEITO, [INSTITUICAO_A, 'efeito-vizinho-do-preso']),
    );
  }
}

@Injectable()
class ConsumidorQueGravaSemParar {
  preso = true;
  parar = false;
  laco: Promise<void> = Promise.resolve();

  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {}

  @ReageA('teste.EventoComGravacaoContinua', 'ConsumidorQueGravaSemParar.reagir')
  async reagir(): Promise<void> {
    await this.unidadeDeTrabalho.transacao('escrita', async ({ em }) => {
      if (!this.preso) {
        await em.execute(INSERIR_EFEITO, [INSTITUICAO_A, 'efeito-continuo-reentrega']);
        return;
      }
      this.preso = false;
      let sequencia = 0;
      const gravarAteParar = async (): Promise<void> => {
        while (!this.parar) {
          sequencia += 1;
          // eslint-disable-next-line no-await-in-loop -- cada gravação tardia precisa ser tentada em sequência, sem pausa
          await em
            .execute(INSERIR_SEM_ISOLAMENTO_POR_CASA, [`estranho-continuo-${sequencia}`, randomUUID()])
            .catch(() => proximoTurno());
        }
      };
      this.laco = gravarAteParar();
      await new Promise<void>(() => undefined);
    });
  }
}

@Injectable()
class ConsumidorQueGravaDuplicado {
  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {}

  @ReageA('teste.EventoComEmailDuplicado', 'ConsumidorQueGravaDuplicado.reagir')
  async reagir(): Promise<void> {
    await this.unidadeDeTrabalho.transacao('escrita', async ({ em }) => {
      await em.execute(INSERIR_EFEITO, [INSTITUICAO_A, 'fulana@exemplo.com']);
      await em.execute(INSERIR_EFEITO, [INSTITUICAO_A, 'fulana@exemplo.com']);
    });
  }
}

@Injectable()
class ConsumidorQueLancaComDadoPessoal {
  @ReageA('teste.EventoComDadoPessoalNaMensagem', 'ConsumidorQueLancaComDadoPessoal.reagir')
  async reagir(): Promise<void> {
    throw new Error('titular fulana@exemplo.com cpf 123.456.789-00 e 12345678900');
  }
}

@Injectable()
class ConsumidorSimples {
  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {}

  @ReageA('teste.EventoSimples', 'ConsumidorSimples.reagir')
  async reagir(): Promise<void> {
    await this.unidadeDeTrabalho.transacao('escrita', ({ em }) =>
      em.execute(INSERIR_EFEITO, [INSTITUICAO_A, 'efeito-simples']),
    );
  }
}

describe('Despachante · falha do consumidor', () => {
  let banco: BancoDeTeste;
  let app: INestApplicationContext | undefined;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
    process.env.TIMEOUT_DO_CONSUMIDOR_EM_MS = String(TIMEOUT_DO_CONSUMIDOR_EM_MS);
  });

  afterEach(async () => {
    if (app !== undefined) {
      await encerrarContextoDeEventos(app);
      app = undefined;
    }
    delete process.env.TIMEOUT_DO_CONSUMIDOR_EM_MS;
    await derrubarBancoDeTeste(banco);
  });

  describe('limite de duração das queries', () => {
    it('não fica na conexão do pool depois do ciclo', async () => {
      app = await subirContextoDeEventos(banco, [ConsumidorSimples], 1);
      await gravarEvento(app, criarEvento({ tipo: 'teste.EventoSimples' }));

      await app.get(Despachante).executarCiclo();

      const padraoDoBanco = (await banco.app.query('show statement_timeout')).rows[0]
        .statement_timeout as string;
      const vistoNaConexaoReaproveitada = await app
        .get(UnidadeDeTrabalho)
        .transacao('leitura', ({ em }) =>
          em.execute<{ statement_timeout: string }[]>('show statement_timeout'),
        );
      expect(vistoNaConexaoReaproveitada[0]?.statement_timeout).toBe(padraoDoBanco);
    });

    it('vale só durante o consumidor: o restante da transação do despachante volta ao padrão do banco', async () => {
      await banco.owner.query(
        `create function shared.registrar_limite_de_duracao() returns trigger language plpgsql as
         $$ begin
              insert into shared.chave_de_idempotencia (instituicao_id, chave, rota, status_http, resposta)
              values (current_setting('app.instituicao_id')::uuid, 'limite-' || current_setting('statement_timeout'),
                      '/x', 200, '{}'::jsonb);
              return null;
            end $$`,
      );
      await banco.owner.query(
        `create trigger registrar_limite_de_duracao after insert on shared.evento_processado
         for each row execute function shared.registrar_limite_de_duracao()`,
      );
      app = await subirContextoDeEventos(banco, [ConsumidorSimples]);
      await gravarEvento(app, criarEvento({ tipo: 'teste.EventoSimples' }));

      await app.get(Despachante).executarCiclo();

      const padraoDoBanco = (await banco.app.query('show statement_timeout')).rows[0]
        .statement_timeout as string;
      expect(await contarEfeitos(banco, `limite-${padraoDoBanco}`)).toBe(1);
      expect(await contarEfeitos(banco, 'limite-')).toBe(1);
    });
  });

  describe('consumidor com query lenta', () => {
    it('o banco cancela a query no timeout: nenhum efeito no ciclo e exatamente um depois da nova tentativa', async () => {
      app = await subirContextoDeEventos(banco, [ConsumidorComQueryLenta]);
      const evento = criarEvento({ tipo: 'teste.EventoComQueryLenta' });
      await gravarEvento(app, evento);
      const despachante = app.get(Despachante);

      await despachante.executarCiclo();

      expect(await contarEfeitos(banco, 'efeito-lento')).toBe(0);
      const aposOTimeout = await linhaDoOutbox(banco, evento.eventoId);
      expect(aposOTimeout?.tentativas).toBe(1);
      expect(aposOTimeout?.publicado_em).toBeNull();
      expect(aposOTimeout?.ultimo_erro).toContain('57014');

      await liberarParaNovaTentativa(banco, evento.eventoId);
      await despachante.executarCiclo();

      expect(await contarEfeitos(banco, 'efeito-lento')).toBe(1);
      expect((await linhaDoOutbox(banco, evento.eventoId))?.publicado_em).not.toBeNull();
    });

    it('o consumidor vizinho do mesmo evento mantém o efeito e não repete na nova tentativa', async () => {
      app = await subirContextoDeEventos(banco, [ConsumidorComQueryLenta, ConsumidorVizinhoDoLento]);
      const evento = criarEvento({ tipo: 'teste.EventoComQueryLenta' });
      await gravarEvento(app, evento);
      const despachante = app.get(Despachante);

      await despachante.executarCiclo();
      expect(await contarEfeitos(banco, 'efeito-vizinho')).toBe(1);

      await liberarParaNovaTentativa(banco, evento.eventoId);
      await despachante.executarCiclo();

      expect(await contarEfeitos(banco, 'efeito-vizinho')).toBe(1);
      expect(await contarEfeitos(banco, 'efeito-lento')).toBe(1);
      expect(await linhasDeEventoProcessado(banco, evento.eventoId)).toEqual([
        'ConsumidorComQueryLenta.reagir',
        'ConsumidorVizinhoDoLento.reagir',
      ]);
    });

    it('um evento de outro agregado é entregue no mesmo ciclo em que o lento estoura', async () => {
      app = await subirContextoDeEventos(banco, [ConsumidorComQueryLenta, ConsumidorVizinhoDoPreso]);
      const lento = criarEvento({ tipo: 'teste.EventoComQueryLenta' });
      const outro = criarEvento({ tipo: 'teste.EventoPresoEmJs' });
      await gravarEvento(app, lento);
      await gravarEvento(app, outro);

      await app.get(Despachante).executarCiclo();

      expect((await linhaDoOutbox(banco, lento.eventoId))?.publicado_em).toBeNull();
      expect((await linhaDoOutbox(banco, outro.eventoId))?.publicado_em).not.toBeNull();
    });
  });

  describe('consumidor esperando lock', () => {
    it('a espera é cancelada no timeout e o despachante não trava', async () => {
      app = await subirContextoDeEventos(banco, [ConsumidorQueEsperaLock]);
      const evento = criarEvento({ tipo: 'teste.EventoComLock' });
      await gravarEvento(app, evento);
      await banco.owner.query('begin');
      await banco.owner.query('lock table shared.chave_de_idempotencia in access exclusive mode');
      try {
        const duracaoEmMs = await medirEmMs(() => app!.get(Despachante).executarCiclo());

        expect(duracaoEmMs).toBeLessThan(2500);
        const linha = await linhaDoOutbox(banco, evento.eventoId);
        expect(linha?.tentativas).toBe(1);
        expect(linha?.ultimo_erro).toContain('57014');
      } finally {
        await banco.owner.query('rollback');
      }

      await liberarParaNovaTentativa(banco, evento.eventoId);
      await app.get(Despachante).executarCiclo();

      expect(await contarEfeitos(banco, 'efeito-lock')).toBe(1);
    });
  });

  describe('consumidor preso fora do banco', () => {
    it('a gravação que ele tenta depois do timeout não persiste, e a nova tentativa grava uma vez', async () => {
      app = await subirContextoDeEventos(banco, [ConsumidorPresoForaDoBanco, ConsumidorVizinhoDoPreso]);
      const evento = criarEvento({ tipo: 'teste.EventoPresoEmJs' });
      await gravarEvento(app, evento);
      const despachante = app.get(Despachante);
      const consumidor = app.get(ConsumidorPresoForaDoBanco);

      await despachante.executarCiclo();
      consumidor.liberar();

      expect(await consumidor.gravacaoTardia).toBe('rejeitada');
      expect(await contarEscritasSemIsolamentoPorCasa(banco, 'estranho-preso-')).toBe(0);
      expect(await contarEfeitos(banco, 'efeito-vizinho-do-preso')).toBe(0);
      const aposOTimeout = await linhaDoOutbox(banco, evento.eventoId);
      expect(aposOTimeout?.tentativas).toBe(1);
      expect(aposOTimeout?.ultimo_erro).toContain('ErroDeTimeoutDoConsumidor');
      expect(await linhasDeEventoProcessado(banco, evento.eventoId)).toEqual([]);

      await liberarParaNovaTentativa(banco, evento.eventoId);
      await despachante.executarCiclo();

      expect(await contarEfeitos(banco, 'efeito-preso')).toBe(1);
      expect(await contarEfeitos(banco, 'efeito-vizinho-do-preso')).toBe(1);
      expect((await linhaDoOutbox(banco, evento.eventoId))?.publicado_em).not.toBeNull();
    });

    it('o ciclo termina logo depois do timeout do banco, sem esperar uma folga grande do timer em JS', async () => {
      app = await subirContextoDeEventos(banco, [ConsumidorPresoForaDoBanco, ConsumidorVizinhoDoPreso]);
      await gravarEvento(app, criarEvento({ tipo: 'teste.EventoPresoEmJs' }));

      const duracaoEmMs = await medirEmMs(() => app!.get(Despachante).executarCiclo());

      expect(duracaoEmMs).toBeLessThan(TIMEOUT_DO_CONSUMIDOR_EM_MS + 1500);
    });

    it('um consumidor que grava sem parar durante todo o aborto não persiste nada, nem na conexão reaproveitada', async () => {
      app = await subirContextoDeEventos(banco, [ConsumidorQueGravaSemParar], 1);
      const evento = criarEvento({ tipo: 'teste.EventoComGravacaoContinua' });
      await gravarEvento(app, evento);
      const despachante = app.get(Despachante);
      const consumidor = app.get(ConsumidorQueGravaSemParar);

      await despachante.executarCiclo();
      await liberarParaNovaTentativa(banco, evento.eventoId);
      await despachante.executarCiclo();
      consumidor.parar = true;
      await consumidor.laco;

      expect(await contarEfeitos(banco, 'efeito-continuo-reentrega')).toBe(1);
      expect(await contarEscritasSemIsolamentoPorCasa(banco, 'estranho-continuo-')).toBe(0);
      expect((await linhaDoOutbox(banco, evento.eventoId))?.publicado_em).not.toBeNull();
    });
  });

  describe('ultimo_erro', () => {
    it('de violação de unicidade grava classe, SQLSTATE e constraint, sem o detail com o e-mail', async () => {
      app = await subirContextoDeEventos(banco, [ConsumidorQueGravaDuplicado]);
      const evento = criarEvento({ tipo: 'teste.EventoComEmailDuplicado' });
      await gravarEvento(app, evento);

      await app.get(Despachante).executarCiclo();

      const ultimoErro = (await linhaDoOutbox(banco, evento.eventoId))?.ultimo_erro ?? '';
      expect(ultimoErro).toContain('23505');
      expect(ultimoErro).toContain('constraint=');
      expect(ultimoErro).not.toContain('fulana');
      expect(ultimoErro).not.toContain('exemplo.com');
      expect(ultimoErro).not.toContain('already exists');
    });

    it('de erro comum não grava nem loga e-mail, CPF formatado nem CPF de 11 dígitos da mensagem', async () => {
      const avisos = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      app = await subirContextoDeEventos(banco, [ConsumidorQueLancaComDadoPessoal]);
      const evento = criarEvento({
        tipo: 'teste.EventoComDadoPessoalNaMensagem',
      });
      await gravarEvento(app, evento);

      await app.get(Despachante).executarCiclo();

      const ultimoErro = (await linhaDoOutbox(banco, evento.eventoId))?.ultimo_erro ?? '';
      expect(ultimoErro).toMatch(/^Error - /);
      expect(ultimoErro).not.toContain('fulana');
      expect(ultimoErro).not.toContain('123.456.789-00');
      expect(ultimoErro).not.toContain('12345678900');
      expect(avisos).toHaveBeenCalled();
      const textoLogado = avisos.mock.calls.map((chamada) => String(chamada[0])).join('\n');
      expect(textoLogado).not.toContain('fulana');
      expect(textoLogado).not.toContain('123.456.789-00');
      expect(textoLogado).not.toContain('12345678900');
      avisos.mockRestore();
    });
  });
});
