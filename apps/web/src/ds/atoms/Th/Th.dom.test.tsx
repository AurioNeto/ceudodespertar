import { afterEach, describe, expect, it } from 'vitest';
import type { ReactElement } from 'react';
import { Th } from './Th';
import { desmontarTudo, elemento, montar } from '@/testes/montagem';

afterEach(desmontarTudo);

describe('Th', () => {
  const montarCabecalho = (celula: ReactElement) =>
    montar(
      <table>
        <thead>
          <tr>{celula}</tr>
        </thead>
      </table>,
    );

  it('é uma célula de cabeçalho com o texto', async () => {
    const tela = await montarCabecalho(<Th>Valor</Th>);

    expect(elemento(tela.container, 'th').textContent).toBe('Valor');
  });

  it('alinha à esquerda por padrão', async () => {
    const tela = await montarCabecalho(<Th>Valor</Th>);

    expect(elemento(tela.container, 'th').style.textAlign).toBe('left');
  });

  it('alinha à direita quando pedido', async () => {
    const tela = await montarCabecalho(<Th alinharDireita>Valor</Th>);

    expect(elemento(tela.container, 'th').style.textAlign).toBe('right');
  });

  it('sem conteúdo continua sendo uma célula, vazia', async () => {
    const tela = await montarCabecalho(<Th />);

    expect(elemento(tela.container, 'th').textContent).toBe('');
  });
});
