import { Aviso } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';

export function BuracoDoRelatorio({ quantidade, lancamentos }: { quantidade: number; lancamentos: number }) {
  return (
    <Aviso
      tom="atencao"
      titulo={pluralizar(quantidade, 'categoria ativa sem linha de relatório', 'categorias ativas sem linha de relatório')}
      acao={
        <span style={{ font: 'var(--text-small)', color: 'var(--color-attention)' }}>
          Escolher a linha resolve. É a razão de esta tela existir.
        </span>
      }
    >
      {pluralizar(lancamentos, 'lançamento')} não aparecem no DRE — e isso não é sinalizado como erro em lugar nenhum.
      Foi assim que R$ 40,6 mil ficaram órfãos na planilha: não estavam errados, estavam fora.
    </Aviso>
  );
}
