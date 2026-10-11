import { Icon, StatusBadge } from '@/ds';
import { formatarValor } from '@/lib/formato';
import type { ParticipanteDoTrabalho } from '../../../../tipos';
import { Bloco } from '../Bloco';
import { TEXTO_DA_ANAMNESE, TOM_DA_ANAMNESE } from './constantes';

export interface ListaDeParticipantesProps {
  participantes: readonly ParticipanteDoTrabalho[];
  confirmados: readonly ParticipanteDoTrabalho[];
  emEspera: readonly ParticipanteDoTrabalho[];
  visitantes: readonly ParticipanteDoTrabalho[];
  onAviso: (texto: string) => void;
}

export function ListaDeParticipantes({
  participantes,
  confirmados,
  emEspera,
  visitantes,
  onAviso,
}: ListaDeParticipantesProps) {
  return (
    <Bloco
      titulo="Participantes"
      nota={`${confirmados.length} confirmados · ${emEspera.length} em espera · ${visitantes.length} visitantes${
        participantes.length > 12 ? ` · mostrando 12 de ${participantes.length}` : ''
      }`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {participantes.slice(0, 12).map((p) => (
          <button
            key={p.nome}
            type="button"
            onClick={() => onAviso(`Ficha de ${p.nome} — cadastro e anamneses ficam na tela Pessoas.`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              padding: '10px 12px',
              border: 'var(--border-hairline)',
              borderLeft: `3px solid ${p.situacao === 'confirmado' ? 'var(--color-confirmed)' : 'var(--color-pending)'}`,
              borderRadius: 'var(--radius)',
              background: 'var(--bg-card)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ flex: '1 1 200px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{p.nome}</span>
              <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>{p.contato}</span>
            </span>
            {p.atencao ? (
              <span title={p.atencao} style={{ display: 'flex', alignItems: 'center', cursor: 'help' }}>
                <Icon name="triangle-alert" size={16} color="var(--color-attention)" />
              </span>
            ) : null}
            <StatusBadge tone={TOM_DA_ANAMNESE[p.anamnese]}>{TEXTO_DA_ANAMNESE[p.anamnese]}</StatusBadge>
            <StatusBadge tone={p.situacao === 'confirmado' ? 'royal' : 'pending'}>
              {p.situacao === 'confirmado' ? 'Confirmado' : 'Em espera'}
            </StatusBadge>
            {p.contribuicao ? (
              <span
                style={{
                  font: 'var(--text-amount)',
                  letterSpacing: 'var(--tracking-amount)',
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--text-primary)',
                }}
              >
                {formatarValor(p.contribuicao)}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </Bloco>
  );
}
