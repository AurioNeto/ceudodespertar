import { PALETA, RAIO } from '../constantes';
import type { FatiaDaQuebra } from '../tipos';

const CIRCUNFERENCIA = 2 * Math.PI * RAIO;

export const fatiasDaQuebra = (itens: readonly FatiaDaQuebra[], total: number, hover: number | null) => {
  let acumulado = 0;
  return itens.map((item, i) => {
    const fracao = total > 0 ? item.valor / total : 0;
    const fatia = {
      ...item,
      cor: PALETA[i % PALETA.length] as string,
      fracao,
      dash: `${(fracao * CIRCUNFERENCIA).toFixed(2)} ${CIRCUNFERENCIA.toFixed(2)}`,
      offset: (-acumulado * CIRCUNFERENCIA).toFixed(2),
      destacado: hover === i,
      apagado: hover != null && hover !== i,
    };
    acumulado += fracao;
    return fatia;
  });
};
