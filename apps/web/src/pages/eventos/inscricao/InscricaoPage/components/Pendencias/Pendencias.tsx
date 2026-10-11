import { Aviso, Button, type Density } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import type { Pendencia } from '../../tipos';

export interface PendenciasProps {
  lista: readonly Pendencia[];
  densidade: Density;
}

export function Pendencias({ lista, densidade }: PendenciasProps) {
  const campo = densidade === 'field';
  return (
    <Aviso tom="atencao" titulo={`${pluralizar(lista.length, 'pendência')} para confirmar`}>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 13, marginTop: 9 }}>
        {lista.map((p) => (
          <span
            key={p.chave}
            style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--color-line)', paddingTop: 11 }}
          >
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 9px', alignItems: 'baseline' }}>
              <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{p.titulo}</span>
              <code style={{ font: 'var(--text-code)' }}>{p.invariante}</code>
            </span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '72ch' }}>
              {p.detalhe}
            </span>
            {p.acao ? (
              <span>
                <Button variant="ghost" density={campo ? 'field' : 'office'} iconName="check" onClick={p.acao.ao}>
                  {p.acao.rotulo}
                </Button>
              </span>
            ) : null}
          </span>
        ))}
      </span>
    </Aviso>
  );
}
