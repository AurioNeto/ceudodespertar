import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { BarraDeProporcao, Cartao, Numero, Recado, Rotulo, Td, Th, rotuloCaixaAlta } from './Blocos';
import { clicar, desmontarTudo, elemento, montar, todos } from '@/testes/montagem';

afterEach(desmontarTudo);

describe('rotuloCaixaAlta', () => {
  it('é o conjunto de estilos do rótulo em caixa alta que as telas espalham no próprio estilo', () => {
    expect(rotuloCaixaAlta).toEqual({
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-field-label)',
    });
  });
});

describe('Rotulo', () => {
  it('mostra o texto num span', async () => {
    const tela = await montar(<Rotulo>Saldo</Rotulo>);

    expect(elemento(tela.container, 'span').textContent).toBe('Saldo');
  });

  it('o estilo recebido vence o padrão onde há conflito e preserva o resto', async () => {
    const tela = await montar(<Rotulo style={{ color: 'red', marginBottom: 4 }}>Saldo</Rotulo>);

    const rotulo = elemento(tela.container, 'span');
    expect(rotulo.style.color).toBe('red');
    expect(rotulo.style.marginBottom).toBe('4px');
    expect(rotulo.style.textTransform).toBe('uppercase');
  });

  it('aceita elementos como conteúdo', async () => {
    const tela = await montar(
      <Rotulo>
        Saldo <em>do mês</em>
      </Rotulo>,
    );

    expect(elemento(tela.container, 'span em').textContent).toBe('do mês');
  });
});

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

describe('Cartao', () => {
  it('é uma div com o conteúdo por padrão', async () => {
    const tela = await montar(<Cartao>conteúdo</Cartao>);

    const cartao = tela.container.firstElementChild;
    expect(cartao?.tagName).toBe('DIV');
    expect(cartao?.textContent).toBe('conteúdo');
  });

  it('vira article quando pedido', async () => {
    const tela = await montar(<Cartao as="article">conteúdo</Cartao>);

    expect(tela.container.firstElementChild?.tagName).toBe('ARTICLE');
  });

  it('repassa o rótulo acessível', async () => {
    const tela = await montar(<Cartao aria-label="Resumo do mês">conteúdo</Cartao>);

    expect(tela.container.firstElementChild?.getAttribute('aria-label')).toBe('Resumo do mês');
  });

  it('sem rótulo acessível não escreve o atributo', async () => {
    const tela = await montar(<Cartao>conteúdo</Cartao>);

    expect(tela.container.firstElementChild?.hasAttribute('aria-label')).toBe(false);
  });

  it('usa o respiro de escritório por padrão', async () => {
    const tela = await montar(<Cartao>conteúdo</Cartao>);

    expect(elemento(tela.container, 'div').style.padding).toBe('18px 20px');
  });

  it('usa o respiro menor em campo', async () => {
    const tela = await montar(<Cartao campo>conteúdo</Cartao>);

    expect(elemento(tela.container, 'div').style.padding).toBe('15px 16px');
  });

  it('o estilo recebido vence o padrão onde há conflito e preserva o resto', async () => {
    const tela = await montar(<Cartao style={{ gap: 4, background: 'red' }}>conteúdo</Cartao>);

    const cartao = elemento(tela.container, 'div');
    expect(cartao.style.gap).toBe('4px');
    expect(cartao.style.background).toBe('red');
    expect(cartao.style.flexDirection).toBe('column');
  });

  it('sem filhos continua sendo um cartão vazio', async () => {
    const tela = await montar(<Cartao>{null}</Cartao>);

    expect(tela.container.firstElementChild?.textContent).toBe('');
  });
});

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
