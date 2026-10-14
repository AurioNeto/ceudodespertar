import type { ItemNaFila } from '@cdd/contracts';
import { Button, Icon, PainelDeAcao, StatusBadge, type IconName } from '@/ds';
import { ROTULO_DO_VALOR } from '@/pages/financeiro/lancamentos/constantes';
import { formatarData } from '@/pages/utils/formato';
import { CONFIANCA, MOTIVO_DO_PERIODO_FECHADO_NA_REVISAO, ORIGENS } from '../../constantes';
import { emPeriodoFechado } from '../../utils/periodoFechado';
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
  const fechado = emPeriodoFechado(item);

  const origem = ORIGENS[item.origem];
  const confianca = CONFIANCA[item.confianca];
  const ehTransferencia = item.tipo === 'TRANSFERENCIA';
  const ehEntrada = item.tipo === 'ENTRADA';

  return (
    <PainelDeAcao aberto titulo="Revisar lançamento" variante={campo ? 'folha' : 'lateral'} aoFechar={onFechar}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <StatusBadge tone={confianca.tone}>{confianca.texto}</StatusBadge>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'var(--bg-sunken)',
            border: 'var(--border-hairline)',
            borderRadius: 'var(--leaf-md)',
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
          rotulo={ROTULO_DO_VALOR[item.tipo]}
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

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Button
            iconName="check"
            disabled={fechado}
            blockedReason={fechado ? MOTIVO_DO_PERIODO_FECHADO_NA_REVISAO : undefined}
            onClick={() => onAprovar(rascunho)}
          >
            Aprovar e consolidar
          </Button>
          {devolvendo ? null : (
            <Button variant="quiet" iconName="undo-2" onClick={abrirDevolucao}>
              Devolver
            </Button>
          )}
        </div>
      </div>
    </PainelDeAcao>
  );
}
