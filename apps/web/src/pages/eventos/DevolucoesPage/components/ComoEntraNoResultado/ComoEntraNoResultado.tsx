import { Cartao, Rotulo, type Density } from '@/ds';

export interface ComoEntraNoResultadoProps {
  densidade: Density;
}

/**
 * O ponto contábil da tela, e a divergência que ela levanta contra o Doc 2.
 */
export function ComoEntraNoResultado({ densidade }: ComoEntraNoResultadoProps) {
  const campo = densidade === 'field';
  return (
    <Cartao campo={campo} style={{ gap: 10 }}>
      <Rotulo>Devolver não é gastar</Rotulo>
      <span style={{ font: 'var(--text-body)', color: 'var(--text-secondary)', maxWidth: '78ch' }}>
        Quando a casa devolve uma contribuição, ela não teve um custo — ela <b>desfaz uma receita que não se
        confirmou</b>. Por isso a devolução entra como estorno do lançamento original, e não como despesa nova: a
        linha “Receita de contribuição” do DRE cai, e nenhuma linha de custo sobe.
      </span>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '78ch' }}>
        Lançar como despesa fecharia o resultado pelo mesmo número, e é por isso que o erro passa despercebido: as
        duas pontas incham juntas. O DRE passaria a dizer que entraram R$ 210 que nunca ficaram e que a casa gastou
        R$ 210 que nunca gastou — e a leitura de quanto a casa arrecada no ano deixa de ser verdadeira.
      </span>
      <span style={{ font: 'var(--text-small)', color: 'var(--color-suggest)', maxWidth: '78ch' }}>
        É a mesma família de F2 (pagar fatura é transferência, não despesa), E1 (empréstimo é patrimonial) e A5
        (ressarcir adiantamento não gera despesa nova).
      </span>
    </Cartao>
  );
}
