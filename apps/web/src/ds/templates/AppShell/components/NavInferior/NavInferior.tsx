import type { NavLink } from '../../navegacao';
import type { GrupoDoMenu } from '../../tipos';
import { BotaoDoMenu } from './components/BotaoDoMenu';
import { ItemDaBarra } from './components/ItemDaBarra';

export interface NavInferiorProps {
  naBarra: readonly NavLink[];
  foraDaBarra: readonly GrupoDoMenu[];
  activeId: string | undefined;
  userActive: boolean;
  temMenu: boolean;
  menu: { aberto: boolean; abrir: () => void };
  onNavigate: ((id: string) => void) | undefined;
}

export function NavInferior({
  naBarra,
  foraDaBarra,
  activeId,
  userActive,
  temMenu,
  menu,
  onNavigate,
}: NavInferiorProps) {
  return (
    <nav style={{ display: 'flex', background: 'var(--bg-card)', borderTop: '1px solid var(--color-line)' }}>
      {naBarra.map((item) => (
        <ItemDaBarra key={item.id} item={item} active={item.id === activeId} onNavigate={onNavigate} />
      ))}
      {temMenu ? (
        <BotaoDoMenu
          aberto={menu.aberto}
          ativo={userActive || foraDaBarra.some((grupo) => grupo.itens.some((item) => item.id === activeId))}
          aoAbrir={menu.abrir}
        />
      ) : null}
    </nav>
  );
}
