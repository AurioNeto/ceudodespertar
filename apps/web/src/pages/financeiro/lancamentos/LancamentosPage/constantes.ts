export const POR_PAGINA = 8;

export const FILTRO_INICIAL = {
  periodo: '2026-08',
  tipo: 'todos',
  grupo: 'todos',
  status: 'todos',
  busca: '',
} as const;

export const OPCOES_PERIODO = [
  { value: '2026-08', label: 'Agosto 2026' },
  { value: '2026-07', label: 'Julho 2026' },
  { value: 'todos', label: 'Todo o histórico' },
];

export const OPCOES_TIPO = [
  { value: 'todos', label: 'Todos' },
  { value: 'SAIDA', label: 'Saída' },
  { value: 'ENTRADA', label: 'Entrada' },
  { value: 'TRANSFERENCIA', label: 'Transferência' },
];

export const OPCOES_STATUS = [
  { value: 'todos', label: 'Todas' },
  { value: 'A_CONFERIR', label: 'A conferir' },
  { value: 'CONFIRMADO', label: 'Consolidado' },
  { value: 'ESTORNADO', label: 'Estornado' },
];

const GRUPOS = ['Lojinha', 'Dormitório', 'Chácara (Infraestrutura)', 'CDD', 'Cozinha', 'Secretaria'];
export const OPCOES_GRUPO = [{ value: 'todos', label: 'Todos os grupos' }, ...GRUPOS.map((g) => ({ value: g, label: g }))];

export const CHIPS_TIPO = [
  { value: 'todos', label: 'Todos' },
  { value: 'SAIDA', label: 'Saída' },
  { value: 'ENTRADA', label: 'Entrada' },
  { value: 'TRANSFERENCIA', label: 'Transf.' },
];

export const rotuloLabel = {
  font: 'var(--text-label)',
  textTransform: 'uppercase',
  letterSpacing: 'var(--tracking-label)',
  color: 'var(--text-field-label)',
} as const;

export const valorTabular = {
  font: 'var(--text-amount)',
  letterSpacing: 'var(--tracking-amount)',
  fontVariantNumeric: 'tabular-nums',
} as const;
