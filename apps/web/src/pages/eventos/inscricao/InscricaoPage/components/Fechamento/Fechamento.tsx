import { AmountDisplay, Button, Cartao, type Density } from '@/ds';
import { formatarBRL, pluralizar } from '@/pages/utils/formato';
import { totalComContribuicaoACombinar } from '../../../utils/totalComContribuicaoACombinar';

export interface FechamentoProps {
  densidade: Density;
  isento: boolean;
  semValor: boolean;
  total: number;
  contribuicao: number;
  custoHospedagem: number;
  custoRefeicoes: number;
  pendencias: number;
  nome: string;
  onConfirmar: () => void;
  onPendente: () => void;
}

export function Fechamento({
  densidade,
  isento,
  semValor,
  total,
  contribuicao,
  custoHospedagem,
  custoRefeicoes,
  pendencias,
  nome,
  onConfirmar,
  onPendente,
}: FechamentoProps) {
  const campo = densidade === 'field';
  const isentoSemCusto = isento && total === 0;
  const custosConhecidos =
    (custoHospedagem > 0 ? ` · ${formatarBRL(custoHospedagem)} de acomodação` : '') +
    (custoRefeicoes > 0 ? ` · ${formatarBRL(custoRefeicoes)} de alimentação` : '');
  return (
    <Cartao campo={campo} style={{ gap: 13 }}>
      {isentoSemCusto ? (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ font: 'var(--text-amount-lg)', color: 'var(--color-royal-deep)' }}>Isento</span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>não há valor devido</span>
        </div>
      ) : semValor ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {total > 0 ? (
            <>
              <span data-numeric style={{ font: 'var(--text-amount-lg)', color: 'var(--color-royal-deep)' }}>
                {totalComContribuicaoACombinar(total)}
              </span>
              <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                Contribuição a combinar
                {custosConhecidos}
              </span>
            </>
          ) : (
            <>
              <span style={{ font: 'var(--text-amount-lg)', color: 'var(--text-secondary)' }}>A combinar</span>
              <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '72ch' }}>
                A inscrição pode existir antes da conversa sobre valor — e “a combinar” é mais honesto do que R$ 0,00,
                que diria que a pessoa não deve nada.
              </span>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <AmountDisplay value={total / 100} size="lg" style={{ color: 'var(--color-royal-deep)' }} />
            <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>devidos</span>
          </div>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            {isento ? 'Isento de contribuição' : `${formatarBRL(contribuicao)} de contribuição`}
            {custosConhecidos}
          </span>
        </div>
      )}

      <Button
        fullWidth
        density={campo ? 'field' : 'office'}
        iconName="check-check"
        disabled={pendencias > 0}
        blockedReason={
          pendencias > 0
            ? `${pluralizar(pendencias, 'pendência')} acima impede${pendencias === 1 ? '' : 'm'} confirmar. Salvar como pendente sempre pode.`
            : undefined
        }
        onClick={onConfirmar}
      >
        Confirmar a inscrição de {nome.split(' ')[0]}
      </Button>

      <Button variant="quiet" fullWidth density={campo ? 'field' : 'office'} onClick={onPendente}>
        Salvar como pendente
      </Button>

      <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', maxWidth: '76ch' }}>
        O pagamento não se marca aqui. Quem recebe na recepção informa quanto, quando e por qual meio — a conta, a
        categoria e a competência vêm da configuração do evento, não de quem está com a pessoa na frente.
      </span>
    </Cartao>
  );
}
