import { Button } from '@/ds';
import type { ParticipanteDoTrabalho } from '../../../../tipos';
import { Bloco } from '../Bloco';
import { Numero } from '../Numero';
import { VERSAO_DO_FORMULARIO } from './mocks/formulario';

export interface AnamneseDoTrabalhoProps {
  semAnamnese: readonly ParticipanteDoTrabalho[];
  vencidas: readonly ParticipanteDoTrabalho[];
  emDia: readonly ParticipanteDoTrabalho[];
  comAtencao: readonly ParticipanteDoTrabalho[];
  onAviso: (texto: string) => void;
}

export function AnamneseDoTrabalho({ semAnamnese, vencidas, emDia, comAtencao, onAviso }: AnamneseDoTrabalhoProps) {
  return (
    <Bloco
      titulo="Anamnese do trabalho"
      nota={
        semAnamnese.length === 0 && vencidas.length === 0
          ? 'todos com anamnese em dia'
          : `${semAnamnese.length} sem resposta · ${vencidas.length} vencidas`
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 }}>
        <Numero rotulo="Em dia" valor={`${emDia.length}`} cor="var(--color-confirmed)" />
        <Numero rotulo="Vencidas" valor={`${vencidas.length}`} cor="var(--color-suggest)" />
        <Numero rotulo="Sem resposta" valor={`${semAnamnese.length}`} cor="var(--color-pending)" />
        <Numero rotulo="Pontos de atenção" valor={`${comAtencao.length}`} cor="var(--color-attention)" />
      </div>

      {comAtencao.length ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            background: 'var(--color-attention-soft)',
            border: '1px solid var(--color-attention-border)',
            borderRadius: 'var(--radius)',
            padding: '12px 14px',
          }}
        >
          {comAtencao.slice(0, 5).map((p) => (
            <div key={p.nome} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
              <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{p.nome}</span>
              <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>— {p.atencao}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
          borderTop: 'var(--border-hairline)',
          paddingTop: 12,
        }}
      >
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', flex: 1, minWidth: 0 }}>
          Formulário em uso: versão {VERSAO_DO_FORMULARIO}, publicada em 12/06/2026.
        </span>
        <Button
          variant="ghost"
          iconName="send"
          onClick={() => onAviso('Convite de anamnese enviado a quem está sem resposta ou com resposta vencida.')}
        >
          Cobrar quem está pendente
        </Button>
      </div>
    </Bloco>
  );
}
