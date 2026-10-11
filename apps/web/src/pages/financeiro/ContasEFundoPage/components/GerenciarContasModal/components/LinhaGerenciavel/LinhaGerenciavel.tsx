import { Icon, StatusBadge } from '@/ds';

export interface LinhaGerenciavelProps {
  marcador: React.ReactNode;
  nome: string;
  nota: string;
  valor?: string;
  ativa: boolean;
  rotuloAtiva: string;
  rotuloInativa: string;
  onEditar: () => void;
  onAlternar: () => void;
}

export function LinhaGerenciavel({
  marcador,
  nome,
  nota,
  valor,
  ativa,
  rotuloAtiva,
  rotuloInativa,
  onEditar,
  onAlternar,
}: LinhaGerenciavelProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius-sm)',
        background: ativa ? 'var(--bg-card)' : 'var(--bg-sunken)',
        opacity: ativa ? 1 : 0.7,
      }}
    >
      {marcador}
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{nome}</span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{nota}</span>
      </span>
      {valor ? (
        <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
          {valor}
        </span>
      ) : null}
      <StatusBadge tone={ativa ? 'confirmed' : 'neutral'}>{ativa ? rotuloAtiva : rotuloInativa}</StatusBadge>
      <button
        type="button"
        aria-label={`editar ${nome}`}
        onClick={onEditar}
        style={{
          width: 32,
          height: 32,
          flex: '0 0 auto',
          border: '1px solid var(--color-line)',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-pill)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="pencil" size={15} color="var(--text-secondary)" />
      </button>
      <button
        type="button"
        onClick={onAlternar}
        style={{
          flex: '0 0 auto',
          padding: '0 14px',
          minHeight: 38,
          font: 'var(--text-small)',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          border: `1px solid ${ativa ? 'var(--color-line)' : 'var(--color-confirmed)'}`,
          background: 'var(--bg-card)',
          color: ativa ? 'var(--color-attention)' : 'var(--color-confirmed)',
        }}
      >
        {ativa ? 'Excluir' : 'Reativar'}
      </button>
    </div>
  );
}
