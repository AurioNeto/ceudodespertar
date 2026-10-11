import { Cartao, Icon, Rotulo, type Density } from '@/ds';
import { formatarBRL } from '@/pages/utils/formato';
import { eventoDoLink } from '../../../mocks/linkDaCerimonia';
import { Passos } from '../Passos';

export interface ProntoProps {
  densidade: Density;
  nome: string;
  primeiraVez: boolean;
  pontos: readonly string[];
  total: number;
  semValor: boolean;
}

export function Pronto({ densidade, nome, primeiraVez, pontos, total, semValor }: ProntoProps) {
  const campo = densidade === 'field';
  return (
    <Passos
      titulo="Inscrição enviada"
      recado={`Está tudo com a casa, ${nome.trim().split(/\s+/)[0]}. A recepção confirma a sua vaga pelo WhatsApp.`}
    >
      <Cartao campo={campo} style={{ gap: 11 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Icon name="circle-check" size={22} color="var(--color-confirmed)" />
          <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>
            {eventoDoLink.nome} — {eventoDoLink.data}
          </span>
        </div>
        <span style={{ font: 'var(--text-body)', color: 'var(--text-secondary)' }}>
          {semValor ? 'Valor a combinar com a recepção.' : `${formatarBRL(total)} combinados.`}
        </span>
      </Cartao>

      {primeiraVez ? (
        <Cartao campo={campo} style={{ gap: 8 }}>
          <Rotulo>Antes do trabalho</Rotulo>
          <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>
            Como é a sua primeira vez, alguém da casa vai te chamar para uma conversa.
          </span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            Não é entrevista nem avaliação — é para você saber o que esperar e poder perguntar o que quiser.
          </span>
        </Cartao>
      ) : null}

      {pontos.length > 0 ? (
        <Cartao campo={campo} style={{ gap: 8 }}>
          <Rotulo>O que você declarou e a casa vai ler com atenção</Rotulo>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{pontos.join(' · ')}.</span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
            Nada disso impede a sua participação. Se a casa precisar conversar sobre algum ponto, ela procura você
            antes do dia.
          </span>
        </Cartao>
      ) : null}

      <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', maxWidth: '62ch' }}>
        Suas respostas de saúde ficam guardadas com a casa e só o acolhimento consegue abrir — e toda vez que alguém
        abre, fica registrado quem foi.
      </span>
    </Passos>
  );
}
