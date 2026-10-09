import { act, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { errosDurante, glifoDe } from './apoioDeTeste';
import { PainelDeAcao, varianteDoPainel, type VarianteDoPainel } from './PainelDeAcao';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

interface AnfitriaoProps {
  variante?: VarianteDoPainel;
  comCampo?: boolean;
  aoFecharExtra?: () => void;
  focoDeReserva?: () => HTMLElement | null;
}

function Anfitriao({ variante = 'folha', comCampo = true, aoFecharExtra, focoDeReserva }: AnfitriaoProps) {
  const [aberto, setAberto] = useState(false);
  const [gatilhoVisivel, setGatilhoVisivel] = useState(true);
  return (
    <>
      {gatilhoVisivel ? (
        <button type="button" onClick={() => setAberto(true)}>
          Abrir
        </button>
      ) : null}
      <button type="button" onClick={() => setGatilhoVisivel(false)}>
        Sumir gatilho
      </button>
      <PainelDeAcao
        aberto={aberto}
        titulo="Gerenciar acesso"
        descricao="Escolha o que fazer"
        variante={variante}
        aoFechar={() => {
          aoFecharExtra?.();
          setAberto(false);
        }}
        {...(focoDeReserva ? { focoDeReserva } : {})}
      >
        {comCampo ? <input aria-label="Motivo" /> : <p>Sem campos</p>}
        <button type="button">Ação interna</button>
      </PainelDeAcao>
    </>
  );
}

let container: HTMLElement;
let raiz: Root;

const botao = (rotulo: string): HTMLButtonElement => {
  const encontrado = Array.from(document.querySelectorAll('button')).find((b) => b.textContent === rotulo);
  if (!encontrado) throw new Error(`botão não encontrado: ${rotulo}`);
  return encontrado;
};
const dialogo = () => document.querySelector<HTMLElement>('[role="dialog"]');
const clicar = (el: HTMLElement) => act(async () => el.click());
const teclar = (alvo: EventTarget, key: string, opcoes: KeyboardEventInit = {}) =>
  act(async () => {
    alvo.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opcoes }));
  });

const teclarEsc = () => teclar(document.activeElement ?? document.body, 'Escape');
const fundoDoPainel = () => document.querySelector<HTMLElement>('[data-testid="painel-de-acao-fundo"]') as HTMLElement;
const apertarMouse = (alvo: HTMLElement) =>
  act(async () => {
    alvo.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
  });

async function montar(props: AnfitriaoProps = {}) {
  await act(async () => raiz.render(<Anfitriao {...props} />));
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  raiz = createRoot(container);
});

afterEach(async () => {
  await act(async () => raiz.unmount());
  container.remove();
});

describe('PainelDeAcao', () => {
  it('fechado não renderiza nada', async () => {
    await montar();
    expect(dialogo()).toBeNull();
  });

  it('abre num portal no body, com semântica de diálogo modal nomeado pelo título', async () => {
    await montar();
    await clicar(botao('Abrir'));
    const d = dialogo();
    expect(d).not.toBeNull();
    expect(container.contains(d)).toBe(false);
    expect(d?.getAttribute('aria-modal')).toBe('true');
    const titulo = document.getElementById(d?.getAttribute('aria-labelledby') ?? '');
    expect(titulo?.textContent).toBe('Gerenciar acesso');
    expect(document.getElementById(d?.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      'Escolha o que fazer',
    );
  });

  it('leva o foco inicial ao primeiro campo', async () => {
    await montar();
    await clicar(botao('Abrir'));
    expect(document.activeElement).toBe(document.querySelector('input[aria-label="Motivo"]'));
  });

  it('sem campo, o foco inicial vai ao título', async () => {
    await montar({ comCampo: false });
    await clicar(botao('Abrir'));
    expect(document.activeElement?.tagName).toBe('H2');
    expect(document.activeElement?.textContent).toBe('Gerenciar acesso');
  });

  it('Esc fecha e devolve o foco a quem abriu', async () => {
    const aoFecharExtra = vi.fn();
    await montar({ aoFecharExtra });
    const gatilho = botao('Abrir');
    gatilho.focus();
    await clicar(gatilho);
    await teclar(document.activeElement ?? document.body, 'Escape');
    expect(aoFecharExtra).toHaveBeenCalledTimes(1);
    expect(dialogo()).toBeNull();
    expect(document.activeElement).toBe(gatilho);
  });

  it('o botão Fechar tem nome acessível, fecha e devolve o foco', async () => {
    await montar();
    const gatilho = botao('Abrir');
    gatilho.focus();
    await clicar(gatilho);
    const fechar = document.querySelector<HTMLElement>('button[aria-label="Fechar"]');
    expect(fechar).not.toBeNull();
    await clicar(fechar as HTMLElement);
    expect(dialogo()).toBeNull();
    expect(document.activeElement).toBe(gatilho);
  });

  it('o botão Fechar mostra só o ícone de x, decorativo', async () => {
    await montar();
    await clicar(botao('Abrir'));
    const fechar = document.querySelector('button[aria-label="Fechar"]') as HTMLElement;
    const icone = fechar.querySelector('svg') as SVGElement;
    expect(glifoDe(icone)).toBe('x');
    expect(icone.getAttribute('aria-hidden')).toBe('true');
    expect(fechar.textContent).toBe('');
  });

  it('clicar no fundo fecha; clicar dentro do painel não', async () => {
    const aoFecharExtra = vi.fn();
    await montar({ aoFecharExtra });
    await clicar(botao('Abrir'));
    await clicar(dialogo() as HTMLElement);
    expect(aoFecharExtra).not.toHaveBeenCalled();
    await apertarMouse(fundoDoPainel());
    await clicar(fundoDoPainel());
    expect(aoFecharExtra).toHaveBeenCalledTimes(1);
    expect(dialogo()).toBeNull();
  });

  it('arrastar de dentro do painel até o fundo não fecha, e o clique seguinte no fundo ainda fecha', async () => {
    const aoFecharExtra = vi.fn();
    await montar({ aoFecharExtra });
    await clicar(botao('Abrir'));
    await apertarMouse(dialogo() as HTMLElement);
    await clicar(fundoDoPainel());
    expect(aoFecharExtra).not.toHaveBeenCalled();
    expect(dialogo()).not.toBeNull();
    await apertarMouse(fundoDoPainel());
    await clicar(fundoDoPainel());
    expect(aoFecharExtra).toHaveBeenCalledTimes(1);
  });

  it('Tab no último elemento volta ao primeiro e Shift+Tab no primeiro vai ao último', async () => {
    await montar();
    await clicar(botao('Abrir'));
    const focaveis = Array.from(dialogo()?.querySelectorAll<HTMLElement>('button, input') ?? []);
    const primeiro = focaveis[0] as HTMLElement;
    const ultimo = focaveis.at(-1) as HTMLElement;
    expect(ultimo.textContent).toBe('Ação interna');

    ultimo.focus();
    await teclar(ultimo, 'Tab');
    expect(document.activeElement).toBe(primeiro);

    await teclar(primeiro, 'Tab', { shiftKey: true });
    expect(document.activeElement).toBe(ultimo);
  });

  it('Tab no meio do painel não é interceptado', async () => {
    await montar();
    await clicar(botao('Abrir'));
    const campo = document.querySelector<HTMLElement>('input[aria-label="Motivo"]') as HTMLElement;
    const evento = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    await act(async () => {
      campo.dispatchEvent(evento);
    });
    expect(evento.defaultPrevented).toBe(false);
  });

  it('se quem abriu saiu do DOM, o foco vai ao fallback', async () => {
    const reserva = document.createElement('h1');
    reserva.tabIndex = -1;
    document.body.append(reserva);
    await montar({ focoDeReserva: () => reserva });
    const gatilho = botao('Abrir');
    gatilho.focus();
    await clicar(gatilho);
    await clicar(botao('Sumir gatilho'));
    await teclarEsc();
    expect(dialogo()).toBeNull();
    expect(document.activeElement).toBe(reserva);
    reserva.remove();
  });

  it('reabrir começa de novo: campo vazio e foco no primeiro campo', async () => {
    await montar();
    await clicar(botao('Abrir'));
    const campo = document.querySelector<HTMLInputElement>('input[aria-label="Motivo"]') as HTMLInputElement;
    campo.value = 'rascunho';
    await teclarEsc();
    await clicar(botao('Abrir'));
    const novoCampo = document.querySelector<HTMLInputElement>('input[aria-label="Motivo"]');
    expect(novoCampo?.value).toBe('');
    expect(document.activeElement).toBe(novoCampo);
  });

  it('folha encosta embaixo com cantos de cima arredondados e no máximo 90dvh', async () => {
    await montar({ variante: 'folha' });
    await clicar(botao('Abrir'));
    const d = dialogo() as HTMLElement;
    const fundo = d.parentElement as HTMLElement;
    expect(d.dataset['variante']).toBe('folha');
    expect(fundo.style.alignItems).toBe('flex-end');
    expect(d.style.borderRadius).toBe('var(--radius-lg) var(--radius-lg) 0 0');
    expect(d.style.maxHeight).toBe('90dvh');
  });

  it('lateral fica à direita com altura cheia', async () => {
    await montar({ variante: 'lateral' });
    await clicar(botao('Abrir'));
    const d = dialogo() as HTMLElement;
    const fundo = d.parentElement as HTMLElement;
    expect(d.dataset['variante']).toBe('lateral');
    expect(fundo.style.justifyContent).toBe('flex-end');
    expect(fundo.style.alignItems).toBe('stretch');
    expect(d.style.height).toBe('100%');
    expect(d.style.width).toContain('440px');
  });
});

describe('PainelDeAcao: Esc', () => {
  it('Esc já tratado ou durante composição de texto não fecha', async () => {
    const aoFecharExtra = vi.fn();
    await montar({ aoFecharExtra });
    await clicar(botao('Abrir'));
    const campo = document.activeElement as HTMLElement;
    const tratado = (evento: Event) => evento.preventDefault();
    campo.addEventListener('keydown', tratado);
    await teclar(campo, 'Escape');
    campo.removeEventListener('keydown', tratado);
    await teclar(campo, 'Escape', { isComposing: true });
    expect(aoFecharExtra).not.toHaveBeenCalled();
    await teclarEsc();
    expect(aoFecharExtra).toHaveBeenCalledTimes(1);
  });
});

function PaineisEmpilhados({ aoFecharDeBaixo, aoFecharDeCima }: { aoFecharDeBaixo: () => void; aoFecharDeCima: () => void }) {
  const [cimaAberto, setCimaAberto] = useState(false);
  return (
    <PainelDeAcao aberto titulo="De baixo" variante="lateral" aoFechar={aoFecharDeBaixo}>
      <button type="button" onClick={() => setCimaAberto(true)}>
        Abrir de cima
      </button>
      <PainelDeAcao
        aberto={cimaAberto}
        titulo="De cima"
        variante="lateral"
        aoFechar={() => {
          aoFecharDeCima();
          setCimaAberto(false);
        }}
      >
        <input aria-label="Campo de cima" />
      </PainelDeAcao>
    </PainelDeAcao>
  );
}

describe('PainelDeAcao: painéis empilhados', () => {
  it('Esc fecha só o painel de cima e deixa o de baixo aberto', async () => {
    const aoFecharDeBaixo = vi.fn();
    const aoFecharDeCima = vi.fn();
    await act(async () => raiz.render(<PaineisEmpilhados aoFecharDeBaixo={aoFecharDeBaixo} aoFecharDeCima={aoFecharDeCima} />));
    await clicar(botao('Abrir de cima'));
    expect(document.activeElement).toBe(document.querySelector('input[aria-label="Campo de cima"]'));
    await teclarEsc();
    expect(aoFecharDeCima).toHaveBeenCalledTimes(1);
    expect(aoFecharDeBaixo).not.toHaveBeenCalled();
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
  });
});

describe('PainelDeAcao: isolamento do fundo', () => {
  it('trava a rolagem do body e inativa os irmãos do portal, restaurando ao fechar', async () => {
    document.body.style.overflow = 'scroll';
    const jaInativo = document.createElement('div');
    jaInativo.setAttribute('inert', '');
    document.body.append(jaInativo);
    await montar();
    await clicar(botao('Abrir'));
    expect(document.body.style.overflow).toBe('hidden');
    expect(container.hasAttribute('inert')).toBe(true);
    expect(document.querySelector('[data-testid="painel-de-acao-fundo"]')?.hasAttribute('inert')).toBe(false);
    await teclarEsc();
    expect(document.body.style.overflow).toBe('scroll');
    expect(container.hasAttribute('inert')).toBe(false);
    expect(jaInativo.hasAttribute('inert')).toBe(true);
    document.body.style.overflow = '';
    jaInativo.remove();
  });

  it('o foco volta a quem abriu depois de o fundo ser liberado', async () => {
    await montar();
    const gatilho = botao('Abrir');
    gatilho.focus();
    await clicar(gatilho);
    const inertNoRetorno: boolean[] = [];
    const original = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function (this: HTMLElement, ...args: Parameters<typeof original>) {
      inertNoRetorno.push(container.hasAttribute('inert'));
      original.apply(this, args);
    };
    await teclarEsc();
    HTMLElement.prototype.focus = original;
    expect(inertNoRetorno).toEqual([false]);
  });
});

describe('varianteDoPainel', () => {
  it('campo vira folha e escritório vira lateral', () => {
    expect(varianteDoPainel('field')).toBe('folha');
    expect(varianteDoPainel('office')).toBe('lateral');
  });
});

interface PainelDiretoProps {
  descricao?: string;
  aoFechar?: () => void;
  children: ReactNode;
}

const renderizarAberto = ({ descricao, aoFechar = () => undefined, children }: PainelDiretoProps) =>
  act(async () =>
    raiz.render(
      <PainelDeAcao
        aberto
        titulo="Painel direto"
        variante="folha"
        aoFechar={aoFechar}
        {...(descricao !== undefined ? { descricao } : {})}
      >
        {children}
      </PainelDeAcao>,
    ),
  );

const focado = () => document.activeElement as HTMLElement;
const tituloDoPainel = () => document.querySelector<HTMLElement>('h2') as HTMLElement;

describe('PainelDeAcao: descrição', () => {
  it.each([
    ['ausente', undefined],
    ['vazia', ''],
  ])('com descrição %s o diálogo não tem aria-describedby nem parágrafo', async (_descricao, descricao) => {
    await renderizarAberto({ ...(descricao === undefined ? {} : { descricao }), children: <input aria-label="Motivo" /> });
    expect(dialogo()?.hasAttribute('aria-describedby')).toBe(false);
    expect(dialogo()?.querySelector('p')).toBeNull();
  });

  it('com descrição o parágrafo vem logo abaixo do título e descreve o diálogo', async () => {
    await renderizarAberto({ descricao: 'Escolha o que fazer', children: <input aria-label="Motivo" /> });
    const paragrafo = dialogo()?.querySelector('p') as HTMLElement;
    expect(paragrafo.previousElementSibling).toBe(tituloDoPainel());
    expect(dialogo()?.getAttribute('aria-describedby')).toBe(paragrafo.id);
  });
});

describe('PainelDeAcao: foco inicial', () => {
  it('pula campo desabilitado e foca o primeiro campo habilitado', async () => {
    await renderizarAberto({
      children: (
        <>
          <input aria-label="Bloqueado" disabled />
          <input aria-label="Livre" />
        </>
      ),
    });
    expect(focado().getAttribute('aria-label')).toBe('Livre');
  });

  it('só com campos desabilitados o foco vai ao título', async () => {
    await renderizarAberto({ children: <input aria-label="Bloqueado" disabled /> });
    expect(focado()).toBe(tituloDoPainel());
  });

  it('um botão antes do campo não rouba o foco inicial', async () => {
    await renderizarAberto({
      children: (
        <>
          <button type="button">Antes</button>
          <input aria-label="Motivo" />
        </>
      ),
    });
    expect(focado().getAttribute('aria-label')).toBe('Motivo');
  });

  it.each([
    ['textarea', <textarea key="t" aria-label="Detalhe" />],
    ['select', <select key="s" aria-label="Detalhe" />],
  ])('%s conta como campo para o foco inicial', async (_nome, campo) => {
    await renderizarAberto({ children: campo });
    expect(focado().getAttribute('aria-label')).toBe('Detalhe');
  });
});

describe('PainelDeAcao: foco preso', () => {
  it('Tab ignora botão e select desabilitados, âncora sem href e tabindex -1 ao decidir quem é o último', async () => {
    await renderizarAberto({
      children: (
        <>
          <input aria-label="Motivo" />
          <button type="button">Último</button>
          <button type="button" disabled>
            Inativo
          </button>
          <select aria-label="Bloqueado" disabled />
          <a>Sem destino</a>
          <div tabIndex={-1}>Só por programa</div>
        </>
      ),
    });
    const ultimo = botao('Último');
    const fechar = document.querySelector<HTMLElement>('button[aria-label="Fechar"]') as HTMLElement;
    ultimo.focus();
    await teclar(ultimo, 'Tab');
    expect(focado()).toBe(fechar);
  });

  it('com o foco no título, Shift+Tab vai ao último elemento do painel', async () => {
    await renderizarAberto({ children: <button type="button">Ação interna</button> });
    expect(focado()).toBe(tituloDoPainel());
    await teclar(tituloDoPainel(), 'Tab', { shiftKey: true });
    expect(focado()).toBe(botao('Ação interna'));
  });

  it('com o foco no título, Tab segue o fluxo normal sem ser interceptado', async () => {
    await renderizarAberto({ children: <button type="button">Ação interna</button> });
    const evento = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    await act(async () => {
      tituloDoPainel().dispatchEvent(evento);
    });
    expect(evento.defaultPrevented).toBe(false);
  });

  it('Shift+Tab no último elemento segue o fluxo normal, sem ser interceptado', async () => {
    await renderizarAberto({
      children: (
        <>
          <input aria-label="Motivo" />
          <button type="button">Ação interna</button>
        </>
      ),
    });
    const ultimo = botao('Ação interna');
    ultimo.focus();
    const evento = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    await act(async () => {
      ultimo.dispatchEvent(evento);
    });
    expect(evento.defaultPrevented).toBe(false);
  });

  it('o Tab que circula é cancelado para o navegador não levar o foco para fora', async () => {
    await renderizarAberto({ children: <button type="button">Ação interna</button> });
    const ultimo = botao('Ação interna');
    ultimo.focus();
    const evento = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    await act(async () => {
      ultimo.dispatchEvent(evento);
    });
    expect(evento.defaultPrevented).toBe(true);
  });
});

describe('PainelDeAcao: outras teclas', () => {
  it('Enter não fecha e não é cancelado pelo painel', async () => {
    const aoFechar = vi.fn();
    await renderizarAberto({ aoFechar, children: <input aria-label="Motivo" /> });
    const evento = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    await act(async () => {
      focado().dispatchEvent(evento);
    });
    expect(aoFechar).not.toHaveBeenCalled();
    expect(evento.defaultPrevented).toBe(false);
  });

  it('o Esc que fecha é cancelado, para ninguém mais reagir a ele', async () => {
    await renderizarAberto({ children: <input aria-label="Motivo" /> });
    const evento = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    await act(async () => {
      focado().dispatchEvent(evento);
    });
    expect(evento.defaultPrevented).toBe(true);
  });
});

describe('PainelDeAcao: clique no fundo', () => {
  it('um clique no fundo sem que o botão tenha sido apertado ali não fecha', async () => {
    const aoFechar = vi.fn();
    await renderizarAberto({ aoFechar, children: <input aria-label="Motivo" /> });
    await clicar(fundoDoPainel());
    expect(aoFechar).not.toHaveBeenCalled();
  });

  it('apertar e soltar no fundo fecha uma vez; o clique seguinte, sem apertar de novo, não fecha outra vez', async () => {
    const aoFechar = vi.fn();
    await renderizarAberto({ aoFechar, children: <input aria-label="Motivo" /> });
    await apertarMouse(fundoDoPainel());
    await clicar(fundoDoPainel());
    await clicar(fundoDoPainel());
    expect(aoFechar).toHaveBeenCalledOnce();
  });

  it('apertar no fundo e soltar dentro do painel não fecha, e o aperto não vale para o clique seguinte', async () => {
    const aoFechar = vi.fn();
    await renderizarAberto({ aoFechar, children: <input aria-label="Motivo" /> });
    await apertarMouse(fundoDoPainel());
    await clicar(dialogo() as HTMLElement);
    await clicar(fundoDoPainel());
    expect(aoFechar).not.toHaveBeenCalled();
  });
});

describe('PainelDeAcao: devolução do foco', () => {
  it('com quem abriu ainda na página, o foco volta a ele e o foco de reserva nem é consultado', async () => {
    const reserva = vi.fn(() => null);
    await montar({ focoDeReserva: reserva });
    const gatilho = botao('Abrir');
    gatilho.focus();
    await clicar(gatilho);
    await teclarEsc();
    expect(focado()).toBe(gatilho);
    expect(reserva).not.toHaveBeenCalled();
  });

  it('o foco de reserva usado é o mais recente, mesmo trocado com o painel aberto', async () => {
    const antiga = document.createElement('h1');
    const nova = document.createElement('h1');
    antiga.tabIndex = -1;
    nova.tabIndex = -1;
    document.body.append(antiga, nova);
    await montar({ focoDeReserva: () => antiga });
    const gatilho = botao('Abrir');
    gatilho.focus();
    await clicar(gatilho);
    await clicar(botao('Sumir gatilho'));
    await montar({ focoDeReserva: () => nova });
    await teclarEsc();
    expect(focado()).toBe(nova);
    antiga.remove();
    nova.remove();
  });

  it('se o foco estava num elemento que não é HTML, como um SVG, o foco de reserva assume ao fechar', async () => {
    const reserva = document.createElement('h1');
    reserva.tabIndex = -1;
    const icone = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icone.setAttribute('tabindex', '0');
    document.body.append(reserva, icone);
    await montar({ focoDeReserva: () => reserva });
    icone.focus();
    expect(focado()).toBe(icone);
    await clicar(botao('Abrir'));
    await teclarEsc();
    expect(focado()).toBe(reserva);
    reserva.remove();
    icone.remove();
  });

  it('sem quem abriu na página e sem foco de reserva, fechar não lança erro', async () => {
    await montar();
    const gatilho = botao('Abrir');
    gatilho.focus();
    await clicar(gatilho);
    await clicar(botao('Sumir gatilho'));
    const erros = await errosDurante(teclarEsc);
    expect(dialogo()).toBeNull();
    expect(erros).toEqual([]);
  });
});

describe('PainelDeAcao: isolamento ao desmontar', () => {
  it('desmontar com o painel aberto libera a rolagem do body e os irmãos inertes', async () => {
    document.body.style.overflow = 'scroll';
    await montar();
    await clicar(botao('Abrir'));
    expect(container.hasAttribute('inert')).toBe(true);
    await act(async () => raiz.unmount());
    expect(document.body.style.overflow).toBe('scroll');
    expect(container.hasAttribute('inert')).toBe(false);
    document.body.style.overflow = '';
  });

  it('dois painéis empilhados têm ids próprios e cada um se chama pelo seu título', async () => {
    await act(async () => raiz.render(<PaineisEmpilhados aoFecharDeBaixo={vi.fn()} aoFecharDeCima={vi.fn()} />));
    await clicar(botao('Abrir de cima'));
    const nomes = Array.from(document.querySelectorAll('[role="dialog"]')).map(
      (d) => document.getElementById(d.getAttribute('aria-labelledby') ?? '')?.textContent,
    );
    expect(nomes).toEqual(['De baixo', 'De cima']);
  });
});
