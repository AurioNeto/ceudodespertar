export function BarraDeEsqueleto({ w, h = 11, top = 0 }: { w: string; h?: number; top?: number }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        marginTop: top,
        borderRadius: 'var(--radius-sm)',
        background: 'linear-gradient(90deg,var(--bg-sunken) 25%,var(--bg-hover) 37%,var(--bg-sunken) 63%)',
        backgroundSize: '400% 100%',
        animation: 'cdd-sh 1.3s ease infinite',
      }}
    />
  );
}
