import type { VersaoDoFormulario } from '../../mocks/anamnese';
import { Cartao } from '../Cartao';

export interface HistoricoDaVersaoProps {
  historico: VersaoDoFormulario['historico'];
}

export function HistoricoDaVersao({ historico }: HistoricoDaVersaoProps) {
  return (
    <Cartao>
      <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>Histórico da versão</span>
      {historico.map(([quando, oQue]) => (
        <div key={`${quando}-${oQue}`} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
          <span
            style={{
              font: 'var(--text-code)',
              color: 'var(--text-meta)',
              fontVariantNumeric: 'tabular-nums',
              flex: '0 0 auto',
            }}
          >
            {quando}
          </span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{oQue}</span>
        </div>
      ))}
    </Cartao>
  );
}
