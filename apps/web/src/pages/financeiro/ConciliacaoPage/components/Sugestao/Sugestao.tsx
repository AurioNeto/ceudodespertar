import type { SugestaoDeCasamento } from '@cdd/contracts';
import { Button, Icon, StatusBadge } from '@/ds';
import { formatarData, formatarDinheiro } from '@/pages/utils/formato';
import { Lado } from './components/Lado';

export interface SugestaoProps {
  sugestao: SugestaoDeCasamento;
  onCasar: () => void;
  onRecusar: () => void;
}

export function Sugestao({ sugestao, onCasar, onRecusar }: SugestaoProps) {
  const { linha, lancamento, forca, porque } = sugestao;
  return (
    <div
      style={{
        background: 'var(--color-suggest-soft)',
        border: '1px solid var(--color-suggest-border)',
        borderRadius: 'var(--radius)',
        padding: '13px 15px',
        display: 'flex',
        flexDirection: 'column',
        gap: 11,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <StatusBadge tone="suggest">{forca === 'ALTA' ? 'Alta confiança' : 'Média confiança'}</StatusBadge>
        <span style={{ font: 'var(--text-small)', color: 'var(--color-suggest)' }}>{porque}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <Lado
          rotulo="No banco"
          texto={linha.descricaoBanco}
          data={formatarData(linha.data)}
          valor={formatarDinheiro(linha.valor)}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 2 }}>
          <Icon name="arrow-left-right" size={15} color="var(--color-suggest)" />
          <div style={{ flex: 1, height: 1, background: 'var(--color-suggest-border)' }} />
        </div>
        <Lado
          rotulo="No sistema"
          texto={lancamento.motivo}
          data={formatarData(lancamento.data)}
          valor={formatarDinheiro(lancamento.valor)}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <Button variant="suggest" iconName="check" onClick={onCasar}>
          Casar
        </Button>
        <Button variant="quiet" iconName="circle-x" onClick={onRecusar}>
          Não é o mesmo
        </Button>
      </div>
    </div>
  );
}
