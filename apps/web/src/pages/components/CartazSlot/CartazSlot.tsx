import type { Anexo } from '@cdd/contracts';

export interface CartazSlotProps {
  cartaz?: Anexo | null;
  largura: number;
  altura: number;
  alt?: string;
}

/**
 * Miniatura do cartaz da cerimônia. No protótipo era um slot em que se
 * arrastava a imagem; aqui o cartaz é o anexo do evento, e o espaço vazio
 * continua marcado para a cerimônia que ainda não tem arte.
 */
export function CartazSlot({ cartaz, largura, altura, alt = 'Cartaz da cerimônia' }: CartazSlotProps) {
  return (
    <div
      style={{
        position: 'relative',
        flex: '0 0 auto',
        width: largura,
        height: altura,
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
        background: 'var(--bg-brand)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {cartaz ? (
        <img src={cartaz.url} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span
          style={{
            font: 'var(--text-label)',
            textTransform: 'uppercase',
            letterSpacing: 'var(--tracking-label)',
            color: 'var(--text-meta)',
          }}
        >
          cartaz
        </span>
      )}
    </div>
  );
}
