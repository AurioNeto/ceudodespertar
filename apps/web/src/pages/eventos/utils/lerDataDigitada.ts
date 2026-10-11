const FORMATO_DD_MM_AAAA = /^(\d{2})\/(\d{2})\/(\d{4})$/;

export interface DataDigitada {
  dia: number;
  mes: number;
  ano: number;
}

export function lerDataDigitada(texto: string): DataDigitada | null {
  const achado = FORMATO_DD_MM_AAAA.exec(texto);
  if (!achado) return null;
  const dia = Number(achado[1]);
  const mes = Number(achado[2]);
  const ano = Number(achado[3]);
  const conferida = new Date(0);
  conferida.setUTCFullYear(ano, mes - 1, dia);
  const existe =
    conferida.getUTCFullYear() === ano && conferida.getUTCMonth() === mes - 1 && conferida.getUTCDate() === dia;
  return existe ? { dia, mes, ano } : null;
}
