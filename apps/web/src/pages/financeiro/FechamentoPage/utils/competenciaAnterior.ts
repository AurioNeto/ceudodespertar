export function competenciaAnteriorA(competencia: string): string {
  const ano = Number(competencia.slice(0, 4));
  const mes = Number(competencia.slice(5, 7));
  const meses = ano * 12 + (mes - 1) - 1;
  return `${Math.floor(meses / 12)}-${String((meses % 12) + 1).padStart(2, '0')}`;
}
