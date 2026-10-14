import type { RefObject } from 'react';
import { Icon } from '../../../../atoms/Icon';

const ALVO_MINIMO_DE_TOQUE = 44;

export interface CabecalhoDoPainelProps {
  titulo: string;
  descricao?: string;
  idDoTitulo: string;
  idDaDescricao: string;
  refDoTitulo: RefObject<HTMLHeadingElement | null>;
  aoFechar: () => void;
}

export function CabecalhoDoPainel({
  titulo,
  descricao,
  idDoTitulo,
  idDaDescricao,
  refDoTitulo,
  aoFechar,
}: CabecalhoDoPainelProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-3)',
        padding: 'var(--space-5) var(--space-5) var(--space-3)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2
          id={idDoTitulo}
          ref={refDoTitulo}
          tabIndex={-1}
          style={{ margin: 0, font: 'var(--text-title)', color: 'var(--text-title)' }}
        >
          {titulo}
        </h2>
        {descricao ? (
          <p
            id={idDaDescricao}
            style={{ margin: 'var(--space-1) 0 0', font: 'var(--text-small)', color: 'var(--text-secondary)' }}
          >
            {descricao}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Fechar"
        onClick={aoFechar}
        style={{
          display: 'grid',
          placeItems: 'center',
          minWidth: ALVO_MINIMO_DE_TOQUE,
          minHeight: ALVO_MINIMO_DE_TOQUE,
          marginTop: 'calc(var(--space-2) * -1)',
          marginRight: 'calc(var(--space-2) * -1)',
          background: 'transparent',
          color: 'var(--text-secondary)',
          borderRadius: 'var(--leaf-sm)',
        }}
      >
        <Icon name="x" size={20} />
      </button>
    </div>
  );
}
