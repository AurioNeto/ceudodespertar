import { cerimoniasPassadas } from '../../../mocks/cerimonias';
import { lotesDeDaime } from '../mocks/estoque';
import { formatarDiaMes, formatarLitros } from '@/pages/utils/formato';
import { BASE, ESCALA, LARGURA_BARRA, PASSO_X } from '../constantes';

interface Retangulo {
  chave: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  stroke?: string;
}

interface RotuloDaBarra {
  chave: string;
  cx: number;
  data: string;
  nome: string;
  total: string;
  totalY: number;
  consumo: string;
  consumoY: number;
}

/**
 * A barra sólida é o estoque após a cerimônia, empilhado por lote; a parte
 * hachurada acima é o que aquela cerimônia consumiu de cada lote. Os números
 * de estoque são derivados dos consumos, não valores soltos.
 */
export function derivar() {
  const saldo = lotesDeDaime.map((l) => l.saldoInicial);
  const solidos: Retangulo[] = [];
  const consumos: Retangulo[] = [];
  const rotulos: RotuloDaBarra[] = [];
  let consumoTotal = 0;

  cerimoniasPassadas.forEach((c, i) => {
    c.entrada?.forEach((litros, j) => {
      saldo[j] = (saldo[j] ?? 0) + litros;
    });

    const bx = 55 + i * PASSO_X;
    const gasto = c.consumo.reduce((a, b) => a + b, 0);
    consumoTotal += gasto;

    let empilhado = 0;
    lotesDeDaime.forEach((lote, j) => {
      const restante = +((saldo[j] ?? 0) - (c.consumo[j] ?? 0)).toFixed(1);
      if (restante > 0.05) {
        solidos.push({
          chave: `${c.data}-${j}`,
          x: bx,
          w: LARGURA_BARRA,
          y: +(BASE - (empilhado + restante) * ESCALA).toFixed(1),
          h: +(restante * ESCALA).toFixed(1),
          fill: lote.cor,
        });
      }
      empilhado += Math.max(restante, 0);
    });

    const topoSolido = empilhado;
    let topoConsumo = empilhado;
    lotesDeDaime.forEach((lote, j) => {
      const gastoDoLote = c.consumo[j] ?? 0;
      if (gastoDoLote > 0.05) {
        consumos.push({
          chave: `${c.data}-${j}`,
          x: bx,
          w: LARGURA_BARRA,
          y: +(BASE - (topoConsumo + gastoDoLote) * ESCALA).toFixed(1),
          h: +(gastoDoLote * ESCALA).toFixed(1),
          fill: `url(#hachura-${j})`,
          stroke: lote.cor,
        });
        topoConsumo += gastoDoLote;
      }
    });

    rotulos.push({
      chave: c.data,
      cx: bx + LARGURA_BARRA / 2,
      data: formatarDiaMes(c.data),
      nome: c.nome,
      total: formatarLitros(topoSolido),
      totalY: +(BASE - topoSolido * ESCALA + 18).toFixed(1),
      consumo: `− ${formatarLitros(gasto)}`,
      consumoY: +(BASE - topoConsumo * ESCALA - 7).toFixed(1),
    });

    c.consumo.forEach((gastoDoLote, j) => {
      saldo[j] = +((saldo[j] ?? 0) - gastoDoLote).toFixed(1);
    });
  });

  const totalAtual = saldo.reduce((a, b) => a + b, 0);
  const media = consumoTotal / cerimoniasPassadas.length;

  return {
    solidos,
    consumos,
    rotulos,
    totalAtual,
    media,
    cobertura: Math.floor(totalAtual / media),
    legenda: lotesDeDaime.map((lote, j) => ({
      nome: lote.nome,
      cor: lote.cor,
      saldo: (saldo[j] ?? 0) > 0.05 ? `${formatarLitros(saldo[j] ?? 0)} L` : 'esgotado',
    })),
  };
}
