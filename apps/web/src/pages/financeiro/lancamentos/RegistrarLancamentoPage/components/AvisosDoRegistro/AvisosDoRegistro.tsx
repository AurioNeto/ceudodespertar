import { DomainError, StatusBadge, TwoAxisGuard, type Density } from '@/ds';

export interface AvisosDoRegistroProps {
  consolida: boolean;
  temRecibo: boolean;
  composto: boolean;
  densidade: Density;
}

export function AvisosDoRegistro({ consolida, temRecibo, composto, densidade }: AvisosDoRegistroProps) {
  const campo = densidade === 'field';

  return (
    <>
      {!consolida && !temRecibo ? (
        <TwoAxisGuard
          explanation="Você grava este lançamento como A conferir. Lançar já consolidado é operação de tesouraria, e é por isso que o botão não está aqui."
          requirement="Precisa da permissão financeiro.lancamento.confirmar."
        />
      ) : null}

      {consolida && composto ? (
        <DomainError
          rule="Um lançamento consolidado tem um valor só"
          explanation={
            campo
              ? 'Uma soma no valor são duas compras no mesmo cupom. Separe em dois lançamentos ou grave o total explicando na descrição.'
              : 'Uma soma no valor são duas compras no mesmo cupom. Consolidado, o valor precisa ser um — a tesouraria separa antes de gravar, senão o relatório por categoria mistura extintor com suporte.'
          }
          way={
            campo
              ? undefined
              : 'Separe em dois lançamentos, ou grave o total com a explicação na descrição e classifique como manutenção.'
          }
        />
      ) : null}

      {campo ? (
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {consolida ? (
            <StatusBadge tone="confirmed">Grava consolidado</StatusBadge>
          ) : (
            <StatusBadge>Grava a conferir</StatusBadge>
          )}
        </div>
      ) : null}
    </>
  );
}
