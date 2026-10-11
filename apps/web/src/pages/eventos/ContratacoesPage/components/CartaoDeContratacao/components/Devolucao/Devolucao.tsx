import { Aviso } from '@/ds';
import { formatarBRL } from '@/pages/utils/formato';
import type { ContratacaoNaTela } from '../../../../mocks/contratacoes';

export interface DevolucaoProps {
  c: ContratacaoNaTela;
}

export function Devolucao({ c }: DevolucaoProps) {
  return (
    <Aviso tom="atencao" titulo={`Cancelada com ${formatarBRL(c.devolucaoDevida!.valor)} já recebidos`}>
      <span style={{ display: 'block', maxWidth: '74ch' }}>
        Cancelar uma contratação que já foi paga gera devolução devida ao contratante, e quem paga é a Tesouraria —
        esta tela não devolve dinheiro. {c.devolucaoDevida!.situacao}.
      </span>
    </Aviso>
  );
}
