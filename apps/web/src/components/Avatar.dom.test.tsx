import { afterEach, describe, expect, it } from 'vitest';
import { Avatar } from './Avatar';
import { desmontarTudo, montar } from '@/testes/montagem';

afterEach(desmontarTudo);

describe('Avatar', () => {
  it('mostra as iniciais que saem do nome recebido', async () => {
    const tela = await montar(<Avatar nome="Carla Mendes Duarte" />);

    expect(tela.container.textContent).toBe('CD');
  });

  it('nome sem iniciais deixa o quadro sem letras, mas ele continua na tela', async () => {
    const tela = await montar(<Avatar nome="" />);

    expect(tela.container.firstElementChild).not.toBeNull();
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

  it('acompanha o nome quando ele muda por fora', async () => {
    const tela = await montar(<Avatar nome="Ana Souza" />);

    await tela.atualizar(<Avatar nome="Bruno Lima" />);

    expect(tela.container.textContent).toBe('BL');
  });
});
