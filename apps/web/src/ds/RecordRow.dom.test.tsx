import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecordRow, type RecordStatus } from './RecordRow';
import { clicar, desmontarTudo, elemento, montar, passarMouseSobre, tirarMouseDe } from '@/testes/montagem';

afterEach(desmontarTudo);

const SINAL_DE_MENOS = '− ';
const SINAL_DE_MAIS = '+ ';

const linhaDe = (container: HTMLElement) => elemento<HTMLButtonElement>(container, ':scope > button');
const barraDeEstado = (container: HTMLElement) => elemento<HTMLSpanElement>(container, ':scope > button > span:first-child');
const valorDe = (container: HTMLElement) => elemento<HTMLSpanElement>(container, '[data-numeric]');

const COR_DA_BARRA_POR_ESTADO: readonly [RecordStatus, string][] = [
  ['pending', 'var(--color-pending)'],
  ['confirmed', 'var(--color-confirmed)'],
  ['reversed', 'var(--color-neutral)'],
];

const PREENCHIMENTO_POR_DENSIDADE: readonly [('field' | 'office'), string][] = [
  ['field', '13px 15px 13px 17px'],
  ['office', '11px 14px 11px 16px'],
];

describe('RecordRow — conteúdo', () => {
  it('descrição e valor — mostra o texto e o valor em reais, como despesa por padrão', async () => {
    const { container } = await montar(<RecordRow description="Mercado" amount={120} />);

    expect(container.textContent).toBe(`MercadoR$${SINAL_DE_MENOS}120,00`);
  });

  it('nature receita — o valor leva sinal de mais', async () => {
    const { container } = await montar(<RecordRow description="Oferta" amount={50} nature="receita" />);

    expect(valorDe(container).textContent).toBe(`R$${SINAL_DE_MAIS}50,00`);
  });

  it('nature neutral — o valor vai sem sinal', async () => {
    const { container } = await montar(<RecordRow description="Transferência" amount={50} nature="neutral" />);

    expect(valorDe(container).textContent).toBe('R$50,00');
  });

  it('description como elemento — renderiza o elemento', async () => {
    const { container } = await montar(<RecordRow description={<em>Feitio</em>} amount={1} />);

    expect(elemento(container, 'em').textContent).toBe('Feitio');
  });

  it('com meta — mostra a linha de apoio depois da descrição e do valor', async () => {
    const { container } = await montar(<RecordRow description="Mercado" amount={120} meta="12/03 · Caixa" />);

    expect(container.textContent).toBe(`MercadoR$${SINAL_DE_MENOS}120,00` + '12/03 · Caixa');
  });

  it.each([['string vazia', ''], ['zero', 0], ['nulo', null]])('meta %s — não desenha a linha de apoio', async (_nome, meta) => {
    const { container } = await montar(<RecordRow description="Mercado" amount={120} meta={meta} />);

    expect(container.textContent).toBe(`MercadoR$${SINAL_DE_MENOS}120,00`);
  });

  it('com badges — mostra os selos depois do valor', async () => {
    const { container } = await montar(
      <RecordRow description="Mercado" amount={120} badges={<b>A conferir</b>} />,
    );

    expect(container.textContent).toBe(`MercadoR$${SINAL_DE_MENOS}120,00` + 'A conferir');
  });

  it.each([['string vazia', ''], ['zero', 0], ['falso', false], ['nulo', null]])('badges %s — não desenha o contêiner de selos', async (_nome, badges) => {
    const { container } = await montar(<RecordRow description="Mercado" amount={120} badges={badges} />);

    expect(linhaDe(container).children.length).toBe(2);
  });

  it('com children — renderiza por último, depois de meta e badges', async () => {
    const { container } = await montar(
      <RecordRow description="Mercado" amount={120} meta="meta" badges="selo">
        <i>extra</i>
      </RecordRow>,
    );

    expect(linhaDe(container).lastElementChild?.textContent).toBe('extra');
    expect(container.textContent).toBe(`MercadoR$${SINAL_DE_MENOS}120,00metaseloextra`);
  });
});

describe('RecordRow — barra de estado', () => {
  it('sem status — usa a cor de pendente', async () => {
    const { container } = await montar(<RecordRow description="Mercado" amount={1} />);

    expect(barraDeEstado(container).style.background).toBe('var(--color-pending)');
  });

  it.each(COR_DA_BARRA_POR_ESTADO)('status %s — a barra à esquerda leva a cor do estado', async (status, cor) => {
    const { container } = await montar(<RecordRow description="Mercado" amount={1} status={status} />);

    expect(barraDeEstado(container).style.background).toBe(cor);
  });
});

describe('RecordRow — seleção e densidade', () => {
  it('sem selected — fundo de cartão e borda de linha', async () => {
    const { container } = await montar(<RecordRow description="Mercado" amount={1} />);

    const linha = linhaDe(container);
    expect([linha.style.background, linha.style.border]).toEqual(['var(--bg-card)', '1px solid var(--color-line)']);
  });

  it('selected — fundo e borda em azul real', async () => {
    const { container } = await montar(<RecordRow description="Mercado" amount={1} selected />);

    const linha = linhaDe(container);
    expect([linha.style.background, linha.style.border]).toEqual([
      'var(--color-royal-soft)',
      '1px solid var(--color-royal-border)',
    ]);
  });

  it('sem densidade — usa a de campo', async () => {
    const { container } = await montar(<RecordRow description="Mercado" amount={1} />);

    expect(linhaDe(container).style.padding).toBe('13px 15px 13px 17px');
  });

  it.each(PREENCHIMENTO_POR_DENSIDADE)('densidade %s — preenchimento %s', async (densidade, preenchimento) => {
    const { container } = await montar(<RecordRow description="Mercado" amount={1} density={densidade} />);

    expect(linhaDe(container).style.padding).toBe(preenchimento);
  });
});

describe('RecordRow — interação', () => {
  it('é um button do tipo button, sem disabled', async () => {
    const { container } = await montar(<RecordRow description="Mercado" amount={1} />);

    const linha = linhaDe(container);
    expect([linha.type, linha.disabled]).toEqual(['button', false]);
  });

  it('clique — chama onClick uma vez', async () => {
    const aoClicar = vi.fn();
    const { container } = await montar(<RecordRow description="Mercado" amount={1} onClick={aoClicar} />);

    await clicar(linhaDe(container));

    expect(aoClicar).toHaveBeenCalledTimes(1);
  });

  it('clique sem onClick — nenhum erro chega ao window', async () => {
    const errosDoWindow: string[] = [];
    const registrarErro = (evento: ErrorEvent) => errosDoWindow.push(evento.message);
    window.addEventListener('error', registrarErro);
    const { container } = await montar(<RecordRow description="Mercado" amount={1} />);

    await clicar(linhaDe(container));
    window.removeEventListener('error', registrarErro);

    expect(errosDoWindow).toEqual([]);
  });

  it('com onClick — cursor de clique', async () => {
    const { container } = await montar(<RecordRow description="Mercado" amount={1} onClick={vi.fn()} />);

    expect(linhaDe(container).style.cursor).toBe('pointer');
  });

  it('sem onClick — cursor padrão', async () => {
    const { container } = await montar(<RecordRow description="Mercado" amount={1} />);

    expect(linhaDe(container).style.cursor).toBe('default');
  });

  it('com onClick e mouse em cima — levanta com sombra', async () => {
    const { container } = await montar(<RecordRow description="Mercado" amount={1} onClick={vi.fn()} />);

    await passarMouseSobre(linhaDe(container));

    expect(linhaDe(container).style.boxShadow).toBe('var(--shadow-raised)');
  });

  it('com onClick e mouse que sai — a sombra some', async () => {
    const { container } = await montar(<RecordRow description="Mercado" amount={1} onClick={vi.fn()} />);
    await passarMouseSobre(linhaDe(container));

    await tirarMouseDe(linhaDe(container));

    expect(linhaDe(container).style.boxShadow).toBe('none');
  });

  it('sem onClick e mouse em cima — não ganha sombra', async () => {
    const { container } = await montar(<RecordRow description="Mercado" amount={1} />);

    await passarMouseSobre(linhaDe(container));

    expect(linhaDe(container).style.boxShadow).toBe('none');
  });

  it('style próprio — sobrepõe o fundo da linha', async () => {
    const { container } = await montar(<RecordRow description="Mercado" amount={1} selected style={{ background: 'red' }} />);

    expect(linhaDe(container).style.background).toBe('red');
  });
});
