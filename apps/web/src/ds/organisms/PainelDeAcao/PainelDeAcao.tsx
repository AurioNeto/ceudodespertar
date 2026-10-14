import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Density } from '../../fundacao/densidade';
import { CabecalhoDoPainel } from './components/CabecalhoDoPainel';
import { DIALOGO_POR_VARIANTE, FUNDO_POR_VARIANTE } from './constantes';
import { vidroLeve } from '../../fundacao/estilos';

export type VarianteDoPainel = 'folha' | 'lateral' | 'central';

export interface PainelDeAcaoProps {
  aberto: boolean;
  titulo: string;
  descricao?: string;
  variante: VarianteDoPainel;
  aoFechar: () => void;
  focoDeReserva?: () => HTMLElement | null;
  children: ReactNode;
}

const SELETOR_DE_FOCAVEL =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';
const SELETOR_DE_CAMPO = 'input:not(:disabled), select:not(:disabled), textarea:not(:disabled)';

const focaveisDe = (raiz: HTMLElement): HTMLElement[] =>
  Array.from(raiz.querySelectorAll<HTMLElement>(SELETOR_DE_FOCAVEL));

export const varianteDoPainel = (densidade: Density): VarianteDoPainel =>
  densidade === 'field' ? 'folha' : 'lateral';

function isolarFundo(fundoDoPainel: HTMLElement | null): () => void {
  const corpoDaPagina = document.body;
  const overflowAnterior = corpoDaPagina.style.overflow;
  corpoDaPagina.style.overflow = 'hidden';
  const isolados = Array.from(corpoDaPagina.children).filter(
    (irmao): irmao is HTMLElement => irmao instanceof HTMLElement && irmao !== fundoDoPainel && !irmao.hasAttribute('inert'),
  );
  isolados.forEach((irmao) => {
    irmao.setAttribute('inert', '');
  });
  return () => {
    corpoDaPagina.style.overflow = overflowAnterior;
    isolados.forEach((irmao) => {
      irmao.removeAttribute('inert');
    });
  };
}

export function PainelDeAcao(props: PainelDeAcaoProps) {
  if (!props.aberto) return null;
  return createPortal(<PainelAberto {...props} />, document.body);
}

function PainelAberto({
  titulo,
  descricao,
  variante,
  aoFechar,
  focoDeReserva,
  children,
}: PainelDeAcaoProps) {
  const idDoTitulo = useId();
  const idDaDescricao = useId();
  const fundo = useRef<HTMLDivElement>(null);
  const dialogo = useRef<HTMLDivElement>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const corpo = useRef<HTMLDivElement>(null);
  const focoDeReservaAtual = useRef(focoDeReserva);

  const pointerdownComecouNoFundo = useRef(false);

  useEffect(() => {
    focoDeReservaAtual.current = focoDeReserva;
  });

  useEffect(() => {
    const quemAbriu = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const liberarFundo = isolarFundo(fundo.current);
    const primeiroCampo = corpo.current?.querySelector<HTMLElement>(SELETOR_DE_CAMPO);
    (primeiroCampo ?? tituloRef.current)?.focus();

    return () => {
      liberarFundo();
      const destino = quemAbriu?.isConnected ? quemAbriu : focoDeReservaAtual.current?.();
      destino?.focus();
    };
  }, []);

  const fecharComEsc = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (evento.key !== 'Escape' || evento.defaultPrevented || evento.nativeEvent.isComposing) return;
    evento.preventDefault();
    aoFechar();
  };

  const circularFocoComTab = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (evento.key !== 'Tab' || !dialogo.current) return;
    const focaveis = focaveisDe(dialogo.current);
    const primeiro = focaveis[0];
    const ultimo = focaveis.at(-1);
    if (!primeiro || !ultimo) return;
    const posicao = focaveis.findIndex((el) => el === document.activeElement);
    if (evento.shiftKey && posicao <= 0) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && posicao === focaveis.length - 1) {
      evento.preventDefault();
      primeiro.focus();
    }
  };

  const tratarTecla = (evento: KeyboardEvent<HTMLDivElement>) => {
    fecharComEsc(evento);
    circularFocoComTab(evento);
  };

  return (
    <div
      ref={fundo}
      data-testid="painel-de-acao-fundo"
      onPointerDown={(evento) => {
        pointerdownComecouNoFundo.current = evento.target === evento.currentTarget;
      }}
      onClick={(evento) => {
        const clicouNoFundo = evento.target === evento.currentTarget;
        const comecouNoFundo = pointerdownComecouNoFundo.current;
        pointerdownComecouNoFundo.current = false;
        if (clicouNoFundo && comecouNoFundo) aoFechar();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg-scrim)',
        backdropFilter: 'var(--glass)',
        WebkitBackdropFilter: 'var(--glass)',
        display: 'flex',
        zIndex: 40,
        ...FUNDO_POR_VARIANTE[variante],
      }}
    >
      <div
        ref={dialogo}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idDoTitulo}
        aria-describedby={descricao ? idDaDescricao : undefined}
        data-variante={variante}
        onKeyDown={tratarTecla}
        tabIndex={-1}
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-card)',
          ...vidroLeve,
          outline: 'none',
          ...DIALOGO_POR_VARIANTE[variante],
        }}
      >
        <CabecalhoDoPainel
          titulo={titulo}
          descricao={descricao}
          idDoTitulo={idDoTitulo}
          idDaDescricao={idDaDescricao}
          refDoTitulo={tituloRef}
          aoFechar={aoFechar}
        />

        <div ref={corpo} style={{ flex: 1, overflow: 'auto', padding: '0 var(--space-5) var(--space-4)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
