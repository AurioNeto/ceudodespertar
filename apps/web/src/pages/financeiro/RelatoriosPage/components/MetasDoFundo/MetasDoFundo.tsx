import { reais } from '@cdd/contracts';
import { Cartao } from '@/ds';
import { formatarBRL } from '@/pages/utils/formato';
import { metasDeFundo } from '../../mocks/relatorios';
import { tituloDoCartao } from '../../constantes';

export function MetasDoFundo() {
  return (
    <Cartao>
      <span style={tituloDoCartao}>Fundo próprio contra as metas</span>
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
                {formatarBRL(reais(f.valor))} de {formatarBRL(reais(f.meta))}
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
