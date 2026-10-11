import { Button, Cartao, type Density } from '@/ds';
import { parametrosDaCasa } from '../../mocks/parametros';

export function ParametrosDaCasa({ densidade }: { densidade: Density }) {
  const campo = densidade === 'field';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {parametrosDaCasa.map((p) => (
        <Cartao key={p.chave} campo={campo} style={{ gap: 9 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'baseline' }}>
            <span style={{ flex: 1, minWidth: 200, font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
              {p.rotulo}
            </span>
            <span data-numeric style={{ font: 'var(--text-amount)', color: 'var(--color-royal-deep)' }}>
              {p.valor}
            </span>
            {p.editavel ? (
              <Button variant="quiet" iconName="pencil">
                Editar
              </Button>
            ) : (
              <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>fixo</span>
            )}
          </div>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '74ch' }}>{p.nota}</span>
        </Cartao>
      ))}
    </div>
  );
}
