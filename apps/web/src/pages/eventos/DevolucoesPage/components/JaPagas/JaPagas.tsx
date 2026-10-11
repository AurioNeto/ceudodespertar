import { Cartao, Icon, Rotulo, type Density } from '@/ds';
import { formatarBRL } from '@/pages/utils/formato';
import type { Paga } from '../../tipos';

export interface JaPagasProps {
  lista: readonly Paga[];
  densidade: Density;
}

export function JaPagas({ lista, densidade }: JaPagasProps) {
  const campo = densidade === 'field';
  return (
    <Cartao campo={campo} style={{ gap: 10 }}>
      <Rotulo>Já devolvidas</Rotulo>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {lista.map((x, i) => (
          <div
            key={x.id}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px 12px',
              alignItems: 'baseline',
              padding: '9px 0',
              borderTop: i === 0 ? undefined : '1px solid var(--color-line)',
            }}
          >
            <Icon name="circle-check" size={15} color="var(--color-confirmed)" />
            <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)', flex: 1, minWidth: 140 }}>
              {x.nome}
            </span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', flex: 1, minWidth: 160 }}>
              {x.evento} · {x.pagaEm} · {x.conta}
            </span>
            <code style={{ font: 'var(--text-code)' }}>{x.estorno}</code>
            <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
              {formatarBRL(x.valor)}
            </span>
          </div>
        ))}
      </div>
    </Cartao>
  );
}
