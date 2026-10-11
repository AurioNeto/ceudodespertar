import { Icon, StatusBadge, TextField, type Density } from '@/ds';
import { ANAMNESE_ROTULO, TOM_DA_ANAMNESE } from '../../constantes';
import { diretorio, type PessoaDoDiretorio } from '../../mocks/inscricao';
import { Bloco } from '../Bloco';

export interface BuscaDePessoaProps {
  busca: string;
  onBusca: (v: string) => void;
  onEscolher: (p: PessoaDoDiretorio) => void;
  densidade: Density;
}

export function BuscaDePessoa({ busca, onBusca, onEscolher, densidade }: BuscaDePessoaProps) {
  const campo = densidade === 'field';
  const termo = busca.trim().toLowerCase();
  const achados = termo
    ? diretorio.filter((d) => d.nome.toLowerCase().includes(termo) || d.cidade.toLowerCase().includes(termo))
    : diretorio;

  return (
    <Bloco titulo="Quem vai" densidade={densidade}>
      <TextField
        label="Buscar no diretório"
        placeholder="Nome ou cidade"
        value={busca}
        density={campo ? 'field' : 'office'}
        onChange={(e) => onBusca(e.target.value)}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {achados.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onEscolher(d)}
            style={{
              textAlign: 'left',
              border: 'var(--border-hairline)',
              borderRadius: 'var(--radius)',
              background: 'var(--bg-card)',
              padding: campo ? '13px 14px' : '12px 15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              minHeight: campo ? 'var(--target-field)' : undefined,
            }}
          >
            <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
              <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{d.nome}</span>
              <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                {d.vinculo} · {d.cidade}
              </span>
            </span>
            <StatusBadge tone={TOM_DA_ANAMNESE[d.anamnese]!}>{ANAMNESE_ROTULO[d.anamnese]}</StatusBadge>
            <Icon name="chevron-right" size={17} color="var(--text-meta)" />
          </button>
        ))}
        {achados.length === 0 ? (
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            Ninguém com esse nome. Quem chega pela primeira vez entra pelo cadastro rápido, e o cadastro é sempre
            humano — não há autoinscrição.
          </span>
        ) : null}
      </div>
    </Bloco>
  );
}
