import { Injectable } from '@nestjs/common';
import type { INestApplicationContext } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { Despachante } from '../../src/shared/infrastructure/eventos/despachante.js';
import { ReageA } from '../../src/shared/infrastructure/eventos/reage-a.decorator.js';
import {
  criarEvento,
  encerrarContextoDeEventos,
  gravarEvento,
  linhaDoOutbox,
  semearInstituicoes,
  subirContextoDeEventos,
} from './apoio.js';

const TIMEOUT_DO_CONSUMIDOR_EM_MS = 200;
const TIPO_DO_EVENTO = 'teste.EventoQueNuncaTermina';

let invocacoes = 0;

@Injectable()
class ConsumidorQueNuncaTermina {
  @ReageA(TIPO_DO_EVENTO, 'ConsumidorQueNuncaTermina.reagir')
  async reagir(): Promise<void> {
    invocacoes += 1;
    await new Promise<void>(() => undefined);
  }
}

describe('Despachante · dois despachantes sobre o mesmo outbox', () => {
  let banco: BancoDeTeste;
  const aplicacoes: INestApplicationContext[] = [];

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
    process.env.TIMEOUT_DO_CONSUMIDOR_EM_MS = String(TIMEOUT_DO_CONSUMIDOR_EM_MS);
    invocacoes = 0;
  });

  afterEach(async () => {
    for (const aplicacao of aplicacoes.splice(0)) {
      // eslint-disable-next-line no-await-in-loop -- encerramento em sequência para não competir pelo mesmo banco
      await encerrarContextoDeEventos(aplicacao);
    }
    delete process.env.TIMEOUT_DO_CONSUMIDOR_EM_MS;
    await derrubarBancoDeTeste(banco);
  });

  it('cada entrega abortada por timeout soma uma tentativa, mesmo quando o outro despachante entra entre o aborto e o registro da falha', async () => {
    const primeira = await subirContextoDeEventos(banco, [ConsumidorQueNuncaTermina], 2);
    aplicacoes.push(primeira);
    const segunda = await subirContextoDeEventos(banco, [ConsumidorQueNuncaTermina], 2);
    aplicacoes.push(segunda);
    const evento = criarEvento({ tipo: TIPO_DO_EVENTO });
    await gravarEvento(primeira, evento);

    let primeiroCicloTerminou = false;
    const primeiroCiclo = primeira
      .get(Despachante)
      .executarCiclo()
      .finally(() => {
        primeiroCicloTerminou = true;
      });
    while (!primeiroCicloTerminou) {
      // eslint-disable-next-line no-await-in-loop -- o segundo despachante tenta sem pausa durante todo o primeiro ciclo
      await segunda.get(Despachante).executarCiclo();
    }
    await primeiroCiclo;

    const linha = await linhaDoOutbox(banco, evento.eventoId);
    expect(invocacoes).toBeGreaterThanOrEqual(1);
    expect(linha?.tentativas).toBe(invocacoes);
  }, 20_000);
});
