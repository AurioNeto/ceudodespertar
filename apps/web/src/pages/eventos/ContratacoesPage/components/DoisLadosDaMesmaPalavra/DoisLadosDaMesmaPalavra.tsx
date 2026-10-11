import { Cartao, Rotulo, type Density } from '@/ds';

export interface DoisLadosDaMesmaPalavraProps {
  densidade: Density;
}

/** O nó que o modelo veio desfazer, dito uma vez, no pé da tela. */
export function DoisLadosDaMesmaPalavra({ densidade }: DoisLadosDaMesmaPalavraProps) {
  const campo = densidade === 'field';
  return (
    <Cartao campo={campo} style={{ gap: 11 }}>
      <Rotulo>Por que cachê são duas categorias e não uma</Rotulo>
      <div style={{ display: 'grid', gridTemplateColumns: campo ? '1fr' : '1fr 1fr', gap: campo ? 11 : 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <code style={{ font: 'var(--text-code)' }}>CACHE_RECEBIDO</code>
          <span style={{ font: 'var(--text-small)', color: 'var(--color-confirmed)' }}>receita da Munay</span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            O contratante paga para a Munay tocar.
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <code style={{ font: 'var(--text-code)' }}>CACHE_PAGO</code>
          <span style={{ font: 'var(--text-small)', color: 'var(--color-attention)' }}>despesa da Munay</span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            A Munay paga quem tocou.
          </span>
        </div>
      </div>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '78ch' }}>
        É a mesma palavra apontando para lados opostos no mesmo evento. Uma categoria só obrigaria a soma a escolher
        um sinal, e a planilha escolhia errado com frequência — era o tipo de erro que não aparece no saldo, só no
        relatório de quanto a Munay realmente ganha.
      </span>
    </Cartao>
  );
}
