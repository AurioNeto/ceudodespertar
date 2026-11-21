import { AmountDisplay, BotaoDeIcone, StatusBadge, vidroLeve, fundoComVidro } from '@/ds';

export interface LinhaGerenciavelProps {
  marcador: React.ReactNode;
  nome: string;
  nota: string;
  valor?: number;
  ativa: boolean;
  rotuloAtiva: string;
  rotuloInativa: string;
  onEditar: () => void;
  onAlternar: () => void;
  bloqueio?: string;
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
  bloqueio,
}: LinhaGerenciavelProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--leaf-sm)',
        ...fundoComVidro(ativa ? 'var(--bg-card)' : 'var(--bg-sunken)'),
        opacity: ativa ? 1 : 0.7,
      }}
    >
      {marcador}
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{nome}</span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{nota}</span>
        {bloqueio ? <span style={{ font: 'var(--text-small)', color: 'var(--color-attention)' }}>{bloqueio}</span> : null}
      </span>
      {valor === undefined ? null : <AmountDisplay value={valor / 100} size="sm" />}
      <StatusBadge tone={ativa ? 'confirmed' : 'neutral'}>{ativa ? rotuloAtiva : rotuloInativa}</StatusBadge>
      <BotaoDeIcone
        icone="pencil"
        tamanhoDoIcone={15}
        medida={32}
        aria-label={`editar ${nome}`}
        onClick={onEditar}
        style={{
          flex: '0 0 auto',
          border: '1px solid var(--color-line)',
          background: 'var(--bg-card)',
          ...vidroLeve,
          borderRadius: 'var(--leaf-seal)',
          color: 'var(--text-secondary)',
        }}
      />
      <button
        type="button"
        onClick={onAlternar}
        disabled={Boolean(bloqueio)}
        title={bloqueio}
        style={{
          flex: '0 0 auto',
          padding: '0 14px',
          minHeight: 38,
          font: 'var(--text-small)',
          borderRadius: 'var(--leaf-md)',
          cursor: bloqueio ? 'not-allowed' : 'pointer',
          border: `1px solid ${ativa ? 'var(--color-line)' : 'var(--color-confirmed)'}`,
          background: 'var(--bg-card)',
          ...vidroLeve,
          color: ativa ? 'var(--color-attention)' : 'var(--color-confirmed)',
        }}
      >
        {ativa ? 'Excluir' : 'Reativar'}
      </button>
    </div>
  );
}
