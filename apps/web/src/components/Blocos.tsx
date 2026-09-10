import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '../ds';

/**
 * Peças pequenas que mais de uma tela financeira usa: o rótulo em caixa alta,
 * o número com rótulo, a célula de tabela e a faixa de recado depois de uma
 * ação. Nasceram em `F-09` e vieram para cá quando `F-10` pediu as mesmas.
 */

export const rotuloCaixaAlta: CSSProperties = {
  font: 'var(--text-label)',
  letterSpacing: 'var(--tracking-label)',
  textTransform: 'uppercase',
  color: 'var(--text-field-label)',
};

export function Rotulo({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <span style={{ ...rotuloCaixaAlta, ...style }}>{children}</span>;
}

export interface NumeroProps {
  rotulo: string;
  valor: string;
  nota?: string;
  /** Destaque para o número que a tela quer que se leia primeiro. */
  destaque?: boolean;
  cor?: string;
}

export function Numero({ rotulo, valor, nota, destaque = false, cor }: NumeroProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <Rotulo>{rotulo}</Rotulo>
      <span
        data-numeric
        style={{
          font: destaque ? 'var(--text-amount-lg)' : 'var(--text-amount)',
          color: cor ?? (destaque ? 'var(--color-royal-deep)' : 'var(--text-primary)'),
        }}
      >
        {valor}
      </span>
      {nota ? <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{nota}</span> : null}
    </div>
  );
}

export function Th({ children, alinharDireita = false }: { children?: ReactNode; alinharDireita?: boolean }) {
  return (
    <th
      style={{
        ...rotuloCaixaAlta,
        textAlign: alinharDireita ? 'right' : 'left',
        padding: '9px 13px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </th>
  );
}

export function Td({ children, alinharDireita = false }: { children?: ReactNode; alinharDireita?: boolean }) {
  return (
    <td
      style={{
        padding: '11px 13px',
        textAlign: alinharDireita ? 'right' : 'left',
        color: 'var(--text-secondary)',
        verticalAlign: 'top',
      }}
    >
      {children}
    </td>
  );
}

/** Confirmação do que acabou de acontecer, dispensável. */
export function Recado({ texto, onFechar }: { texto: string; onFechar: () => void }) {
  return (
    <div
      role="status"
      style={{
        background: 'var(--color-confirmed-soft)',
        border: '1px solid var(--color-confirmed-border)',
        borderRadius: 'var(--radius)',
        padding: '12px 15px',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
      }}
    >
      <Icon name="circle-check" size={17} color="var(--color-confirmed)" style={{ marginTop: 1 }} />
      <span style={{ flex: 1, font: 'var(--text-small)', color: 'var(--text-primary)' }}>{texto}</span>
      <button
        type="button"
        onClick={onFechar}
        aria-label="fechar recado"
        style={{ color: 'var(--text-meta)', cursor: 'pointer', lineHeight: 1 }}
      >
        ×
      </button>
    </div>
  );
}

/** Cartão branco com fio, que é o contêiner padrão das telas financeiras. */
export function Cartao({
  children,
  campo = false,
  style,
}: {
  children: ReactNode;
  campo?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius)',
        padding: campo ? '15px 16px' : '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        minWidth: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Barra de proporção com uma escala só: quanto do principal já voltou. */
export function BarraDeProporcao({
  parte,
  total,
  cor = 'var(--color-confirmed)',
}: {
  parte: number;
  total: number;
  cor?: string;
}) {
  const fracao = total > 0 ? Math.min(1, Math.max(0, parte / total)) : 0;
  return (
    <div
      role="img"
      aria-label={`${Math.round(fracao * 100)}% do total`}
      style={{ height: 8, borderRadius: 'var(--radius-pill)', background: 'var(--bg-sunken)', overflow: 'hidden' }}
    >
      <div style={{ width: `${fracao * 100}%`, height: '100%', background: cor, transition: 'width var(--motion)' }} />
    </div>
  );
}
