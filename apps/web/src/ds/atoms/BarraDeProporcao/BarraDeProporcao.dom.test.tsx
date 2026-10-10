import { afterEach, describe, expect, it } from 'vitest';
import { BarraDeProporcao } from './BarraDeProporcao';
import { desmontarTudo, elemento, montar } from '@/testes/montagem';

afterEach(desmontarTudo);

describe('BarraDeProporcao', () => {
  const barra = (origem: ParentNode) => elemento(origem, '[role="img"]');
  const preenchimento = (origem: ParentNode) => elemento(origem, '[role="img"] > div');

  it.each([
    [0, 10, '0% do total', '0%'],
    [5, 10, '50% do total', '50%'],
    [10, 10, '100% do total', '100%'],
    [2, 8, '25% do total', '25%'],
  ])('parte %s de %s lê "%s" e preenche %s', async (parte, total, rotulo, largura) => {
    const tela = await montar(<BarraDeProporcao parte={parte} total={total} />);

    expect(barra(tela.container).getAttribute('aria-label')).toBe(rotulo);
    expect(preenchimento(tela.container).style.width).toBe(largura);
  });

  it('o rótulo arredonda a porcentagem para o inteiro mais próximo', async () => {
    const tela = await montar(<BarraDeProporcao parte={2} total={3} />);

    expect(barra(tela.container).getAttribute('aria-label')).toBe('67% do total');
  });

  it('o rótulo arredonda o meio para cima', async () => {
    const tela = await montar(<BarraDeProporcao parte={1} total={8} />);

    expect(barra(tela.container).getAttribute('aria-label')).toBe('13% do total');
  });

  it('a largura do preenchimento guarda a fração exata, sem arredondar', async () => {
    const tela = await montar(<BarraDeProporcao parte={1} total={3} />);

    expect(parseFloat(preenchimento(tela.container).style.width)).toBeCloseTo(33.3333333, 5);
  });

  it('parte maior que o total enche a barra, sem passar de 100%', async () => {
    const tela = await montar(<BarraDeProporcao parte={30} total={10} />);

    expect(barra(tela.container).getAttribute('aria-label')).toBe('100% do total');
    expect(preenchimento(tela.container).style.width).toBe('100%');
  });

  it('parte negativa deixa a barra vazia', async () => {
    const tela = await montar(<BarraDeProporcao parte={-5} total={10} />);

    expect(barra(tela.container).getAttribute('aria-label')).toBe('0% do total');
    expect(preenchimento(tela.container).style.width).toBe('0%');
  });

  it('total zero deixa a barra vazia', async () => {
    const tela = await montar(<BarraDeProporcao parte={5} total={0} />);

    expect(barra(tela.container).getAttribute('aria-label')).toBe('0% do total');
    expect(preenchimento(tela.container).style.width).toBe('0%');
  });

  it('total negativo deixa a barra vazia', async () => {
    const tela = await montar(<BarraDeProporcao parte={5} total={-10} />);

    expect(barra(tela.container).getAttribute('aria-label')).toBe('0% do total');
    expect(preenchimento(tela.container).style.width).toBe('0%');
  });

  it('parte que não é número deixa NaN no rótulo e a largura sem valor', async () => {
    const tela = await montar(<BarraDeProporcao parte={Number.NaN} total={10} />);

    expect(barra(tela.container).getAttribute('aria-label')).toBe('NaN% do total');
    expect(preenchimento(tela.container).style.width).toBe('');
  });

  it('é uma imagem para os leitores de tela, sem texto visível', async () => {
    const tela = await montar(<BarraDeProporcao parte={5} total={10} />);

    expect(tela.container.textContent).toBe('');
  });

  it('o preenchimento usa o tom de confirmado por padrão', async () => {
    const tela = await montar(<BarraDeProporcao parte={5} total={10} />);

    expect(preenchimento(tela.container).style.background).toBe('var(--color-confirmed)');
  });

  it('o preenchimento usa a cor informada', async () => {
    const tela = await montar(<BarraDeProporcao parte={5} total={10} cor="var(--color-attention)" />);

    expect(preenchimento(tela.container).style.background).toBe('var(--color-attention)');
  });

  it('acompanha parte e total quando eles mudam por fora', async () => {
    const tela = await montar(<BarraDeProporcao parte={1} total={10} />);

    await tela.atualizar(<BarraDeProporcao parte={9} total={10} />);

    expect(barra(tela.container).getAttribute('aria-label')).toBe('90% do total');
    expect(preenchimento(tela.container).style.width).toBe('90%');
  });
});
