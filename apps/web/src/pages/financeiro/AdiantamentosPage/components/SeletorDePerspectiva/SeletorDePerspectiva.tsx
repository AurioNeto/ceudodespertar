import { Rotulo, type Density } from '@/ds';
import { perspectivas, type Perspectiva } from '../../mocks/adiantamentos';

export interface SeletorDePerspectivaProps {
  atual: Perspectiva;
  onTrocar: (chave: string) => void;
  densidade: Density;
}

export function SeletorDePerspectiva({ atual, onTrocar, densidade }: SeletorDePerspectivaProps) {
  const campo = densidade === 'field';
  return (
    <div
      style={{
        border: '1px dashed var(--color-line-gold)',
        borderRadius: 'var(--radius)',
        padding: campo ? '12px 14px' : '13px 16px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 200, flex: 1 }}>
        <Rotulo>Protótipo · ver como</Rotulo>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          {atual.notaDoVinculo ?? 'Sem vínculo de autoridade no cadastro de pessoas.'}
        </span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          Vale só nesta tela — o menu continua o do seu usuário. Sai com o backend.
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {perspectivas.map((p) => {
          const on = p.chave === atual.chave;
          return (
            <button
              key={p.chave}
              type="button"
              aria-pressed={on}
              onClick={() => onTrocar(p.chave)}
              style={{
                padding: '7px 12px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                border: `1px solid ${on ? 'var(--color-royal-border)' : 'var(--color-line)'}`,
                background: on ? 'var(--color-royal-soft)' : 'var(--bg-card)',
                color: on ? 'var(--color-royal-deep)' : 'var(--text-secondary)',
                font: on ? 'var(--text-body-strong)' : 'var(--text-body)',
                textAlign: 'left',
              }}
            >
              {p.nome}
              <span style={{ display: 'block', font: 'var(--text-small)', color: 'var(--text-meta)' }}>{p.grupo}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
