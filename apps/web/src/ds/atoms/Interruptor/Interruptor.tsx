export function Interruptor({
  ligado,
  onAlternar,
  rotuloAcessivel,
}: {
  ligado: boolean;
  onAlternar: () => void;
  rotuloAcessivel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotuloAcessivel}
      onClick={onAlternar}
      style={{
        width: 52,
        height: 30,
        flex: '0 0 auto',
        borderRadius: 'var(--leaf-seal)',
        cursor: 'pointer',
        padding: 3,
        display: 'flex',
        justifyContent: ligado ? 'flex-end' : 'flex-start',
        background: ligado ? 'var(--color-royal)' : 'var(--color-line-strong)',
        transition: 'background var(--motion-fast)',
      }}
    >
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: 'var(--leaf-seal)',
          background: 'var(--bg-card)',
          boxShadow: 'var(--shadow-raised)',
          display: 'block',
        }}
      />
    </button>
  );
}
