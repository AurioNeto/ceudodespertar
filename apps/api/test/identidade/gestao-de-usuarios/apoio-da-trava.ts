import { CHAVE_DO_TRAVAMENTO_DA_ADMINISTRACAO } from '../../../src/modules/identidade/infrastructure/administracao/trava-da-administracao.advisory.js';
import type { BancoDeTeste } from '../../integracao/banco-de-teste.js';
import type { RespostaDeEscrita } from './apoio-http.js';

const LIMITE_DE_TENTATIVAS_DE_BLOQUEIO = 200;
const INTERVALO_ENTRE_TENTATIVAS_EM_MS = 25;

export interface ApoioDaTrava {
  segurar(): Promise<() => Promise<void>>;
  esperarPedidos(quantidade: number): Promise<void>;
  dispararComATravaSegura(disparar: readonly (() => Promise<RespostaDeEscrita>)[]): Promise<RespostaDeEscrita[]>;
}

export function apoioDaTrava(banco: BancoDeTeste, instituicaoId: string): ApoioDaTrava {
  async function segurar(): Promise<() => Promise<void>> {
    await banco.owner.query('begin');
    await banco.owner.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [
      CHAVE_DO_TRAVAMENTO_DA_ADMINISTRACAO + instituicaoId,
    ]);
    return async () => {
      await banco.owner.query('rollback');
    };
  }

  async function contarPedidosEsperando(): Promise<number> {
    const { rows } = await banco.owner.query<{ total: number }>(
      `select count(*)::int as total
         from pg_locks
        where locktype = 'advisory'
          and not granted`,
    );
    return rows[0]?.total ?? 0;
  }

  async function esperarPedidos(quantidade: number): Promise<void> {
    for (let tentativa = 0; tentativa < LIMITE_DE_TENTATIVAS_DE_BLOQUEIO; tentativa += 1) {
      // eslint-disable-next-line no-await-in-loop -- sondagem sequencial até o bloqueio aparecer
      if ((await contarPedidosEsperando()) >= quantidade) return;
      // eslint-disable-next-line no-await-in-loop -- intervalo entre as sondagens
      await new Promise((resolver) => setTimeout(resolver, INTERVALO_ENTRE_TENTATIVAS_EM_MS));
    }
    throw new Error(`os ${quantidade} pedidos nunca ficaram bloqueados esperando a trava da administração`);
  }

  async function dispararComATravaSegura(
    disparar: readonly (() => Promise<RespostaDeEscrita>)[],
  ): Promise<RespostaDeEscrita[]> {
    const liberar = await segurar();
    try {
      const pedidos = disparar.map((pedido) => pedido());
      await esperarPedidos(disparar.length);
      await liberar();
      return await Promise.all(pedidos);
    } catch (erro) {
      await liberar().catch(() => undefined);
      throw erro;
    }
  }

  return { segurar, esperarPedidos, dispararComATravaSegura };
}
