import { afterEach, describe, expect, it } from 'vitest';
import { Cartao } from './Cartao';
import { desmontarTudo, elemento, montar } from '@/testes/montagem';

afterEach(desmontarTudo);

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
