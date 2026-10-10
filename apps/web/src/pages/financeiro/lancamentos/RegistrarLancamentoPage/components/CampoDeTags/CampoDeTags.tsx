import type { SheetOption } from '@/ds';
import { RotuloDeCampo } from '@/ds';

export interface CampoDeTagsProps {
  label: string;
  escolhidas: readonly string[];
  disponiveis: readonly SheetOption[];
  onAdicionar: (valor: string) => void;
  onRemover: (valor: string) => void;
  vazio?: string;
}

/** Categoria: várias por lançamento, com as existentes clicáveis. */
export function CampoDeTags({
  label,
  escolhidas,
  disponiveis,
  onAdicionar,
  onRemover,
  vazio = 'nenhuma escolhida',
}: CampoDeTagsProps) {
  const restantes = disponiveis.filter((o) => !escolhidas.includes(o.value));

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <RotuloDeCampo>{label}</RotuloDeCampo>
      <div
        style={{
          minHeight: 'var(--target-office)',
          border: '1px solid var(--color-line-strong)',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius)',
          padding: '8px 10px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 7,
          alignItems: 'center',
        }}
      >
        {escolhidas.map((c) => (
          <span
            key={c}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--color-royal-soft)',
              border: '1px solid var(--color-royal-border)',
              color: 'var(--color-royal-deep)',
              borderRadius: 'var(--radius-pill)',
              padding: '4px 6px 4px 12px',
              font: 'var(--text-body)',
            }}
          >
            {c}
            <button
              type="button"
              aria-label={`remover categoria ${c}`}
              onClick={() => onRemover(c)}
              style={{
                color: 'var(--color-royal-deep)',
                cursor: 'pointer',
                font: 'var(--text-body-strong)',
                lineHeight: 1,
                padding: '2px 5px',
              }}
            >
              ×
            </button>
          </span>
        ))}
        {escolhidas.length === 0 ? (
          <span style={{ font: 'var(--text-body)', color: 'var(--text-meta)', padding: '4px 3px' }}>{vazio}</span>
        ) : null}
      </div>

      {restantes.length ? (
        <div style={{ marginTop: 9, display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>Existentes:</span>
          {restantes.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onAdicionar(o.value)}
              style={{
                border: '1px dashed var(--color-line-strong)',
                background: 'var(--bg-card)',
                color: 'var(--text-secondary)',
                borderRadius: 'var(--radius-pill)',
                padding: '5px 12px',
                font: 'var(--text-small)',
                cursor: 'pointer',
              }}
            >
              + {o.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
