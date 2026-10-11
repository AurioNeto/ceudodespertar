import type { Adiantamento, AdiantamentoId } from '@cdd/contracts';
import { Button, EmptyState, Rotulo, type Density } from '@/ds';
import { hoje } from '@/pages/mocks/relogio';
import { diasDesde } from '../../utils/diasDesde';
import { Linha } from '../Linha';
import { FormularioDeRessarcimento } from './components/FormularioDeRessarcimento';

export interface FilaDeRessarcimentoProps {
  densidade: Density;
  podeRessarcir: boolean;
  aRessarcir: readonly Adiantamento[];
  ressarcindo: AdiantamentoId | null;
  conta: string;
  data: string;
  onIniciarRessarcimento: (id: AdiantamentoId) => void;
  onConta: (v: string) => void;
  onData: (v: string) => void;
  onRessarcir: (a: Adiantamento) => void;
  onCancelarRessarcimento: () => void;
}

export function FilaDeRessarcimento({
  densidade,
  podeRessarcir,
  aRessarcir,
  ressarcindo,
  conta,
  data,
  onIniciarRessarcimento,
  onConta,
  onData,
  onRessarcir,
  onCancelarRessarcimento,
}: FilaDeRessarcimentoProps) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Rotulo>A ressarcir</Rotulo>
      {aRessarcir.length === 0 ? (
        <EmptyState
          title="Ninguém esperando dinheiro de volta"
          description="Todo adiantamento autorizado já foi ressarcido."
        />
      ) : (
        aRessarcir.map((a) => (
          <Linha key={a.id} adiantamento={a} densidade={densidade} idade={diasDesde(a.dataDespesa, hoje)}>
            {!podeRessarcir ? (
              <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>a tesouraria ressarce</span>
            ) : ressarcindo === a.id ? (
              <FormularioDeRessarcimento
                conta={conta}
                data={data}
                valor={a.valor}
                onConta={onConta}
                onData={onData}
                onConfirmar={() => onRessarcir(a)}
                onVoltar={onCancelarRessarcimento}
              />
            ) : (
              <Button iconName="arrow-left-right" onClick={() => onIniciarRessarcimento(a.id)}>
                Ressarcir
              </Button>
            )}
          </Linha>
        ))
      )}
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '68ch' }}>
        O ressarcimento é transferência de valor igual ao adiantado, e <b>não gera lançamento novo</b> — a despesa já
        entrou na data em que a pessoa gastou.
      </span>
    </section>
  );
}
