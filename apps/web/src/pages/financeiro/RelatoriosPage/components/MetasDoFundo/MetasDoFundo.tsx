import { formatarValor } from '@/lib/formato';
import { metasDeFundo } from '../../mocks/relatorios';
import { Cartao } from '../Cartao';

export function MetasDoFundo() {
  return (
    <Cartao titulo="Fundo próprio contra as metas">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {metasDeFundo.map((f) => (
          <div key={f.nome} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ font: 'var(--text-small)', color: 'var(--text-primary)' }}>{f.nome}</span>
              <span
                style={{
                  font: 'var(--text-small)',
                  color: 'var(--text-secondary)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatarValor(f.valor)} de {formatarValor(f.meta)}
              </span>
            </div>
            <span
              style={{
                width: '100%',
                height: 8,
                borderRadius: 'var(--radius-pill)',
                background: 'var(--bg-sunken)',
                overflow: 'hidden',
                display: 'block',
              }}
            >
              <span
                style={{
                  display: 'block',
                  height: '100%',
                  borderRadius: 'var(--radius-pill)',
                  background: f.cor,
                  width: `${Math.min(100, (f.valor / f.meta) * 100)}%`,
                  transition: 'width 520ms cubic-bezier(.22,.61,.36,1)',
                }}
              />
            </span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>{f.nota}</span>
          </div>
        ))}
      </div>
    </Cartao>
  );
}
