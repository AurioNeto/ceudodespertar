import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  botaoComTexto,
  clicar,
  desmontarTudo,
  elemento,
  folhaComTexto,
  montar,
  passarMouseSobre,
  tirarMouseDe,
  todos,
} from '../testes/montagem';
import { AppShell, type NavEntry } from './AppShell';

afterEach(desmontarTudo);

const NAV: readonly NavEntry[] = [
  { section: 'Operação' },
  { id: 'painel', label: 'Painel', icon: 'layout-dashboard' },
  { id: 'fila', label: 'Fila de verificação', icon: 'inbox', count: 3 },
  { section: 'Cadastros' },
  { id: 'pessoas', label: 'Pessoas', icon: 'users', count: 0 },
  { id: 'contas', label: 'Contas', icon: 'wallet' },
  { id: 'acessos', label: 'Acessos', icon: 'key-round' },
];

const USUARIA = { name: 'Ana Souza', group: 'Tesouraria' };

const raiz = (container: HTMLElement) => container.firstElementChild as HTMLElement;
const lateral = (container: HTMLElement) => elemento(container, 'aside');
const navLateral = (container: HTMLElement) => elemento(lateral(container), 'nav');
const navInferior = (container: HTMLElement) => elemento(container, 'nav');
const barraDeContexto = (container: HTMLElement) => elemento(container, 'header');
const chipDoUsuario = (container: HTMLElement) => elemento<HTMLButtonElement>(container, 'button[title="Meu perfil"]');
const textosDosFilhos = (pai: HTMLElement) => Array.from(pai.children).map((filho) => filho.textContent);

async function errosAoClicar(alvo: HTMLElement): Promise<string[]> {
  const erros: string[] = [];
  const ouvir = (evento: ErrorEvent) => {
    evento.preventDefault();
    erros.push(evento.message);
  };
  window.addEventListener('error', ouvir);
  await clicar(alvo);
  window.removeEventListener('error', ouvir);
  return erros;
}

describe('AppShell: estrutura por densidade', () => {
  it('sem densidade vale a de escritório, com coluna lateral de 232px', async () => {
    const { container } = await montar(<AppShell user={USUARIA}>conteúdo</AppShell>);
    expect(raiz(container).dataset['density']).toBe('office');
    expect(raiz(container).style.gridTemplateColumns).toBe('232px 1fr');
    expect(todos(container, 'aside')).toHaveLength(1);
  });

  it('em campo a tela é de coluna única e não há lateral', async () => {
    const { container } = await montar(
      <AppShell user={USUARIA} density="field">
        conteúdo
      </AppShell>,
    );
    expect(raiz(container).dataset['density']).toBe('field');
    expect(raiz(container).style.gridTemplateColumns).toBe('1fr');
    expect(todos(container, 'aside')).toHaveLength(0);
  });

  it('o conteúdo fica dentro de main, que é a área com a estampa de papel', async () => {
    const { container } = await montar(
      <AppShell user={USUARIA}>
        <p>conteúdo da tela</p>
      </AppShell>,
    );
    const principal = elemento(container, 'main');
    expect(principal.textContent).toBe('conteúdo da tela');
    expect(principal.classList.contains('cdd-papel-estampado')).toBe(true);
    expect(todos(container, 'main')).toHaveLength(1);
  });

  it('em campo o conteúdo também fica dentro de main', async () => {
    const campo = await montar(
      <AppShell user={USUARIA} density="field">
        <p>conteúdo da tela</p>
      </AppShell>,
    );
    expect(elemento(campo.container, 'main').textContent).toBe('conteúdo da tela');
  });

  it('o style recebido vence o padrão e preserva o resto', async () => {
    const { container } = await montar(
      <AppShell user={USUARIA} style={{ height: '50%' }}>
        conteúdo
      </AppShell>,
    );
    expect(raiz(container).style.height).toBe('50%');
    expect(raiz(container).style.display).toBe('grid');
  });
});

describe('AppShell: marca da lateral', () => {
  it('a lateral abre com o nome da casa e a legenda do sistema', async () => {
    const { container } = await montar(<AppShell user={USUARIA}>conteúdo</AppShell>);
    expect(lateral(container).textContent).toContain('Céu doDespertar');
    expect(folhaComTexto(lateral(container), 'div', 'Sistema de gestão')).toBeTruthy();
  });

  it('em campo a marca da lateral não existe', async () => {
    const { container } = await montar(
      <AppShell user={USUARIA} density="field">
        conteúdo
      </AppShell>,
    );
    expect(container.textContent).not.toContain('Sistema de gestão');
  });
});

describe('AppShell: navegação lateral', () => {
  it('lista seções e itens na ordem recebida, com a contagem colada ao rótulo', async () => {
    const { container } = await montar(
      <AppShell user={USUARIA} nav={NAV}>
        conteúdo
      </AppShell>,
    );
    expect(textosDosFilhos(navLateral(container))).toEqual([
      'Operação',
      'Painel',
      'Fila de verificação3',
      'Cadastros',
      'Pessoas',
      'Contas',
      'Acessos',
    ]);
  });

  it('seção é só um título: não é botão e clicar nela não navega', async () => {
    const aoNavegar = vi.fn();
    const { container } = await montar(
      <AppShell user={USUARIA} nav={NAV} onNavigate={aoNavegar}>
        conteúdo
      </AppShell>,
    );
    expect(todos(navLateral(container), 'button')).toHaveLength(5);
    await clicar(folhaComTexto(navLateral(container), 'div', 'Operação'));
    expect(aoNavegar).not.toHaveBeenCalled();
  });

  it('clicar num item chama onNavigate uma vez com o id dele', async () => {
    const aoNavegar = vi.fn();
    const { container } = await montar(
      <AppShell user={USUARIA} nav={NAV} onNavigate={aoNavegar}>
        conteúdo
      </AppShell>,
    );
    await clicar(todos<HTMLButtonElement>(navLateral(container), 'button')[3] as HTMLElement);
    expect(aoNavegar).toHaveBeenCalledExactlyOnceWith('contas');
  });

  it('sem onNavigate clicar num item não lança erro', async () => {
    const { container } = await montar(
      <AppShell user={USUARIA} nav={NAV}>
        conteúdo
      </AppShell>,
    );
    expect(await errosAoClicar(todos<HTMLButtonElement>(navLateral(container), 'button')[0] as HTMLElement)).toEqual([]);
  });

  it('os itens são botões de tipo button', async () => {
    const { container } = await montar(
      <AppShell user={USUARIA} nav={NAV}>
        conteúdo
      </AppShell>,
    );
    const tipos = todos<HTMLButtonElement>(navLateral(container), 'button').map((botao) => botao.type);
    expect(tipos).toEqual(['button', 'button', 'button', 'button', 'button']);
  });

  it('em escritório a lateral é a única navegação: não há barra inferior', async () => {
    const { container } = await montar(
      <AppShell user={USUARIA} nav={NAV}>
        conteúdo
      </AppShell>,
    );
    expect(todos(container, 'nav')).toHaveLength(1);
    expect(lateral(container).contains(navLateral(container))).toBe(true);
  });

  it('sem nav a lateral tem a navegação vazia', async () => {
    const { container } = await montar(<AppShell user={USUARIA}>conteúdo</AppShell>);
    expect(navLateral(container).children).toHaveLength(0);
  });
});

describe('AppShell: item ativo', () => {
  it('só o item cujo id é o activeId carrega aria-current=page', async () => {
    const { container } = await montar(
      <AppShell user={USUARIA} nav={NAV} activeId="fila">
        conteúdo
      </AppShell>,
    );
    const atuais = todos(navLateral(container), 'button').map((botao) => botao.getAttribute('aria-current'));
    expect(atuais).toEqual([null, 'page', null, null, null]);
  });

  it.each([
    ['ausente', undefined],
    ['que não existe na navegação', 'inexistente'],
    ['igual ao nome de uma seção', 'Operação'],
  ])('com activeId %s nenhum item é marcado como atual', async (_descricao, activeId) => {
    const { container } = await montar(
      <AppShell user={USUARIA} nav={NAV} {...(activeId ? { activeId } : {})}>
        conteúdo
      </AppShell>,
    );
    expect(container.querySelector('[aria-current]')).toBeNull();
  });

  it('o item ativo ganha tinta royal escura e uma marca na borda esquerda, os outros não', async () => {
    const { container } = await montar(
      <AppShell user={USUARIA} nav={NAV} activeId="painel">
        conteúdo
      </AppShell>,
    );
    const [ativo, inativo] = todos<HTMLButtonElement>(navLateral(container), 'button');
    expect(ativo?.style.color).toBe('var(--color-royal-deep)');
    expect(inativo?.style.color).toBe('var(--text-primary)');
    expect(todos(ativo as HTMLElement, 'span').filter((s) => s.style.position === 'absolute')).toHaveLength(1);
    expect(todos(inativo as HTMLElement, 'span').filter((s) => s.style.position === 'absolute')).toHaveLength(0);
  });

  it('trocar o activeId passa a marca de um item para o outro', async () => {
    const montado = await montar(
      <AppShell user={USUARIA} nav={NAV} activeId="painel">
        conteúdo
      </AppShell>,
    );
    await montado.atualizar(
      <AppShell user={USUARIA} nav={NAV} activeId="contas">
        conteúdo
      </AppShell>,
    );
    const atuais = todos(navLateral(montado.container), 'button').map((botao) => botao.getAttribute('aria-current'));
    expect(atuais).toEqual([null, null, null, 'page', null]);
  });
});

describe('AppShell: contagem de pendências', () => {
  it('mostra o número no item que tem contagem positiva, marcado como dado numérico', async () => {
    const { container } = await montar(
      <AppShell user={USUARIA} nav={NAV}>
        conteúdo
      </AppShell>,
    );
    const selos = todos(navLateral(container), '[data-numeric]');
    expect(selos).toHaveLength(1);
    expect(selos[0]?.textContent).toBe('3');
    expect(selos[0]?.closest('button')?.textContent).toBe('Fila de verificação3');
  });

  it('contagem zero ou ausente não ocupa lugar no item', async () => {
    const { container } = await montar(
      <AppShell user={USUARIA} nav={NAV}>
        conteúdo
      </AppShell>,
    );
    const [painel, , pessoas] = todos<HTMLButtonElement>(navLateral(container), 'button');
    expect(painel?.children).toHaveLength(2);
    expect(pessoas?.children).toHaveLength(2);
  });

  it('o número aparece como veio, sem separador de milhar', async () => {
    const { container } = await montar(
      <AppShell user={USUARIA} nav={[{ id: 'fila', label: 'Fila', icon: 'inbox', count: 1200 }]}>
        conteúdo
      </AppShell>,
    );
    expect(elemento(navLateral(container), '[data-numeric]').textContent).toBe('1200');
  });
});

describe('AppShell: realce ao passar o mouse', () => {
  it('item inativo ganha fundo tênue ao receber o mouse e volta a transparente ao sair', async () => {
    const { container } = await montar(
      <AppShell user={USUARIA} nav={NAV} activeId="painel">
        conteúdo
      </AppShell>,
    );
    const inativo = todos<HTMLButtonElement>(navLateral(container), 'button')[1] as HTMLButtonElement;
    expect(inativo.style.background).toBe('transparent');
    await passarMouseSobre(inativo);
    expect(inativo.style.background).toBe('rgba(26, 61, 168, 0.06)');
    await tirarMouseDe(inativo);
    expect(inativo.style.background).toBe('transparent');
  });

  it('o item ativo mantém o cartão branco mesmo com o mouse em cima', async () => {
    const { container } = await montar(
      <AppShell user={USUARIA} nav={NAV} activeId="painel">
        conteúdo
      </AppShell>,
    );
    const ativo = todos<HTMLButtonElement>(navLateral(container), 'button')[0] as HTMLButtonElement;
    await passarMouseSobre(ativo);
    expect(ativo.style.background).toBe('var(--bg-card)');
  });

  it('o realce de um item não contamina os vizinhos', async () => {
    const { container } = await montar(
      <AppShell user={USUARIA} nav={NAV}>
        conteúdo
      </AppShell>,
    );
    const [primeiro, segundo] = todos<HTMLButtonElement>(navLateral(container), 'button');
    await passarMouseSobre(primeiro as HTMLElement);
    expect(segundo?.style.background).toBe('transparent');
  });
});

describe('AppShell: chip do usuário', () => {
  it('mostra nome e grupo, e o botão se chama Meu perfil', async () => {
    const { container } = await montar(<AppShell user={USUARIA}>conteúdo</AppShell>);
    const chip = chipDoUsuario(container);
    expect(folhaComTexto(chip, 'span', 'Ana Souza')).toBeTruthy();
    expect(folhaComTexto(chip, 'span', 'Tesouraria')).toBeTruthy();
    expect(chip.title).toBe('Meu perfil');
  });

  it.each([
    ['Ana Souza', 'AN'],
    ['maria', 'MA'],
    ['J', 'J'],
    ['élio', 'ÉL'],
    ['', '?'],
  ])('o selo do usuário "%s" mostra %s: as duas primeiras letras do nome, em maiúsculas', async (name, selo) => {
    const { container } = await montar(<AppShell user={{ name, group: 'Tesouraria' }}>conteúdo</AppShell>);
    expect(chipDoUsuario(container).querySelector('span')?.textContent).toBe(selo);
  });

  it('clicar no chip chama onUserClick uma vez', async () => {
    const aoClicarNoUsuario = vi.fn();
    const { container } = await montar(
      <AppShell user={USUARIA} onUserClick={aoClicarNoUsuario}>
        conteúdo
      </AppShell>,
    );
    await clicar(chipDoUsuario(container));
    expect(aoClicarNoUsuario).toHaveBeenCalledOnce();
  });

  it('sem onUserClick o chip não lança erro e o cursor deixa de ser de clique', async () => {
    const { container } = await montar(<AppShell user={USUARIA}>conteúdo</AppShell>);
    expect(await errosAoClicar(chipDoUsuario(container))).toEqual([]);
    expect(chipDoUsuario(container).style.cursor).toBe('default');
  });

  it('com onUserClick o cursor é de clique', async () => {
    const { container } = await montar(
      <AppShell user={USUARIA} onUserClick={vi.fn()}>
        conteúdo
      </AppShell>,
    );
    expect(chipDoUsuario(container).style.cursor).toBe('pointer');
  });

  it('em campo não há chip do usuário', async () => {
    const { container } = await montar(
      <AppShell user={USUARIA} density="field" onUserClick={vi.fn()}>
        conteúdo
      </AppShell>,
    );
    expect(container.querySelector('button[title="Meu perfil"]')).toBeNull();
  });
});

describe('AppShell: barra de contexto', () => {
  it('traz por padrão a instituição e a unidade CDD', async () => {
    const { container } = await montar(<AppShell user={USUARIA}>conteúdo</AppShell>);
    expect(folhaComTexto(barraDeContexto(container), 'span', 'Céu do Despertar')).toBeTruthy();
    expect(botaoComTexto(barraDeContexto(container), 'CDD')).toBeTruthy();
  });

  it('aceita instituição e unidade próprias', async () => {
    const { container } = await montar(
      <AppShell user={USUARIA} institution="Instituto Aurora" unit="Filial Norte">
        conteúdo
      </AppShell>,
    );
    expect(folhaComTexto(barraDeContexto(container), 'span', 'Instituto Aurora')).toBeTruthy();
    expect(botaoComTexto(barraDeContexto(container), 'Filial Norte')).toBeTruthy();
  });

  it('clicar na unidade chama onUnitClick uma vez', async () => {
    const aoClicarNaUnidade = vi.fn();
    const { container } = await montar(
      <AppShell user={USUARIA} onUnitClick={aoClicarNaUnidade}>
        conteúdo
      </AppShell>,
    );
    await clicar(botaoComTexto(barraDeContexto(container), 'CDD'));
    expect(aoClicarNaUnidade).toHaveBeenCalledOnce();
  });

  it('sem onUnitClick clicar na unidade não lança erro', async () => {
    const { container } = await montar(<AppShell user={USUARIA}>conteúdo</AppShell>);
    expect(await errosAoClicar(botaoComTexto(barraDeContexto(container), 'CDD'))).toEqual([]);
  });

  it('em escritório o canto direito diz o grupo do usuário', async () => {
    const { container } = await montar(<AppShell user={USUARIA}>conteúdo</AppShell>);
    expect(barraDeContexto(container).lastElementChild?.textContent).toBe('Tesouraria');
  });

  it('em campo o canto direito diz o nome do usuário, e a unidade continua à mão', async () => {
    const { container } = await montar(
      <AppShell user={USUARIA} density="field">
        conteúdo
      </AppShell>,
    );
    expect(barraDeContexto(container).lastElementChild?.textContent).toBe('Ana Souza');
    expect(botaoComTexto(barraDeContexto(container), 'CDD')).toBeTruthy();
  });

  it('é a única barra de contexto, acima do conteúdo', async () => {
    const { container } = await montar(<AppShell user={USUARIA}>conteúdo</AppShell>);
    expect(todos(container, 'header')).toHaveLength(1);
    expect(barraDeContexto(container).nextElementSibling?.tagName).toBe('MAIN');
  });
});

describe('AppShell: navegação inferior em campo', () => {
  const montarEmCampo = (props: { nav?: readonly NavEntry[]; activeId?: string; onNavigate?: (id: string) => void }) =>
    montar(
      <AppShell user={USUARIA} density="field" {...props}>
        conteúdo
      </AppShell>,
    );

  it('mostra só os quatro primeiros itens, sem seções e sem contagem', async () => {
    const { container } = await montarEmCampo({ nav: NAV });
    expect(textosDosFilhos(navInferior(container))).toEqual(['Painel', 'Fila de verificação', 'Pessoas', 'Contas']);
  });

  it('com exatamente quatro itens mostra os quatro', async () => {
    const quatro: readonly NavEntry[] = NAV.filter((entrada) => 'id' in entrada).slice(0, 4);
    const { container } = await montarEmCampo({ nav: quatro });
    expect(navInferior(container).children).toHaveLength(4);
  });

  it('com menos de quatro itens mostra os que há', async () => {
    const { container } = await montarEmCampo({ nav: [{ id: 'painel', label: 'Painel', icon: 'layout-dashboard' }] });
    expect(textosDosFilhos(navInferior(container))).toEqual(['Painel']);
  });

  it('sem itens, só com seções, não há barra inferior', async () => {
    const { container } = await montarEmCampo({ nav: [{ section: 'Operação' }] });
    expect(todos(container, 'nav')).toHaveLength(0);
  });

  it('sem nav não há barra inferior', async () => {
    const { container } = await montarEmCampo({});
    expect(todos(container, 'nav')).toHaveLength(0);
  });

  it('a barra inferior fica abaixo do conteúdo', async () => {
    const { container } = await montarEmCampo({ nav: NAV });
    expect(elemento(container, 'main').nextElementSibling).toBe(navInferior(container));
  });

  it('clicar num item chama onNavigate com o id dele', async () => {
    const aoNavegar = vi.fn();
    const { container } = await montarEmCampo({ nav: NAV, onNavigate: aoNavegar });
    await clicar(botaoComTexto(navInferior(container), 'Pessoas'));
    expect(aoNavegar).toHaveBeenCalledExactlyOnceWith('pessoas');
  });

  it('sem onNavigate clicar num item não lança erro', async () => {
    const { container } = await montarEmCampo({ nav: NAV });
    expect(await errosAoClicar(botaoComTexto(navInferior(container), 'Painel'))).toEqual([]);
  });

  it('o item ativo é marcado só pelo tom royal e pela borda de cima, sem aria-current', async () => {
    const { container } = await montarEmCampo({ nav: NAV, activeId: 'fila' });
    const [painel, fila] = todos<HTMLButtonElement>(navInferior(container), 'button');
    expect(fila?.style.color).toBe('var(--color-royal)');
    expect(fila?.style.borderTop).toBe('2px solid var(--color-royal)');
    expect(painel?.style.color).toBe('var(--text-secondary)');
    expect(painel?.style.borderTop).toBe('2px solid transparent');
    expect(container.querySelector('[aria-current]')).toBeNull();
  });

  it('item da barra inferior de campo é botão de tipo button', async () => {
    const { container } = await montarEmCampo({ nav: NAV });
    const tipos = todos<HTMLButtonElement>(navInferior(container), 'button').map((botao) => botao.type);
    expect(tipos).toEqual(['button', 'button', 'button', 'button']);
  });
});
