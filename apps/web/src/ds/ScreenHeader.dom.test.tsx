import { afterEach, describe, expect, it, vi } from 'vitest';
import { botaoComTexto, clicar, desmontarTudo, elemento, montar, todos } from '@/testes/montagem';
import { ScreenHeader } from './ScreenHeader';

afterEach(desmontarTudo);

const cabecalho = (container: HTMLElement) => elemento<HTMLElement>(container, 'header');
const blocoDeTexto = (container: HTMLElement) => cabecalho(container).firstElementChild as HTMLElement;

describe('ScreenHeader: título', () => {
  it('o título é o único h1 e aceita foco por programa, não pelo Tab', async () => {
    const { container } = await montar(<ScreenHeader title="Acessos" />);
    const titulos = todos(container, 'h1');
    expect(titulos).toHaveLength(1);
    expect(titulos[0]?.textContent).toBe('Acessos');
    expect(titulos[0]?.getAttribute('tabindex')).toBe('-1');
  });

  it('o título pode receber foco por quem navega entre telas', async () => {
    const { container } = await montar(<ScreenHeader title="Acessos" />);
    const titulo = elemento<HTMLElement>(container, 'h1');
    titulo.focus();
    expect(document.activeElement).toBe(titulo);
  });

  it('o cabeçalho é um elemento header', async () => {
    const { container } = await montar(<ScreenHeader title="Acessos" />);
    expect(container.firstElementChild?.tagName).toBe('HEADER');
  });

  it('trocar o título nas props troca o texto sem remontar o cabeçalho', async () => {
    const montado = await montar(<ScreenHeader title="Acessos" />);
    const antes = cabecalho(montado.container);
    await montado.atualizar(<ScreenHeader title="Meu perfil" />);
    expect(cabecalho(montado.container)).toBe(antes);
    expect(elemento(montado.container, 'h1').textContent).toBe('Meu perfil');
  });
});

describe('ScreenHeader: sobrancelha', () => {
  it('o código da tela aparece acima do título', async () => {
    const { container } = await montar(<ScreenHeader code="T-02" title="Acessos" />);
    expect(blocoDeTexto(container).children[0]?.textContent).toBe('T-02');
    expect(blocoDeTexto(container).children[1]?.tagName).toBe('H1');
  });

  it('sem código o bloco de texto começa direto no título', async () => {
    const { container } = await montar(<ScreenHeader title="Acessos" />);
    expect(blocoDeTexto(container).children).toHaveLength(1);
    expect(blocoDeTexto(container).children[0]?.tagName).toBe('H1');
  });

  it('código vazio não ocupa lugar', async () => {
    const { container } = await montar(<ScreenHeader code="" title="Acessos" />);
    expect(blocoDeTexto(container).children).toHaveLength(1);
  });
});

describe('ScreenHeader: subtítulo', () => {
  it('o subtítulo é um parágrafo logo abaixo do título', async () => {
    const { container } = await montar(<ScreenHeader title="Acessos" subtitle="Quem entra e o que pode fazer." />);
    const paragrafo = elemento(container, 'p');
    expect(paragrafo.textContent).toBe('Quem entra e o que pode fazer.');
    expect(paragrafo.previousElementSibling?.tagName).toBe('H1');
  });

  it('sem subtítulo não há parágrafo', async () => {
    const { container } = await montar(<ScreenHeader title="Acessos" />);
    expect(todos(container, 'p')).toHaveLength(0);
  });

  it('subtítulo vazio não ocupa lugar', async () => {
    const { container } = await montar(<ScreenHeader title="Acessos" subtitle="" />);
    expect(blocoDeTexto(container).children).toHaveLength(1);
  });

  it('código, título e subtítulo juntos ficam nessa ordem', async () => {
    const { container } = await montar(<ScreenHeader code="T-02" title="Acessos" subtitle="Quem entra." />);
    const tags = Array.from(blocoDeTexto(container).children).map((filho) => filho.tagName);
    expect(tags).toEqual(['DIV', 'H1', 'P']);
  });
});

describe('ScreenHeader: ações', () => {
  it('as ações ficam num bloco ao lado do texto, depois dele', async () => {
    const { container } = await montar(
      <ScreenHeader title="Acessos" actions={<button type="button">Convidar</button>} />,
    );
    expect(cabecalho(container).children).toHaveLength(2);
    expect(blocoDeTexto(container).contains(botaoComTexto(container, 'Convidar'))).toBe(false);
    expect(cabecalho(container).lastElementChild?.contains(botaoComTexto(container, 'Convidar'))).toBe(true);
  });

  it('várias ações ficam todas no mesmo bloco, na ordem recebida', async () => {
    const { container } = await montar(
      <ScreenHeader
        title="Acessos"
        actions={
          <>
            <button type="button">Exportar</button>
            <button type="button">Convidar</button>
          </>
        }
      />,
    );
    const rotulos = todos(cabecalho(container).lastElementChild as HTMLElement, 'button').map((b) => b.textContent);
    expect(rotulos).toEqual(['Exportar', 'Convidar']);
  });

  it('a ação continua clicável e recebe o clique', async () => {
    const aoConvidar = vi.fn();
    const { container } = await montar(
      <ScreenHeader
        title="Acessos"
        actions={
          <button type="button" onClick={aoConvidar}>
            Convidar
          </button>
        }
      />,
    );
    await clicar(botaoComTexto(container, 'Convidar'));
    expect(aoConvidar).toHaveBeenCalledOnce();
  });

  it('sem ações o cabeçalho só tem o bloco de texto', async () => {
    const { container } = await montar(<ScreenHeader title="Acessos" />);
    expect(cabecalho(container).children).toHaveLength(1);
  });

  it('ação nula não ocupa lugar', async () => {
    const { container } = await montar(<ScreenHeader title="Acessos" actions={null} />);
    expect(cabecalho(container).children).toHaveLength(1);
  });
});

describe('ScreenHeader: densidade', () => {
  it.each([
    ['sem densidade, vale a de escritório', undefined, '21px 24px 20px'],
    ['escritório', 'office', '21px 24px 20px'],
    ['campo, mais compacto', 'field', '17px 20px 16px'],
  ] as const)('%s: respiro interno de %s', async (_nome, densidade, respiro) => {
    const { container } = await montar(
      densidade ? <ScreenHeader title="Acessos" density={densidade} /> : <ScreenHeader title="Acessos" />,
    );
    expect(cabecalho(container).style.padding).toBe(respiro);
  });

  it('o style recebido vence o padrão do cabeçalho e preserva o resto', async () => {
    const { container } = await montar(<ScreenHeader title="Acessos" style={{ gap: 4 }} />);
    expect(cabecalho(container).style.gap).toBe('4px');
    expect(cabecalho(container).style.display).toBe('flex');
  });
});
