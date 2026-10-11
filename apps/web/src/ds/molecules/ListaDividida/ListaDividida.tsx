import type { Key, ReactNode } from 'react';

export interface ListaDivididaProps<T> {
  itens: readonly T[];
  chave: (item: T) => Key;
  children: (item: T) => ReactNode;
  alinhamento?: 'base' | 'centro';
  esmaecido?: (item: T) => boolean;
}

export function ListaDividida<T>({ itens, chave, children, alinhamento = 'base', esmaecido }: ListaDivididaProps<T>) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {itens.map((item, posicao) => (
        <div
          key={chave(item)}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px 12px',
            alignItems: alinhamento === 'base' ? 'baseline' : 'center',
            padding: '9px 0',
            borderTop: posicao === 0 ? undefined : '1px solid var(--color-line)',
            opacity: esmaecido?.(item) ? 0.6 : undefined,
          }}
        >
          {children(item)}
        </div>
      ))}
    </div>
  );
}
