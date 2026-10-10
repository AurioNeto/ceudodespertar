import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { botaoComTexto, clicar, desmontarTudo, digitar, elemento, escolherOpcao, montar, todos } from '@/testes/montagem';
import { RelatoriosPage } from './RelatoriosPage';

const COR_CONFIRMADA = 'var(--color-confirmed)';
const COR_DE_ATENCAO = 'var(--color-attention)';
const COR_DE_MARCA = 'var(--color-royal-deep)';
const COR_PRIMARIA = 'var(--text-primary)';
const COR_META = 'var(--text-meta)';
const MENOS = '− ';

function fixarDensidade(campo: boolean) {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    media: consulta,
    matches: campo,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

beforeEach(() => fixarDensidade(false));

afterEach(async () => {
  await desmontarTudo();
  vi.unstubAllGlobals();
});

const cartaoDoKpi = (container: HTMLElement, rotulo: string) => {
  const cartao = todos<HTMLDivElement>(container, 'div').find(
    (d) => d.children.length === 3 && d.children[0]?.textContent === rotulo && d.children[1]?.tagName === 'SPAN',
  );
  if (!cartao) throw new Error(`cartão do indicador não encontrado: ${rotulo}`);
  const [, valor, delta] = Array.from(cartao.children) as HTMLElement[];
  return {
    valor: valor?.textContent,
    corDoValor: valor?.style.color,
    delta: delta?.textContent,
    corDoDelta: delta?.style.color,
  };
};

const seletorDe = (container: HTMLElement, rotulo: string) => {
  const etiqueta = todos<HTMLLabelElement>(container, 'label').find((l) => l.textContent === rotulo);
  const campo = etiqueta ? document.getElementById(etiqueta.htmlFor) : null;
  if (!(campo instanceof HTMLSelectElement)) throw new Error(`seletor não encontrado: ${rotulo}`);
  return campo;
};

const campoDeMes = (container: HTMLElement, rotulo: string) => {
  const etiqueta = todos<HTMLLabelElement>(container, 'label').find((l) => l.textContent === rotulo);
  const campo = etiqueta?.querySelector('input');
  if (!campo) throw new Error(`campo de mês não encontrado: ${rotulo}`);
  return campo;
};

const opcoesDe = (seletor: HTMLSelectElement) => Array.from(seletor.options).map((o) => [o.value, o.textContent]);

const marcado = (container: HTMLElement, texto: string) => botaoComTexto(container, texto).getAttribute('aria-pressed');

const cartaoComTitulo = (container: HTMLElement, titulo: string) => {
  const rotulo = todos<HTMLSpanElement>(container, 'span').find((s) => s.textContent === titulo);
  if (!rotulo?.parentElement) throw new Error(`cartão não encontrado: ${titulo}`);
  return rotulo.parentElement;
};

const barraDoPainel = (container: HTMLElement, titulo: string, nome: string) => {
  const painel = cartaoComTitulo(container, titulo).parentElement as HTMLElement;
  const achado = todos<HTMLButtonElement>(painel, 'button').find((b) => b.title.startsWith(`${nome} · `));
  if (!achado) throw new Error(`barra não encontrada: ${nome}`);
  return achado;
};

const gaveta = (container: HTMLElement) => todos<HTMLDivElement>(container, 'div').find((d) => d.style.position === 'fixed') ?? null;

const painelDaGaveta = (container: HTMLElement) => gaveta(container)?.firstElementChild as HTMLElement;

const linhasDaGaveta = (container: HTMLElement) =>
  Array.from(painelDaGaveta(container)?.children[1]?.children ?? []).map((linha) => linha.textContent);

const valoresDaGaveta = (container: HTMLElement) =>
  Array.from(painelDaGaveta(container)?.children[1]?.children ?? []).map((linha) => {
    const valor = linha.lastElementChild as HTMLElement;
    return { texto: valor.textContent, cor: valor.style.color };
  });

const cabecalhoDaGaveta = (container: HTMLElement) =>
  Array.from(painelDaGaveta(container)?.firstElementChild?.firstElementChild?.children ?? []).map((parte) => parte.textContent);

const botaoDeConta = (container: HTMLElement, nome: string) => {
  const cartao = cartaoComTitulo(container, 'Movimento por conta');
  const achado = todos<HTMLButtonElement>(cartao, 'button').find((b) => b.textContent === nome);
  if (!achado) throw new Error(`conta não encontrada: ${nome}`);
  return achado;
};

const linhaDaConta = (container: HTMLElement, nome: string) => botaoDeConta(container, nome).parentElement as HTMLElement;

const botoesComTexto = (container: HTMLElement, texto: string) =>
  todos<HTMLButtonElement>(container, 'button').filter((b) => b.textContent === texto);

describe('RelatoriosPage: cabeçalho', () => {
  it('escritório — mostra o código com o nome da tela, o título e o subtítulo', async () => {
    const { container } = await montar(<RelatoriosPage />);

    const cabecalho = elemento(container, 'header');
    expect(cabecalho.textContent).toContain('F-06 · Relatórios');
    expect(elemento(cabecalho, 'h1').textContent).toBe('Relatórios');
    expect(cabecalho.textContent).toContain('Período, unidade e recorte — do total ao lançamento');
  });

  it('campo — mostra só o código e o título, sem subtítulo', async () => {
    fixarDensidade(true);

    const { container } = await montar(<RelatoriosPage />);

    const cabecalho = elemento(container, 'header');
    expect(cabecalho.querySelector('p')).toBeNull();
    expect(cabecalho.textContent).toBe('F-06RelatóriosPDFPlanilha');
  });
});

describe('RelatoriosPage: indicadores do mês de agosto de 2026 contra o período anterior', () => {
  it('Entradas — soma as entradas do mês e mostra a alta sobre julho, em verde', async () => {
    const { container } = await montar(<RelatoriosPage />);

    expect(cartaoDoKpi(container, 'Entradas')).toEqual({
      valor: '4.747,90',
      corDoValor: COR_CONFIRMADA,
      delta: '+56% vs período anterior',
      corDoDelta: COR_CONFIRMADA,
    });
  });

  it('Saídas — soma as saídas do mês e mostra a queda sobre julho, em verde porque cair é bom', async () => {
    const { container } = await montar(<RelatoriosPage />);

    expect(cartaoDoKpi(container, 'Saídas')).toEqual({
      valor: '4.159,06',
      corDoValor: COR_DE_ATENCAO,
      delta: '-10% vs período anterior',
      corDoDelta: COR_CONFIRMADA,
    });
  });

  it('Resultado — é entradas menos saídas, na cor da marca, com a variação sobre a base negativa de julho', async () => {
    const { container } = await montar(<RelatoriosPage />);

    expect(cartaoDoKpi(container, 'Resultado')).toEqual({
      valor: '588,84',
      corDoValor: COR_DE_MARCA,
      delta: '+137% vs período anterior',
      corDoDelta: COR_CONFIRMADA,
    });
  });

  it('Transferências — mostra o total movido e a contagem, sem variação', async () => {
    const { container } = await montar(<RelatoriosPage />);

    expect(cartaoDoKpi(container, 'Transferências')).toEqual({
      valor: '605,68',
      corDoValor: COR_PRIMARIA,
      delta: '1 movimento entre contas',
      corDoDelta: COR_META,
    });
  });

  it('comparar com o ano passado — a variação é contra agosto de 2025, e saída que sobe fica em atenção', async () => {
    const { container } = await montar(<RelatoriosPage />);

    await escolherOpcao(seletorDe(container, 'Comparar com'), 'ano_passado');

    expect([cartaoDoKpi(container, 'Entradas').delta, cartaoDoKpi(container, 'Saídas').delta, cartaoDoKpi(container, 'Resultado').delta]).toEqual([
      '+202% vs ano passado',
      '+82% vs ano passado',
      '+182% vs ano passado',
    ]);
    expect(cartaoDoKpi(container, 'Saídas').corDoDelta).toBe(COR_DE_ATENCAO);
  });

  it('sem comparação — a variação de entradas, saídas e resultado some, e a nota das transferências fica', async () => {
    const { container } = await montar(<RelatoriosPage />);

    await escolherOpcao(seletorDe(container, 'Comparar com'), 'nenhum');

    expect(['Entradas', 'Saídas', 'Resultado'].map((k) => cartaoDoKpi(container, k).delta)).toEqual(['', '', '']);
    expect(cartaoDoKpi(container, 'Transferências').delta).toBe('1 movimento entre contas');
  });

  it('trimestre — os indicadores passam a somar junho, julho e agosto', async () => {
    const { container } = await montar(<RelatoriosPage />);

    await clicar(botaoComTexto(container, 'Trimestre'));

    expect(['Entradas', 'Saídas', 'Resultado', 'Transferências'].map((k) => cartaoDoKpi(container, k).valor)).toEqual([
      '12.236,08',
      '11.443,13',
      '792,95',
      '2.980,79',
    ]);
    expect(cartaoDoKpi(container, 'Transferências').delta).toBe('3 movimentos entre contas');
  });

  it('só saídas — a entrada zera e fica sem base, e o resultado negativo vai para atenção', async () => {
    const { container } = await montar(<RelatoriosPage />);

    await escolherOpcao(seletorDe(container, 'Tipo'), 'saida');

    expect(cartaoDoKpi(container, 'Entradas')).toMatchObject({ valor: '0,00', delta: 'sem base de comparação', corDoDelta: COR_META });
    expect(cartaoDoKpi(container, 'Resultado')).toMatchObject({ valor: '-4.159,06', corDoValor: COR_DE_ATENCAO, delta: '+10% vs período anterior' });
    expect(cartaoDoKpi(container, 'Transferências')).toMatchObject({ valor: '0,00', delta: '0 movimentos entre contas' });
  });

  it('só transferências — o resultado zerado fica na cor da marca e sem base de comparação', async () => {
    const { container } = await montar(<RelatoriosPage />);

    await escolherOpcao(seletorDe(container, 'Tipo'), 'transferencia');

    expect(cartaoDoKpi(container, 'Resultado')).toEqual({
      valor: '0,00',
      corDoValor: COR_DE_MARCA,
      delta: 'sem base de comparação',
      corDoDelta: COR_META,
    });
    expect(cartaoDoKpi(container, 'Transferências').valor).toBe('605,68');
  });

  it('campo — os mesmos números aparecem nos quatro indicadores', async () => {
    fixarDensidade(true);

    const { container } = await montar(<RelatoriosPage />);

    expect(['Entradas', 'Saídas', 'Resultado', 'Transferências'].map((k) => cartaoDoKpi(container, k).valor)).toEqual([
      '4.747,90',
      '4.159,06',
      '588,84',
      '605,68',
    ]);
  });
});

describe('RelatoriosPage: aviso de lançamentos a conferir', () => {
  it('mês com um lançamento a conferir — avisa a contagem e o valor', async () => {
    const { container } = await montar(<RelatoriosPage />);

    expect(container.textContent).toContain(
      'Inclui 1 lançamento a conferir (1.543,68) — os números podem mudar depois da conferência.',
    );
  });

  it('só consolidados — troca o aviso pela frase de que está tudo consolidado', async () => {
    const { container } = await montar(<RelatoriosPage />);

    await escolherOpcao(seletorDe(container, 'Situação'), 'consolidado');

    expect(container.textContent).toContain('Todos os lançamentos deste recorte estão consolidados.');
    expect(container.textContent).not.toContain('Inclui');
  });

  it('dois anos de janela — o plural e o valor somam entradas, saídas e transferências sem distinguir o tipo', async () => {
    const { container } = await montar(<RelatoriosPage />);
    await clicar(botaoComTexto(container, 'Personalizado'));

    await digitar(campoDeMes(container, 'De'), '01/2025');

    expect(container.textContent).toContain(
      'Inclui 11 lançamentos a conferir (11.200,93) — os números podem mudar depois da conferência.',
    );
  });
});

describe('RelatoriosPage: filtros no escritório', () => {
  it('abre com os filtros à mostra e o botão para ocultar marcado como expandido', async () => {
    const { container } = await montar(<RelatoriosPage />);

    expect(botaoComTexto(container, 'Ocultar filtros').getAttribute('aria-expanded')).toBe('true');
    expect(seletorDe(container, 'Grupo').value).toBe('todos');
    expect(container.textContent).not.toContain('ago/26 · CDD + Munay');
  });

  it('Ocultar filtros — esconde os seletores e passa a mostrar o resumo do recorte', async () => {
    const { container } = await montar(<RelatoriosPage />);

    await clicar(botaoComTexto(container, 'Ocultar filtros'));

    expect(botaoComTexto(container, 'Mostrar filtros').getAttribute('aria-expanded')).toBe('false');
    expect(todos(container, 'select')).toHaveLength(0);
    expect(container.textContent).toContain('ago/26 · CDD + Munay');
  });

  it('o resumo com filtros ativos mostra o valor interno do filtro e não o rótulo do seletor', async () => {
    const { container } = await montar(<RelatoriosPage />);
    await escolherOpcao(seletorDe(container, 'Tipo'), 'saida');
    await escolherOpcao(seletorDe(container, 'Situação'), 'a conferir');
    await escolherOpcao(seletorDe(container, 'Grupo'), 'Chácara (Infraestrutura)');

    await clicar(botaoComTexto(container, 'Ocultar filtros'));

    expect(container.textContent).toContain('ago/26 · CDD + Munay · Chácara (Infraestrutura) · saida · a conferir');
  });

  it('o resumo com os seis filtros ativos — lista cada um depois das unidades, na ordem da tela', async () => {
    const { container } = await montar(<RelatoriosPage />);
    await escolherOpcao(seletorDe(container, 'Grupo'), 'Chácara (Infraestrutura)');
    await escolherOpcao(seletorDe(container, 'Categoria'), 'Manutenção');
    await escolherOpcao(seletorDe(container, 'Conta'), 'Nubank Paty');
    await escolherOpcao(seletorDe(container, 'Tipo'), 'saida');
    await escolherOpcao(seletorDe(container, 'Cerimônia'), 'São Miguel · julho');
    await escolherOpcao(seletorDe(container, 'Situação'), 'a conferir');

    await clicar(botaoComTexto(container, 'Ocultar filtros'));

    expect(container.textContent).toContain(
      'ago/26 · CDD + Munay · Chácara (Infraestrutura) · Manutenção · Nubank Paty · saida · São Miguel · julho · a conferir',
    );
  });

  it('período — Mês começa marcado e escolher Ano move a marca e amplia o rótulo do período', async () => {
    const { container } = await montar(<RelatoriosPage />);
    expect(['Mês', 'Trimestre', 'Ano', 'Personalizado'].map((p) => marcado(container, p))).toEqual(['true', 'false', 'false', 'false']);

    await clicar(botaoComTexto(container, 'Ano'));

    expect(['Mês', 'Trimestre', 'Ano', 'Personalizado'].map((p) => marcado(container, p))).toEqual(['false', 'false', 'true', 'false']);
    expect(container.textContent).toContain('jan/26 — ago/26');
  });

  it('unidades — as duas começam ligadas e desligar a CDD tira a CDD do recorte', async () => {
    const { container } = await montar(<RelatoriosPage />);
    expect([marcado(container, 'CDD'), marcado(container, 'Munay')]).toEqual(['true', 'true']);

    await clicar(botaoComTexto(container, 'CDD'));

    expect([marcado(container, 'CDD'), marcado(container, 'Munay')]).toEqual(['false', 'true']);
    expect(cartaoDoKpi(container, 'Entradas').valor).toBe('0,00');
  });

  it('unidades — desligar a que sobrou não faz nada', async () => {
    const { container } = await montar(<RelatoriosPage />);
    await clicar(botaoComTexto(container, 'CDD'));

    await clicar(botaoComTexto(container, 'Munay'));

    expect([marcado(container, 'CDD'), marcado(container, 'Munay')]).toEqual(['false', 'true']);
  });

  it('unidades — religar a CDD a coloca depois da Munay no resumo do recorte', async () => {
    const { container } = await montar(<RelatoriosPage />);
    await clicar(botaoComTexto(container, 'CDD'));
    await clicar(botaoComTexto(container, 'CDD'));

    await clicar(botaoComTexto(container, 'Ocultar filtros'));

    expect(container.textContent).toContain('ago/26 · Munay + CDD');
  });

  it('Personalizado — mostra os campos De e Até com março e agosto de 2026, e só nesse período', async () => {
    const { container } = await montar(<RelatoriosPage />);
    expect(todos(container, 'input')).toHaveLength(0);

    await clicar(botaoComTexto(container, 'Personalizado'));

    expect([campoDeMes(container, 'De').value, campoDeMes(container, 'Até').value]).toEqual(['03/2026', '08/2026']);
    expect(campoDeMes(container, 'De').placeholder).toBe('03/2026');
    expect(container.textContent).toContain('mar/26 — ago/26');
  });

  it('Personalizado — digitar no De e no Até muda o rótulo do período em toda a tela', async () => {
    const { container } = await montar(<RelatoriosPage />);
    await clicar(botaoComTexto(container, 'Personalizado'));

    await digitar(campoDeMes(container, 'De'), '01/2026');
    await digitar(campoDeMes(container, 'Até'), '03/2026');

    expect(container.textContent).toContain('Entradas e saídas ao longo do tempojan/26 — mar/26');
  });

  it('sair do Personalizado — esconde os campos, mas o período volta a ser o escolhido', async () => {
    const { container } = await montar(<RelatoriosPage />);
    await clicar(botaoComTexto(container, 'Personalizado'));

    await clicar(botaoComTexto(container, 'Mês'));

    expect(todos(container, 'input')).toHaveLength(0);
    expect(container.textContent).toContain('Entradas e saídas ao longo do tempoago/26');
  });

  it.each<{ rotulo: string; opcoes: readonly (readonly [string, string])[] }>([
    { rotulo: 'Comparar com', opcoes: [['anterior', 'Período anterior'], ['ano_passado', 'Mesmo período do ano passado'], ['nenhum', 'Sem comparação']] },
    { rotulo: 'Tipo', opcoes: [['todos', 'Todos'], ['saida', 'Saída'], ['entrada', 'Entrada'], ['transferencia', 'Transferência']] },
    { rotulo: 'Situação', opcoes: [['todas', 'Todas'], ['consolidado', 'Consolidado'], ['a conferir', 'A conferir']] },
    {
      rotulo: 'Grupo',
      opcoes: [['todos', 'Todos'], ['Lojinha', 'Lojinha'], ['Dormitório', 'Dormitório'], ['Chácara (Infraestrutura)', 'Chácara (Infraestrutura)'], ['CDD', 'CDD'], ['Cozinha', 'Cozinha'], ['Secretaria', 'Secretaria']],
    },
    {
      rotulo: 'Categoria',
      opcoes: [
        ['todas', 'Todas'],
        ['Alimentação de cerimônia', 'Alimentação de cerimônia'],
        ['Manutenção', 'Manutenção'],
        ['Transporte', 'Transporte'],
        ['Animais', 'Animais'],
        ['Insumos de feitio', 'Insumos de feitio'],
        ['Administrativo', 'Administrativo'],
        ['Contribuições', 'Contribuições'],
        ['Doações', 'Doações'],
        ['Vendas', 'Vendas'],
      ],
    },
    { rotulo: 'Conta', opcoes: [['todas', 'Todas'], ['Cora PJ', 'Cora PJ'], ['Espécie', 'Espécie'], ['Nubank Paty', 'Nubank Paty'], ['Itaú Munay', 'Itaú Munay']] },
    {
      rotulo: 'Cerimônia',
      opcoes: [['todas', 'Todas'], ['Mãe Divina · setembro', 'Mãe Divina · setembro'], ['Mãe Divina · agosto', 'Mãe Divina · agosto'], ['São Miguel · julho', 'São Miguel · julho'], ['São João · junho', 'São João · junho'], ['Sem cerimônia', 'Sem cerimônia']],
    },
  ])('seletor $rotulo — oferece as opções na ordem esperada', async ({ rotulo, opcoes }) => {
    const { container } = await montar(<RelatoriosPage />);

    expect(opcoesDe(seletorDe(container, rotulo))).toEqual(opcoes);
  });

  it('escolher Conta Espécie — restringe os indicadores às entradas e saídas da conta', async () => {
    const { container } = await montar(<RelatoriosPage />);

    await escolherOpcao(seletorDe(container, 'Conta'), 'Espécie');

    expect([cartaoDoKpi(container, 'Entradas').valor, cartaoDoKpi(container, 'Saídas').valor]).toEqual(['2.161,06', '0,00']);
  });

  it('escolher Categoria Manutenção — restringe os indicadores às saídas da categoria', async () => {
    const { container } = await montar(<RelatoriosPage />);

    await escolherOpcao(seletorDe(container, 'Categoria'), 'Manutenção');

    expect([cartaoDoKpi(container, 'Entradas').valor, cartaoDoKpi(container, 'Saídas').valor]).toEqual(['0,00', '2.497,54']);
  });

  it('escolher Cerimônia São Miguel · julho — restringe os indicadores aos lançamentos da cerimônia', async () => {
    const { container } = await montar(<RelatoriosPage />);

    await escolherOpcao(seletorDe(container, 'Cerimônia'), 'São Miguel · julho');

    expect([cartaoDoKpi(container, 'Entradas').valor, cartaoDoKpi(container, 'Saídas').valor]).toEqual(['0,00', '1.543,68']);
  });

  it('Limpar filtros — devolve os seis seletores ao valor de todos e os indicadores ao recorte inteiro', async () => {
    const { container } = await montar(<RelatoriosPage />);
    await escolherOpcao(seletorDe(container, 'Conta'), 'Espécie');
    await escolherOpcao(seletorDe(container, 'Tipo'), 'entrada');

    await clicar(botaoComTexto(container, 'Limpar filtros'));

    expect(['Grupo', 'Categoria', 'Conta', 'Tipo', 'Cerimônia', 'Situação'].map((r) => seletorDe(container, r).value)).toEqual([
      'todos',
      'todas',
      'todas',
      'todos',
      'todas',
      'todas',
    ]);
    expect(cartaoDoKpi(container, 'Entradas').valor).toBe('4.747,90');
  });

  it('Limpar filtros — não mexe no período, na comparação nem nas unidades', async () => {
    const { container } = await montar(<RelatoriosPage />);
    await clicar(botaoComTexto(container, 'Trimestre'));
    await escolherOpcao(seletorDe(container, 'Comparar com'), 'nenhum');
    await clicar(botaoComTexto(container, 'CDD'));

    await clicar(botaoComTexto(container, 'Limpar filtros'));

    expect(marcado(container, 'Trimestre')).toBe('true');
    expect(seletorDe(container, 'Comparar com').value).toBe('nenhum');
    expect(marcado(container, 'CDD')).toBe('false');
  });
});

describe('RelatoriosPage: filtros em campo', () => {
  beforeEach(() => fixarDensidade(true));

  it('abre com os filtros recolhidos e o resumo do recorte no lugar deles', async () => {
    const { container } = await montar(<RelatoriosPage />);

    expect(botaoComTexto(container, 'Mostrar filtros').getAttribute('aria-expanded')).toBe('false');
    expect(todos(container, 'select')).toHaveLength(0);
    expect(container.textContent).toContain('ago/26 · CDD + Munay');
  });

  it('Mostrar filtros — abre os seletores e some o resumo', async () => {
    const { container } = await montar(<RelatoriosPage />);

    await clicar(botaoComTexto(container, 'Mostrar filtros'));

    expect(todos(container, 'select')).toHaveLength(7);
    expect(container.textContent).not.toContain('ago/26 · CDD + Munay');
  });
});

describe('RelatoriosPage: avisos das ações do cabeçalho', () => {
  it('PDF — avisa que o relatório do período foi preparado em PDF', async () => {
    const { container } = await montar(<RelatoriosPage />);

    await clicar(botaoComTexto(container, 'PDF'));

    expect(container.textContent).toContain('Relatório de ago/26 preparado em PDF.');
  });

  it('Planilha — avisa quantos lançamentos entraram na planilha', async () => {
    const { container } = await montar(<RelatoriosPage />);

    await clicar(botaoComTexto(container, 'Planilha'));

    expect(container.textContent).toContain('Planilha de ago/26 gerada com 7 lançamentos.');
  });

  it('Planilha com um só lançamento — usa o singular', async () => {
    const { container } = await montar(<RelatoriosPage />);
    await escolherOpcao(seletorDe(container, 'Situação'), 'a conferir');

    await clicar(botaoComTexto(container, 'Planilha'));

    expect(container.textContent).toContain('Planilha de ago/26 gerada com 1 lançamento.');
  });

  it('um novo aviso troca o anterior em vez de somar', async () => {
    const { container } = await montar(<RelatoriosPage />);
    await clicar(botaoComTexto(container, 'PDF'));

    await clicar(botaoComTexto(container, 'Planilha'));

    expect(container.textContent).not.toContain('preparado em PDF');
    expect(container.textContent).toContain('Planilha de ago/26');
  });

  it('o aviso fala do período que estava escolhido quando o botão foi clicado', async () => {
    const { container } = await montar(<RelatoriosPage />);
    await clicar(botaoComTexto(container, 'Trimestre'));

    await clicar(botaoComTexto(container, 'PDF'));

    expect(container.textContent).toContain('Relatório de jun/26 — ago/26 preparado em PDF.');
  });

  it('fechar aviso — remove o aviso da tela', async () => {
    const { container } = await montar(<RelatoriosPage />);
    await clicar(botaoComTexto(container, 'PDF'));

    await clicar(elemento<HTMLButtonElement>(container, 'button[aria-label="fechar aviso"]'));

    expect(container.textContent).not.toContain('preparado em PDF');
    expect(container.querySelector('button[aria-label="fechar aviso"]')).toBeNull();
  });

  it('o aviso não é anunciado como status: não tem papel de região viva', async () => {
    const { container } = await montar(<RelatoriosPage />);

    await clicar(botaoComTexto(container, 'PDF'));

    expect(container.querySelector('[role="status"]')).toBeNull();
  });
});

describe('RelatoriosPage: movimento por conta', () => {
  it('escritório — mostra o cabeçalho da tabela e, por conta, entradas, saídas, resultado e exportar', async () => {
    const { container } = await montar(<RelatoriosPage />);

    expect(linhaDaConta(container, 'Cora PJ').textContent).toBe('Cora PJ2.586,842.615,38-28,54exportar');
    expect(linhaDaConta(container, 'Espécie').textContent).toBe('Espécie2.161,060,002.161,06exportar');
    expect(cartaoComTitulo(container, 'Movimento por conta').textContent).toContain('ContaEntradasSaídasResultado');
  });

  it('escritório — conta sem movimento aparece zerada e com resultado na cor primária', async () => {
    const { container } = await montar(<RelatoriosPage />);

    expect(linhaDaConta(container, 'Itaú Munay').textContent).toBe('Itaú Munay0,000,000,00exportar');
    const resultado = todos<HTMLSpanElement>(linhaDaConta(container, 'Itaú Munay'), 'span')[2];
    expect(resultado?.style.color).toBe(COR_PRIMARIA);
  });

  it('escritório — resultado negativo da conta fica em atenção', async () => {
    const { container } = await montar(<RelatoriosPage />);

    const resultado = todos<HTMLSpanElement>(linhaDaConta(container, 'Nubank Paty'), 'span')[2];
    expect([resultado?.textContent, resultado?.style.color]).toEqual(['-1.543,68', COR_DE_ATENCAO]);
  });

  it('escritório — exportar da conta avisa o extrato exportado do período', async () => {
    const { container } = await montar(<RelatoriosPage />);

    await clicar(botoesComTexto(linhaDaConta(container, 'Cora PJ'), 'exportar')[0] as HTMLButtonElement);

    expect(container.textContent).toContain('Extrato de Cora PJ em ago/26 exportado em planilha.');
  });

  it('campo — mostra só o nome da conta e o resultado, sem cabeçalho nem exportar', async () => {
    fixarDensidade(true);

    const { container } = await montar(<RelatoriosPage />);

    expect(linhaDaConta(container, 'Cora PJ').textContent).toBe('Cora PJ-28,54');
    expect(cartaoComTitulo(container, 'Movimento por conta').textContent).not.toContain('ContaEntradas');
    expect(botoesComTexto(container, 'exportar')).toHaveLength(0);
  });

  it('campo — o resultado positivo ou zerado da conta fica em verde e o negativo em atenção', async () => {
    fixarDensidade(true);

    const { container } = await montar(<RelatoriosPage />);

    const cores = ['Espécie', 'Nubank Paty', 'Itaú Munay'].map((nome) => todos<HTMLSpanElement>(linhaDaConta(container, nome), 'span')[0]?.style.color);
    expect(cores).toEqual([COR_CONFIRMADA, COR_DE_ATENCAO, COR_CONFIRMADA]);
  });
});

describe('RelatoriosPage: fundo próprio e custo por cerimônia', () => {
  it('fundo próprio — mostra cada fundo com valor de meta, nota e a barra do que já foi atingido', async () => {
    const { container } = await montar(<RelatoriosPage />);

    const cartao = cartaoComTitulo(container, 'Fundo próprio contra as metas');
    expect(cartao.textContent).toContain('Obra do dormitório18.400,00 de 24.000,00');
    expect(cartao.textContent).toContain('previsão de conclusão em novembro');
    expect(cartao.textContent).toContain('Emergência e saúde6.000,00 de 6.000,00');
    expect(cartao.textContent).toContain('meta atingida, mantida intocada');
  });

  it('fundo próprio — a barra é o valor sobre a meta e a meta cumprida ocupa 100%', async () => {
    const { container } = await montar(<RelatoriosPage />);

    const barras = todos<HTMLSpanElement>(cartaoComTitulo(container, 'Fundo próprio contra as metas'), 'span').filter((s) => s.style.transition.startsWith('width'));

    expect(barras.map((b) => Math.round(parseFloat(b.style.width) * 100) / 100)).toEqual([76.67, 76.67, 100]);
  });

  it('fundo próprio — não muda com o período nem com os filtros', async () => {
    const { container } = await montar(<RelatoriosPage />);
    const antes = cartaoComTitulo(container, 'Fundo próprio contra as metas').textContent;

    await clicar(botaoComTexto(container, 'Ano'));
    await escolherOpcao(seletorDe(container, 'Conta'), 'Espécie');

    expect(cartaoComTitulo(container, 'Fundo próprio contra as metas').textContent).toBe(antes);
  });

  it('custo por cerimônia — lista as cerimônias do recorte da maior para a menor, com o valor', async () => {
    const { container } = await montar(<RelatoriosPage />);

    const botoes = todos<HTMLButtonElement>(cartaoComTitulo(container, 'Custo por cerimônia'), 'button');

    expect(botoes.map((b) => b.textContent)).toEqual(['São Miguel · julho1.543,68', 'Mãe Divina · setembro538,55']);
  });

  it('custo por cerimônia — a barra da maior ocupa 100% e a outra é proporcional a ela', async () => {
    const { container } = await montar(<RelatoriosPage />);

    const barras = todos<HTMLSpanElement>(cartaoComTitulo(container, 'Custo por cerimônia'), 'span').filter((s) => s.style.transition.startsWith('width'));

    expect(barras.map((b) => Math.round(parseFloat(b.style.width) * 100) / 100)).toEqual([100, 34.89]);
  });

  it('custo por cerimônia — sem saída de cerimônia no recorte, só o título', async () => {
    const { container } = await montar(<RelatoriosPage />);

    await escolherOpcao(seletorDe(container, 'Tipo'), 'entrada');

    expect(todos(cartaoComTitulo(container, 'Custo por cerimônia'), 'button')).toHaveLength(0);
  });
});

describe('RelatoriosPage: gaveta com os lançamentos de um recorte', () => {
  it('sem clique — não há gaveta aberta', async () => {
    const { container } = await montar(<RelatoriosPage />);

    expect(gaveta(container)).toBeNull();
  });

  it('barra de Saídas por grupo — abre a gaveta do grupo com a contagem, o total e o período', async () => {
    const { container } = await montar(<RelatoriosPage />);

    await clicar(barraDoPainel(container, 'Saídas por grupo', 'Chácara (Infraestrutura)'));

    expect(cabecalhoDaGaveta(container)).toEqual(['Saídas do grupo', 'Chácara (Infraestrutura)', '1 lançamento · 1.543,68 · ago/26']);
  });

  it('a linha da gaveta mostra dia e mês, motivo, grupo, conta, a marca de a conferir e a saída com sinal de menos', async () => {
    const { container } = await montar(<RelatoriosPage />);

    await clicar(barraDoPainel(container, 'Saídas por grupo', 'Chácara (Infraestrutura)'));

    expect(linhasDaGaveta(container)).toEqual([
      `25/08reforma do telhadoChácara (Infraestrutura) · Nubank Paty · a conferir${MENOS}1.543,68`,
    ]);
  });

  it('barra de Saídas por categoria — abre a gaveta da categoria com as saídas dela', async () => {
    const { container } = await montar(<RelatoriosPage />);

    await clicar(barraDoPainel(container, 'Saídas por categoria', 'Manutenção'));

    expect(cabecalhoDaGaveta(container)).toEqual(['Saídas da categoria', 'Manutenção', '2 lançamentos · 2.497,54 · ago/26']);
    expect(linhasDaGaveta(container)).toEqual([
      `25/08reforma do telhadoChácara (Infraestrutura) · Nubank Paty · a conferir${MENOS}1.543,68`,
      `23/08reforma do telhadoCDD · Cora PJ${MENOS}953,86`,
    ]);
  });

  it('cerimônia — abre a gaveta de gastos da cerimônia', async () => {
    const { container } = await montar(<RelatoriosPage />);

    await clicar(botaoComTexto(container, 'São Miguel · julho1.543,68'));

    expect(cabecalhoDaGaveta(container)).toEqual(['Gastos da cerimônia', 'São Miguel · julho', '1 lançamento · 1.543,68 · ago/26']);
  });

  it('barra de Saídas por grupo com entrada no mês — a gaveta do grupo lista só as saídas', async () => {
    const { container } = await montar(<RelatoriosPage />);

    await clicar(barraDoPainel(container, 'Saídas por grupo', 'Cozinha'));

    expect(cabecalhoDaGaveta(container)).toEqual(['Saídas do grupo', 'Cozinha', '1 lançamento · 538,55 · ago/26']);
    expect(linhasDaGaveta(container)).toEqual([`10/08lenha para o feitioCozinha · Cora PJ${MENOS}538,55`]);
  });

  it('cerimônia com entrada no mês — a gaveta de gastos lista só as saídas da cerimônia', async () => {
    const { container } = await montar(<RelatoriosPage />);

    await clicar(botaoComTexto(container, 'Mãe Divina · setembro538,55'));

    expect(cabecalhoDaGaveta(container)).toEqual(['Gastos da cerimônia', 'Mãe Divina · setembro', '1 lançamento · 538,55 · ago/26']);
    expect(linhasDaGaveta(container)).toEqual([`10/08lenha para o feitioCozinha · Cora PJ${MENOS}538,55`]);
  });

  it('conta — a gaveta lista entradas e saídas da conta, com sinal de mais e de menos', async () => {
    const { container } = await montar(<RelatoriosPage />);

    await clicar(botaoDeConta(container, 'Cora PJ'));

    expect(cabecalhoDaGaveta(container)[0]).toBe('Movimento da conta');
    expect(linhasDaGaveta(container)).toEqual([
      `10/08lenha para o feitioCozinha · Cora PJ${MENOS}538,55`,
      `24/08lenha para o feitioDormitório · Cora PJ${MENOS}1.122,97`,
      `23/08reforma do telhadoCDD · Cora PJ${MENOS}953,86`,
      '04/08venda de velasCozinha · Cora PJ+ 2.586,84',
    ]);
  });

  it('conta — o valor da entrada leva a cor de confirmado e o da saída a cor primária', async () => {
    const { container } = await montar(<RelatoriosPage />);

    await clicar(botaoDeConta(container, 'Cora PJ'));

    expect(valoresDaGaveta(container)).toEqual([
      { texto: `${MENOS}538,55`, cor: COR_PRIMARIA },
      { texto: `${MENOS}1.122,97`, cor: COR_PRIMARIA },
      { texto: `${MENOS}953,86`, cor: COR_PRIMARIA },
      { texto: '+ 2.586,84', cor: COR_CONFIRMADA },
    ]);
  });

  it('conta com transferência — o valor sem sinal leva a cor primária', async () => {
    const { container } = await montar(<RelatoriosPage />);

    await clicar(botaoDeConta(container, 'Itaú Munay'));

    expect(valoresDaGaveta(container)).toEqual([{ texto: '605,68', cor: COR_PRIMARIA }]);
  });

  it('conta — o total da gaveta soma entradas e saídas como valores positivos, e não bate com o resultado da conta', async () => {
    const { container } = await montar(<RelatoriosPage />);

    await clicar(botaoDeConta(container, 'Cora PJ'));

    expect(cabecalhoDaGaveta(container)[2]).toBe('4 lançamentos · 5.202,22 · ago/26');
    expect(linhaDaConta(container, 'Cora PJ').textContent).toContain('-28,54');
  });

  it('conta com transferência — a linha repete a conta e o valor sai sem sinal', async () => {
    const { container } = await montar(<RelatoriosPage />);

    await clicar(botaoDeConta(container, 'Itaú Munay'));

    expect(linhasDaGaveta(container)).toEqual(['10/08repasse entre contasItaú Munay · Itaú Munay605,68']);
  });

  it('a gaveta mostra no máximo 40 linhas, mas a contagem do cabeçalho é a do recorte inteiro', async () => {
    const { container } = await montar(<RelatoriosPage />);
    await clicar(botaoComTexto(container, 'Personalizado'));
    await digitar(campoDeMes(container, 'De'), '01/2025');

    await clicar(botaoDeConta(container, 'Nubank Paty'));

    expect(cabecalhoDaGaveta(container)[2]).toMatch(/^48 lançamentos · .* · jan\/25 — ago\/26$/);
    expect(linhasDaGaveta(container)).toHaveLength(40);
  });

  it('Fechar recorte — fecha a gaveta', async () => {
    const { container } = await montar(<RelatoriosPage />);
    await clicar(barraDoPainel(container, 'Saídas por grupo', 'Chácara (Infraestrutura)'));

    await clicar(elemento<HTMLButtonElement>(container, 'button[aria-label="Fechar recorte"]'));

    expect(gaveta(container)).toBeNull();
  });

  it('clicar no fundo escuro — fecha a gaveta', async () => {
    const { container } = await montar(<RelatoriosPage />);
    await clicar(barraDoPainel(container, 'Saídas por grupo', 'Chácara (Infraestrutura)'));

    await clicar(gaveta(container) as HTMLElement);

    expect(gaveta(container)).toBeNull();
  });

  it('clicar dentro da gaveta — não fecha', async () => {
    const { container } = await montar(<RelatoriosPage />);
    await clicar(barraDoPainel(container, 'Saídas por grupo', 'Chácara (Infraestrutura)'));

    await clicar(painelDaGaveta(container));

    expect(gaveta(container)).not.toBeNull();
  });

  it('Exportar este recorte — avisa a exportação com a contagem de lançamentos, e a gaveta continua aberta', async () => {
    const { container } = await montar(<RelatoriosPage />);
    await clicar(barraDoPainel(container, 'Saídas por categoria', 'Manutenção'));

    await clicar(botaoComTexto(container, 'Exportar este recorte'));

    expect(container.textContent).toContain('Recorte exportado com 2 lançamentos.');
    expect(gaveta(container)).not.toBeNull();
  });

  it('escritório — a gaveta fica colada na direita, com a altura toda da tela', async () => {
    const { container } = await montar(<RelatoriosPage />);

    await clicar(barraDoPainel(container, 'Saídas por grupo', 'Chácara (Infraestrutura)'));

    expect(gaveta(container)?.style.alignItems).toBe('stretch');
    expect(painelDaGaveta(container).style.maxHeight).toBe('100%');
  });

  it('campo — a gaveta sobe da base, ocupa a largura e deixa folga em cima', async () => {
    fixarDensidade(true);
    const { container } = await montar(<RelatoriosPage />);

    await clicar(barraDoPainel(container, 'Saídas por grupo', 'Chácara (Infraestrutura)'));

    expect(gaveta(container)?.style.alignItems).toBe('flex-end');
    expect([painelDaGaveta(container).style.width, painelDaGaveta(container).style.maxHeight]).toEqual(['100%', '86%']);
  });
});
