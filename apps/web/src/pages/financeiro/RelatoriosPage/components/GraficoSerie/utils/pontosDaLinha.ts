export const pontosDaLinha = (acumulados: readonly number[], quantidadeDePontos: number, escala: number) =>
  acumulados
    .map((v, i) => `${(((i + 0.5) / quantidadeDePontos) * 100).toFixed(2)},${(50 - (v / escala) * 50).toFixed(2)}`)
    .join(' ');
