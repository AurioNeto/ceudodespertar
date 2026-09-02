import type { CSSProperties, ReactNode } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';

/**
 * Estados de tela. A distinção é deliberada: erro de domínio explica a regra,
 * erro de infraestrutura oferece nova tentativa, e falta de permissão nomeia
 * o grupo e a permissão que falta (Doc 3 §11).
 */

export interface DomainErrorProps {
  rule: string;
  explanation?: string;
  /** O caminho que resta a quem esbarrou na regra. */
  way?: string;
  style?: CSSProperties;
}

export function DomainError({ rule, explanation, way, style }: DomainErrorProps) {
  return (
    <div
      style={{
        background: 'var(--bg-sunken)',
        border: 'var(--border-hairline)',
        borderLeft: 'var(--edge-state) solid var(--color-ink-brand)',
        borderRadius: '0 var(--radius) var(--radius) 0',
        padding: '14px 16px',
        ...style,
      }}
    >
      <div style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{rule}</div>
      {explanation ? (
        <p style={{ marginTop: 5, font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{explanation}</p>
      ) : null}
      {way ? (
        <p style={{ marginTop: 8, font: 'var(--text-small)', color: 'var(--color-royal-ink)' }}>{way}</p>
      ) : null}
    </div>
  );
}

/** A flor da vida aparece em três lugares e só: login, estado vazio e marca d'água. */
export function FlowerOfLife() {
  const centros: readonly [number, number][] = [
    [100, 100],
    [100, 66],
    [100, 134],
    [129, 83],
    [129, 117],
    [71, 83],
    [71, 117],
  ];
  return (
    <svg
      viewBox="0 0 200 200"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06 }}
    >
      <g fill="none" stroke="var(--color-label)" strokeWidth="1.4">
        {centros.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={34} />
        ))}
      </g>
    </svg>
  );
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  style?: CSSProperties;
}

export function EmptyState({ title, description, action, style }: EmptyStateProps) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '44px 24px',
        background: 'var(--bg-card)',
        border: '1px dashed var(--color-line-gold)',
        borderRadius: 'var(--radius-lg)',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      <FlowerOfLife />
      <h3 style={{ position: 'relative', font: '700 18px var(--font-display)', color: 'var(--text-title)' }}>
        {title}
      </h3>
      {description ? (
        <p
          style={{
            position: 'relative',
            margin: '7px auto 0',
            maxWidth: '34ch',
            font: 'var(--text-small)',
            color: 'var(--text-secondary)',
          }}
        >
          {description}
        </p>
      ) : null}
      {action ? <div style={{ position: 'relative', marginTop: 16 }}>{action}</div> : null}
    </div>
  );
}

export interface InfraErrorProps {
  title?: string;
  description: string;
  onRetry?: () => void;
  style?: CSSProperties;
}

export function InfraError({ title = 'Não deu para carregar', description, onRetry, style }: InfraErrorProps) {
  return (
    <div
      style={{
        background: 'var(--color-pending-soft)',
        border: '1px solid var(--color-pending-border)',
        borderRadius: 'var(--radius)',
        padding: '15px 16px',
        display: 'flex',
        gap: 13,
        ...style,
      }}
    >
      <Icon name="wifi-off" size={19} color="var(--color-pending)" style={{ marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <div style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{title}</div>
        <p style={{ marginTop: 5, font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{description}</p>
        {onRetry ? (
          <div style={{ marginTop: 11 }}>
            <Button variant="quiet" iconName="rotate-cw" onClick={onRetry}>
              Tentar de novo
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export interface PermissionDeniedProps {
  screen: string;
  group: string;
  missing: string;
  whoToAsk?: string;
  style?: CSSProperties;
}

export function PermissionDenied({
  screen,
  group,
  missing,
  whoToAsk = 'o administrador',
  style,
}: PermissionDeniedProps) {
  return (
    <div
      style={{
        background: 'var(--color-attention-soft)',
        border: '1px solid var(--color-attention-border)',
        borderRadius: 'var(--radius)',
        padding: '17px 18px',
        display: 'flex',
        gap: 13,
        ...style,
      }}
    >
      <Icon name="ban" size={20} color="var(--color-attention)" style={{ marginTop: 2 }} />
      <div>
        <div style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>Você não tem acesso a {screen}</div>
        <p style={{ marginTop: 7, font: 'var(--text-body)', color: 'var(--text-secondary)', maxWidth: '58ch' }}>
          Seu grupo é <b>{group}</b>. Falta a permissão <code>{missing}</code>. Se você precisa desse acesso, fale com{' '}
          {whoToAsk}.
        </p>
      </div>
    </div>
  );
}

function Bar({ w, h = 11, top = 0 }: { w: string; h?: number; top?: number }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        marginTop: top,
        borderRadius: 'var(--radius-sm)',
        background: 'linear-gradient(90deg,var(--bg-sunken) 25%,#EAE3D3 37%,var(--bg-sunken) 63%)',
        backgroundSize: '400% 100%',
        animation: 'cdd-sh 1.3s ease infinite',
      }}
    />
  );
}

const LARGURAS = ['58%', '44%', '66%', '38%'] as const;
const LARGURAS_META = ['32%', '26%', '30%', '22%'] as const;

export function SkeletonList({ rows = 4, style }: { rows?: number; style?: CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, ...style }}>
      <style>{'@keyframes cdd-sh{0%{background-position:100% 0}100%{background-position:0 0}}'}</style>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          style={{
            background: 'var(--bg-card)',
            border: 'var(--border-hairline)',
            borderRadius: 'var(--radius)',
            padding: '15px 16px',
          }}
        >
          <Bar w={LARGURAS[i % 4] ?? '50%'} />
          <Bar w={LARGURAS_META[i % 4] ?? '30%'} h={9} top={10} />
        </div>
      ))}
    </div>
  );
}
