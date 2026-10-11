import { Button, Icon, type Density } from '@/ds';
import { formatarValor } from '@/lib/formato';
import { pluralizar } from '@/pages/utils/formato';
import { rotuloLabel } from '../../constantes';
import type { LinhaDoRelatorio } from '../../mocks/relatorios';
import type { Drill } from '../../tipos';

export interface GavetaDeRecorteProps {
  drill: Drill;
  linhasDoDrill: readonly LinhaDoRelatorio[];
  totalDoDrill: number;
  rotuloPeriodo: string;
  densidade: Density;
  onFechar: () => void;
  onAvisar: (mensagem: string) => void;
}

export function GavetaDeRecorte({
  drill,
  linhasDoDrill,
  totalDoDrill,
  rotuloPeriodo,
  densidade,
  onFechar,
  onAvisar,
}: GavetaDeRecorteProps) {
  const campo = densidade === 'field';

  return (
    <div
      onClick={onFechar}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(59,38,23,.38)',
        display: 'flex',
        alignItems: campo ? 'flex-end' : 'stretch',
        justifyContent: 'flex-end',
        zIndex: 40,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: campo ? '100%' : 'min(520px, 100%)',
          maxHeight: campo ? '86%' : '100%',
          overflow: 'auto',
          background: 'var(--bg-app)',
          borderLeft: campo ? 0 : '1px solid var(--color-line-strong)',
          borderRadius: campo ? 'var(--radius-lg) var(--radius-lg) 0 0' : 0,
          boxShadow: 'var(--shadow-sheet)',
          padding: '18px 20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={rotuloLabel}>{drill.rotulo}</div>
            <div style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{drill.valor}</div>
            <div style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', marginTop: 4 }}>
              {pluralizar(linhasDoDrill.length, 'lançamento')} · {formatarValor(totalDoDrill)} · {rotuloPeriodo}
            </div>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar recorte" style={{ color: 'var(--text-meta)' }}>
            <Icon name="x" size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {linhasDoDrill.slice(0, 40).map((l) => (
            <div
              key={l.id}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 12,
                padding: '9px 0',
                borderBottom: 'var(--border-hairline)',
              }}
            >
              <span
                style={{ font: 'var(--text-code)', color: 'var(--text-meta)', fontVariantNumeric: 'tabular-nums' }}
              >
                {l.data.slice(0, 5)}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', font: 'var(--text-body)', color: 'var(--text-primary)' }}>
                  {l.motivo}
                </span>
                <span style={{ display: 'block', font: 'var(--text-small)', color: 'var(--text-meta)' }}>
                  {(l.grupo ?? l.conta)} · {l.conta}
                  {l.situacao === 'a conferir' ? ' · a conferir' : ''}
                </span>
              </span>
              <span
                style={{
                  font: 'var(--text-amount)',
                  letterSpacing: 'var(--tracking-amount)',
                  fontVariantNumeric: 'tabular-nums',
                  color: l.tipo === 'entrada' ? 'var(--color-confirmed)' : 'var(--text-primary)',
                }}
              >
                {l.tipo === 'entrada' ? '+ ' : l.tipo === 'saida' ? '− ' : ''}
                {formatarValor(l.valor)}
              </span>
            </div>
          ))}
        </div>

        <Button
          variant="ghost"
          iconName="file-spreadsheet"
          onClick={() => onAvisar(`Recorte exportado com ${pluralizar(linhasDoDrill.length, 'lançamento')}.`)}
        >
          Exportar este recorte
        </Button>
      </div>
    </div>
  );
}
