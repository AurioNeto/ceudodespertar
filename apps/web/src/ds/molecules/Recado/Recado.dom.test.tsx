import { afterEach, describe, expect, it, vi } from 'vitest';
import { Recado } from './Recado';
import { clicar, desmontarTudo, elemento, montar, todos } from '@/testes/montagem';

afterEach(desmontarTudo);

describe('Recado', () => {
  it('avisa como status com o texto', async () => {
    const tela = await montar(<Recado texto="Lançamento registrado" onFechar={() => undefined} />);

    expect(elemento(tela.container, '[role="status"]').textContent).toContain('Lançamento registrado');
  });

  it('o único botão é o de fechar, nomeado pelo rótulo acessível', async () => {
    const tela = await montar(<Recado texto="Lançamento registrado" onFechar={() => undefined} />);

    const botoes = todos<HTMLButtonElement>(tela.container, 'button');
    expect(botoes).toHaveLength(1);
    expect(botoes[0]?.getAttribute('aria-label')).toBe('fechar recado');
    expect(botoes[0]?.type).toBe('button');
  });

  it('o botão de fechar mostra o sinal × e o texto do recado fica fora dele', async () => {
    const tela = await montar(<Recado texto="Lançamento registrado" onFechar={() => undefined} />);

    expect(elemento(tela.container, 'button').textContent).toBe('×');
    expect(tela.container.textContent).toBe('Lançamento registrado×');
  });

  it('fechar chama onFechar uma vez', async () => {
    const onFechar = vi.fn();
    const tela = await montar(<Recado texto="Lançamento registrado" onFechar={onFechar} />);

    await clicar(elemento(tela.container, 'button[aria-label="fechar recado"]'));

    expect(onFechar).toHaveBeenCalledTimes(1);
  });

  it('não chama onFechar ao montar', async () => {
    const onFechar = vi.fn();
    await montar(<Recado texto="Lançamento registrado" onFechar={onFechar} />);

    expect(onFechar).not.toHaveBeenCalled();
  });

  it('não some sozinho: o recado continua depois do clique até o dono desmontá-lo', async () => {
    const tela = await montar(<Recado texto="Lançamento registrado" onFechar={() => undefined} />);

    await clicar(elemento(tela.container, 'button'));

    expect(tela.container.textContent).toContain('Lançamento registrado');
  });

  it('leva um ícone decorativo escondido dos leitores de tela', async () => {
    const tela = await montar(<Recado texto="Lançamento registrado" onFechar={() => undefined} />);

    expect(elemento(tela.container, '[role="status"] svg').getAttribute('aria-hidden')).toBe('true');
  });

  it('texto vazio mostra só o botão de fechar', async () => {
    const tela = await montar(<Recado texto="" onFechar={() => undefined} />);

    expect(tela.container.textContent).toBe('×');
  });
});
