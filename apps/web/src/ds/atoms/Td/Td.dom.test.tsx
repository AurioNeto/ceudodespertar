import { afterEach, describe, expect, it } from 'vitest';
import type { ReactElement } from 'react';
import { Td } from './Td';
import { desmontarTudo, elemento, montar } from '@/testes/montagem';

afterEach(desmontarTudo);

describe('Td', () => {
  const montarCorpo = (celula: ReactElement) =>
    montar(
      <table>
        <tbody>
          <tr>{celula}</tr>
        </tbody>
      </table>,
    );

  it('é uma célula de dados com o conteúdo', async () => {
    const tela = await montarCorpo(<Td>R$ 10,00</Td>);

    expect(elemento(tela.container, 'td').textContent).toBe('R$ 10,00');
  });

  it('alinha à esquerda por padrão', async () => {
    const tela = await montarCorpo(<Td>x</Td>);

    expect(elemento(tela.container, 'td').style.textAlign).toBe('left');
  });

  it('alinha à direita quando pedido', async () => {
    const tela = await montarCorpo(<Td alinharDireita>x</Td>);

    expect(elemento(tela.container, 'td').style.textAlign).toBe('right');
  });

  it('sem conteúdo continua sendo uma célula, vazia', async () => {
    const tela = await montarCorpo(<Td />);

    expect(elemento(tela.container, 'td').textContent).toBe('');
  });

  it('aceita elementos como conteúdo', async () => {
    const tela = await montarCorpo(
      <Td>
        <strong>10</strong>
      </Td>,
    );

    expect(elemento(tela.container, 'td strong').textContent).toBe('10');
  });
});
