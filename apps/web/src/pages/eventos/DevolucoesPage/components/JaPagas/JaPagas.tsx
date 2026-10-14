import { AmountDisplay, Cartao, Icon, ListaDividida, Rotulo, type Density } from '@/ds';
import type { Paga } from '../../tipos';

export interface JaPagasProps {
  lista: readonly Paga[];
  densidade: Density;
}

export function JaPagas({ lista, densidade }: JaPagasProps) {
  return (
    <Cartao density={densidade} style={{ gap: 10 }}>
      <Rotulo>Já devolvidas</Rotulo>
      <ListaDividida itens={lista} chave={(x) => x.id}>
        {(x) => (
          <>
            <Icon name="circle-check" size={15} color="var(--color-confirmed)" />
            <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)', flex: 1, minWidth: 140 }}>
              {x.nome}
            </span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', flex: 1, minWidth: 160 }}>
              {x.evento} · {x.pagaEm} · {x.conta}
            </span>
            <code style={{ font: 'var(--text-code)' }}>{x.lancamentoDeSaida}</code>
            <AmountDisplay
              value={x.valor / 100}
              size="sm"
              style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}
            />
          </>
        )}
      </ListaDividida>
    </Cartao>
  );
}
