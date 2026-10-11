import { useId } from 'react';
import type { GrupoDoMenu } from '../../../../tipos';
import { NavItem } from '../../../NavItem';
import { RotuloDeSecao } from '../../../RotuloDeSecao';

export function GrupoNoMenu({
  grupo,
  activeId,
  onNavigate,
}: {
  grupo: GrupoDoMenu;
  activeId: string | undefined;
  onNavigate: (id: string) => void;
}) {
  const idDoRotulo = useId();
  const nomeado = grupo.secao !== null;

  return (
    <div
      role={nomeado ? 'group' : undefined}
      aria-labelledby={nomeado ? idDoRotulo : undefined}
      style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      {nomeado ? <RotuloDeSecao id={idDoRotulo}>{grupo.secao}</RotuloDeSecao> : null}
      {grupo.itens.map((item) => (
        <NavItem
          key={item.id}
          item={item}
          active={item.id === activeId}
          onNavigate={onNavigate}
          densidade="field"
        />
      ))}
    </div>
  );
}
