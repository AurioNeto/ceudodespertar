import { Icon } from '../../../../../../atoms/Icon';
import type { NavLink } from '../../../../navegacao';
import { SeloDeContagem } from '../../../SeloDeContagem';
import { ROTULO_DA_BARRA } from '../../constantes';
import { estiloDoBotaoDaBarra } from '../../utils/estiloDoBotaoDaBarra';

export function ItemDaBarra({
  item,
  active,
  onNavigate,
}: {
  item: NavLink;
  active: boolean;
  onNavigate?: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onNavigate?.(item.id)}
      aria-current={active ? 'page' : undefined}
      style={estiloDoBotaoDaBarra(active)}
    >
      <Icon name={item.icon} size={20} />
      <span style={ROTULO_DA_BARRA}>{item.label}</span>
      <SeloDeContagem
        count={item.count}
        style={{ position: 'absolute', top: 'var(--space-1)', left: 'calc(50% + 6px)' }}
      />
    </button>
  );
}
