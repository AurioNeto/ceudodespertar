/** Formatação pt-BR / BRL — Doc 1 §5.7: sem i18n, moeda e fuso fixos. */

const BRL = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const INTEIRO = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const UM_DECIMAL = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Valor em reais → "1.234,56". */
export const formatarValor = (reais: number): string => BRL.format(reais);

/** Centavos (Dinheiro) → "1.234,56". */
export const formatarDinheiro = (centavos: number): string => BRL.format(centavos / 100);

/** Centavos → "R$ 1.234,56". */
export const formatarBRL = (centavos: number): string => `R$ ${formatarDinheiro(centavos)}`;

export const formatarInteiro = (n: number): string => INTEIRO.format(n);

/** Litros de daime — uma casa decimal em toda a tela de estoque. */
export const formatarLitros = (litros: number): string => UM_DECIMAL.format(litros);

const MESES = [
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

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'] as const;

/** `YYYY-MM-DD` → data local sem escorregar de fuso. */
export function paraData(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano ?? 1970, (mes ?? 1) - 1, dia ?? 1);
}

/** `YYYY-MM-DD` → "05/09". */
export function formatarDiaMes(iso: string): string {
  const d = paraData(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** `YYYY-MM-DD` → "05/09/2026". */
export function formatarData(iso: string): string {
  return `${formatarDiaMes(iso)}/${paraData(iso).getFullYear()}`;
}

/** `YYYY-MM-DD` → "sexta". */
export const diaDaSemana = (iso: string): string => DIAS[paraData(iso).getDay()] ?? '';

/** `YYYY-MM` → "08/2026". */
export function formatarCompetencia(comp: string): string {
  const [ano, mes] = comp.split('-');
  return `${mes}/${ano}`;
}

/** `YYYY-MM` → "agosto de 2026". */
export function competenciaPorExtenso(comp: string): string {
  const [ano, mes] = comp.split('-');
  return `${MESES[Number(mes) - 1] ?? ''} de ${ano}`;
}

export const nomeDoMes = (mesZeroBase: number): string => MESES[mesZeroBase] ?? '';

/** Plural simples: `pluralizar(1, 'lançamento')` → "1 lançamento". */
export const pluralizar = (n: number, singular: string, plural = `${singular}s`): string =>
  `${formatarInteiro(n)} ${n === 1 ? singular : plural}`;

/** Iniciais para avatar sem foto. */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : '';
  return (primeira + ultima).toUpperCase();
}
