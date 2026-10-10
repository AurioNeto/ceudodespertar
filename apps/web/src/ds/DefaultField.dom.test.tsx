import { afterEach, describe, expect, it, vi } from 'vitest';
import { clicar, desmontarTudo, elemento, folhaComTexto, montar, todos } from '@/testes/montagem';
import { errosAoClicar, glifoDe } from './apoioDeTeste';
import { DefaultField } from './DefaultField';

afterEach(desmontarTudo);

const campo = (container: HTMLElement) => elemento<HTMLButtonElement>(container, 'button');

describe('DefaultField: padrão visível', () => {
  it('mostra o rótulo e o valor sem precisar de toque', async () => {
    const { container } = await montar(<DefaultField label="Conta" value="Cora PJ" />);
    expect(folhaComTexto(container, 'span', 'Conta')).toBeTruthy();
    expect(folhaComTexto(container, 'span', 'Cora PJ')).toBeTruthy();
  });

  it('o rótulo vem antes do valor', async () => {
    const { container } = await montar(<DefaultField label="Conta" value="Cora PJ" />);
    const rotulo = folhaComTexto(container, 'span', 'Conta');
    expect(rotulo.nextElementSibling?.textContent).toBe('Cora PJ');
  });

  it('o valor aceita elemento React, não só texto', async () => {
    const { container } = await montar(<DefaultField label="Valor" value={<strong>R$ 120,00</strong>} />);
    expect(elemento(container, 'strong').textContent).toBe('R$ 120,00');
  });

  it('a origem do padrão aparece quando informada', async () => {
    const { container } = await montar(<DefaultField label="Conta" value="Cora PJ" origin="última conta usada" />);
    expect(folhaComTexto(container, 'span', 'última conta usada')).toBeTruthy();
  });

  it('sem origem o botão só tem o bloco de texto e o lápis', async () => {
    const { container } = await montar(<DefaultField label="Conta" value="Cora PJ" />);
    expect(campo(container).children).toHaveLength(2);
  });

  it('com origem o botão ganha um terceiro filho, entre o texto e o lápis', async () => {
    const { container } = await montar(<DefaultField label="Conta" value="Cora PJ" origin="última conta usada" />);
    expect(campo(container).children).toHaveLength(3);
    expect(campo(container).children[1]?.textContent).toBe('última conta usada');
  });

  it('origem vazia não ocupa lugar', async () => {
    const { container } = await montar(<DefaultField label="Conta" value="Cora PJ" origin="" />);
    expect(campo(container).children).toHaveLength(2);
  });

  it('o nome acessível do botão junta rótulo, valor e origem', async () => {
    const { container } = await montar(<DefaultField label="Conta" value="Cora PJ" origin="última conta usada" />);
    expect(campo(container).textContent).toBe('ContaCora PJúltima conta usada');
  });

  it('o lápis que indica edição é decorativo e fica por último', async () => {
    const { container } = await montar(<DefaultField label="Conta" value="Cora PJ" />);
    const lapis = campo(container).lastElementChild as Element;
    expect(lapis.tagName.toLowerCase()).toBe('svg');
    expect(lapis.getAttribute('aria-hidden')).toBe('true');
    expect(glifoDe(lapis)).toBe('pencil');
  });
});

describe('DefaultField: editar em um toque', () => {
  it('o campo inteiro é um único botão de tipo button', async () => {
    const { container } = await montar(<DefaultField label="Conta" value="Cora PJ" origin="última conta usada" />);
    expect(todos(container, 'button')).toHaveLength(1);
    expect(campo(container).type).toBe('button');
  });

  it('um clique chama onEdit uma vez, sem passo de confirmação', async () => {
    const aoEditar = vi.fn();
    const { container } = await montar(<DefaultField label="Conta" value="Cora PJ" onEdit={aoEditar} />);
    await clicar(campo(container));
    expect(aoEditar).toHaveBeenCalledOnce();
  });

  it('clicar no texto do valor também edita', async () => {
    const aoEditar = vi.fn();
    const { container } = await montar(<DefaultField label="Conta" value="Cora PJ" onEdit={aoEditar} />);
    await clicar(folhaComTexto(container, 'span', 'Cora PJ'));
    expect(aoEditar).toHaveBeenCalledOnce();
  });

  it('sem onEdit clicar no campo não lança erro', async () => {
    const { container } = await montar(<DefaultField label="Conta" value="Cora PJ" />);
    expect(await errosAoClicar(campo(container))).toEqual([]);
  });

  it('mostrar o padrão não chama onEdit', async () => {
    const aoEditar = vi.fn();
    await montar(<DefaultField label="Conta" value="Cora PJ" onEdit={aoEditar} />);
    expect(aoEditar).not.toHaveBeenCalled();
  });
});

describe('DefaultField: densidade', () => {
  it.each([
    { nome: 'sem densidade, vale a de campo', densidade: undefined, altura: 'var(--target-field)' },
    { nome: 'campo', densidade: 'field', altura: 'var(--target-field)' },
    { nome: 'escritório', densidade: 'office', altura: 'var(--target-office)' },
  ] as const)('$nome: altura mínima $altura', async ({ densidade, altura }) => {
    const { container } = await montar(
      densidade ? <DefaultField label="Conta" value="Cora PJ" density={densidade} /> : <DefaultField label="Conta" value="Cora PJ" />,
    );
    expect(campo(container).style.minHeight).toBe(altura);
  });

  it('o style recebido vence o padrão e preserva o resto', async () => {
    const { container } = await montar(<DefaultField label="Conta" value="Cora PJ" style={{ gap: 2 }} />);
    expect(campo(container).style.gap).toBe('2px');
    expect(campo(container).style.display).toBe('flex');
  });
});
