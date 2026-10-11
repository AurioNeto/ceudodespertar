import type { CSSProperties, ReactNode } from 'react';
import type { Density } from '../../fundacao/densidade';
import { BarraDeContexto } from './components/BarraDeContexto';
import { ChipDoUsuario } from './components/ChipDoUsuario';
import { MenuDeCampo } from './components/MenuDeCampo';
import { NavInferior } from './components/NavInferior';
import { RailDeNavegacao } from './components/RailDeNavegacao';
import { useDestinoDoFocoDeReserva } from './hooks/useDestinoDoFocoDeReserva';
import { useMenuDeCampo } from './hooks/useMenuDeCampo';
import { isSection, type NavEntry, type NavLink } from './navegacao';
import type { AppShellBrand } from './tipos';
import { agruparForaDaBarra } from './utils/agruparForaDaBarra';

const ITENS_NA_BARRA_DE_CAMPO = 3;

export interface AppShellProps {
  institution: string;
  unit: string;
  brand: AppShellBrand;
  user: { name: string; group: string };
  userLabel: string;
  userActive?: boolean;
  nav?: readonly NavEntry[];
  activeId?: string;
  onNavigate?: (id: string) => void;
  onUnitClick?: () => void;
  onUserClick?: () => void;
  density?: Density;
  children: ReactNode;
  style?: CSSProperties;
}

/**
 * v3: o rail não é um bloco azul-marinho. É papel esfriado — royal a 8% —
 * com tinta royal, fio na borda e o item ativo em cartão branco.
 */
export function AppShell({
  institution,
  unit,
  brand,
  user,
  userLabel,
  userActive = false,
  nav = [],
  activeId,
  onNavigate,
  onUnitClick,
  onUserClick,
  density = 'office',
  children,
  style,
}: AppShellProps) {
  const field = density === 'field';
  const links = nav.filter((n): n is NavLink => !isSection(n));
  const naBarra = links.slice(0, ITENS_NA_BARRA_DE_CAMPO);
  const foraDaBarra = agruparForaDaBarra(nav, ITENS_NA_BARRA_DE_CAMPO);
  const temMenu = foraDaBarra.length > 0 || onUserClick !== undefined;
  const menu = useMenuDeCampo(field, activeId);
  const foco = useDestinoDoFocoDeReserva();

  return (
    <div
      data-density={density}
      style={{
        display: 'grid',
        gridTemplateColumns: field ? '1fr' : '232px 1fr',
        height: '100%',
        minHeight: 0,
        background: 'var(--bg-app)',
        color: 'var(--text-primary)',
        ...style,
      }}
    >
      {field ? null : (
        <RailDeNavegacao ref={foco.lateral} brand={brand} nav={nav} activeId={activeId} onNavigate={onNavigate}>
          <ChipDoUsuario user={user} userLabel={userLabel} userActive={userActive} onUserClick={onUserClick} />
        </RailDeNavegacao>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        <BarraDeContexto
          institution={institution}
          unit={unit}
          user={user}
          onUnitClick={onUnitClick}
          densidade={density}
        />

        {/*
          A estampa fica no papel do conteúdo, e só nele: a barra de rolagem é
          desta caixa, então o desenho se mantém parado enquanto o conteúdo
          corre por cima — textura de papel, não plano de fundo em movimento.
        */}
        <main
          ref={foco.principal}
          tabIndex={-1}
          className="cdd-papel-estampado"
          style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'auto' }}
        >
          {children}
        </main>

        {field && (naBarra.length > 0 || temMenu) ? (
          <NavInferior
            naBarra={naBarra}
            foraDaBarra={foraDaBarra}
            activeId={activeId}
            userActive={userActive}
            temMenu={temMenu}
            menu={menu}
            onNavigate={onNavigate}
          />
        ) : null}
      </div>

      <MenuDeCampo
        aberto={menu.aberto}
        grupos={foraDaBarra}
        activeId={activeId}
        user={user}
        userLabel={userLabel}
        userActive={userActive}
        onNavigate={onNavigate}
        onUserClick={onUserClick}
        aoFechar={menu.fechar}
        focoDeReserva={foco.destino}
      />
    </div>
  );
}
