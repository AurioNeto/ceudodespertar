export const COLUNAS_DAS_COMPRAS = [
  { key: 'data', label: 'Data' },
  { key: 'compra', label: 'Compra' },
  { key: 'grupo', label: 'Grupo' },
  { key: 'quem', label: 'Quem registrou' },
  { key: 'valor', label: 'Valor', numeric: true },
] as const;

export const COLUNAS_SO_DO_ESCRITORIO: ReadonlySet<string> = new Set(['grupo', 'quem']);
