const FORMATO_D_M_AAAA = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const PRIMEIRO_ANO_ACEITO = 1900;

export interface DataDigitada {
  dia: number;
  mes: number;
  ano: number;
}

export function lerDataDigitada(texto: string): DataDigitada | null {
  const achado = FORMATO_D_M_AAAA.exec(texto.trim());
  if (!achado) return null;
  const dia = Number(achado[1]);
  const mes = Number(achado[2]);
  const ano = Number(achado[3]);
  if (ano < PRIMEIRO_ANO_ACEITO) return null;
  const conferida = new Date(0);
  conferida.setUTCFullYear(ano, mes - 1, dia);
  const existe =
    conferida.getUTCFullYear() === ano && conferida.getUTCMonth() === mes - 1 && conferida.getUTCDate() === dia;
  return existe ? { dia, mes, ano } : null;
}

const doisDigitos = (n: number) => String(n).padStart(2, '0');

export const formatarDataDigitada = ({ dia, mes, ano }: DataDigitada) => `${doisDigitos(dia)}/${doisDigitos(mes)}/${ano}`;
