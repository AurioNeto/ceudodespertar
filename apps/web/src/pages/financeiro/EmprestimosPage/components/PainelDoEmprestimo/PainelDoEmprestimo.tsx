import type { Emprestimo } from '@cdd/contracts';
import { Aviso, Button, DomainError, type Density } from '@/ds';
import { formatarBRL } from '@/pages/utils/formato';
import { quitado } from '../../utils/saldo';
import { Detalhe } from './components/Detalhe';
import { FormularioDeDevolucao } from './components/FormularioDeDevolucao';
import { TabelaDeDevolucoes } from './components/TabelaDeDevolucoes';

export interface PainelDoEmprestimoProps {
  emprestimo: Emprestimo;
  densidade: Density;
  devolvendo: boolean;
  saldo: number;
  valor: string;
  data: string;
  dataValida: boolean;
  conta: string;
  excedeSaldo: boolean;
  valorValido: boolean;
  onIniciarDevolucao: () => void;
  onValor: (v: string) => void;
  onData: (v: string) => void;
  onConta: (v: string) => void;
  onConfirmarDevolucao: () => void;
  onCancelarDevolucao: () => void;
}

export function PainelDoEmprestimo({
  emprestimo,
  densidade,
  devolvendo,
  saldo,
  valor,
  data,
  dataValida,
  conta,
  excedeSaldo,
  valorValido,
  onIniciarDevolucao,
  onValor,
  onData,
  onConta,
  onConfirmarDevolucao,
  onCancelarDevolucao,
}: PainelDoEmprestimoProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
      <Detalhe emprestimo={emprestimo} densidade={densidade} />

      <DomainError
        rule="Emprestar e devolver não mexem no resultado do mês"
        explanation="O dinheiro sai e volta do patrimônio da casa: não é despesa quando sai, nem receita quando volta. Os dois lados são transferências entre contas."
        way="Era assim que a planilha errava — o empréstimo entrava como despesa e a devolução como receita, e o mês fechava torto nas duas pontas."
      />

      <TabelaDeDevolucoes emprestimo={emprestimo} densidade={densidade} />

      {quitado(emprestimo) ? (
        <Aviso tom="confirmado">Quitado. A soma das devoluções fechou com o principal.</Aviso>
      ) : devolvendo ? (
        <FormularioDeDevolucao
          densidade={densidade}
          saldo={saldo}
          direcao={emprestimo.direcao}
          valor={valor}
          data={data}
          dataValida={dataValida}
          conta={conta}
          excedeSaldo={excedeSaldo}
          valorValido={valorValido}
          onValor={onValor}
          onData={onData}
          onConta={onConta}
          onConfirmar={onConfirmarDevolucao}
          onCancelar={onCancelarDevolucao}
        />
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <Button iconName="undo-2" onClick={onIniciarDevolucao}>
            Registrar devolução
          </Button>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            Saldo de {formatarBRL(saldo)} · grava uma transferência.
          </span>
        </div>
      )}
    </div>
  );
}
