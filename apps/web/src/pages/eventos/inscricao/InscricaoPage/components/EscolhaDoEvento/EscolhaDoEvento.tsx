import { Cartao, SeletorDeTipo, type Density } from '@/ds';
import { eventos } from '../../../mocks/eventos';

export interface EscolhaDoEventoProps {
  eventoId: string;
  onTrocar: (v: string) => void;
  densidade: Density;
}

export function EscolhaDoEvento({ eventoId, onTrocar, densidade }: EscolhaDoEventoProps) {
  const campo = densidade === 'field';
  const evento = eventos.find((e) => (e.id as string) === eventoId)!;
  return (
    <Cartao campo={campo} style={{ gap: 11 }}>
      <SeletorDeTipo
        opcoes={eventos.map((e) => ({ valor: e.id as string, label: e.abreviacao }))}
        valor={eventoId}
        onEscolher={onTrocar}
        densidade={campo ? 'field' : 'office'}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 14px', alignItems: 'baseline' }}>
        <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>
          {evento.nome} — {evento.data}
        </span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>{evento.local}</span>
        <span style={{ flex: 1 }} />
        <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          {evento.inscritos} de {evento.capacidade} · {evento.leitosLivres} leitos livres
        </span>
      </div>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
        Nome e data juntos porque há mais de um trabalho no mesmo mês.
      </span>
    </Cartao>
  );
}
