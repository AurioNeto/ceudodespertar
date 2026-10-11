import type { Dinheiro } from '@cdd/contracts';
import type { FeitioNaTela } from '../mocks/feitio';

export const custoTotal = (f: FeitioNaTela): Dinheiro =>
  (f.materiaPrima.reduce((s, m) => s + m.custo, 0) + f.custos.reduce((s, c) => s + c.valor, 0)) as Dinheiro;

export const custoConfirmado = (f: FeitioNaTela): Dinheiro =>
  (f.materiaPrima.reduce((s, m) => s + m.custo, 0) +
    f.custos.filter((c) => c.confirmado).reduce((s, c) => s + c.valor, 0)) as Dinheiro;

export const custoDaMateriaPrima = (f: FeitioNaTela) => f.materiaPrima.reduce((s, m) => s + m.custo, 0);

export const custoDosLancamentos = (f: FeitioNaTela) => f.custos.reduce((s, c) => s + c.valor, 0);

export const custoPorLitro = (total: number, litros: number | null) => (litros ? total / litros : null);
