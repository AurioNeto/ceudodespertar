import { Cartao, Rotulo, type Density } from '@/ds';
import { formatarBRL, formatarLitros } from '@/pages/utils/formato';
import { anteriores } from '../../mocks/feitio';
import { custoPorLitro, custoTotal } from '../../utils/custoDoFeitio';

export interface AnterioresProps {
  densidade: Density;
}

export function Anteriores({ densidade }: AnterioresProps) {
  const campo = densidade === 'field';

  return (
    <Cartao campo={campo} style={{ gap: 11 }}>
      <Rotulo>Feitios anteriores</Rotulo>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {anteriores.map((f, i) => {
          const t = custoTotal(f);
          const porLitro = custoPorLitro(t, f.litrosProduzidos) ?? 0;
          return (
            <div
              key={f.id}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px 12px',
                alignItems: 'baseline',
                padding: '10px 0',
                borderTop: i === 0 ? undefined : '1px solid var(--color-line)',
              }}
            >
              <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)', flex: 1, minWidth: 150 }}>
                {f.nome}
              </span>
              <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', minWidth: 110 }}>
                {f.loteProduzido}
              </span>
              <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', minWidth: 62 }}>
                {formatarLitros(f.litrosProduzidos ?? 0)} L
              </span>
              <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', minWidth: 86 }}>
                {formatarBRL(t)}
              </span>
              <span data-numeric style={{ font: 'var(--text-amount)', color: 'var(--color-royal-deep)' }}>
                {formatarBRL(porLitro)}/L
              </span>
            </div>
          );
        })}
      </div>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '78ch' }}>
        A série importa mais que qualquer valor isolado: um feitio caro pode ser uma colheita ruim, e dois seguidos já
        são uma conversa sobre onde a casa compra a folha.
      </span>
    </Cartao>
  );
}
