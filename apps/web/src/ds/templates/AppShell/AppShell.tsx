import { Fragment, useId, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { Icon, type IconName } from '../../atoms/Icon';
import { PainelDeAcao } from '../../organisms/PainelDeAcao';
import type { Density } from '../../Button';

export interface NavLink {
  id: string;
  label: string;
  icon: IconName;
  count?: number;
}

export interface NavSection {
  section: string;
}

export type NavEntry = NavLink | NavSection;

const isSection = (e: NavEntry): e is NavSection => 'section' in e;

const ITENS_NA_BARRA_DE_CAMPO = 3;

interface GrupoDoMenu {
  readonly posicao: number;
  readonly secao: string | null;
  readonly itens: NavLink[];
}

function agruparForaDaBarra(nav: readonly NavEntry[], naBarra: number): readonly GrupoDoMenu[] {
  const grupos: GrupoDoMenu[] = [];
  let secaoAtual: string | null = null;
  let posicaoDaSecao = 0;
  let vistos = 0;
  for (const entrada of nav) {
    if (isSection(entrada)) {
      secaoAtual = entrada.section;
      posicaoDaSecao += 1;
      continue;
    }
    vistos += 1;
    if (vistos <= naBarra) continue;
    const ultimo = grupos.at(-1);
    if (ultimo?.posicao === posicaoDaSecao) ultimo.itens.push(entrada);
    else grupos.push({ posicao: posicaoDaSecao, secao: secaoAtual, itens: [entrada] });
  }
  return grupos;
}

function useMenuDeCampo(campo: boolean, ativo: string | undefined) {
  const [aberto, setAberto] = useState(false);
  const [contextoVisto, setContextoVisto] = useState({ campo, ativo });
  if (contextoVisto.campo !== campo || contextoVisto.ativo !== ativo) {
    setContextoVisto({ campo, ativo });
    setAberto(false);
  }
  return {
    aberto,
    abrir: () => setAberto(true),
    fechar: () => setAberto(false),
  };
}

function useDestinoDoFocoDeReserva() {
  const lateral = useRef<HTMLElement>(null);
  const principal = useRef<HTMLElement>(null);
  const destino = () =>
    lateral.current?.querySelector<HTMLElement>('[aria-current="page"]') ??
    lateral.current?.querySelector<HTMLElement>('nav button') ??
    principal.current;
  return { lateral, principal, destino };
}

export interface AppShellBrand {
  lines: readonly string[];
  tagline: string;
}

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
        <aside
          ref={foco.lateral}
          style={{
            background: 'var(--bg-rail)',
            borderRight: '1px solid var(--color-line-strong)',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px 0 14px',
            overflow: 'auto',
          }}
        >
          <div style={{ padding: '0 18px 18px' }}>
            <div
              style={{
                font: '800 15px/1.05 var(--font-display)',
                letterSpacing: '.01em',
                textTransform: 'uppercase',
                color: 'var(--color-ink-brand)',
              }}
            >
              {brand.lines.map((linha, posicao) => (
                <Fragment key={`${posicao}-${linha}`}>
                  {posicao > 0 ? <br /> : null}
                  {linha}
                </Fragment>
              ))}
            </div>
            <div
              style={{
                marginTop: 7,
                font: 'var(--text-label)',
                letterSpacing: 'var(--tracking-label)',
                textTransform: 'uppercase',
                color: 'var(--text-field-label)',
              }}
            >
              {brand.tagline}
            </div>
            <div style={{ marginTop: 14, height: 1, background: 'var(--color-line-gold)' }} />
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 10px', flex: 1 }}>
            {nav.map((item) =>
              isSection(item) ? (
                <RotuloDeSecao key={item.section}>{item.section}</RotuloDeSecao>
              ) : (
                <NavItem key={item.id} item={item} active={item.id === activeId} onNavigate={onNavigate} />
              ),
            )}
          </nav>

          <button
            type="button"
            onClick={onUserClick}
            title={userLabel}
            aria-current={userActive ? 'page' : undefined}
            style={{
              margin: '12px 10px 0',
              padding: '11px 8px 0',
              borderTop: '1px solid var(--color-line-strong)',
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              textAlign: 'left',
              cursor: onUserClick ? 'pointer' : 'default',
            }}
          >
            <SeloDoUsuario name={user.name} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', font: '600 13px var(--font-body)' }}>{user.name}</span>
              <span style={{ display: 'block', font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                {user.group}
              </span>
            </span>
          </button>
        </aside>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: field ? 'var(--bg-rail)' : 'var(--bg-card)',
            borderBottom: '1px solid var(--color-line)',
            borderTop: field ? '2px solid var(--color-royal)' : 0,
            padding: field ? '11px 16px' : '0 20px',
            minHeight: field ? 56 : 52,
            flex: '0 0 auto',
          }}
        >
          <span
            style={{
              font: 'var(--text-label)',
              letterSpacing: 'var(--tracking-label)',
              textTransform: 'uppercase',
              color: 'var(--text-field-label)',
            }}
          >
            {institution}
          </span>
          <button
            type="button"
            onClick={onUnitClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              font: '600 13px var(--font-body)',
              padding: '5px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-royal-soft)',
              color: 'var(--color-royal-ink)',
            }}
          >
            {unit}
            <Icon name="chevron-down" size={14} />
          </button>
          <span style={{ flex: 1 }} />
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            {field ? user.name : user.group}
          </span>
        </header>

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

function SeloDoUsuario({ name, decorativo = false }: { name: string; decorativo?: boolean }) {
  return (
    <span
      aria-hidden={decorativo ? true : undefined}
      style={{
        width: 30,
        height: 30,
        borderRadius: 'var(--radius-sm)',
        flex: '0 0 auto',
        background: 'var(--color-royal)',
        color: '#fff',
        display: 'grid',
        placeItems: 'center',
        font: '700 12px var(--font-data)',
      }}
    >
      {(name || '?').slice(0, 2).toUpperCase()}
    </span>
  );
}

function SeloDeContagem({ count, style }: { count: number | undefined; style?: CSSProperties }) {
  if (!count) return null;
  return (
    <span
      data-numeric
      style={{
        font: '600 11.5px var(--font-data)',
        background: 'var(--color-pending-soft)',
        color: 'var(--color-pending)',
        borderRadius: 'var(--radius-pill)',
        padding: '1px 7px',
        ...style,
      }}
    >
      {count}
    </span>
  );
}

function RotuloDeSecao({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <div
      id={id}
      style={{
        font: 'var(--text-label)',
        letterSpacing: 'var(--tracking-label)',
        textTransform: 'uppercase',
        color: 'var(--text-meta)',
        padding: '16px 8px 6px',
      }}
    >
      {children}
    </div>
  );
}

const estiloDoBotaoDaBarra = (ativo: boolean): CSSProperties => ({
  position: 'relative',
  flex: 1,
  minHeight: 'var(--target-field)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 3,
  color: ativo ? 'var(--color-royal)' : 'var(--text-secondary)',
  borderTop: `2px solid ${ativo ? 'var(--color-royal)' : 'transparent'}`,
});

const ROTULO_DA_BARRA: CSSProperties = { font: '600 10.5px var(--font-body)' };

function ItemDaBarra({
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

function BotaoDoMenu({ aberto, ativo, aoAbrir }: { aberto: boolean; ativo: boolean; aoAbrir: () => void }) {
  const focarEAbrir = (evento: MouseEvent<HTMLButtonElement>) => {
    evento.currentTarget.focus();
    aoAbrir();
  };

  return (
    <button
      type="button"
      onClick={focarEAbrir}
      aria-haspopup="dialog"
      aria-expanded={aberto}
      style={estiloDoBotaoDaBarra(ativo)}
    >
      <Icon name="menu" size={20} />
      <span style={ROTULO_DA_BARRA}>Menu</span>
    </button>
  );
}

interface MenuDeCampoProps {
  aberto: boolean;
  grupos: readonly GrupoDoMenu[];
  activeId: string | undefined;
  user: { name: string; group: string };
  userLabel: string;
  userActive: boolean;
  onNavigate: ((id: string) => void) | undefined;
  onUserClick: (() => void) | undefined;
  aoFechar: () => void;
  focoDeReserva: () => HTMLElement | null;
}

function MenuDeCampo({
  aberto,
  grupos,
  activeId,
  user,
  userLabel,
  userActive,
  onNavigate,
  onUserClick,
  aoFechar,
  focoDeReserva,
}: MenuDeCampoProps) {
  const navegarPara = (id: string) => {
    onNavigate?.(id);
    aoFechar();
  };
  const abrirPerfil = () => {
    onUserClick?.();
    aoFechar();
  };

  return (
    <PainelDeAcao aberto={aberto} titulo="Menu" variante="folha" aoFechar={aoFechar} focoDeReserva={focoDeReserva}>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {grupos.map((grupo) => (
          <GrupoNoMenu key={grupo.posicao} grupo={grupo} activeId={activeId} onNavigate={navegarPara} />
        ))}
        {onUserClick ? <PerfilNoMenu user={user} rotulo={userLabel} ativo={userActive} aoAbrir={abrirPerfil} /> : null}
      </nav>
    </PainelDeAcao>
  );
}

function GrupoNoMenu({
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

interface PerfilNoMenuProps {
  user: { name: string; group: string };
  rotulo: string;
  ativo: boolean;
  aoAbrir: () => void;
}

function PerfilNoMenu({ user, rotulo, ativo, aoAbrir }: PerfilNoMenuProps) {
  return (
    <button
      type="button"
      onClick={aoAbrir}
      aria-current={ativo ? 'page' : undefined}
      style={{
        marginTop: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-2)',
        minHeight: 'var(--target-field)',
        borderTop: '1px solid var(--color-line-strong)',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        textAlign: 'left',
      }}
    >
      <SeloDoUsuario name={user.name} decorativo />
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', font: '600 13.5px var(--font-body)' }}>{rotulo}</span>
        <span style={{ display: 'block', font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          {user.name} · {user.group}
        </span>
      </span>
    </button>
  );
}

function NavItem({
  item,
  active,
  onNavigate,
  densidade = 'office',
}: {
  item: NavLink;
  active: boolean;
  onNavigate?: (id: string) => void;
  densidade?: Density;
}) {
  const [hot, setHot] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onNavigate?.(item.id)}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      aria-current={active ? 'page' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        textAlign: 'left',
        minHeight: densidade === 'field' ? 'var(--target-field)' : 'var(--target-office)',
        padding: '0 10px',
        borderRadius: 'var(--radius-sm)',
        color: active ? 'var(--color-royal-deep)' : 'var(--text-primary)',
        background: active ? 'var(--bg-card)' : hot ? 'rgba(26,61,168,.06)' : 'transparent',
        boxShadow: active ? 'var(--shadow-raised)' : 'none',
        font: active ? '600 13.5px var(--font-body)' : '400 13.5px var(--font-body)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'background var(--motion-fast)',
      }}
    >
      {active ? (
        <span
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 'var(--edge-state)',
            background: 'var(--color-royal)',
          }}
        />
      ) : null}
      <Icon name={item.icon} size={17} color={active ? 'var(--color-royal)' : 'var(--text-meta)'} />
      <span style={{ flex: 1 }}>{item.label}</span>
      <SeloDeContagem count={item.count} />
    </button>
  );
}
