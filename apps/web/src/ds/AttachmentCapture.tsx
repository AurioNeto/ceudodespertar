import type { CSSProperties } from 'react';
import { Icon } from './Icon';
import type { Density } from './Button';

export interface AttachmentCaptureProps {
  label?: string;
  filename?: string | null;
  onCapture?: () => void;
  onRemove?: () => void;
  density?: Density;
  style?: CSSProperties;
}

export function AttachmentCapture({
  label = 'Comprovante',
  filename,
  onCapture,
  onRemove,
  density = 'field',
  style,
}: AttachmentCaptureProps) {
  const alvo = density === 'field' ? 'var(--target-field)' : 'var(--target-office)';

  if (filename) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'var(--color-royal-soft)',
          border: '1px solid var(--color-royal-border)',
          borderRadius: 'var(--radius)',
          padding: '10px 10px 10px 14px',
          minHeight: alvo,
          ...style,
        }}
      >
        <Icon name="paperclip" size={17} color="var(--color-royal)" />
        <span
          style={{
            flex: 1,
            minWidth: 0,
            font: 'var(--text-body-strong)',
            color: 'var(--color-royal-ink)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {filename}
        </span>
        <button
          type="button"
          onClick={onRemove}
          title="Remover comprovante"
          style={{
            minWidth: 'var(--tap-min)',
            minHeight: 'var(--tap-min)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-meta)',
          }}
        >
          <Icon name="x" size={17} />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onCapture}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        textAlign: 'left',
        minHeight: alvo,
        background: 'var(--bg-card)',
        border: '1px dashed var(--color-line-strong)',
        borderRadius: 'var(--radius)',
        padding: '0 14px',
        cursor: 'pointer',
        ...style,
      }}
    >
      <Icon name="camera" size={20} color="var(--color-royal)" />
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
          {label}
        </span>
        <span style={{ display: 'block', font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          Um toque, direto da câmera. Nunca obrigatório.
        </span>
      </span>
    </button>
  );
}
