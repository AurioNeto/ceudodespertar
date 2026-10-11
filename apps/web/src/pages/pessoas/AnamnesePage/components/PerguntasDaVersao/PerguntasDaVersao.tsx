import { Button, StatusBadge } from '@/ds';
import type { PerguntaDoFormulario } from '../../mocks/anamnese';
import type { RascunhoDePergunta } from '../../tipos';
import { Cartao } from '../Cartao';
import { BotaoDaPergunta } from './components/BotaoDaPergunta';
import { FormularioDeNovaPergunta } from './components/FormularioDeNovaPergunta';

export interface PerguntasDaVersaoProps {
  perguntas: readonly PerguntaDoFormulario[];
  ehRascunho: boolean;
  novaPergunta: RascunhoDePergunta | null;
  onSubir: (i: number) => void;
  onDescer: (i: number) => void;
  onRemover: (i: number) => void;
  onAbrirNovaPergunta: () => void;
  onMudarNovaPergunta: (rascunho: RascunhoDePergunta) => void;
  onAdicionarPergunta: () => void;
  onCancelarNovaPergunta: () => void;
}

export function PerguntasDaVersao({
  perguntas,
  ehRascunho,
  novaPergunta,
  onSubir,
  onDescer,
  onRemover,
  onAbrirNovaPergunta,
  onMudarNovaPergunta,
  onAdicionarPergunta,
  onCancelarNovaPergunta,
}: PerguntasDaVersaoProps) {
  return (
    <Cartao>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>Perguntas</span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          {ehRascunho
            ? 'editar só no rascunho — versão publicada não muda'
            : 'versão fechada: as respostas ficam presas a esta redação'}
        </span>
      </div>

      {perguntas.map((p, i) => (
        <div
          key={`${p.titulo}-${i}`}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: '11px 0',
            borderBottom: 'var(--border-hairline)',
          }}
        >
          <span
            style={{
              font: 'var(--text-code)',
              color: 'var(--text-meta)',
              fontVariantNumeric: 'tabular-nums',
              paddingTop: 2,
            }}
          >
            {String(i + 1).padStart(2, '0')}
          </span>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{p.titulo}</span>
            <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>{p.tipo}</span>
              {p.obrigatoria ? <StatusBadge tone="royal">Obrigatória</StatusBadge> : null}
              {p.alerta ? (
                <span style={{ font: 'var(--text-small)', color: 'var(--color-attention)' }}>
                  ponto de atenção quando: {p.alerta}
                </span>
              ) : null}
            </span>
          </span>

          {ehRascunho ? (
            <span style={{ display: 'flex', gap: 6 }}>
              <BotaoDaPergunta rotulo="subir" onClick={() => onSubir(i)}>
                ↑
              </BotaoDaPergunta>
              <BotaoDaPergunta rotulo="descer" onClick={() => onDescer(i)}>
                ↓
              </BotaoDaPergunta>
              <BotaoDaPergunta rotulo="remover" onClick={() => onRemover(i)}>
                ×
              </BotaoDaPergunta>
            </span>
          ) : null}
        </div>
      ))}

      {ehRascunho ? (
        novaPergunta ? (
          <FormularioDeNovaPergunta
            rascunho={novaPergunta}
            onMudar={onMudarNovaPergunta}
            onAdicionar={onAdicionarPergunta}
            onCancelar={onCancelarNovaPergunta}
          />
        ) : (
          <Button
            variant="quiet"
            iconName="plus"
            onClick={onAbrirNovaPergunta}
            style={{ alignSelf: 'flex-start' }}
          >
            Adicionar pergunta
          </Button>
        )
      ) : null}
    </Cartao>
  );
}
