export const COLUNAS_DAS_DEVOLUCOES = [
  { key: 'data', label: 'Data' },
  { key: 'conta', label: 'Conta' },
  { key: 'quem', label: 'Quem registrou' },
  { key: 'valor', label: 'Valor', numeric: true },
] as const;

export const COLUNAS_SO_DO_ESCRITORIO: ReadonlySet<string> = new Set(['quem']);
