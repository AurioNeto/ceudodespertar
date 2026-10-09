import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Density } from './Button';
import { Icon } from './Icon';

export type VarianteDoPainel = 'folha' | 'lateral';

export interface PainelDeAcaoProps {
  aberto: boolean;
  titulo: string;
  descricao?: string;
  variante: VarianteDoPainel;
  aoFechar: () => void;
  fechamentoBloqueado?: boolean;
  rodape?: ReactNode;
  focoDeReserva?: () => HTMLElement | null;
  children: ReactNode;
}

const SELETOR_DE_FOCAVEL =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const SELETOR_DE_CAMPO = 'input:not([disabled]), select:not([disabled]), textarea:not([disabled])';
const ALVO_MINIMO_DE_TOQUE = 44;
const LARGURA_LATERAL = 'min(440px, 100vw)';

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
  fechamentoBloqueado = false,
  rodape,
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

  const pedirFechamento = () => {
    if (!fechamentoBloqueado) aoFechar();
  };
  const pedirFechamentoAtual = useRef(pedirFechamento);

  useEffect(() => {
    focoDeReservaAtual.current = focoDeReserva;
    pedirFechamentoAtual.current = pedirFechamento;
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

  useEffect(() => {
    const fecharComEsc = (evento: globalThis.KeyboardEvent) => {
      if (evento.key !== 'Escape' || evento.defaultPrevented || evento.isComposing) return;
      evento.preventDefault();
      pedirFechamentoAtual.current();
    };
    document.addEventListener('keydown', fecharComEsc);
    return () => document.removeEventListener('keydown', fecharComEsc);
  }, []);

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

  const lateral = variante === 'lateral';

  return (
    <div
      ref={fundo}
      data-testid="painel-de-acao-fundo"
      onClick={(evento) => {
        if (evento.target === evento.currentTarget) pedirFechamento();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg-scrim)',
        display: 'flex',
        alignItems: lateral ? 'stretch' : 'flex-end',
        justifyContent: lateral ? 'flex-end' : 'center',
        zIndex: 40,
      }}
    >
      <div
        ref={dialogo}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idDoTitulo}
        aria-describedby={descricao ? idDaDescricao : undefined}
        data-variante={variante}
        onKeyDown={circularFocoComTab}
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: lateral ? LARGURA_LATERAL : '100%',
          height: lateral ? '100%' : undefined,
          maxHeight: lateral ? undefined : '90dvh',
          background: 'var(--bg-card)',
          borderRadius: lateral ? 0 : 'var(--radius-lg) var(--radius-lg) 0 0',
          boxShadow: lateral ? 'var(--shadow-raised)' : 'var(--shadow-sheet)',
          borderLeft: lateral ? 'var(--border-hairline)' : undefined,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--space-3)',
            padding: 'var(--space-5) var(--space-5) var(--space-3)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              id={idDoTitulo}
              ref={tituloRef}
              tabIndex={-1}
              style={{ margin: 0, font: 'var(--text-title)', color: 'var(--text-title)' }}
            >
              {titulo}
            </h2>
            {descricao ? (
              <p
                id={idDaDescricao}
                style={{ margin: 'var(--space-1) 0 0', font: 'var(--text-small)', color: 'var(--text-secondary)' }}
              >
                {descricao}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={pedirFechamento}
            style={{
              display: 'grid',
              placeItems: 'center',
              minWidth: ALVO_MINIMO_DE_TOQUE,
              minHeight: ALVO_MINIMO_DE_TOQUE,
              marginTop: 'calc(var(--space-2) * -1)',
              marginRight: 'calc(var(--space-2) * -1)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              borderRadius: 'var(--radius)',
            }}
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        <div ref={corpo} style={{ flex: 1, overflow: 'auto', padding: '0 var(--space-5) var(--space-4)' }}>
          {children}
        </div>

        {rodape ? (
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-3)',
              justifyContent: 'flex-end',
              padding: 'var(--space-4) var(--space-5)',
              borderTop: 'var(--border-hairline)',
            }}
          >
            {rodape}
          </div>
        ) : null}
      </div>
    </div>
  );
}
