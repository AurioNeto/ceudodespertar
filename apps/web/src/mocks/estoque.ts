/** Lotes de daime — a ordem é a das colunas empilhadas do gráfico do Painel. */
export interface LoteDoGrafico {
  readonly nome: string;
  readonly cor: string;
  /** Saldo do lote antes da primeira cerimônia da série. */
  readonly saldoInicial: number;
}

export const lotesDeDaime: readonly LoteDoGrafico[] = [
  { nome: 'Feitio set/25', cor: 'var(--color-royal-deep)', saldoInicial: 28.0 },
  { nome: 'Feitio fev/26', cor: 'var(--color-royal)', saldoInicial: 62.0 },
  { nome: 'Feitio jul/26', cor: 'var(--color-pending)', saldoInicial: 0 },
];

export const feitioRecente = { data: '12/07', litros: 60.0, apos: 3 } as const;

export const conferidoEm = '2026-08-24';
