export interface ItemDaLegendaProps {
  cor: string;
  linha?: boolean;
  children: string;
}

export function ItemDaLegenda({ cor, linha = false, children }: ItemDaLegendaProps) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
      <span style={{ width: linha ? 14 : 10, height: linha ? 2 : 10, borderRadius: linha ? 0 : 2, background: cor }} />
      {children}
    </span>
  );
}
