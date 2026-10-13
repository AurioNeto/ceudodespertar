import type { ReactNode } from 'react';
import { Icon } from '../../atoms/Icon';
import { fundoComVidro } from '../../fundacao/estilos';
import { TONS_DO_AVISO } from './constantes';

export type TomDoAviso = keyof typeof TONS_DO_AVISO;

export interface AvisoProps {
  tom: TomDoAviso;
  titulo?: ReactNode;
  children?: ReactNode;
  acao?: ReactNode;
  comIcone?: boolean;
  role?: 'status' | 'alert';
  id?: string;
  aoFechar?: () => void;
  rotuloDeFechar?: string;
}

export function Aviso({
  tom,
  titulo,
  children,
  acao,
  comIcone = true,
  role,
  id,
  aoFechar,
  rotuloDeFechar,
}: AvisoProps) {
  const t = TONS_DO_AVISO[tom];
  return (
    <div
      id={id}
      role={role}
      style={{
        ...fundoComVidro(t.fundo),
        border: `1px solid ${t.borda}`,
        borderRadius: 'var(--leaf-md)',
        padding: '12px 15px',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
      }}
    >
      {comIcone ? <Icon name={t.icone} size={17} color={t.tinta} style={{ marginTop: 1 }} /> : null}
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {titulo ? <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{titulo}</span> : null}
        {children ? (
          <span
            style={{
              marginTop: titulo ? 4 : undefined,
              font: 'var(--text-small)',
              color: titulo ? 'var(--text-secondary)' : 'var(--text-primary)',
            }}
          >
            {children}
          </span>
        ) : null}
        {acao ? <span style={{ marginTop: 11 }}>{acao}</span> : null}
      </span>
      {aoFechar ? (
        <button
          type="button"
          onClick={aoFechar}
          aria-label={rotuloDeFechar}
          style={{ color: 'var(--text-meta)', cursor: 'pointer', lineHeight: 1 }}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
