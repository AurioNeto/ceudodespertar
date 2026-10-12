export const TONES = {
  pending: { bg: 'var(--tone-pending-bg)', fg: 'var(--tone-pending-fg)' },
  confirmed: { bg: 'var(--tone-confirmed-bg)', fg: 'var(--tone-confirmed-fg)' },
  attention: { bg: 'var(--tone-attention-bg)', fg: 'var(--tone-attention-fg)' },
  period: { bg: 'var(--tone-period-bg)', fg: 'var(--tone-period-fg)' },
  neutral: { bg: 'var(--tone-neutral-bg)', fg: 'var(--tone-neutral-fg)' },
  suggest: { bg: 'var(--tone-suggest-bg)', fg: 'var(--tone-suggest-fg)' },
  royal: { bg: 'var(--tone-royal-bg)', fg: 'var(--tone-royal-fg)' },
} satisfies Record<string, { bg: string; fg: string }>;
