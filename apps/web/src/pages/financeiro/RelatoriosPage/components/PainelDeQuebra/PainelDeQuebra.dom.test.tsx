import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { botaoComTexto, clicar, desmontarTudo, elemento, montar, passarMouseSobre, tirarMouseDe, todos } from '@/testes/montagem';
import { PainelDeQuebra } from './PainelDeQuebra';

afterEach(desmontarTudo);

const ITENS = [
  { nome: 'Cozinha', valor: 600 },
  { nome: 'Dormitório', valor: 300 },
  { nome: 'Secretaria', valor: 100 },
];

const PRIMEIRA_COR = 'oklch(0.52 0.13 265)';
const SEGUNDA_COR = 'oklch(0.62 0.11 205)';
const CIRCUNFERENCIA = '376.99';

async function montarPainel(itens = ITENS, campo = false) {
  const aoAbrir = vi.fn();
  const montado = await montar(<PainelDeQuebra titulo="Saídas por grupo" itens={itens} onAbrir={aoAbrir} campo={campo} />);
  return { ...montado, aoAbrir };
}

const botaoDaBarra = (container: HTMLElement, nome: string) => {
  const achado = todos<HTMLButtonElement>(container, 'button').find((b) => b.title.startsWith(`${nome} · `));
  if (!achado) throw new Error(`barra não encontrada: ${nome}`);
  return achado;
};

const botaoDaLegenda = (container: HTMLElement, nome: string) => {
  const achado = todos<HTMLButtonElement>(container, 'button').find((b) => b.textContent?.startsWith(nome));
  if (!achado) throw new Error(`legenda não encontrada: ${nome}`);
  return achado;
};

const dispararNaFatia = (fatia: SVGCircleElement, tipo: 'click' | 'mouseover' | 'mouseout') =>
  act(async () => {
    fatia.dispatchEvent(new MouseEvent(tipo, { bubbles: true, relatedTarget: null }));
  });

const clicarNaFatia = (fatia: SVGCircleElement) => dispararNaFatia(fatia, 'click');
const passarMouseSobreAFatia = (fatia: SVGCircleElement) => dispararNaFatia(fatia, 'mouseover');
const tirarMouseDaFatia = (fatia: SVGCircleElement) => dispararNaFatia(fatia, 'mouseout');

const fatias = (container: HTMLElement) => todos<SVGCircleElement>(container, 'circle').slice(1);

const linhaDoResumo = (container: HTMLElement) => {
  const total = todos<HTMLSpanElement>(container, 'span').find((s) => s.style.marginLeft === 'auto' && s.style.fontVariantNumeric === 'tabular-nums');
  return [total?.previousElementSibling?.textContent, total?.textContent];
};

describe('PainelDeQuebra: cabeçalho e troca de vista', () => {
  it('mostra o título e abre em barras, com o botão Barras marcado', async () => {
    const { container } = await montarPainel();

    expect(container.textContent).toContain('Saídas por grupo');
    expect(botaoComTexto(container, 'Barras').getAttribute('aria-pressed')).toBe('true');
    expect(botaoComTexto(container, 'Rosca').getAttribute('aria-pressed')).toBe('false');
    expect(todos(container, 'svg')).toHaveLength(0);
  });

  it('clicar em Rosca — troca para a rosca e marca o botão Rosca', async () => {
    const { container } = await montarPainel();

    await clicar(botaoComTexto(container, 'Rosca'));

    expect(botaoComTexto(container, 'Rosca').getAttribute('aria-pressed')).toBe('true');
    expect(botaoComTexto(container, 'Barras').getAttribute('aria-pressed')).toBe('false');
    expect(todos(container, 'svg')).toHaveLength(1);
  });

  it('voltar para Barras — a rosca some', async () => {
    const { container } = await montarPainel();
    await clicar(botaoComTexto(container, 'Rosca'));

    await clicar(botaoComTexto(container, 'Barras'));

    expect(todos(container, 'svg')).toHaveLength(0);
  });
});

describe('PainelDeQuebra: vista em barras', () => {
  it('uma barra por item, com nome e valor formatado, na ordem recebida', async () => {
    const { container } = await montarPainel();

    const barras = todos<HTMLButtonElement>(container, 'button').filter((b) => b.title !== '' && b.title.includes(' · '));

    expect(barras.map((b) => b.textContent)).toEqual(['Cozinha600,00', 'Dormitório300,00', 'Secretaria100,00']);
  });

  it('a dica de cada barra traz nome, valor e a participação no total arredondada', async () => {
    const { container } = await montarPainel();

    expect(botaoDaBarra(container, 'Cozinha').title).toBe('Cozinha · 600,00 · 60%');
    expect(botaoDaBarra(container, 'Secretaria').title).toBe('Secretaria · 100,00 · 10%');
  });

  it('a participação na dica é arredondada para o inteiro mais próximo: dois terços viram 67%', async () => {
    const { container } = await montarPainel([
      { nome: 'Cozinha', valor: 20 },
      { nome: 'Secretaria', valor: 10 },
    ]);

    expect(botaoDaBarra(container, 'Cozinha').title).toBe('Cozinha · 20,00 · 67%');
    expect(botaoDaBarra(container, 'Secretaria').title).toBe('Secretaria · 10,00 · 33%');
  });

  it('a largura de cada barra é o valor sobre o maior valor, não sobre o total', async () => {
    const { container } = await montarPainel();

    const largura = (nome: string) =>
      todos<HTMLSpanElement>(botaoDaBarra(container, nome), 'span').find((s) => s.style.width.endsWith('%') && s.style.height === '100%')?.style.width ?? '';

    expect(largura('Cozinha')).toBe('100%');
    expect(largura('Dormitório')).toBe('50%');
    expect(parseFloat(largura('Secretaria'))).toBeCloseTo(16.67, 2);
  });

  it('clicar numa barra — pede para abrir o item com o nome dele', async () => {
    const { container, aoAbrir } = await montarPainel();

    await clicar(botaoDaBarra(container, 'Dormitório'));

    expect(aoAbrir).toHaveBeenCalledTimes(1);
    expect(aoAbrir).toHaveBeenCalledWith('Dormitório');
  });

  it('mouse sobre uma barra — apaga as outras para 55% e mantém a dela', async () => {
    const { container } = await montarPainel();

    await passarMouseSobre(botaoDaBarra(container, 'Dormitório'));

    expect(['Cozinha', 'Dormitório', 'Secretaria'].map((n) => botaoDaBarra(container, n).style.opacity)).toEqual(['0.55', '1', '0.55']);
  });

  it('mouse sai da barra — todas voltam a opacidade cheia', async () => {
    const { container } = await montarPainel();
    await passarMouseSobre(botaoDaBarra(container, 'Dormitório'));

    await tirarMouseDe(botaoDaBarra(container, 'Dormitório'));

    expect(['Cozinha', 'Dormitório', 'Secretaria'].map((n) => botaoDaBarra(container, n).style.opacity)).toEqual(['1', '1', '1']);
  });

  it('sem itens — só o cabeçalho, sem barra nenhuma', async () => {
    const { container } = await montarPainel([]);

    expect(todos(container, 'button')).toHaveLength(2);
  });

  it('item de valor zero — a barra existe com largura zero e 0% na dica', async () => {
    const { container } = await montarPainel([
      { nome: 'Cozinha', valor: 100 },
      { nome: 'Vazio', valor: 0 },
    ]);

    expect(botaoDaBarra(container, 'Vazio').title).toBe('Vazio · 0,00 · 0%');
  });

  it('só itens de valor zero — a participação é 0% e a largura não vira NaN', async () => {
    const { container } = await montarPainel([{ nome: 'Vazio', valor: 0 }]);

    const faixa = todos<HTMLSpanElement>(botaoDaBarra(container, 'Vazio'), 'span').find((s) => s.style.height === '100%');
    expect(botaoDaBarra(container, 'Vazio').title).toBe('Vazio · 0,00 · 0%');
    expect(faixa?.style.width).toBe('0%');
  });
});

describe('PainelDeQuebra: vista em rosca', () => {
  it('uma fatia por item mais o anel de fundo, cada fatia na cor da posição', async () => {
    const { container } = await montarPainel();
    await clicar(botaoComTexto(container, 'Rosca'));

    expect(todos(container, 'circle')).toHaveLength(4);
    expect(fatias(container).map((c) => c.getAttribute('stroke'))).toEqual([
      PRIMEIRA_COR,
      SEGUNDA_COR,
      'oklch(0.64 0.12 155)',
    ]);
  });

  it('o tamanho e o deslocamento de cada fatia seguem a fração acumulada do total', async () => {
    const { container } = await montarPainel();
    await clicar(botaoComTexto(container, 'Rosca'));

    expect(fatias(container).map((c) => [c.getAttribute('stroke-dasharray'), c.getAttribute('stroke-dashoffset')])).toEqual([
      [`226.19 ${CIRCUNFERENCIA}`, '0.00'],
      [`113.10 ${CIRCUNFERENCIA}`, '-226.19'],
      [`37.70 ${CIRCUNFERENCIA}`, '-339.29'],
    ]);
  });

  it('a legenda mostra nome e percentual arredondado de cada item', async () => {
    const { container } = await montarPainel();
    await clicar(botaoComTexto(container, 'Rosca'));

    expect(['Cozinha', 'Dormitório', 'Secretaria'].map((n) => botaoDaLegenda(container, n).textContent)).toEqual([
      'Cozinha60%',
      'Dormitório30%',
      'Secretaria10%',
    ]);
  });

  it('três itens iguais — cada um mostra 33% e a soma dos percentuais fica em 99%', async () => {
    const { container } = await montarPainel([
      { nome: 'Água', valor: 10 },
      { nome: 'Fogo', valor: 10 },
      { nome: 'Terra', valor: 10 },
    ]);
    await clicar(botaoComTexto(container, 'Rosca'));

    expect(['Água', 'Fogo', 'Terra'].map((n) => botaoDaLegenda(container, n).textContent)).toEqual(['Água33%', 'Fogo33%', 'Terra33%']);
  });

  it('sem o mouse em cima — a linha de baixo diz saídas e mostra o total', async () => {
    const { container } = await montarPainel();
    await clicar(botaoComTexto(container, 'Rosca'));

    expect(linhaDoResumo(container)).toEqual(['saídas', '1.000,00']);
  });

  it('mouse sobre a legenda — a linha de baixo passa a mostrar o item e o valor dele', async () => {
    const { container } = await montarPainel();
    await clicar(botaoComTexto(container, 'Rosca'));

    await passarMouseSobre(botaoDaLegenda(container, 'Dormitório'));

    expect(linhaDoResumo(container)).toEqual(['Dormitório', '300,00']);
  });

  it('mouse sobre a fatia — destaca a fatia com traço mais grosso e apaga as outras', async () => {
    const { container } = await montarPainel();
    await clicar(botaoComTexto(container, 'Rosca'));

    await passarMouseSobreAFatia(fatias(container)[1] as SVGCircleElement);

    expect(fatias(container).map((c) => [c.getAttribute('stroke-width'), c.style.opacity])).toEqual([
      ['26', '0.45'],
      ['32', '1'],
      ['26', '0.45'],
    ]);
  });

  it('mouse sobre a legenda — apaga as outras legendas para 50%', async () => {
    const { container } = await montarPainel();
    await clicar(botaoComTexto(container, 'Rosca'));

    await passarMouseSobre(botaoDaLegenda(container, 'Cozinha'));

    expect(['Cozinha', 'Dormitório', 'Secretaria'].map((n) => botaoDaLegenda(container, n).style.opacity)).toEqual(['1', '0.5', '0.5']);
  });

  it('mouse sai da fatia — a linha de baixo volta ao total', async () => {
    const { container } = await montarPainel();
    await clicar(botaoComTexto(container, 'Rosca'));
    await passarMouseSobreAFatia(fatias(container)[0] as SVGCircleElement);

    await tirarMouseDaFatia(fatias(container)[0] as SVGCircleElement);

    expect(linhaDoResumo(container)).toEqual(['saídas', '1.000,00']);
  });

  it('mouse sai da legenda — a linha de baixo volta ao total e as legendas à opacidade cheia', async () => {
    const { container } = await montarPainel();
    await clicar(botaoComTexto(container, 'Rosca'));
    await passarMouseSobre(botaoDaLegenda(container, 'Dormitório'));

    await tirarMouseDe(botaoDaLegenda(container, 'Dormitório'));

    expect(linhaDoResumo(container)).toEqual(['saídas', '1.000,00']);
    expect(['Cozinha', 'Dormitório', 'Secretaria'].map((n) => botaoDaLegenda(container, n).style.opacity)).toEqual(['1', '1', '1']);
  });

  it('clicar na fatia — pede para abrir o item dela', async () => {
    const { container, aoAbrir } = await montarPainel();
    await clicar(botaoComTexto(container, 'Rosca'));

    await clicarNaFatia(fatias(container)[2] as SVGCircleElement);

    expect(aoAbrir).toHaveBeenCalledWith('Secretaria');
  });

  it('clicar na legenda — pede para abrir o item dela', async () => {
    const { container, aoAbrir } = await montarPainel();
    await clicar(botaoComTexto(container, 'Rosca'));

    await clicar(botaoDaLegenda(container, 'Cozinha'));

    expect(aoAbrir).toHaveBeenCalledWith('Cozinha');
  });

  it('sem itens — só o anel de fundo e o total zerado', async () => {
    const { container } = await montarPainel([]);
    await clicar(botaoComTexto(container, 'Rosca'));

    expect(fatias(container)).toHaveLength(0);
    expect(linhaDoResumo(container)).toEqual(['saídas', '0,00']);
  });

  it('só itens de valor zero — as fatias têm tamanho zero em vez de NaN', async () => {
    const { container } = await montarPainel([{ nome: 'Vazio', valor: 0 }]);
    await clicar(botaoComTexto(container, 'Rosca'));

    expect(fatias(container).map((c) => c.getAttribute('stroke-dasharray'))).toEqual([`0.00 ${CIRCUNFERENCIA}`]);
  });

  it('mais itens que cores — a paleta recomeça: o décimo item usa a cor do primeiro', async () => {
    const itens = Array.from({ length: 10 }, (_, i) => ({ nome: `Item ${i + 1}`, valor: 10 }));
    const { container } = await montarPainel(itens);
    await clicar(botaoComTexto(container, 'Rosca'));

    const cores = fatias(container).map((c) => c.getAttribute('stroke'));
    expect(cores[9]).toBe(cores[0]);
    expect(new Set(cores).size).toBe(9);
  });
});

describe('PainelDeQuebra: densidade', () => {
  it('escritório — cartão com respiro de 16px por 18px', async () => {
    const { container } = await montarPainel();

    expect((container.firstElementChild as HTMLElement).style.padding).toBe('16px 18px');
  });

  it('campo — cartão com respiro de 14px', async () => {
    const { container } = await montarPainel(ITENS, true);

    expect((container.firstElementChild as HTMLElement).style.padding).toBe('14px');
  });

  it('rosca no escritório — a rosca e a legenda ficam lado a lado, sem quebra de linha', async () => {
    const { container } = await montarPainel();
    await clicar(botaoComTexto(container, 'Rosca'));

    expect(elemento<SVGElement>(container, 'svg').parentElement?.parentElement?.style.flexWrap).toBe('nowrap');
  });

  it('rosca em campo — a legenda pode quebrar para baixo da rosca', async () => {
    const { container } = await montarPainel(ITENS, true);
    await clicar(botaoComTexto(container, 'Rosca'));

    expect(elemento<SVGElement>(container, 'svg').parentElement?.parentElement?.style.flexWrap).toBe('wrap');
  });
});
