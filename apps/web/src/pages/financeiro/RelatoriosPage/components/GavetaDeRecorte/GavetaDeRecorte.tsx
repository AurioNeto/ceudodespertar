import { reais } from '@cdd/contracts';
import { AmountDisplay, Button, PainelDeAcao, rotuloVersalete, varianteDoPainel, type Density } from '@/ds';
import { formatarBRL, pluralizar } from '@/pages/utils/formato';
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
  return (
    <PainelDeAcao
      aberto
      titulo={drill.valor}
      descricao={`${pluralizar(linhasDoDrill.length, 'lançamento')} · ${formatarBRL(reais(totalDoDrill))} · ${rotuloPeriodo}`}
      variante={varianteDoPainel(densidade)}
      aoFechar={onFechar}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={rotuloVersalete}>{drill.rotulo}</div>
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
                <AmountDisplay value={l.valor} size="sm" style={{ color: 'inherit' }} />
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
    </PainelDeAcao>
  );
}
