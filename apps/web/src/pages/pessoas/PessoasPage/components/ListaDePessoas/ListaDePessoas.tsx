import { Avatar, Icon, StatusBadge } from '@/ds';
import { TEXTO_DA_ANAMNESE, TOM_DA_ANAMNESE } from '../../constantes';
import type { AcessoAoSistema, PessoaDaCasa } from '../../mocks/pessoas';

export interface ListaDePessoasProps {
  pessoas: readonly PessoaDaCasa[];
  acessos: Readonly<Record<number, AcessoAoSistema>>;
  onAbrir: (id: number) => void;
}

export function ListaDePessoas({ pessoas, acessos, onAbrir }: ListaDePessoasProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {pessoas.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onAbrir(p.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            padding: '11px 14px',
            border: 'var(--border-hairline)',
            borderRadius: 'var(--radius)',
            background: p.ativa ? 'var(--bg-card)' : 'var(--bg-sunken)',
            opacity: p.ativa ? 1 : 0.75,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <Avatar nome={p.nome} />
          <span style={{ flex: '1 1 220px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{p.nome}</span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
              {p.vinculo} desde {p.desde} · {p.cidade}
            </span>
          </span>
          {p.pontos.length ? (
            <span title={p.pontos.map(([t]) => t).join(' · ')} style={{ display: 'flex', cursor: 'help' }}>
              <Icon name="triangle-alert" size={16} color="var(--color-attention)" />
            </span>
          ) : null}
          <StatusBadge tone={TOM_DA_ANAMNESE[p.anamnese]}>{TEXTO_DA_ANAMNESE[p.anamnese]}</StatusBadge>
          {acessos[p.id] ? <StatusBadge tone="royal">{acessos[p.id]!.grupo}</StatusBadge> : null}
          {!p.ativa ? <StatusBadge tone="neutral">Inativa</StatusBadge> : null}
        </button>
      ))}
    </div>
  );
}
