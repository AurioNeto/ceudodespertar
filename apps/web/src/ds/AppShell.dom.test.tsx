import { act } from 'react';
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
  type Montado,
} from '@/testes/montagem';
import { errosAoClicar, glifoDe } from './apoioDeTeste';
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

const NAV_LONGA: readonly NavEntry[] = [
  { section: 'Operação' },
  { id: 'painel', label: 'Painel', icon: 'layout-dashboard' },
  { id: 'registrar', label: 'Registrar', icon: 'circle-plus' },
  { section: 'Financeiro' },
  { id: 'lote', label: 'Verificação de lote', icon: 'sparkles', count: 5 },
  { id: 'lancamentos', label: 'Lançamentos', icon: 'list' },
  { id: 'contas', label: 'Contas', icon: 'landmark' },
  { section: 'Pessoas' },
  { id: 'pessoas', label: 'Pessoas', icon: 'users' },
  { id: 'anamnese', label: 'Anamnese', icon: 'clipboard-list' },
];

const USUARIA = { name: 'Ana Souza', group: 'Tesouraria' };

const IDENTIDADE = {
  institution: 'Céu do Despertar',
  unit: 'CDD',
  brand: { lines: ['Céu do', 'Despertar'], tagline: 'Sistema de gestão' },
  userLabel: 'Meu perfil',
} as const;

const raiz = (container: HTMLElement) => container.firstElementChild as HTMLElement;
const lateral = (container: HTMLElement) => elemento(container, 'aside');
const navLateral = (container: HTMLElement) => elemento(lateral(container), 'nav');
const navInferior = (container: HTMLElement) => elemento(container, 'nav');
const barraDeContexto = (container: HTMLElement) => elemento(container, 'header');
const chipDoUsuario = (container: HTMLElement) => elemento<HTMLButtonElement>(container, 'button[title="Meu perfil"]');
const textosDosFilhos = (pai: HTMLElement) => Array.from(pai.children).map((filho) => filho.textContent);
const glifosDosBotoes = (nav: HTMLElement) => todos<HTMLButtonElement>(nav, 'button').map((botao) => glifoDe(elemento(botao, 'svg')));
const botaoDoMenu = (container: HTMLElement) => botaoComTexto(navInferior(container), 'Menu');
const dialogoDoMenu = () => document.querySelector<HTMLElement>('[role="dialog"]');
const dialogoAberto = () => elemento(document.body, '[role="dialog"]');
const nomeDoDialogo = (dialogo: HTMLElement) =>
  document.getElementById(dialogo.getAttribute('aria-labelledby') ?? '')?.textContent;
const botoesDoMenu = () => todos(dialogoAberto(), 'nav button').map((botao) => botao.textContent);
const rotuloDoGrupo = (grupo: HTMLElement) => document.getElementById(grupo.getAttribute('aria-labelledby') ?? '')?.textContent;
const estruturaDoMenu = () =>
  todos(dialogoAberto(), '[role="group"]').map((grupo) => ({
    secao: rotuloDoGrupo(grupo),
    itens: todos(grupo, 'button').map((botao) => botao.textContent),
  }));
const perfilNoMenu = () =>
  todos<HTMLButtonElement>(dialogoAberto(), 'nav button').find((botao) => botao.textContent?.includes('Meu perfil')) as HTMLButtonElement;
const teclarEsc = () =>
  act(async () => {
    (document.activeElement ?? document.body).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
  });

describe('AppShell: estrutura por densidade', () => {
  it('sem densidade vale a de escritório, com coluna lateral de 232px', async () => {
    const { container } = await montar(<AppShell {...IDENTIDADE} user={USUARIA}>conteúdo</AppShell>);
    expect(raiz(container).dataset['density']).toBe('office');
    expect(raiz(container).style.gridTemplateColumns).toBe('232px 1fr');
    expect(todos(container, 'aside')).toHaveLength(1);
  });

  it('em campo a tela é de coluna única e não há lateral', async () => {
    const { container } = await montar(
      <AppShell {...IDENTIDADE} user={USUARIA} density="field">
        conteúdo
      </AppShell>,
    );
    expect(raiz(container).dataset['density']).toBe('field');
    expect(raiz(container).style.gridTemplateColumns).toBe('1fr');
    expect(todos(container, 'aside')).toHaveLength(0);
  });

  it('o conteúdo fica dentro de main, que é a área com a estampa de papel', async () => {
    const { container } = await montar(
      <AppShell {...IDENTIDADE} user={USUARIA}>
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
      <AppShell {...IDENTIDADE} user={USUARIA} density="field">
        <p>conteúdo da tela</p>
      </AppShell>,
    );
    expect(elemento(campo.container, 'main').textContent).toBe('conteúdo da tela');
  });

  it('o style recebido vence o padrão e preserva o resto', async () => {
    const { container } = await montar(
      <AppShell {...IDENTIDADE} user={USUARIA} style={{ height: '50%' }}>
        conteúdo
      </AppShell>,
    );
    expect(raiz(container).style.height).toBe('50%');
    expect(raiz(container).style.display).toBe('grid');
  });
});

describe('AppShell: marca da lateral', () => {
  const blocoDaMarca = (container: HTMLElement) => lateral(container).firstElementChild?.firstElementChild as HTMLElement;

  it('a lateral abre com o nome da casa em duas linhas e a legenda que recebeu', async () => {
    const { container } = await montar(<AppShell {...IDENTIDADE} user={USUARIA}>conteúdo</AppShell>);
    expect(lateral(container).textContent).toContain('Céu doDespertar');
    expect(blocoDaMarca(container).innerHTML).toBe('Céu do<br>Despertar');
    expect(folhaComTexto(lateral(container), 'div', 'Sistema de gestão')).toBeTruthy();
  });

  it('as linhas e a legenda da marca são as que o consumidor passa, com quebra só entre as linhas', async () => {
    const tres = await montar(
      <AppShell
        {...IDENTIDADE}
        brand={{ lines: ['Instituto', 'Aurora', 'Norte'], tagline: 'Gestão de unidades' }}
        user={USUARIA}
      >
        conteúdo
      </AppShell>,
    );
    expect(blocoDaMarca(tres.container).innerHTML).toBe('Instituto<br>Aurora<br>Norte');
    expect(folhaComTexto(lateral(tres.container), 'div', 'Gestão de unidades')).toBeTruthy();
    expect(lateral(tres.container).textContent).not.toContain('Sistema de gestão');
    await tres.atualizar(
      <AppShell {...IDENTIDADE} brand={{ lines: ['Aurora'], tagline: 'Gestão' }} user={USUARIA}>
        conteúdo
      </AppShell>,
    );
    expect(blocoDaMarca(tres.container).innerHTML).toBe('Aurora');
  });

  it('em campo a marca da lateral não existe', async () => {
    const { container } = await montar(
      <AppShell {...IDENTIDADE} user={USUARIA} density="field">
        conteúdo
      </AppShell>,
    );
    expect(container.textContent).not.toContain('Sistema de gestão');
  });
});

describe('AppShell: navegação lateral', () => {
  it('lista seções e itens na ordem recebida, com a contagem colada ao rótulo', async () => {
    const { container } = await montar(
      <AppShell {...IDENTIDADE} user={USUARIA} nav={NAV}>
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

  it('cada item mostra o ícone que recebeu', async () => {
    const { container } = await montar(
      <AppShell {...IDENTIDADE} user={USUARIA} nav={NAV}>
        conteúdo
      </AppShell>,
    );
    expect(glifosDosBotoes(navLateral(container))).toEqual(['layout-dashboard', 'inbox', 'users', 'wallet', 'key-round']);
  });

  it('seção é só um título: não é botão e clicar nela não navega', async () => {
    const aoNavegar = vi.fn();
    const { container } = await montar(
      <AppShell {...IDENTIDADE} user={USUARIA} nav={NAV} onNavigate={aoNavegar}>
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
      <AppShell {...IDENTIDADE} user={USUARIA} nav={NAV} onNavigate={aoNavegar}>
        conteúdo
      </AppShell>,
    );
    await clicar(todos<HTMLButtonElement>(navLateral(container), 'button')[3] as HTMLElement);
    expect(aoNavegar).toHaveBeenCalledExactlyOnceWith('contas');
  });

  it('sem onNavigate clicar num item não lança erro', async () => {
    const { container } = await montar(
      <AppShell {...IDENTIDADE} user={USUARIA} nav={NAV}>
        conteúdo
      </AppShell>,
    );
    expect(await errosAoClicar(todos<HTMLButtonElement>(navLateral(container), 'button')[0] as HTMLElement)).toEqual([]);
  });

  it('os itens são botões de tipo button', async () => {
    const { container } = await montar(
      <AppShell {...IDENTIDADE} user={USUARIA} nav={NAV}>
        conteúdo
      </AppShell>,
    );
    const tipos = todos<HTMLButtonElement>(navLateral(container), 'button').map((botao) => botao.type);
    expect(tipos).toEqual(['button', 'button', 'button', 'button', 'button']);
  });

  it('em escritório a lateral é a única navegação: não há barra inferior', async () => {
    const { container } = await montar(
      <AppShell {...IDENTIDADE} user={USUARIA} nav={NAV}>
        conteúdo
      </AppShell>,
    );
    expect(todos(container, 'nav')).toHaveLength(1);
    expect(lateral(container).contains(navLateral(container))).toBe(true);
  });

  it('sem nav a lateral tem a navegação vazia', async () => {
    const { container } = await montar(<AppShell {...IDENTIDADE} user={USUARIA}>conteúdo</AppShell>);
    expect(navLateral(container).children).toHaveLength(0);
  });
});

describe('AppShell: item ativo', () => {
  it('só o item cujo id é o activeId carrega aria-current=page', async () => {
    const { container } = await montar(
      <AppShell {...IDENTIDADE} user={USUARIA} nav={NAV} activeId="fila">
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
      <AppShell {...IDENTIDADE} user={USUARIA} nav={NAV} {...(activeId ? { activeId } : {})}>
        conteúdo
      </AppShell>,
    );
    expect(container.querySelector('[aria-current]')).toBeNull();
  });

  it('o item ativo ganha tinta royal escura e uma marca na borda esquerda, os outros não', async () => {
    const { container } = await montar(
      <AppShell {...IDENTIDADE} user={USUARIA} nav={NAV} activeId="painel">
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
      <AppShell {...IDENTIDADE} user={USUARIA} nav={NAV} activeId="painel">
        conteúdo
      </AppShell>,
    );
    await montado.atualizar(
      <AppShell {...IDENTIDADE} user={USUARIA} nav={NAV} activeId="contas">
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
      <AppShell {...IDENTIDADE} user={USUARIA} nav={NAV}>
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
      <AppShell {...IDENTIDADE} user={USUARIA} nav={NAV}>
        conteúdo
      </AppShell>,
    );
    const [painel, , pessoas] = todos<HTMLButtonElement>(navLateral(container), 'button');
    expect(painel?.children).toHaveLength(2);
    expect(pessoas?.children).toHaveLength(2);
  });

  it('o número aparece como veio, sem separador de milhar', async () => {
    const { container } = await montar(
      <AppShell {...IDENTIDADE} user={USUARIA} nav={[{ id: 'fila', label: 'Fila', icon: 'inbox', count: 1200 }]}>
        conteúdo
      </AppShell>,
    );
    expect(elemento(navLateral(container), '[data-numeric]').textContent).toBe('1200');
  });
});

describe('AppShell: realce ao passar o mouse', () => {
  it('item inativo ganha fundo tênue ao receber o mouse e volta a transparente ao sair', async () => {
    const { container } = await montar(
      <AppShell {...IDENTIDADE} user={USUARIA} nav={NAV} activeId="painel">
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
      <AppShell {...IDENTIDADE} user={USUARIA} nav={NAV} activeId="painel">
        conteúdo
      </AppShell>,
    );
    const ativo = todos<HTMLButtonElement>(navLateral(container), 'button')[0] as HTMLButtonElement;
    await passarMouseSobre(ativo);
    expect(ativo.style.background).toBe('var(--bg-card)');
  });

  it('o realce de um item não contamina os vizinhos', async () => {
    const { container } = await montar(
      <AppShell {...IDENTIDADE} user={USUARIA} nav={NAV}>
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
    const { container } = await montar(<AppShell {...IDENTIDADE} user={USUARIA}>conteúdo</AppShell>);
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
    const { container } = await montar(<AppShell {...IDENTIDADE} user={{ name, group: 'Tesouraria' }}>conteúdo</AppShell>);
    expect(chipDoUsuario(container).querySelector('span')?.textContent).toBe(selo);
  });

  it('o selo do chip da lateral não é escondido do leitor de tela', async () => {
    const { container } = await montar(<AppShell {...IDENTIDADE} user={USUARIA}>conteúdo</AppShell>);
    expect(chipDoUsuario(container).querySelector('span')?.hasAttribute('aria-hidden')).toBe(false);
  });

  it('clicar no chip chama onUserClick uma vez', async () => {
    const aoClicarNoUsuario = vi.fn();
    const { container } = await montar(
      <AppShell {...IDENTIDADE} user={USUARIA} onUserClick={aoClicarNoUsuario}>
        conteúdo
      </AppShell>,
    );
    await clicar(chipDoUsuario(container));
    expect(aoClicarNoUsuario).toHaveBeenCalledOnce();
  });

  it('sem onUserClick o chip não lança erro e o cursor deixa de ser de clique', async () => {
    const { container } = await montar(<AppShell {...IDENTIDADE} user={USUARIA}>conteúdo</AppShell>);
    expect(await errosAoClicar(chipDoUsuario(container))).toEqual([]);
    expect(chipDoUsuario(container).style.cursor).toBe('default');
  });

  it('com onUserClick o cursor é de clique', async () => {
    const { container } = await montar(
      <AppShell {...IDENTIDADE} user={USUARIA} onUserClick={vi.fn()}>
        conteúdo
      </AppShell>,
    );
    expect(chipDoUsuario(container).style.cursor).toBe('pointer');
  });

  it('o título do chip é o userLabel recebido, e o rótulo antigo não aparece', async () => {
    const { container } = await montar(
      <AppShell {...IDENTIDADE} userLabel="Minha conta" user={USUARIA}>
        conteúdo
      </AppShell>,
    );
    expect(elemento<HTMLButtonElement>(container, 'button[title="Minha conta"]')).toBeTruthy();
    expect(container.querySelector('[title="Meu perfil"]')).toBeNull();
  });

  it('em campo o chip da lateral não existe: o Meu perfil fica no menu', async () => {
    const { container } = await montar(
      <AppShell {...IDENTIDADE} user={USUARIA} density="field" onUserClick={vi.fn()}>
        conteúdo
      </AppShell>,
    );
    expect(container.querySelector('button[title="Meu perfil"]')).toBeNull();
  });
});

describe('AppShell: barra de contexto', () => {
  it('a unidade leva a seta para baixo que indica a troca', async () => {
    const { container } = await montar(<AppShell {...IDENTIDADE} user={USUARIA}>conteúdo</AppShell>);
    expect(glifoDe(elemento(botaoComTexto(barraDeContexto(container), 'CDD'), 'svg'))).toBe('chevron-down');
  });

  it('mostra a instituição e a unidade que recebeu', async () => {
    const { container } = await montar(
      <AppShell {...IDENTIDADE} user={USUARIA} institution="Instituto Aurora" unit="Filial Norte">
        conteúdo
      </AppShell>,
    );
    expect(folhaComTexto(barraDeContexto(container), 'span', 'Instituto Aurora')).toBeTruthy();
    expect(botaoComTexto(barraDeContexto(container), 'Filial Norte')).toBeTruthy();
  });

  it('clicar na unidade chama onUnitClick uma vez', async () => {
    const aoClicarNaUnidade = vi.fn();
    const { container } = await montar(
      <AppShell {...IDENTIDADE} user={USUARIA} onUnitClick={aoClicarNaUnidade}>
        conteúdo
      </AppShell>,
    );
    await clicar(botaoComTexto(barraDeContexto(container), 'CDD'));
    expect(aoClicarNaUnidade).toHaveBeenCalledOnce();
  });

  it('sem onUnitClick clicar na unidade não lança erro', async () => {
    const { container } = await montar(<AppShell {...IDENTIDADE} user={USUARIA}>conteúdo</AppShell>);
    expect(await errosAoClicar(botaoComTexto(barraDeContexto(container), 'CDD'))).toEqual([]);
  });

  it('em escritório o canto direito diz o grupo do usuário', async () => {
    const { container } = await montar(<AppShell {...IDENTIDADE} user={USUARIA}>conteúdo</AppShell>);
    expect(barraDeContexto(container).lastElementChild?.textContent).toBe('Tesouraria');
  });

  it('em campo o canto direito diz o nome do usuário, e a unidade continua à mão', async () => {
    const { container } = await montar(
      <AppShell {...IDENTIDADE} user={USUARIA} density="field">
        conteúdo
      </AppShell>,
    );
    expect(barraDeContexto(container).lastElementChild?.textContent).toBe('Ana Souza');
    expect(botaoComTexto(barraDeContexto(container), 'CDD')).toBeTruthy();
  });

  it('é a única barra de contexto, acima do conteúdo', async () => {
    const { container } = await montar(<AppShell {...IDENTIDADE} user={USUARIA}>conteúdo</AppShell>);
    expect(todos(container, 'header')).toHaveLength(1);
    expect(barraDeContexto(container).nextElementSibling?.tagName).toBe('MAIN');
  });
});

describe('AppShell: navegação inferior em campo', () => {
  const montarEmCampo = (props: {
    nav?: readonly NavEntry[];
    activeId?: string;
    onNavigate?: (id: string) => void;
    onUserClick?: () => void;
  }) =>
    montar(
      <AppShell {...IDENTIDADE} user={USUARIA} density="field" {...props}>
        conteúdo
      </AppShell>,
    );

  it('mostra os três primeiros itens e o botão Menu, sem seções, com a contagem de quem a tem', async () => {
    const { container } = await montarEmCampo({ nav: NAV });
    expect(textosDosFilhos(navInferior(container))).toEqual(['Painel', 'Fila de verificação3', 'Pessoas', 'Menu']);
  });

  it('cada item mostra o ícone que recebeu, e o Menu leva o seu', async () => {
    const { container } = await montarEmCampo({ nav: NAV });
    expect(glifosDosBotoes(navInferior(container))).toEqual(['layout-dashboard', 'inbox', 'users', 'menu']);
  });

  it('com quatro itens a barra mostra três e o quarto vai para o menu', async () => {
    const quatro: readonly NavEntry[] = NAV.filter((entrada) => 'id' in entrada).slice(0, 4);
    const { container } = await montarEmCampo({ nav: quatro });
    expect(textosDosFilhos(navInferior(container))).toEqual(['Painel', 'Fila de verificação3', 'Pessoas', 'Menu']);
    await clicar(botaoComTexto(navInferior(container), 'Menu'));
    expect(botoesDoMenu()).toEqual(['Contas']);
  });

  it('com exatamente três itens e sem perfil, a barra mostra os três e não tem botão Menu', async () => {
    const tres: readonly NavEntry[] = NAV.filter((entrada) => 'id' in entrada).slice(0, 3);
    const { container } = await montarEmCampo({ nav: tres });
    expect(textosDosFilhos(navInferior(container))).toEqual(['Painel', 'Fila de verificação3', 'Pessoas']);
  });

  it('com menos de quatro itens e sem perfil mostra os que há, sem Menu', async () => {
    const { container } = await montarEmCampo({ nav: [{ id: 'painel', label: 'Painel', icon: 'layout-dashboard' }] });
    expect(textosDosFilhos(navInferior(container))).toEqual(['Painel']);
  });

  it('com onUserClick e poucos itens a barra ganha o Menu, que leva o Meu perfil', async () => {
    const { container } = await montarEmCampo({
      nav: [{ id: 'painel', label: 'Painel', icon: 'layout-dashboard' }],
      onUserClick: vi.fn(),
    });
    expect(textosDosFilhos(navInferior(container))).toEqual(['Painel', 'Menu']);
  });

  it('com onUserClick e sem itens a barra tem só o Menu', async () => {
    const { container } = await montarEmCampo({ onUserClick: vi.fn() });
    expect(textosDosFilhos(navInferior(container))).toEqual(['Menu']);
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

  it('o item ativo é marcado pelo tom royal, pela borda de cima e por aria-current=page', async () => {
    const { container } = await montarEmCampo({ nav: NAV, activeId: 'fila' });
    const [painel, fila] = todos<HTMLButtonElement>(navInferior(container), 'button');
    expect(fila?.style.color).toBe('var(--color-royal)');
    expect(fila?.style.borderTop).toBe('2px solid var(--color-royal)');
    expect(painel?.style.color).toBe('var(--text-secondary)');
    expect(painel?.style.borderTop).toBe('2px solid transparent');
    const atuais = todos(navInferior(container), 'button').map((botao) => botao.getAttribute('aria-current'));
    expect(atuais).toEqual([null, 'page', null, null]);
  });

  it.each([
    ['ausente', undefined],
    ['que não existe na navegação', 'inexistente'],
  ])('com activeId %s nenhum item da barra é marcado como atual', async (_descricao, activeId) => {
    const { container } = await montarEmCampo({ nav: NAV, ...(activeId ? { activeId } : {}) });
    expect(container.querySelector('[aria-current]')).toBeNull();
  });

  it('a contagem do item aparece como dado numérico, e contagem zero ou ausente não ocupa lugar', async () => {
    const { container } = await montarEmCampo({ nav: NAV });
    const [painel, fila, pessoas] = todos<HTMLButtonElement>(navInferior(container), 'button');
    expect(todos(fila as HTMLElement, '[data-numeric]').map((selo) => selo.textContent)).toEqual(['3']);
    expect(todos(painel as HTMLElement, '[data-numeric]')).toHaveLength(0);
    expect(todos(pessoas as HTMLElement, '[data-numeric]')).toHaveLength(0);
  });

  it('item da barra inferior de campo é botão de tipo button', async () => {
    const { container } = await montarEmCampo({ nav: NAV });
    const tipos = todos<HTMLButtonElement>(navInferior(container), 'button').map((botao) => botao.type);
    expect(tipos).toEqual(['button', 'button', 'button', 'button']);
  });

  it('em escritório não há botão Menu: a lateral já traz tudo', async () => {
    const { container } = await montar(
      <AppShell {...IDENTIDADE} user={USUARIA} nav={NAV} onUserClick={vi.fn()}>
        conteúdo
      </AppShell>,
    );
    expect(Array.from(container.querySelectorAll('button')).some((botao) => botao.textContent === 'Menu')).toBe(false);
  });
});

describe('AppShell: menu de campo', () => {
  interface PropsDoMenu {
    nav?: readonly NavEntry[];
    activeId?: string;
    onNavigate?: (id: string) => void;
    onUserClick?: () => void;
  }

  const montarComMenu = (props: PropsDoMenu) =>
    montar(
      <AppShell {...IDENTIDADE} user={USUARIA} density="field" {...props}>
        conteúdo
      </AppShell>,
    );

  const passarParaEscritorio = (montado: Montado, props: PropsDoMenu) =>
    montado.atualizar(
      <AppShell {...IDENTIDADE} user={USUARIA} density="office" {...props}>
        conteúdo
      </AppShell>,
    );

  const abrirMenu = async (container: HTMLElement) => clicar(botaoDoMenu(container));

  it('o botão Menu anuncia o diálogo que abre e começa recolhido, sem diálogo na tela', async () => {
    const { container } = await montarComMenu({ nav: NAV });
    expect(botaoDoMenu(container).getAttribute('aria-haspopup')).toBe('dialog');
    expect(botaoDoMenu(container).getAttribute('aria-expanded')).toBe('false');
    expect(dialogoDoMenu()).toBeNull();
  });

  it('abrir mostra um diálogo modal chamado Menu, e o botão passa a anunciar que está expandido', async () => {
    const { container } = await montarComMenu({ nav: NAV });
    await abrirMenu(container);
    const dialogo = dialogoAberto();
    expect(dialogo.getAttribute('aria-modal')).toBe('true');
    expect(nomeDoDialogo(dialogo)).toBe('Menu');
    expect(botaoDoMenu(container).getAttribute('aria-expanded')).toBe('true');
  });

  it('o menu abre como folha de baixo para cima, não como painel lateral', async () => {
    const { container } = await montarComMenu({ nav: NAV });
    await abrirMenu(container);
    expect(dialogoAberto().dataset['variante']).toBe('folha');
  });

  it('o foco vai para dentro do diálogo e o conteúdo atrás fica inerte enquanto ele está aberto', async () => {
    const { container } = await montarComMenu({ nav: NAV });
    await abrirMenu(container);
    expect(dialogoAberto().contains(document.activeElement)).toBe(true);
    expect(container.hasAttribute('inert')).toBe(true);
  });

  it('lista os itens que não couberam na barra sob a seção deles, sem repetir os da barra', async () => {
    const { container } = await montarComMenu({ nav: NAV });
    await abrirMenu(container);
    expect(estruturaDoMenu()).toEqual([{ secao: 'Cadastros', itens: ['Contas', 'Acessos'] }]);
  });

  it('com várias seções cada uma aparece uma vez, na ordem recebida, e a que coube inteira na barra some', async () => {
    const { container } = await montarComMenu({ nav: NAV_LONGA });
    expect(textosDosFilhos(navInferior(container))).toEqual([
      'Painel',
      'Registrar',
      'Verificação de lote5',
      'Menu',
    ]);
    await abrirMenu(container);
    expect(estruturaDoMenu()).toEqual([
      { secao: 'Financeiro', itens: ['Lançamentos', 'Contas'] },
      { secao: 'Pessoas', itens: ['Pessoas', 'Anamnese'] },
    ]);
  });

  it('itens fora de qualquer seção entram num grupo sem nome', async () => {
    const semSecao: readonly NavEntry[] = NAV_LONGA.filter((entrada) => 'id' in entrada);
    const { container } = await montarComMenu({ nav: semSecao });
    await abrirMenu(container);
    expect(todos(dialogoAberto(), '[role="group"]')).toHaveLength(0);
    expect(botoesDoMenu()).toEqual(['Lançamentos', 'Contas', 'Pessoas', 'Anamnese']);
  });

  it('o item do menu com contagem a mostra como dado numérico; sem contagem, nada', async () => {
    const nav: readonly NavEntry[] = [
      ...NAV_LONGA.slice(0, 3),
      { id: 'a', label: 'A', icon: 'inbox' },
      { id: 'b', label: 'B', icon: 'inbox', count: 7 },
      { id: 'c', label: 'C', icon: 'inbox', count: 0 },
    ];
    const { container } = await montarComMenu({ nav });
    await abrirMenu(container);
    expect(botoesDoMenu()).toEqual(['B7', 'C']);
    expect(todos(dialogoAberto(), '[data-numeric]').map((selo) => selo.textContent)).toEqual(['7']);
  });

  it('o item ativo do menu leva aria-current=page e os outros não', async () => {
    const { container } = await montarComMenu({ nav: NAV, activeId: 'acessos' });
    await abrirMenu(container);
    const atuais = todos(dialogoAberto(), 'nav button').map((botao) => botao.getAttribute('aria-current'));
    expect(atuais).toEqual([null, 'page']);
  });

  it('com o ativo dentro do menu, o botão Menu ganha o tom royal e a borda de cima; fora dele, não', async () => {
    const dentro = await montarComMenu({ nav: NAV, activeId: 'acessos' });
    expect(botaoDoMenu(dentro.container).style.color).toBe('var(--color-royal)');
    expect(botaoDoMenu(dentro.container).style.borderTop).toBe('2px solid var(--color-royal)');
    expect(botaoDoMenu(dentro.container).hasAttribute('aria-current')).toBe(false);
    await dentro.atualizar(
      <AppShell {...IDENTIDADE} user={USUARIA} density="field" nav={NAV} activeId="painel">
        conteúdo
      </AppShell>,
    );
    expect(botaoDoMenu(dentro.container).style.color).toBe('var(--text-secondary)');
    expect(botaoDoMenu(dentro.container).style.borderTop).toBe('2px solid transparent');
  });

  it('o item do menu é um alvo de toque de campo', async () => {
    const { container } = await montarComMenu({ nav: NAV });
    await abrirMenu(container);
    const alvos = todos<HTMLButtonElement>(dialogoAberto(), 'nav button').map((botao) => botao.style.minHeight);
    expect(alvos).toEqual(['var(--target-field)', 'var(--target-field)']);
  });

  it('com onUserClick o Meu perfil aparece no menu, depois dos itens', async () => {
    const { container } = await montarComMenu({ nav: NAV, onUserClick: vi.fn() });
    await abrirMenu(container);
    const botoes = todos(dialogoAberto(), 'nav button');
    expect(botoes.map((botao) => botao.textContent)).toEqual(['Contas', 'Acessos', 'ANMeu perfilAna Souza · Tesouraria']);
    expect(perfilNoMenu().type).toBe('button');
  });

  it('o Meu perfil do menu chama-se como o userLabel recebido', async () => {
    const { container } = await montar(
      <AppShell {...IDENTIDADE} userLabel="Minha conta" user={USUARIA} density="field" nav={NAV} onUserClick={vi.fn()}>
        conteúdo
      </AppShell>,
    );
    await abrirMenu(container);
    expect(botoesDoMenu()).toEqual(['Contas', 'Acessos', 'ANMinha contaAna Souza · Tesouraria']);
  });

  it('sem onUserClick não há Meu perfil no menu', async () => {
    const { container } = await montarComMenu({ nav: NAV });
    await abrirMenu(container);
    expect(todos(dialogoAberto(), 'button').some((botao) => botao.textContent?.includes('Meu perfil'))).toBe(false);
  });

  it('o selo do usuário no menu é decorativo para o leitor de tela', async () => {
    const { container } = await montarComMenu({ nav: NAV, onUserClick: vi.fn() });
    await abrirMenu(container);
    const selo = elemento(perfilNoMenu(), 'span');
    expect(selo.textContent).toBe('AN');
    expect(selo.getAttribute('aria-hidden')).toBe('true');
  });

  it('clicar em Meu perfil chama onUserClick uma vez e fecha o menu', async () => {
    const aoClicarNoUsuario = vi.fn();
    const { container } = await montarComMenu({ nav: NAV, onUserClick: aoClicarNoUsuario });
    await abrirMenu(container);
    await clicar(perfilNoMenu());
    expect(aoClicarNoUsuario).toHaveBeenCalledOnce();
    expect(dialogoDoMenu()).toBeNull();
  });

  it('escolher um item chama onNavigate uma vez com o id dele e fecha o menu', async () => {
    const aoNavegar = vi.fn();
    const { container } = await montarComMenu({ nav: NAV, onNavigate: aoNavegar });
    await abrirMenu(container);
    await clicar(botaoComTexto(dialogoAberto(), 'Acessos'));
    expect(aoNavegar).toHaveBeenCalledExactlyOnceWith('acessos');
    expect(dialogoDoMenu()).toBeNull();
    expect(botaoDoMenu(container).getAttribute('aria-expanded')).toBe('false');
  });

  it('escolher um item sem onNavigate fecha o menu e não lança erro', async () => {
    const { container } = await montarComMenu({ nav: NAV });
    await abrirMenu(container);
    expect(await errosAoClicar(botaoComTexto(dialogoAberto(), 'Contas'))).toEqual([]);
    expect(dialogoDoMenu()).toBeNull();
  });

  it('Esc fecha o menu sem navegar, e o foco volta ao botão Menu', async () => {
    const aoNavegar = vi.fn();
    const { container } = await montarComMenu({ nav: NAV, onNavigate: aoNavegar });
    await abrirMenu(container);
    await teclarEsc();
    expect(dialogoDoMenu()).toBeNull();
    expect(aoNavegar).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(botaoDoMenu(container));
  });

  it('escolher um item devolve o foco ao botão Menu', async () => {
    const { container } = await montarComMenu({ nav: NAV, onNavigate: vi.fn() });
    await abrirMenu(container);
    await clicar(botaoComTexto(dialogoAberto(), 'Contas'));
    expect(document.activeElement).toBe(botaoDoMenu(container));
  });

  it('o botão Fechar do diálogo fecha o menu e devolve o foco ao botão Menu', async () => {
    const { container } = await montarComMenu({ nav: NAV });
    await abrirMenu(container);
    await clicar(elemento(dialogoAberto(), 'button[aria-label="Fechar"]'));
    expect(dialogoDoMenu()).toBeNull();
    expect(document.activeElement).toBe(botaoDoMenu(container));
  });

  it('fechar libera o conteúdo de trás', async () => {
    const { container } = await montarComMenu({ nav: NAV });
    await abrirMenu(container);
    await teclarEsc();
    expect(container.hasAttribute('inert')).toBe(false);
  });

  it('o menu pode ser aberto de novo depois de fechado', async () => {
    const { container } = await montarComMenu({ nav: NAV });
    await abrirMenu(container);
    await teclarEsc();
    await abrirMenu(container);
    expect(botoesDoMenu()).toEqual(['Contas', 'Acessos']);
  });

  it('mudar de página com o menu aberto o fecha', async () => {
    const montado = await montarComMenu({ nav: NAV, activeId: 'painel' });
    await abrirMenu(montado.container);
    await montado.atualizar(
      <AppShell {...IDENTIDADE} user={USUARIA} density="field" nav={NAV} activeId="fila">
        conteúdo
      </AppShell>,
    );
    expect(dialogoDoMenu()).toBeNull();
  });

  it('voltar à página de antes não reabre o menu que já foi fechado', async () => {
    const montado = await montarComMenu({ nav: NAV, activeId: 'painel' });
    await abrirMenu(montado.container);
    await montado.atualizar(
      <AppShell {...IDENTIDADE} user={USUARIA} density="field" nav={NAV} activeId="fila">
        conteúdo
      </AppShell>,
    );
    await montado.atualizar(
      <AppShell {...IDENTIDADE} user={USUARIA} density="field" nav={NAV} activeId="painel">
        conteúdo
      </AppShell>,
    );
    expect(dialogoDoMenu()).toBeNull();
  });

  it('atualizar sem mudar de página mantém o menu aberto', async () => {
    const montado = await montarComMenu({ nav: NAV, activeId: 'painel' });
    await abrirMenu(montado.container);
    await montado.atualizar(
      <AppShell {...IDENTIDADE} user={USUARIA} density="field" nav={NAV} activeId="painel">
        outro conteúdo
      </AppShell>,
    );
    expect(dialogoDoMenu()).not.toBeNull();
  });

  it('passar para escritório com o menu aberto o fecha, e voltar a campo não o reabre', async () => {
    const montado = await montarComMenu({ nav: NAV, activeId: 'painel' });
    await abrirMenu(montado.container);
    await montado.atualizar(
      <AppShell {...IDENTIDADE} user={USUARIA} density="office" nav={NAV} activeId="painel">
        conteúdo
      </AppShell>,
    );
    expect(dialogoDoMenu()).toBeNull();
    await montado.atualizar(
      <AppShell {...IDENTIDADE} user={USUARIA} density="field" nav={NAV} activeId="painel">
        conteúdo
      </AppShell>,
    );
    expect(dialogoDoMenu()).toBeNull();
  });

  describe('quando a troca de densidade tira o botão Menu de debaixo do foco', () => {
    const emCampoComMenuAberto = async (props: PropsDoMenu) => {
      const montado = await montarComMenu(props);
      await abrirMenu(montado.container);
      return montado;
    };

    it('o foco vai para o item ativo da lateral', async () => {
      const props = { nav: NAV, activeId: 'acessos', onUserClick: vi.fn() };
      const montado = await emCampoComMenuAberto(props);
      await passarParaEscritorio(montado, props);
      expect(document.activeElement).toBe(botaoComTexto(navLateral(montado.container), 'Acessos'));
    });

    it('sem item ativo o foco vai para o primeiro item da navegação', async () => {
      const props = { nav: NAV, onUserClick: vi.fn() };
      const montado = await emCampoComMenuAberto(props);
      await passarParaEscritorio(montado, props);
      expect(document.activeElement).toBe(botaoComTexto(navLateral(montado.container), 'Painel'));
    });

    it('sem itens na navegação o foco vai para a área principal, que aceita foco por programa e não por Tab', async () => {
      const props = { onUserClick: vi.fn() };
      const montado = await emCampoComMenuAberto(props);
      await passarParaEscritorio(montado, props);
      const principal = elemento(montado.container, 'main');
      expect(principal.tabIndex).toBe(-1);
      expect(document.activeElement).toBe(principal);
    });
  });
});
