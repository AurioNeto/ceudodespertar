/** Formatação pt-BR / BRL — Doc 1 §5.7: sem i18n, moeda e fuso fixos. */

const BRL = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Valor em reais → "1.234,56". */
export const formatarValor = (reais: number): string => BRL.format(reais);

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'] as const;

/** `YYYY-MM-DD` → data local sem escorregar de fuso. */
export function paraData(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano ?? 1970, (mes ?? 1) - 1, dia ?? 1);
}

/** `YYYY-MM-DD` → "sexta". */
export const diaDaSemana = (iso: string): string => DIAS[paraData(iso).getDay()] ?? '';

/** Iniciais para avatar sem foto. */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter((parte) => /^\p{L}/u.test(parte));
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : '';
  return (primeira + ultima).toUpperCase();
}

const FUSO_DA_CASA = 'America/Sao_Paulo';
const DATA_E_HORA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO_DA_CASA,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function formatarDataHora(iso: string): string {
  const partes = Object.fromEntries(DATA_E_HORA.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${partes['day']}/${partes['month']}/${partes['year']} ${partes['hour']}:${partes['minute']}`;
}
