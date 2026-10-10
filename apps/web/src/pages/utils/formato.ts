import { formatarValor, paraData } from '@/lib/formato';

const INTEIRO = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const UM_DECIMAL = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatarDinheiro = (centavos: number): string => formatarValor(centavos / 100);

export const formatarBRL = (centavos: number): string => `R$ ${formatarDinheiro(centavos)}`;

export const formatarInteiro = (n: number): string => INTEIRO.format(n);

export const formatarLitros = (litros: number): string => UM_DECIMAL.format(litros);

export const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

export function formatarDiaMes(iso: string): string {
  const d = paraData(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatarData(iso: string): string {
  return `${formatarDiaMes(iso)}/${paraData(iso).getFullYear()}`;
}

export function formatarCompetencia(comp: string): string {
  const [ano, mes] = comp.split('-');
  return `${mes}/${ano}`;
}

export function competenciaPorExtenso(comp: string): string {
  const [ano, mes] = comp.split('-');
  return `${MESES[Number(mes) - 1] ?? ''} de ${ano}`;
}

export const pluralizar = (n: number, singular: string, plural = `${singular}s`): string =>
  `${formatarInteiro(n)} ${n === 1 ? singular : plural}`;
