export const TONES = {
  pending: { bg: 'var(--color-pending-soft)', fg: 'var(--color-pending)' },
  confirmed: { bg: 'var(--color-confirmed-soft)', fg: 'var(--color-confirmed)' },
  attention: { bg: 'var(--color-attention-soft)', fg: 'var(--color-attention)' },
  neutral: { bg: 'var(--color-neutral-soft)', fg: 'var(--color-neutral)' },
  suggest: { bg: 'var(--color-suggest-soft)', fg: 'var(--color-suggest)' },
  royal: { bg: 'var(--color-royal-soft)', fg: 'var(--color-royal-ink)' },
} satisfies Record<string, { bg: string; fg: string }>;
