export function AvisoDeIntervalo() {
  return (
    <div
      role="status"
      style={{
        font: 'var(--text-small)',
        color: 'var(--color-attention)',
        background: 'var(--color-attention-soft)',
        border: '1px solid var(--color-attention-border)',
        borderRadius: 'var(--radius)',
        padding: '9px 13px',
      }}
    >
      O mês De vem depois do mês Até. Nada foi somado: confira o período.
    </div>
  );
}
