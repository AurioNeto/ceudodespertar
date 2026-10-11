import { Icon, type IconName } from '@/ds';
import { formatarBRL } from '@/pages/utils/formato';
import { numeroGrande } from '../../../../constantes';

export function ColunaDeMovimento({
  icone,
  cor,
  rotulo,
  valor,
  anterior,
  divisor = false,
  comparacaoBoaQuandoSobe = false,
}: {
  icone: IconName;
  cor: string;
  rotulo: string;
  valor: number;
  anterior: number;
  divisor?: boolean;
  comparacaoBoaQuandoSobe?: boolean;
}) {
  const diferenca = valor - anterior;
  const acima = diferenca > 0;
  const corDaComparacao = comparacaoBoaQuandoSobe && acima ? 'var(--color-confirmed)' : 'var(--text-primary)';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        paddingLeft: divisor ? 18 : undefined,
        borderLeft: divisor ? 'var(--border-hairline)' : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <Icon name={icone} size={16} color={cor} />
        <span style={{ font: 'var(--text-body)', color: 'var(--text-secondary)' }}>{rotulo}</span>
      </div>
      <div style={{ ...numeroGrande, color: cor }}>{formatarBRL(valor)}</div>
      <div style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        {formatarBRL(anterior)} no mês anterior —{' '}
        <span style={{ color: corDaComparacao, fontWeight: 600, whiteSpace: 'nowrap' }}>
          {formatarBRL(Math.abs(diferenca))} {acima ? 'acima' : 'abaixo'}
        </span>
      </div>
    </div>
  );
}
