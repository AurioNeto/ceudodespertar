import type { ReactNode } from 'react';
import { FlowerOfLife } from '../../atoms/FlowerOfLife';
import { Marca } from '../../atoms/Marca';
import { useDensidade } from '../../fundacao/useDensidade';

export interface PortaoProps {
  titulo: string;
  descricao?: string;
  children: ReactNode;
}

export function Portao({ titulo, descricao, children }: PortaoProps) {
  const campo = useDensidade() === 'field';

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'grid',
        gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'minmax(0,44%) minmax(0,56%)',
        gridTemplateRows: campo ? 'auto 1fr' : undefined,
        background: 'var(--bg-app)',
      }}
    >
      <LadoDaMarca campo={campo} />

      <div
        style={{
          display: 'flex',
          alignItems: campo ? 'flex-start' : 'center',
          justifyContent: 'center',
          padding: campo ? '22px 18px 40px' : '40px 32px',
          overflow: 'auto',
        }}
      >
        <div style={{ width: '100%', maxWidth: 404 }}>
          <h1 style={{ font: 'var(--text-display)', color: 'var(--text-title)' }}>{titulo}</h1>
          {descricao ? (
            <p
              style={{
                marginTop: 9,
                font: 'var(--text-body)',
                color: 'var(--text-secondary)',
                maxWidth: '42ch',
              }}
            >
              {descricao}
            </p>
          ) : null}

          <div style={{ marginTop: 24 }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

function LadoDaMarca({ campo }: { campo: boolean }) {
  const marca = (
    <Marca
      linhas={campo ? ['Céu do Despertar'] : ['Céu do', 'Despertar']}
      legenda="Sistema de gestão"
      tamanho={campo ? 'pequeno' : 'grande'}
    />
  );

  if (campo) {
    return (
      <header
        style={{
          background: 'var(--bg-brand)',
          borderBottom: '1px solid var(--color-line-gold)',
          padding: '20px 18px',
        }}
      >
        {marca}
      </header>
    );
  }

  return (
    <aside
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--bg-brand)',
        borderRight: '1px solid var(--color-line-gold)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '44px 44px 38px',
      }}
    >
      <div
        aria-hidden="true"
        style={{ position: 'absolute', width: 560, height: 560, right: -150, top: '50%', marginTop: -280 }}
      >
        <FlowerOfLife />
      </div>

      <div style={{ position: 'relative' }}>{marca}</div>

      <div style={{ position: 'relative', maxWidth: '30ch' }}>
        <div style={{ height: 1, background: 'var(--color-line-gold)', marginBottom: 18 }} />
        <p style={{ font: 'var(--text-body)', color: 'var(--text-secondary)' }}>
          O registro único do que a casa move: dinheiro, cerimônias, pessoas e o daime.
        </p>
      </div>
    </aside>
  );
}
