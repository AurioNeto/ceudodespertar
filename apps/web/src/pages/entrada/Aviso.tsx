import type { ReactNode } from 'react';
import { Icon, type IconName } from '../../ds';

export type TomDeAviso = 'atencao' | 'pendente' | 'confirmado' | 'neutro';

const TONS: Record<TomDeAviso, { fundo: string; borda: string; tinta: string; icone: IconName }> = {
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
  neutro: {
    fundo: 'var(--bg-sunken)',
    borda: 'var(--color-line)',
    tinta: 'var(--text-secondary)',
    icone: 'circle-alert',
  },
};

export interface AvisoProps {
  tom: TomDeAviso;
  titulo: string;
  children?: ReactNode;
  /** Ação que resolve o aviso — o convite pendente vira "definir senha". */
  acao?: ReactNode;
}

/** Faixa de recado das telas de entrada: o que houve, e qual é a saída. */
export function Aviso({ tom, titulo, children, acao }: AvisoProps) {
  const t = TONS[tom];
  return (
    <div
      role="alert"
      style={{
        background: t.fundo,
        border: `1px solid ${t.borda}`,
        borderRadius: 'var(--radius)',
        padding: '13px 15px',
        display: 'flex',
        gap: 11,
      }}
    >
      <Icon name={t.icone} size={18} color={t.tinta} style={{ marginTop: 1, flex: '0 0 auto' }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{titulo}</div>
        {children ? (
          <p style={{ marginTop: 4, font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{children}</p>
        ) : null}
        {acao ? <div style={{ marginTop: 11 }}>{acao}</div> : null}
      </div>
    </div>
  );
}
