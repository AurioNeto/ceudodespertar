import { AmountDisplay, Cartao, ListaDividida, Rotulo, type Density } from '@/ds';
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

      <ListaDividida itens={faltaramSemPedir} chave={(x) => x.nome} esmaecido={() => true}>
        {(x) => (
          <>
            <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)', flex: 1, minWidth: 150 }}>
              {x.nome}
            </span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', flex: 1, minWidth: 160 }}>
              {x.evento}
            </span>
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
