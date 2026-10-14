import { Cartao, Rotulo, type Density } from '@/ds';

export interface ComoEntraNoResultadoProps {
  densidade: Density;
}

export function ComoEntraNoResultado({ densidade }: ComoEntraNoResultadoProps) {
  return (
    <Cartao density={densidade} style={{ gap: 10 }}>
      <Rotulo>Devolver é uma saída do evento</Rotulo>
      <span style={{ font: 'var(--text-body)', color: 'var(--text-secondary)', maxWidth: '78ch' }}>
        Quando a casa devolve uma contribuição, o dinheiro sai da conta. Por isso a devolução entra como{' '}
        <b>lançamento de saída vinculado ao mesmo evento</b>, e não como estorno do lançamento original: a receita que
        entrou continua no DRE, e o custo do evento sobe pelo valor devolvido.
      </span>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '78ch' }}>
        Quem pede e quem paga são pessoas diferentes (DV3), e é a Tesouraria, ao efetivar a devolução, que gera a saída
        (DV4). O lançamento original não é alterado: confirmado, só se corrige com estorno (L2).
      </span>
    </Cartao>
  );
}
