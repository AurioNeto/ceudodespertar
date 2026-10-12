export function SeloDoUsuario({ name, decorativo = false }: { name: string; decorativo?: boolean }) {
  return (
    <span
      aria-hidden={decorativo ? true : undefined}
      style={{
        width: 30,
        height: 30,
        borderRadius: 'var(--leaf-seal)',
        flex: '0 0 auto',
        background: 'var(--color-royal-soft)',
        color: 'var(--color-royal-ink)',
        display: 'grid',
        placeItems: 'center',
        font: '700 12px var(--font-data)',
      }}
    >
      {(name || '?').slice(0, 2).toUpperCase()}
    </span>
  );
}
