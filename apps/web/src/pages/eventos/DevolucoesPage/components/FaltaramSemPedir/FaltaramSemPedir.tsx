import { Cartao, Rotulo, type Density } from '@/ds';
import { formatarBRL, pluralizar } from '@/pages/utils/formato';
import { faltaramSemPedir } from '../../mocks/devolucoes';

export interface FaltaramSemPedirProps {
  densidade: Density;
}

export function FaltaramSemPedir({ densidade }: FaltaramSemPedirProps) {
  const campo = densidade === 'field';
  const total = faltaramSemPedir.reduce((s, x) => s + x.valor, 0);
  return (
    <Cartao campo={campo} style={{ gap: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 10px', alignItems: 'baseline' }}>
        <Rotulo>Faltaram e não pediram</Rotulo>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          {pluralizar(faltaramSemPedir.length, 'pessoa')} · {formatarBRL(total)} que continuam com a casa
        </span>
      </div>

      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '78ch' }}>
        Não é fila de trabalho: <b>cancelar não devolve</b>. A devolução existe porque alguém pediu, e quem não pediu
        não recebe. Está aqui só para a ausência ser visível em vez de virar dúvida na reunião.
      </span>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {faltaramSemPedir.map((x, i) => (
          <div
            key={x.nome}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px 12px',
              alignItems: 'baseline',
              padding: '8px 0',
              borderTop: i === 0 ? undefined : '1px solid var(--color-line)',
              opacity: 0.75,
            }}
          >
            <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)', flex: 1, minWidth: 150 }}>
              {x.nome}
            </span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', flex: 1, minWidth: 160 }}>
              {x.evento}
            </span>
            <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
              {formatarBRL(x.valor)}
            </span>
          </div>
        ))}
      </div>
    </Cartao>
  );
}
