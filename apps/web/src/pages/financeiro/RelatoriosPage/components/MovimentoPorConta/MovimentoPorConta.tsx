import type { Density } from '@/ds';
import { formatarValor } from '@/lib/formato';
import { rotuloLabel } from '../../constantes';
import type { useRelatorio } from '../../hooks/useRelatorio';
import type { Drill } from '../../tipos';
import { Cartao } from '../Cartao';
import { Numero } from './components/Numero';

export interface MovimentoPorContaProps {
  porConta: ReturnType<typeof useRelatorio>['porConta'];
  rotuloPeriodo: string;
  densidade: Density;
  onAbrirDrill: (d: Drill) => void;
  onAvisar: (mensagem: string) => void;
}

export function MovimentoPorConta({ porConta, rotuloPeriodo, densidade, onAbrirDrill, onAvisar }: MovimentoPorContaProps) {
  const campo = densidade === 'field';

  return (
    <Cartao titulo="Movimento por conta">
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {!campo ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0,1fr) 130px 130px 130px 110px',
              padding: '0 0 8px',
              borderBottom: 'var(--border-hairline)',
            }}
          >
            {['Conta', 'Entradas', 'Saídas', 'Resultado', ''].map((c, i) => (
              <span key={c || 'acoes'} style={{ ...rotuloLabel, textAlign: i === 0 ? 'left' : 'right' }}>
                {c}
              </span>
            ))}
          </div>
        ) : null}
        {porConta.map((c) => (
          <div
            key={c.nome}
            style={{
              display: 'grid',
              gridTemplateColumns: campo ? 'minmax(0,1fr) auto' : 'minmax(0,1fr) 130px 130px 130px 110px',
              alignItems: 'center',
              gap: campo ? 8 : 0,
              padding: '10px 0',
              borderBottom: 'var(--border-hairline)',
            }}
          >
            <button
              type="button"
              onClick={() => onAbrirDrill({ rotulo: 'Movimento da conta', campo: 'conta', valor: c.nome, tipo: null })}
              style={{
                font: 'var(--text-body-strong)',
                color: 'var(--color-royal)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {c.nome}
            </button>
            {campo ? (
              <span
                style={{
                  font: 'var(--text-amount)',
                  fontVariantNumeric: 'tabular-nums',
                  color: c.resultado >= 0 ? 'var(--color-confirmed)' : 'var(--color-attention)',
                }}
              >
                {formatarValor(c.resultado)}
              </span>
            ) : (
              <>
                <Numero valor={c.entradas} cor="var(--color-confirmed)" />
                <Numero valor={c.saidas} cor="var(--color-attention)" />
                <Numero
                  valor={c.resultado}
                  cor={c.resultado >= 0 ? 'var(--text-primary)' : 'var(--color-attention)'}
                />
                <span style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={() =>
                      onAvisar(`Extrato de ${c.nome} em ${rotuloPeriodo} exportado em planilha.`)
                    }
                    style={{ font: 'var(--text-small)', color: 'var(--text-link)', cursor: 'pointer' }}
                  >
                    exportar
                  </button>
                </span>
              </>
            )}
          </div>
        ))}
      </div>
    </Cartao>
  );
}
