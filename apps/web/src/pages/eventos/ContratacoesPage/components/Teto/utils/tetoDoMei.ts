export function tetoDoMei(
  { faturamentoNoAno, tetoAnual }: { faturamentoNoAno: number; tetoAnual: number },
  aReceber: number,
) {
  const atual = faturamentoNoAno / tetoAnual;
  const projetado = (faturamentoNoAno + aReceber) / tetoAnual;
  return { atual, projetado };
}
