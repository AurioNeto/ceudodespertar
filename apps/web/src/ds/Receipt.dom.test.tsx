import { afterEach, describe, expect, it } from 'vitest';
import { Receipt, type ReceiptTone } from './Receipt';
import { desmontarTudo, elemento, folhaComTexto, montar } from '@/testes/montagem';

afterEach(desmontarTudo);

const SINAL_DE_MENOS = '− ';
const SINAL_DE_MAIS = '+ ';

const raizDe = (container: HTMLElement) => elemento<HTMLDivElement>(container, ':scope > div');
const reguaDe = (container: HTMLElement) => elemento<HTMLDivElement>(container, ':scope > div > div:first-child');
const listaDe = (container: HTMLElement) => elemento<HTMLDListElement>(container, 'dl');
const valorDe = (container: HTMLElement) => elemento<HTMLSpanElement>(container, '[data-numeric]');
const linhasDe = (container: HTMLElement) =>
  Array.from(listaDe(container).children).map((linha) => [
    linha.querySelector('dt')?.textContent,
    linha.querySelector('dd')?.textContent,
  ]);

const SINAL_E_COR_POR_TOM: readonly [ReceiptTone, string, string, string][] = [
  ['entrada', SINAL_DE_MAIS, 'var(--color-confirmed)', 'var(--color-confirmed)'],
  ['saida', SINAL_DE_MENOS, 'var(--color-attention)', 'var(--color-attention)'],
  ['transferencia', '', 'var(--text-primary)', 'var(--color-royal)'],
];

describe('Receipt — título e valor', () => {
  it('sem props — mostra o título "Registrado" e nenhum valor', async () => {
    const { container } = await montar(<Receipt />);

    expect(container.textContent).toBe('Registrado');
    expect(container.querySelector('[data-numeric]')).toBeNull();
  });

  it('title — substitui "Registrado"', async () => {
    const { container } = await montar(<Receipt title="Pagamento registrado" />);

    expect(container.textContent).toBe('Pagamento registrado');
  });

  it('amount — mostra o valor em reais formatado', async () => {
    const { container } = await montar(<Receipt amount={1234.5} />);

    expect(valorDe(container).textContent).toBe(`R$${SINAL_DE_MAIS}1.234,50`);
  });

  it('amount zero — o zero aparece', async () => {
    const { container } = await montar(<Receipt amount={0} />);

    expect(valorDe(container).textContent).toBe(`R$${SINAL_DE_MAIS}0,00`);
  });

  it('amount nulo — não mostra valor', async () => {
    const { container } = await montar(<Receipt amount={null} />);

    expect(container.querySelector('[data-numeric]')).toBeNull();
  });

  it('amount — sai no tamanho de destaque', async () => {
    const { container } = await montar(<Receipt amount={10} />);

    expect(valorDe(container).style.font).toBe('var(--text-amount-hero)');
  });
});

describe('Receipt — tom', () => {
  it('sem tom — usa entrada', async () => {
    const { container } = await montar(<Receipt amount={10} />);

    expect(valorDe(container).textContent).toBe(`R$${SINAL_DE_MAIS}10,00`);
  });

  it.each(SINAL_E_COR_POR_TOM)('tom %s — sinal "%s" e cor do valor', async (tom, sinal, corDoValor) => {
    const { container } = await montar(<Receipt amount={10} tone={tom} />);

    expect(valorDe(container).textContent).toBe(`R$${sinal}10,00`);
    expect(valorDe(container).style.color).toBe(corDoValor);
  });

  it.each(SINAL_E_COR_POR_TOM)('tom %s — título na cor da régua', async (tom, _sinal, _corDoValor, corDaRegua) => {
    const { container } = await montar(<Receipt tone={tom} title="Título" />);

    expect(folhaComTexto<HTMLDivElement>(container, 'div', 'Título').style.color).toBe(corDaRegua);
  });

  it('régua pontilhada — é a primeira peça do recibo, com 4px de altura', async () => {
    const { container } = await montar(<Receipt />);

    expect(reguaDe(container).style.height).toBe('4px');
  });
});

describe('Receipt — linhas', () => {
  it('sem lines — a lista de definições existe e fica vazia', async () => {
    const { container } = await montar(<Receipt />);

    expect(listaDe(container).children.length).toBe(0);
  });

  it('lines — uma linha por item, com rótulo e valor, na ordem recebida', async () => {
    const { container } = await montar(
      <Receipt
        lines={[
          { label: 'Conta', value: 'Caixa' },
          { label: 'Data', value: '12/03/2026' },
        ]}
      />,
    );

    expect(linhasDe(container)).toEqual([
      ['Conta', 'Caixa'],
      ['Data', '12/03/2026'],
    ]);
  });

  it('lines com valor em elemento — renderiza o elemento dentro do dd', async () => {
    const { container } = await montar(<Receipt lines={[{ label: 'Status', value: <strong>Confirmado</strong> }]} />);

    expect(elemento(container, 'dd > strong').textContent).toBe('Confirmado');
  });

  it('lines — o valor fica alinhado à direita', async () => {
    const { container } = await montar(<Receipt lines={[{ label: 'Conta', value: 'Caixa' }]} />);

    expect(elemento<HTMLElement>(container, 'dd').style.textAlign).toBe('right');
  });
});

describe('Receipt — rodapé, filhos e estilo', () => {
  it('footnote — mostra a nota em parágrafo', async () => {
    const { container } = await montar(<Receipt footnote="Guarde o comprovante." />);

    expect(elemento(container, 'p').textContent).toBe('Guarde o comprovante.');
  });

  it('sem footnote — não há parágrafo', async () => {
    const { container } = await montar(<Receipt />);

    expect(container.querySelector('p')).toBeNull();
  });

  it('footnote vazio — não há parágrafo', async () => {
    const { container } = await montar(<Receipt footnote="" />);

    expect(container.querySelector('p')).toBeNull();
  });

  it('children — aparecem por último, depois das linhas e da nota', async () => {
    const { container } = await montar(
      <Receipt title="T" lines={[{ label: 'L', value: 'V' }]} footnote="N">
        <button type="button">Desfazer</button>
      </Receipt>,
    );

    expect(raizDe(container).lastElementChild?.tagName.toLowerCase()).toBe('button');
    expect(container.textContent).toBe('TLVNDesfazer');
  });

  it('style próprio — sobrepõe o fundo do recibo', async () => {
    const { container } = await montar(<Receipt style={{ background: 'red' }} />);

    expect(raizDe(container).style.background).toBe('red');
  });
});
