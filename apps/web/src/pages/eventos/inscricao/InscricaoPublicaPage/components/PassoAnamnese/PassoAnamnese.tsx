import type { ModoDePreenchimento, PerguntaPendente } from '@cdd/contracts';
import { Button, StatusBadge, type Density } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import { MODO_RECADO, type CadastroEncontrado } from '../../mocks/inscricaoPublica';
import { respondida } from '../../utils/regraDeAlerta';
import { Passos } from '../Passos';
import { BlocoDePergunta } from './components/BlocoDePergunta';
import { Guardado } from './components/Guardado';
import { Herdadas } from './components/Herdadas';

export interface PassoAnamneseProps {
  densidade: Density;
  refazendo: boolean;
  cadastro: CadastroEncontrado | null;
  primeiroNome: string;
  modo: ModoDePreenchimento;
  pendentes: readonly PerguntaPendente[];
  valores: Record<string, string>;
  faltando: readonly PerguntaPendente[];
  onResponder: (perguntaId: string, valor: string) => void;
  onSeguir: () => void;
}

export function PassoAnamnese({
  densidade,
  refazendo,
  cadastro,
  primeiroNome,
  modo,
  pendentes,
  valores,
  faltando,
  onResponder,
  onSeguir,
}: PassoAnamneseProps) {
  const campo = densidade === 'field';
  return (
    <Passos
      titulo={refazendo ? 'Vamos do começo' : cadastro ? `Olá, ${primeiroNome}` : 'Sobre a sua saúde'}
      recado={
        refazendo
          ? 'Você pediu para responder de novo, então o formulário vem inteiro. O que você escrever agora substitui o que a casa tinha.'
          : (cadastro?.explicacao ??
            'A casa pergunta isso para cuidar de você durante o trabalho. Nada aqui impede a sua participação — o que existe é gente lendo com atenção.')
      }
    >
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <StatusBadge
          tone={
            refazendo
              ? 'confirmed'
              : modo === 'REVALIDACAO_COMPLETA'
                ? 'attention'
                : modo === 'INCREMENTAL'
                  ? 'suggest'
                  : 'royal'
          }
        >
          {refazendo ? 'A seu pedido' : MODO_RECADO[modo]}
        </StatusBadge>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          {pluralizar(pendentes.length, 'pergunta')} · leva uns {Math.max(2, Math.round(pendentes.length * 0.6))} minutos
        </span>
      </div>

      {cadastro && cadastro.herdadas.length > 0 && !refazendo ? (
        <Herdadas cadastro={cadastro} densidade={densidade} />
      ) : null}

      {pendentes.map((x, i) => (
        <BlocoDePergunta
          key={x.pergunta.id}
          numero={i + 1}
          total={pendentes.length}
          pendente={x}
          valor={valores[x.pergunta.id as string] ?? ''}
          campo={campo}
          onResponder={(v) => onResponder(x.pergunta.id as string, v)}
        />
      ))}

      <Guardado quantas={Object.values(valores).filter(respondida).length} />

      <Button
        fullWidth
        density={campo ? 'field' : 'office'}
        iconName="arrow-right"
        iconAfter
        disabled={faltando.length > 0}
        blockedReason={
          faltando.length > 0
            ? `Falta${faltando.length === 1 ? '' : 'm'} ${pluralizar(faltando.length, 'pergunta obrigatória', 'perguntas obrigatórias')} acima.`
            : undefined
        }
        onClick={onSeguir}
      >
        Continuar
      </Button>
    </Passos>
  );
}
