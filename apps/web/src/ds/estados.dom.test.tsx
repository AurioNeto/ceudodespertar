import { afterEach, describe, expect, it, vi } from 'vitest';
import { DomainError, EmptyState, FlowerOfLife, InfraError, PermissionDenied, SkeletonList } from './estados';
import { clicar, desmontarTudo, elemento, montar } from './apoioDeRender';

afterEach(desmontarTudo);

const raizDe = (container: HTMLElement) => elemento<HTMLDivElement>(container, ':scope > div');
const paragrafosDe = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('p')).map((paragrafo) => paragrafo.textContent);
const circulosDe = (container: HTMLElement) => Array.from(container.querySelectorAll('circle'));
const cartoesDe = (container: HTMLElement) => Array.from(container.querySelectorAll(':scope > div > div'));
const largurasDasBarras = (cartao: Element) =>
  Array.from(cartao.children).map((barra) => (barra as HTMLElement).style.width);

const CENTROS_DA_FLOR: readonly [string, string][] = [
  ['100', '100'],
  ['100', '66'],
  ['100', '134'],
  ['129', '83'],
  ['129', '117'],
  ['71', '83'],
  ['71', '117'],
];

const QUANTIDADE_DE_LINHAS: readonly number[] = [0, 1, 3, 4, 5, 9];

const LARGURAS_POR_LINHA: readonly [number, string, string][] = [
  [0, '58%', '32%'],
  [1, '44%', '26%'],
  [2, '66%', '30%'],
  [3, '38%', '22%'],
  [4, '58%', '32%'],
  [7, '38%', '22%'],
];

describe('DomainError', () => {
  it('só a regra — mostra a regra e nenhum parágrafo', async () => {
    const { container } = await montar(<DomainError rule="Período fechado" />);

    expect(container.textContent).toBe('Período fechado');
    expect(paragrafosDe(container)).toEqual([]);
  });

  it('com explicação — mostra a regra e a explicação em parágrafo', async () => {
    const { container } = await montar(<DomainError rule="Período fechado" explanation="Março já foi encerrado." />);

    expect(paragrafosDe(container)).toEqual(['Março já foi encerrado.']);
  });

  it('com o caminho — mostra a regra e o caminho em parágrafo', async () => {
    const { container } = await montar(<DomainError rule="Período fechado" way="Peça a reabertura ao tesoureiro." />);

    expect(paragrafosDe(container)).toEqual(['Peça a reabertura ao tesoureiro.']);
  });

  it('com explicação e caminho — explicação vem antes do caminho', async () => {
    const { container } = await montar(
      <DomainError rule="Período fechado" explanation="Março já foi encerrado." way="Peça a reabertura." />,
    );

    expect(paragrafosDe(container)).toEqual(['Março já foi encerrado.', 'Peça a reabertura.']);
  });

  it('explicação e caminho vazios — não desenha parágrafos', async () => {
    const { container } = await montar(<DomainError rule="Período fechado" explanation="" way="" />);

    expect(paragrafosDe(container)).toEqual([]);
  });

  it('a regra vem antes dos parágrafos', async () => {
    const { container } = await montar(<DomainError rule="Período fechado" explanation="E" way="C" />);

    expect(container.textContent).toBe('Período fechadoEC');
  });

  it('style próprio — sobrepõe o fundo', async () => {
    const { container } = await montar(<DomainError rule="R" style={{ background: 'red' }} />);

    expect(raizDe(container).style.background).toBe('red');
  });
});

describe('FlowerOfLife', () => {
  it('desenha um svg decorativo de 200x200', async () => {
    const { container } = await montar(<FlowerOfLife />);

    const figura = elemento<SVGElement>(container, 'svg');
    expect([figura.getAttribute('aria-hidden'), figura.getAttribute('viewBox')]).toEqual(['true', '0 0 200 200']);
  });

  it('desenha sete círculos nos centros da flor', async () => {
    const { container } = await montar(<FlowerOfLife />);

    expect(circulosDe(container).map((circulo) => [circulo.getAttribute('cx'), circulo.getAttribute('cy')])).toEqual(
      CENTROS_DA_FLOR,
    );
  });

  it('todos os círculos têm raio 34', async () => {
    const { container } = await montar(<FlowerOfLife />);

    expect(circulosDe(container).map((circulo) => circulo.getAttribute('r'))).toEqual(
      CENTROS_DA_FLOR.map(() => '34'),
    );
  });

  it('é uma marca d\'água: cobre o pai e fica quase transparente', async () => {
    const { container } = await montar(<FlowerOfLife />);

    const figura = elemento<SVGElement>(container, 'svg');
    expect([figura.style.position, figura.style.opacity]).toEqual(['absolute', '0.06']);
  });
});

describe('EmptyState', () => {
  it('só o título — mostra o título em h3 e a flor da vida', async () => {
    const { container } = await montar(<EmptyState title="Nada por aqui" />);

    expect(elemento(container, 'h3').textContent).toBe('Nada por aqui');
    expect(circulosDe(container).length).toBe(7);
  });

  it('só o título — não desenha descrição nem ação', async () => {
    const { container } = await montar(<EmptyState title="Nada por aqui" />);

    expect(container.textContent).toBe('Nada por aqui');
    expect(paragrafosDe(container)).toEqual([]);
  });

  it('com descrição — mostra o parágrafo depois do título', async () => {
    const { container } = await montar(<EmptyState title="Nada por aqui" description="Registre o primeiro lançamento." />);

    expect(paragrafosDe(container)).toEqual(['Registre o primeiro lançamento.']);
    expect(container.textContent).toBe('Nada por aquiRegistre o primeiro lançamento.');
  });

  it('descrição vazia — não desenha parágrafo', async () => {
    const { container } = await montar(<EmptyState title="Nada por aqui" description="" />);

    expect(paragrafosDe(container)).toEqual([]);
  });

  it('com ação — renderiza a ação por último', async () => {
    const { container } = await montar(
      <EmptyState title="Nada por aqui" description="D" action={<button type="button">Novo lançamento</button>} />,
    );

    expect(container.textContent).toBe('Nada por aquiDNovo lançamento');
    expect(elemento(container, 'button').textContent).toBe('Novo lançamento');
  });

  it('a ação continua clicável', async () => {
    const aoClicar = vi.fn();
    const { container } = await montar(
      <EmptyState title="Nada por aqui" action={<button type="button" onClick={aoClicar}>Novo</button>} />,
    );

    await clicar(elemento<HTMLButtonElement>(container, 'button'));

    expect(aoClicar).toHaveBeenCalledTimes(1);
  });

  it('style próprio — sobrepõe o fundo', async () => {
    const { container } = await montar(<EmptyState title="T" style={{ background: 'red' }} />);

    expect(raizDe(container).style.background).toBe('red');
  });
});

describe('InfraError', () => {
  it('sem título — usa "Não deu para carregar" e mostra a descrição', async () => {
    const { container } = await montar(<InfraError description="Sem conexão com o servidor." />);

    expect(container.textContent).toBe('Não deu para carregarSem conexão com o servidor.');
  });

  it('título próprio — substitui o padrão', async () => {
    const { container } = await montar(<InfraError title="Falha ao salvar" description="Tente mais tarde." />);

    expect(container.textContent).toBe('Falha ao salvarTente mais tarde.');
  });

  it('descrição — sai em parágrafo', async () => {
    const { container } = await montar(<InfraError description="Sem conexão." />);

    expect(paragrafosDe(container)).toEqual(['Sem conexão.']);
  });

  it('sem onRetry — não oferece nova tentativa', async () => {
    const { container } = await montar(<InfraError description="Sem conexão." />);

    expect(container.querySelector('button')).toBeNull();
  });

  it('com onRetry — oferece o botão "Tentar de novo"', async () => {
    const { container } = await montar(<InfraError description="Sem conexão." onRetry={vi.fn()} />);

    expect(elemento(container, 'button').textContent).toBe('Tentar de novo');
  });

  it('com onRetry — o clique no botão chama onRetry uma vez', async () => {
    const aoTentarDeNovo = vi.fn();
    const { container } = await montar(<InfraError description="Sem conexão." onRetry={aoTentarDeNovo} />);

    await clicar(elemento<HTMLButtonElement>(container, 'button'));

    expect(aoTentarDeNovo).toHaveBeenCalledTimes(1);
  });

  it('sinaliza a falta de conexão com o ícone wifi-off, e o botão leva rotate-cw', async () => {
    const { container } = await montar(<InfraError description="Sem conexão." onRetry={vi.fn()} />);

    const icones = Array.from(container.querySelectorAll('svg'));
    expect(icones.map((icone) => [icone.classList.contains('lucide-wifi-off'), icone.classList.contains('lucide-rotate-cw')])).toEqual([
      [true, false],
      [false, true],
    ]);
  });

  it('style próprio — sobrepõe o fundo', async () => {
    const { container } = await montar(<InfraError description="D" style={{ background: 'red' }} />);

    expect(raizDe(container).style.background).toBe('red');
  });
});

describe('PermissionDenied', () => {
  it('mostra a tela negada, o grupo, a permissão que falta e a quem pedir', async () => {
    const { container } = await montar(
      <PermissionDenied screen="Fechamento" group="Voluntários" missing="financeiro.fechamento.executar" />,
    );

    expect(container.textContent).toBe(
      'Você não tem acesso a Fechamento' +
        'Seu grupo é Voluntários. Falta a permissão financeiro.fechamento.executar. ' +
        'Se você precisa desse acesso, fale com o administrador.',
    );
  });

  it('whoToAsk próprio — substitui "o administrador"', async () => {
    const { container } = await montar(
      <PermissionDenied screen="Fechamento" group="Voluntários" missing="x.y.z" whoToAsk="a tesouraria" />,
    );

    expect(paragrafosDe(container)).toEqual([
      'Seu grupo é Voluntários. Falta a permissão x.y.z. Se você precisa desse acesso, fale com a tesouraria.',
    ]);
  });

  it('grupo — sai em negrito, e a permissão em código', async () => {
    const { container } = await montar(<PermissionDenied screen="Fechamento" group="Voluntários" missing="x.y.z" />);

    expect(elemento(container, 'b').textContent).toBe('Voluntários');
    expect(elemento(container, 'code').textContent).toBe('x.y.z');
  });

  it('sinaliza o bloqueio com o ícone ban', async () => {
    const { container } = await montar(<PermissionDenied screen="S" group="G" missing="m" />);

    expect(elemento<SVGElement>(container, 'svg').classList.contains('lucide-ban')).toBe(true);
  });

  it('style próprio — sobrepõe o fundo', async () => {
    const { container } = await montar(<PermissionDenied screen="S" group="G" missing="m" style={{ background: 'red' }} />);

    expect(raizDe(container).style.background).toBe('red');
  });
});

describe('SkeletonList', () => {
  it('sem rows — desenha 4 cartões', async () => {
    const { container } = await montar(<SkeletonList />);

    expect(cartoesDe(container).length).toBe(4);
  });

  it.each(QUANTIDADE_DE_LINHAS)('rows %s — desenha essa quantidade de cartões', async (linhas) => {
    const { container } = await montar(<SkeletonList rows={linhas} />);

    expect(cartoesDe(container).length).toBe(linhas);
  });

  it('rows negativo — não desenha cartões', async () => {
    const { container } = await montar(<SkeletonList rows={-2} />);

    expect(cartoesDe(container).length).toBe(0);
  });

  it('cada cartão — tem duas barras, a de título mais alta que a de meta', async () => {
    const { container } = await montar(<SkeletonList rows={1} />);

    const barras = Array.from(elemento(container, ':scope > div > div').children) as HTMLElement[];
    expect(barras.map((barra) => barra.style.height)).toEqual(['11px', '9px']);
  });

  it.each(LARGURAS_POR_LINHA)('linha %s — barras de %s e %s, repetindo o ciclo de quatro', async (indice, titulo, meta) => {
    const { container } = await montar(<SkeletonList rows={8} />);

    expect(largurasDasBarras(cartoesDe(container)[indice] as Element)).toEqual([titulo, meta]);
  });

  it('declara os keyframes cdd-sh', async () => {
    const { container } = await montar(<SkeletonList rows={1} />);

    expect(elemento(container, 'style').textContent).toContain('@keyframes cdd-sh');
  });

  it('não escreve texto visível — o único texto é a declaração da animação', async () => {
    const { container } = await montar(<SkeletonList rows={3} />);

    expect(container.textContent).toBe('@keyframes cdd-sh{0%{background-position:100% 0}100%{background-position:0 0}}');
  });

  it('style próprio — sobrepõe o espaçamento entre cartões', async () => {
    const { container } = await montar(<SkeletonList style={{ gap: '30px' }} />);

    expect(raizDe(container).style.gap).toBe('30px');
  });
});
