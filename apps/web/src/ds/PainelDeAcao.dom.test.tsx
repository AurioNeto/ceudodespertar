import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PainelDeAcao, varianteDoPainel, type VarianteDoPainel } from './PainelDeAcao';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

interface AnfitriaoProps {
  variante?: VarianteDoPainel;
  comCampo?: boolean;
  bloqueado?: boolean;
  aoFecharExtra?: () => void;
  focoDeReserva?: () => HTMLElement | null;
}

function Anfitriao({ variante = 'folha', comCampo = true, bloqueado = false, aoFecharExtra, focoDeReserva }: AnfitriaoProps) {
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
        fechamentoBloqueado={bloqueado}
        aoFechar={() => {
          aoFecharExtra?.();
          setAberto(false);
        }}
        rodape={<button type="button">Confirmar</button>}
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

  it('clicar no fundo fecha; clicar dentro do painel não', async () => {
    const aoFecharExtra = vi.fn();
    await montar({ aoFecharExtra });
    await clicar(botao('Abrir'));
    await clicar(dialogo() as HTMLElement);
    expect(aoFecharExtra).not.toHaveBeenCalled();
    await clicar(document.querySelector('[data-testid="painel-de-acao-fundo"]') as HTMLElement);
    expect(aoFecharExtra).toHaveBeenCalledTimes(1);
    expect(dialogo()).toBeNull();
  });

  it('Tab no último elemento volta ao primeiro e Shift+Tab no primeiro vai ao último', async () => {
    await montar();
    await clicar(botao('Abrir'));
    const focaveis = Array.from(dialogo()?.querySelectorAll<HTMLElement>('button, input') ?? []);
    const primeiro = focaveis[0] as HTMLElement;
    const ultimo = focaveis.at(-1) as HTMLElement;
    expect(ultimo.textContent).toBe('Confirmar');

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
    await teclar(document, 'Escape');
    expect(dialogo()).toBeNull();
    expect(document.activeElement).toBe(reserva);
    reserva.remove();
  });

  it('reabrir começa de novo: campo vazio e foco no primeiro campo', async () => {
    await montar();
    await clicar(botao('Abrir'));
    const campo = document.querySelector<HTMLInputElement>('input[aria-label="Motivo"]') as HTMLInputElement;
    campo.value = 'rascunho';
    await teclar(document, 'Escape');
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

describe('PainelDeAcao: fechamento bloqueado', () => {
  it('Esc, fundo e Fechar não fecham enquanto bloqueado', async () => {
    const aoFecharExtra = vi.fn();
    await montar({ aoFecharExtra, bloqueado: true });
    await clicar(botao('Abrir'));
    await teclar(document, 'Escape');
    await clicar(document.querySelector('[data-testid="painel-de-acao-fundo"]') as HTMLElement);
    await clicar(document.querySelector('button[aria-label="Fechar"]') as HTMLElement);
    expect(aoFecharExtra).not.toHaveBeenCalled();
    expect(dialogo()).not.toBeNull();
  });

  it('Esc já tratado ou durante composição de texto não fecha', async () => {
    const aoFecharExtra = vi.fn();
    await montar({ aoFecharExtra });
    await clicar(botao('Abrir'));
    const tratado = (evento: Event) => evento.preventDefault();
    document.body.addEventListener('keydown', tratado);
    await teclar(document.body, 'Escape');
    document.body.removeEventListener('keydown', tratado);
    await teclar(document, 'Escape', { isComposing: true });
    expect(aoFecharExtra).not.toHaveBeenCalled();
    await teclar(document, 'Escape');
    expect(aoFecharExtra).toHaveBeenCalledTimes(1);
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
    await teclar(document, 'Escape');
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
    await teclar(document, 'Escape');
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
