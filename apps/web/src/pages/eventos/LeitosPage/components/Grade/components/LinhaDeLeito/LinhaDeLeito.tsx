import type { Leito } from '@cdd/contracts';
import type { Density } from '@/ds';
import { TIPO_LEITO_ROTULO } from '../../../../constantes';
import { eventoDoMapa, liberadoPorCancelamento, type NoiteId } from '../../../../mocks/leitos';
import { Celula } from './components/Celula';

export interface LinhaDeLeitoProps {
  leito: Leito;
  densidade: Density;
  ocupantesDe: (leitoId: string, noite: string) => readonly string[];
  escolhendo: { leitoId: string; noite: NoiteId } | null;
  onEscolher: (leitoId: string, noite: NoiteId) => void;
  onLiberar: (leitoId: string, noite: string, inscricaoId: string) => void;
}

export function LinhaDeLeito({
  leito: l,
  densidade,
  ocupantesDe,
  escolhendo,
  onEscolher,
  onLiberar,
}: LinhaDeLeitoProps) {
  const leitoId = l.id as string;
  const liberado = liberadoPorCancelamento.leitoId === leitoId;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `minmax(96px, 1.1fr) repeat(${eventoDoMapa.noites.length}, minmax(104px, 1fr))`, gap: 7, alignItems: 'stretch' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'center', minWidth: 0, opacity: l.ativo ? 1 : 0.5 }}>
        <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{l.identificacao}</span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          {l.ativo ? TIPO_LEITO_ROTULO[l.tipo] : 'inativo'}
        </span>
      </div>

      {eventoDoMapa.noites.map((n) => (
        <Celula
          key={n.chave}
          leito={l}
          noite={n}
          densidade={densidade}
          ocupantes={ocupantesDe(leitoId, n.chave)}
          selecionada={escolhendo?.leitoId === leitoId && escolhendo.noite === n.chave}
          mostrarLiberado={liberado && n.chave === eventoDoMapa.noites[0].chave}
          onEscolher={() => onEscolher(leitoId, n.chave)}
          onLiberar={(inscricaoId) => onLiberar(leitoId, n.chave, inscricaoId)}
        />
      ))}
    </div>
  );
}
