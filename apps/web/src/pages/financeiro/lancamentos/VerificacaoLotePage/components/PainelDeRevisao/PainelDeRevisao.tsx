import type { ItemNaFila } from '@cdd/contracts';
import { Button, Icon, StatusBadge, type IconName } from '@/ds';
import { formatarData } from '@/pages/utils/formato';
import { CONFIANCA, ORIGENS } from '../../constantes';
import { rotuloLabel } from './constantes';
import { CampoDeTexto } from './components/CampoDeTexto';
import { FormularioDeDevolucao } from './components/FormularioDeDevolucao';
import { useRascunhoDeRevisao } from './hooks/useRascunhoDeRevisao';

export interface PainelDeRevisaoProps {
  item: ItemNaFila;
  campo: boolean;
  onFechar: () => void;
  onAprovar: (corrigido: ItemNaFila) => void;
  onDevolver: (motivo: string) => void;
}

/**
 * Corrigir antes de aprovar. Devolver não apaga: volta a quem enviou com o
 * motivo, que é o que o remetente vê.
 */
export function PainelDeRevisao({ item, campo, onFechar, onAprovar, onDevolver }: PainelDeRevisaoProps) {
  const { rascunho, valorTexto, alterar, alterarValor, devolvendo, abrirDevolucao, cancelarDevolucao, motivo, escreverMotivo } =
    useRascunhoDeRevisao(item);

  const origem = ORIGENS[item.origem];
  const confianca = CONFIANCA[item.confianca];
  const ehTransferencia = item.tipo === 'TRANSFERENCIA';
  const ehEntrada = item.tipo === 'ENTRADA';

  return (
    <div
      onClick={onFechar}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(59,38,23,.38)',
        display: 'flex',
        alignItems: campo ? 'flex-end' : 'stretch',
        justifyContent: 'flex-end',
        zIndex: 40,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: campo ? '100%' : 440,
          maxHeight: campo ? '88%' : '100%',
          background: 'var(--bg-card)',
          borderLeft: campo ? 0 : '1px solid var(--color-line-strong)',
          borderRadius: campo ? 'var(--radius-lg) var(--radius-lg) 0 0' : 0,
          boxShadow: 'var(--shadow-raised)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '16px 18px',
            borderBottom: 'var(--border-hairline)',
          }}
        >
          <span style={rotuloLabel}>Revisar lançamento</span>
          <StatusBadge tone={confianca.tone}>{confianca.texto}</StatusBadge>
          <button
            type="button"
            aria-label="fechar"
            onClick={onFechar}
            style={{
              width: 34,
              height: 34,
              border: '1px solid var(--color-line)',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-pill)',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'var(--bg-sunken)',
              border: 'var(--border-hairline)',
              borderRadius: 'var(--radius)',
              padding: '10px 12px',
            }}
          >
            <Icon name={origem.icone as IconName} size={16} color="var(--color-royal)" />
            <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
              {origem.label}
              {item.remetente ? ` · enviado por ${item.remetente}` : ' · importado do banco'} ·{' '}
              {formatarData(item.data)}
            </span>
          </div>

          {item.anexo ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                font: 'var(--text-small)',
                color: 'var(--text-secondary)',
              }}
            >
              <Icon name="paperclip" size={15} color="var(--text-secondary)" />
              {item.anexo}
            </div>
          ) : null}

          <CampoDeTexto
            rotulo={ehTransferencia ? 'Quanto transferiu' : ehEntrada ? 'Quanto entrou' : 'Quanto foi'}
            valor={valorTexto}
            onMudar={alterarValor}
          />
          <CampoDeTexto
            rotulo={ehTransferencia ? 'Motivo' : ehEntrada ? 'De onde veio' : 'O que foi'}
            valor={rascunho.motivo}
            onMudar={(v) => alterar('motivo', v)}
          />
          <CampoDeTexto rotulo="Data" valor={formatarData(rascunho.data)} onMudar={() => undefined} />

          {ehTransferencia ? (
            <>
              <CampoDeTexto
                rotulo="Conta de origem"
                valor={rascunho.conta}
                onMudar={(v) => alterar('conta', v)}
              />
              <CampoDeTexto
                rotulo="Conta de destino"
                valor={rascunho.contaDestino ?? ''}
                onMudar={(v) => alterar('contaDestino', v)}
              />
            </>
          ) : (
            <>
              <CampoDeTexto rotulo="Grupo" valor={rascunho.grupo ?? ''} onMudar={(v) => alterar('grupo', v)} />
              <CampoDeTexto
                rotulo="Categoria"
                valor={rascunho.categoria ?? ''}
                onMudar={(v) => alterar('categoria', v)}
              />
              <CampoDeTexto rotulo="Conta" valor={rascunho.conta} onMudar={(v) => alterar('conta', v)} />
            </>
          )}

          {devolvendo ? (
            <FormularioDeDevolucao
              remetente={item.remetente}
              motivo={motivo}
              onEscreverMotivo={escreverMotivo}
              onDevolver={onDevolver}
              onCancelar={cancelarDevolucao}
            />
          ) : null}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            padding: '12px 18px 16px',
            borderTop: 'var(--border-hairline)',
            alignItems: 'flex-start',
          }}
        >
          <Button iconName="check" onClick={() => onAprovar(rascunho)}>
            Aprovar e consolidar
          </Button>
          {devolvendo ? null : (
            <Button variant="quiet" iconName="undo-2" onClick={abrirDevolucao}>
              Devolver
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
