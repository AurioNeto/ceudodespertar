import type { CSSProperties } from 'react';
import { BotaoDeIcone } from '../../atoms/BotaoDeIcone';
import { Icon } from '../../atoms/Icon';
import type { Density } from '../../fundacao/densidade';
import { vidroLeve } from '../../fundacao/estilos';

export interface AttachmentCaptureProps {
  label: string;
  hint: string;
  removeLabel: string;
  filename?: string | null;
  onCapture?: () => void;
  onRemove?: () => void;
  density?: Density;
  style?: CSSProperties;
}

export function AttachmentCapture({
  label,
  hint,
  removeLabel,
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
          ...vidroLeve,
          border: '1px solid var(--color-royal-border)',
          borderRadius: 'var(--leaf-sm)',
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
        <BotaoDeIcone icone="x" tamanhoDoIcone={17} onClick={onRemove} title={removeLabel} />
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
        background: 'var(--bg-glass)',
        backdropFilter: 'var(--glass)',
        WebkitBackdropFilter: 'var(--glass)',
        border: '1px dashed var(--color-line-strong)',
        borderRadius: 'var(--leaf-sm)',
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
          {hint}
        </span>
      </span>
    </button>
  );
}
