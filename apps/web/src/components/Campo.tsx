import { useId } from 'react';
import type { ReactNode } from 'react';
import type { SheetOption } from '../ds';

const rotulo = {
  font: 'var(--text-label)',
  letterSpacing: 'var(--tracking-label)',
  textTransform: 'uppercase',
  color: 'var(--text-field-label)',
  marginBottom: 7,
} as const;

export function RotuloDeCampo({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} style={rotulo}>
      {children}
    </label>
  );
}

export interface SelectProps {
  label: string;
  value: string;
  options: readonly SheetOption[];
  onChange: (value: string) => void;
  hint?: string;
  erro?: boolean;
}

/** Select de formulário tradicional — a classificação deixou de ser cards. */
export function Select({ label, value, options, onChange, hint, erro = false }: SelectProps) {
  const id = useId();
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <RotuloDeCampo htmlFor={id}>{label}</RotuloDeCampo>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          minHeight: 'var(--target-office)',
          border: `1px solid ${erro ? 'var(--color-attention)' : 'var(--color-line-strong)'}`,
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius)',
          padding: '10px 13px',
          font: 'var(--text-body)',
          color: 'var(--text-primary)',
          outline: 'none',
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint ? (
        <span style={{ marginTop: 7, font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{hint}</span>
      ) : null}
    </div>
  );
}

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

export function Interruptor({
  ligado,
  onAlternar,
  rotuloAcessivel,
}: {
  ligado: boolean;
  onAlternar: () => void;
  rotuloAcessivel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotuloAcessivel}
      onClick={onAlternar}
      style={{
        width: 52,
        height: 30,
        flex: '0 0 auto',
        borderRadius: 'var(--radius-pill)',
        cursor: 'pointer',
        padding: 3,
        display: 'flex',
        justifyContent: ligado ? 'flex-end' : 'flex-start',
        background: ligado ? 'var(--color-royal)' : 'var(--color-line-strong)',
        transition: 'background var(--motion-fast)',
      }}
    >
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: 'var(--bg-card)',
          boxShadow: 'var(--shadow-raised)',
          display: 'block',
        }}
      />
    </button>
  );
}

export interface SeletorDeTipoProps<T extends string> {
  opcoes: readonly { valor: T; label: string }[];
  valor: T;
  onEscolher: (valor: T) => void;
  densidade?: 'office' | 'field';
}

export function SeletorDeTipo<T extends string>({
  opcoes,
  valor,
  onEscolher,
  densidade = 'office',
}: SeletorDeTipoProps<T>) {
  const campo = densidade === 'field';
  return (
    <div style={{ display: 'flex', gap: campo ? 6 : 8, flexWrap: campo ? 'nowrap' : 'wrap' }}>
      {opcoes.map((o) => {
        const on = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            aria-pressed={on}
            onClick={() => onEscolher(o.valor)}
            style={{
              font: campo ? 'var(--text-small)' : on ? 'var(--text-body-strong)' : 'var(--text-body)',
              fontWeight: on ? 600 : undefined,
              padding: campo ? '10px 6px' : '9px 14px',
              minHeight: campo ? 'var(--target-field)' : 40,
              flex: campo ? 1 : undefined,
              textAlign: 'center',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              border: `1px solid ${on ? 'var(--color-royal-border)' : 'var(--color-line)'}`,
              background: on ? 'var(--color-royal-soft)' : 'var(--bg-card)',
              color: on ? 'var(--color-royal-deep)' : 'var(--text-secondary)',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
