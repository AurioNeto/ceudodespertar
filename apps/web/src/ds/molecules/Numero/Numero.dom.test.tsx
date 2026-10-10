import { afterEach, describe, expect, it } from 'vitest';
import { Numero } from './Numero';
import { desmontarTudo, elemento, montar } from '@/testes/montagem';

afterEach(desmontarTudo);

describe('Numero', () => {
  it('mostra o rótulo e depois o valor', async () => {
    const tela = await montar(<Numero rotulo="Total" valor="R$ 1.234,56" />);

    expect(tela.container.textContent).toBe('TotalR$ 1.234,56');
  });

  it('marca o valor como numérico', async () => {
    const tela = await montar(<Numero rotulo="Total" valor="R$ 1.234,56" />);

    expect(elemento(tela.container, '[data-numeric]').textContent).toBe('R$ 1.234,56');
  });

  it('a nota vem depois do valor', async () => {
    const tela = await montar(<Numero rotulo="Total" valor="10" nota="até 30/09" />);

    expect(tela.container.textContent).toBe('Total10até 30/09');
    expect(tela.container.firstElementChild?.children).toHaveLength(3);
  });

  it('sem nota não mostra nada além do rótulo e do valor', async () => {
    const tela = await montar(<Numero rotulo="Total" valor="10" />);

    expect(tela.container.textContent).toBe('Total10');
    expect(tela.container.firstElementChild?.children).toHaveLength(2);
  });

  it('nota vazia não ocupa lugar', async () => {
    const tela = await montar(<Numero rotulo="Total" valor="10" nota="" />);

    expect(tela.container.firstElementChild?.children).toHaveLength(2);
  });

  it('sem destaque o valor usa o tom primário e a fonte de valor comum', async () => {
    const tela = await montar(<Numero rotulo="Total" valor="10" />);

    const valor = elemento(tela.container, '[data-numeric]');
    expect(valor.style.color).toBe('var(--text-primary)');
    expect(valor.style.font).toBe('var(--text-amount)');
  });

  it('com destaque o valor usa o tom royal e a fonte de valor grande', async () => {
    const tela = await montar(<Numero rotulo="Total" valor="10" destaque />);

    const valor = elemento(tela.container, '[data-numeric]');
    expect(valor.style.color).toBe('var(--color-royal-deep)');
    expect(valor.style.font).toBe('var(--text-amount-lg)');
  });

  it('a cor informada vence a do destaque', async () => {
    const tela = await montar(<Numero rotulo="Total" valor="10" destaque cor="var(--color-attention)" />);

    expect(elemento(tela.container, '[data-numeric]').style.color).toBe('var(--color-attention)');
  });

  it('a cor informada vence a do valor comum', async () => {
    const tela = await montar(<Numero rotulo="Total" valor="10" cor="var(--color-confirmed)" />);

    expect(elemento(tela.container, '[data-numeric]').style.color).toBe('var(--color-confirmed)');
  });
});
