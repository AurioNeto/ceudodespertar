import type { Adiantamento, AdiantamentoId } from '@cdd/contracts';
import { Button, EmptyState, TwoAxisGuard, Rotulo, type Density } from '@/ds';
import { formatarDinheiro } from '@/pages/utils/formato';
import type { Perspectiva } from '../../mocks/adiantamentos';
import { Linha } from '../Linha';
import { FormularioDeRecusa } from './components/FormularioDeRecusa';

export interface FilaDeAutorizacaoProps {
  densidade: Density;
  quem: Perspectiva;
  aguardando: readonly Adiantamento[];
  barrado: Adiantamento | null;
  recusando: AdiantamentoId | null;
  motivoRecusa: string;
  onAutorizar: (a: Adiantamento) => void;
  onIniciarRecusa: (id: AdiantamentoId) => void;
  onMotivoRecusa: (v: string) => void;
  onRecusar: (a: Adiantamento) => void;
  onCancelarRecusa: () => void;
}

export function FilaDeAutorizacao({
  densidade,
  quem,
  aguardando,
  barrado,
  recusando,
  motivoRecusa,
  onAutorizar,
  onIniciarRecusa,
  onMotivoRecusa,
  onRecusar,
  onCancelarRecusa,
}: FilaDeAutorizacaoProps) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Rotulo>Aguardando sua autorização</Rotulo>
      {aguardando.length === 0 ? (
        <EmptyState title="Nada aguardando" description="Todo adiantamento registrado já passou por autorização." />
      ) : (
        aguardando.map((a) => (
          <Linha key={a.id} adiantamento={a} densidade={densidade}>
            {recusando === a.id ? (
              <FormularioDeRecusa
                motivo={motivoRecusa}
                onMotivo={onMotivoRecusa}
                onRecusar={() => onRecusar(a)}
                onVoltar={onCancelarRecusa}
              />
            ) : (
              <>
                <Button iconName="check" onClick={() => onAutorizar(a)}>
                  Autorizar
                </Button>
                <Button variant="quiet" iconName="circle-x" onClick={() => onIniciarRecusa(a.id)}>
                  Recusar
                </Button>
              </>
            )}
          </Linha>
        ))
      )}

      {barrado ? (
        <TwoAxisGuard
          explanation={`Autorizar adiantamento exige vínculo ativo de padrinho ou madrinha na data da despesa. ${quem.nome} tem a permissão do grupo ${quem.grupo}, e a operação mesmo assim falha — porque autoridade espiritual não se concede pela tela de acesso, e sim no cadastro de pessoas.`}
          requirement={`Peça a um padrinho ou madrinha. O adiantamento de ${barrado.pessoaNome}, de ${formatarDinheiro(barrado.valor)}, continua aguardando.`}
        />
      ) : null}
    </section>
  );
}
