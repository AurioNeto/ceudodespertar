import { Icon } from './atoms/Icon';

export const TEXTO_DA_FAIXA_DE_DEMONSTRACAO =
  'Dados de demonstração. Esta tela ainda não está ligada ao sistema: o que aparece aqui é exemplo e nada é gravado.';

export function FaixaDeDemonstracao() {
  return (
    <div
      role="note"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 20px',
        background: 'var(--color-royal-soft)',
        borderBottom: '1px solid var(--color-royal)',
        color: 'var(--color-royal-deep)',
        font: 'var(--text-small)',
      }}
    >
      <Icon name="circle-alert" size={16} color="var(--color-royal)" style={{ flex: '0 0 auto' }} />
      <span>{TEXTO_DA_FAIXA_DE_DEMONSTRACAO}</span>
    </div>
  );
}
