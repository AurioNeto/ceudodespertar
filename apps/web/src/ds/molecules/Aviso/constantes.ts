export const TONS_DO_AVISO = {
  atencao: {
    fundo: 'var(--color-attention-soft)',
    borda: 'var(--color-attention-border)',
    tinta: 'var(--color-attention)',
    icone: 'triangle-alert',
  },
  pendente: {
    fundo: 'var(--color-pending-soft)',
    borda: 'var(--color-pending-border)',
    tinta: 'var(--color-pending)',
    icone: 'circle-alert',
  },
  confirmado: {
    fundo: 'var(--color-confirmed-soft)',
    borda: 'var(--color-confirmed-border)',
    tinta: 'var(--color-confirmed)',
    icone: 'circle-check',
  },
  informacao: {
    fundo: 'var(--color-royal-soft)',
    borda: 'var(--color-royal-border)',
    tinta: 'var(--color-royal)',
    icone: 'circle-alert',
  },
  neutro: {
    fundo: 'var(--bg-sunken)',
    borda: 'var(--color-line)',
    tinta: 'var(--text-secondary)',
    icone: 'circle-alert',
  },
} as const satisfies Record<string, { fundo: string; borda: string; tinta: string; icone: string }>;
