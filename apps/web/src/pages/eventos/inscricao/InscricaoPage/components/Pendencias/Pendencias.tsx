import { Button, Icon, type Density } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import type { Pendencia } from '../../tipos';

export interface PendenciasProps {
  lista: readonly Pendencia[];
  densidade: Density;
}

export function Pendencias({ lista, densidade }: PendenciasProps) {
  const campo = densidade === 'field';
  return (
    <div
      style={{
        background: 'var(--color-attention-soft)',
        border: '1px solid var(--color-attention-border)',
        borderLeft: 'var(--edge-state) solid var(--color-attention)',
        borderRadius: '0 var(--radius) var(--radius) 0',
        padding: campo ? '14px 15px' : '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 13,
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Icon name="triangle-alert" size={19} color="var(--color-attention)" />
        <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>
          {pluralizar(lista.length, 'pendência')} para confirmar
        </span>
      </div>

      {lista.map((p) => (
        <div
          key={p.chave}
          style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--color-line)', paddingTop: 11 }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 9px', alignItems: 'baseline' }}>
            <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{p.titulo}</span>
            <code style={{ font: 'var(--text-code)' }}>{p.invariante}</code>
          </div>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '72ch' }}>
            {p.detalhe}
          </span>
          {p.acao ? (
            <span>
              <Button variant="ghost" iconName="check" onClick={p.acao.ao}>
                {p.acao.rotulo}
              </Button>
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
