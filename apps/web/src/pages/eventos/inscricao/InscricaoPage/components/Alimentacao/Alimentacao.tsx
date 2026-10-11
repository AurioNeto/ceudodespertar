import type { Refeicao } from '@cdd/contracts';
import type { Density } from '@/ds';
import { formatarBRL } from '@/pages/utils/formato';
import type { EventoParaInscricao } from '../../../mocks/eventos';
import { Bloco } from '../Bloco';
import { OpcaoEmLinha } from '../OpcaoEmLinha';

export interface AlimentacaoProps {
  evento: EventoParaInscricao;
  refeicoes: readonly Refeicao[];
  onAlternar: (r: Refeicao) => void;
  densidade: Density;
}

export function Alimentacao({ evento, refeicoes, onAlternar, densidade }: AlimentacaoProps) {
  return evento.ocasiaoEspecial ? (
    <Bloco titulo="Alimentação" densidade={densidade}>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{evento.nota}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {evento.refeicoes.map((r) => (
          <OpcaoEmLinha
            key={r.refeicao}
            rotulo={r.rotulo}
            valor={formatarBRL(r.valor)}
            marcada={refeicoes.includes(r.refeicao)}
            multipla
            densidade={densidade}
            onEscolher={() => onAlternar(r.refeicao)}
          />
        ))}
      </div>
    </Bloco>
  ) : (
    <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', maxWidth: '78ch' }}>
      Sem bloco de alimentação: este é um trabalho de uma noite, e a casa só cobra refeição em ocasião
      especial. Quando não cobra, o campo não fica desabilitado — ele não existe.
    </span>
  );
}
