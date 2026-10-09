import { afterEach, describe, expect, it } from 'vitest';
import { Avatar } from './Avatar';
import { desmontarTudo, elemento, montar } from '../testes/montagem';

afterEach(desmontarTudo);

describe('Avatar', () => {
  it('mostra a primeira letra do primeiro e do último nome', async () => {
    const tela = await montar(<Avatar nome="Maria das Graças Souza" />);

    expect(tela.container.textContent).toBe('MS');
  });

  it('mostra uma letra só quando o nome tem uma palavra', async () => {
    const tela = await montar(<Avatar nome="Joana" />);

    expect(tela.container.textContent).toBe('J');
  });

  it('as iniciais saem em caixa alta', async () => {
    const tela = await montar(<Avatar nome="ana souza" />);

    expect(tela.container.textContent).toBe('AS');
  });

  it('ignora palavras que não começam com letra', async () => {
    const tela = await montar(<Avatar nome="Aurio Neto (demonstração)" />);

    expect(tela.container.textContent).toBe('AN');
  });

  it('nome vazio deixa o quadro sem letras, mas ele continua na tela', async () => {
    const tela = await montar(<Avatar nome="" />);

    expect(tela.container.firstElementChild).not.toBeNull();
    expect(tela.container.textContent).toBe('');
  });

  it('nome sem letras deixa o quadro sem letras', async () => {
    const tela = await montar(<Avatar nome="123 456" />);

    expect(tela.container.textContent).toBe('');
  });

  it('fica escondido dos leitores de tela, que leem o nome em outro lugar', async () => {
    const tela = await montar(<Avatar nome="Ana Souza" />);

    expect(tela.container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });

  it('é um único span, sem elementos interativos dentro', async () => {
    const tela = await montar(<Avatar nome="Ana Souza" />);

    expect(tela.container.children).toHaveLength(1);
    expect(tela.container.firstElementChild?.tagName).toBe('SPAN');
    expect(tela.container.firstElementChild?.children).toHaveLength(0);
  });

  it('é um quadrado de 34 por 34 pixels no tom royal', async () => {
    const tela = await montar(<Avatar nome="Ana Souza" />);

    const quadro = elemento(tela.container, 'span');
    expect(quadro.style.width).toBe('34px');
    expect(quadro.style.height).toBe('34px');
    expect(quadro.style.background).toBe('var(--color-royal-soft)');
    expect(quadro.style.color).toBe('var(--color-royal-deep)');
  });

  it('acompanha o nome quando ele muda por fora', async () => {
    const tela = await montar(<Avatar nome="Ana Souza" />);

    await tela.atualizar(<Avatar nome="Bruno Lima" />);

    expect(tela.container.textContent).toBe('BL');
  });
});
