import { reais } from '@cdd/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { botaoComTexto, clicar, desmontarTudo, elemento, escolherOpcao, montar, todos } from '@/testes/montagem';
import { ParametrosPage } from './ParametrosPage';

type Registros = readonly Record<string, unknown>[];

const cenario = vi.hoisted(() => ({
  unidades: (reaisDoMock: Registros): Registros => reaisDoMock,
  categorias: (reaisDoMock: Registros): Registros => reaisDoMock,
}));

vi.mock('../../mocks/parametros', async (importarOriginal) => {
  const original = await importarOriginal<{ unidades: Registros; categorias: Registros }>();
  return {
    ...original,
    get unidades() {
      return cenario.unidades(original.unidades);
    },
    get categorias() {
      return cenario.categorias(original.categorias);
    },
  };
});

const COR_PENDENTE = 'var(--color-pending)';
const COR_DA_MARCA = 'var(--color-royal)';

const LINHAS_DE_RELATORIO = [
  'Receita de contribuição',
  'Receita de hospedagem',
  'Receita de apoio',
  'Receita da Lojinha',
  'Receita da Munay',
  'Custo de cerimônia',
  'Custo de feitio',
  'Custo da Lojinha',
  'Custo da Munay',
  'Manutenção',
  'Deslocamento',
  'Serviços de terceiros',
  'Administrativo',
  'Investimento em benfeitoria',
  'Movimentação patrimonial',
];

function fixarDensidade(campo: boolean) {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    media: consulta,
    matches: campo,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

beforeEach(() => {
  fixarDensidade(false);
  cenario.unidades = (u) => u;
  cenario.categorias = (c) => c;
});

afterEach(async () => {
  await desmontarTudo();
  vi.unstubAllGlobals();
});

const seletorDe = (origem: HTMLElement, rotulo: string) => {
  const etiqueta = todos<HTMLLabelElement>(origem, 'label').find((l) => l.textContent === rotulo);
  const campo = etiqueta ? document.getElementById(etiqueta.htmlFor) : null;
  if (!(campo instanceof HTMLSelectElement)) throw new Error(`seletor não encontrado: ${rotulo}`);
  return campo;
};

const linhaDaCategoria = (container: HTMLElement, nome: string) => {
  const achada = todos<HTMLTableRowElement>(container, 'tbody tr').find((tr) => tr.cells[0]?.textContent?.startsWith(nome));
  if (!achada) throw new Error(`categoria não encontrada: ${nome}`);
  return achada;
};

const celulasDaCategoria = (container: HTMLElement, nome: string) =>
  Array.from(linhaDaCategoria(container, nome).cells).map((c) => c.textContent);

const abaMarcada = (container: HTMLElement, texto: string) => botaoComTexto(container, texto).getAttribute('aria-pressed');

const abas = (container: HTMLElement) => ['Categorias', 'Unidades e regimes', 'Instituição'].map((a) => abaMarcada(container, a));

const recado = (container: HTMLElement) => container.querySelector('[role="status"]')?.textContent ?? null;

const cartaoDaUnidade = (container: HTMLElement, nome: string) => {
  const titulo = todos<HTMLSpanElement>(container, 'span').find((s) => s.textContent === nome);
  const cartao = titulo?.parentElement?.parentElement;
  if (!cartao) throw new Error(`unidade não encontrada: ${nome}`);
  return cartao;
};

const faixaDoTeto = (cartao: HTMLElement) =>
  todos<HTMLDivElement>(cartao, 'div').find((d) => d.style.height === '100%' && d.style.width.endsWith('%'));

async function salvarLinhaSugerida(container: HTMLElement, nome: string) {
  await clicar(botaoComTexto(linhaDaCategoria(container, nome), 'Escolher linha'));
  await clicar(botaoComTexto(linhaDaCategoria(container, nome), 'Salvar'));
}

const abrirUnidades = (container: HTMLElement) => clicar(botaoComTexto(container, 'Unidades e regimes'));

const abrirInstituicao = (container: HTMLElement) => clicar(botaoComTexto(container, 'Instituição'));

describe('ParametrosPage: cabeçalho e abas', () => {
  it('escritório — mostra os três códigos por extenso, o título e o subtítulo', async () => {
    const { container } = await montar(<ParametrosPage />);

    const cabecalho = elemento(container, 'header');
    expect(cabecalho.textContent).toContain('F-15, F-16 e A-03 · Parâmetros');
    expect(elemento(cabecalho, 'h1').textContent).toBe('Parâmetros');
    expect(cabecalho.textContent).toContain('Plano de contas, unidades e o que a casa configura · CDD');
  });

  it('campo — mostra os três códigos abreviados e nenhum subtítulo', async () => {
    fixarDensidade(true);

    const { container } = await montar(<ParametrosPage />);

    expect(elemento(container, 'header').textContent).toBe('F-15 · F-16 · A-03Parâmetros');
  });

  it('abre na aba Categorias, com as outras duas desmarcadas', async () => {
    const { container } = await montar(<ParametrosPage />);

    expect(abas(container)).toEqual(['true', 'false', 'false']);
  });

  it('escolher uma aba — marca a aba e troca o conteúdo', async () => {
    const { container } = await montar(<ParametrosPage />);

    await abrirUnidades(container);

    expect(abas(container)).toEqual(['false', 'true', 'false']);
    expect(todos(container, 'table')).toHaveLength(0);
    expect(container.textContent).toContain('CNPJ 41.882.310/0001-55');
  });
});

describe('ParametrosPage: aviso de categorias sem linha de relatório', () => {
  it('com duas categorias ativas sem linha — conta categorias e lançamentos fora do DRE', async () => {
    const { container } = await montar(<ParametrosPage />);

    expect(container.textContent).toContain('2 categorias ativas sem linha de relatório');
    expect(container.textContent).toContain(
      '44 lançamentos não aparecem no DRE — e isso não é sinalizado como erro em lugar nenhum. Foi assim que R$ 40,6 mil ficaram órfãos na planilha: não estavam errados, estavam fora.',
    );
    expect(container.textContent).toContain('Escolher a linha resolve. É a razão de esta tela existir.');
  });
});

describe('ParametrosPage: tabela de categorias', () => {
  it('o título conta as categorias do plano, ativas e inativas', async () => {
    const { container } = await montar(<ParametrosPage />);

    expect(container.textContent).toContain('17 categorias no plano de contas');
  });

  it('as seis colunas, na ordem', async () => {
    const { container } = await montar(<ParametrosPage />);

    expect(todos(container, 'thead th').map((th) => th.textContent)).toEqual([
      'Categoria',
      'Natureza',
      'Tipo',
      'Regimes',
      'Linha de relatório',
      'Lançamentos',
    ]);
  });

  it('uma linha por categoria, na ordem do plano', async () => {
    const { container } = await montar(<ParametrosPage />);

    expect(todos<HTMLTableRowElement>(container, 'tbody tr').map((tr) => tr.cells[0]?.querySelector('span > span > span')?.textContent)).toEqual([
      'Contribuição de cerimônia',
      'Cachê de contratação',
      'Cachê a músico',
      'Venda de mercadoria',
      'Hospedagem',
      'Alimentação de cerimônia',
      'Custo de feitio',
      'Obra do dormitório',
      'Manutenção e zeladoria',
      'Combustível',
      'Custo da lojinha',
      'Prestadores de serviço',
      'Administrativo',
      'Doações e apoio',
      'Investimento na Lojinha',
      'Movimentação',
      'Empréstimo (antigo)',
    ]);
  });

  it('categoria de receita com um regime — mostra código, natureza, tipo, regime, linha e quantidade', async () => {
    const { container } = await montar(<ParametrosPage />);

    expect(celulasDaCategoria(container, 'Contribuição de cerimônia')).toEqual([
      'Contribuição de cerimôniaCONTRIB_CDD',
      'Receita',
      'Operacional',
      'Contribuição',
      'Receita de contribuiçãotrocar',
      '214',
    ]);
  });

  it('categoria que serve aos dois regimes — mostra um selo para cada regime', async () => {
    const { container } = await montar(<ParametrosPage />);

    expect(celulasDaCategoria(container, 'Hospedagem')[3]).toBe('ContribuiçãoComercial');
  });

  it('categoria com nota — mostra a nota embaixo do código', async () => {
    const { container } = await montar(<ParametrosPage />);

    expect(celulasDaCategoria(container, 'Cachê de contratação')[0]).toBe(
      'Cachê de contrataçãoCACHE_RECEBIDOO contratante paga a Munay. Não confundir com o cachê pago ao músico.',
    );
  });

  it('categoria de despesa — mostra Despesa em cor primária e a receita em verde', async () => {
    const { container } = await montar(<ParametrosPage />);

    const natureza = (nome: string) => linhaDaCategoria(container, nome).cells[1]?.querySelector('span') as HTMLElement;
    expect([natureza('Combustível').textContent, natureza('Combustível').style.color]).toEqual(['Despesa', 'var(--text-primary)']);
    expect([natureza('Hospedagem').textContent, natureza('Hospedagem').style.color]).toEqual(['Receita', 'var(--color-confirmed)']);
  });

  it('o tipo sai do código do sistema com a primeira letra maiúscula, e perde o acento', async () => {
    const { container } = await montar(<ParametrosPage />);

    expect(['Manutenção e zeladoria', 'Obra do dormitório', 'Movimentação'].map((nome) => celulasDaCategoria(container, nome)[2])).toEqual([
      'Manutencao',
      'Investimento',
      'Patrimonial',
    ]);
  });

  it('categoria ativa sem linha — destaca a linha, mostra Faltando e oferece Escolher linha', async () => {
    const { container } = await montar(<ParametrosPage />);

    const linha = linhaDaCategoria(container, 'Investimento na Lojinha');

    expect(celulasDaCategoria(container, 'Investimento na Lojinha')[4]).toBe('FaltandoEscolher linha');
    expect(linha.style.background).toBe('var(--color-attention-soft)');
    expect(linha.style.opacity).toBe('1');
  });

  it('categoria inativa — mostra o selo Inativa, esmaece a linha e não oferece trocar a linha', async () => {
    const { container } = await montar(<ParametrosPage />);

    const linha = linhaDaCategoria(container, 'Empréstimo (antigo)');

    expect(celulasDaCategoria(container, 'Empréstimo (antigo)')).toEqual([
      'Empréstimo (antigo)InativaEMPRESTIMO_ANTIGOInativada: empréstimo virou agregado próprio e não é mais despesa (E1).',
      'Despesa',
      'Patrimonial',
      'Contribuição',
      'Movimentação patrimonial',
      '9',
    ]);
    expect(linha.style.opacity).toBe('0.58');
    expect(todos(linha, 'button')).toHaveLength(0);
  });

  it('as duas regras da tabela aparecem embaixo: natureza não muda e categoria com lançamento só se inativa', async () => {
    const { container } = await montar(<ParametrosPage />);

    expect(container.textContent).toContain(
      'Natureza não muda depois de criada: uma categoria não troca de lado. Se precisa dos dois, são duas categorias — é por isso que cachê pago e cachê recebido existem separados.',
    );
    expect(container.textContent).toContain('Categoria com lançamento confirmado não se exclui, só se inativa.');
  });
});

describe('ParametrosPage: tabela com rolagem horizontal', () => {
  it('escritório — a tabela tem largura mínima de 860px dentro de uma área que rola na horizontal', async () => {
    const { container } = await montar(<ParametrosPage />);

    const tabela = elemento<HTMLTableElement>(container, 'table');
    expect(tabela.style.minWidth).toBe('860px');
    expect(tabela.parentElement?.style.overflowX).toBe('auto');
  });

  it('campo — a largura mínima cai para 620px e a área continua rolando na horizontal', async () => {
    fixarDensidade(true);

    const { container } = await montar(<ParametrosPage />);

    const tabela = elemento<HTMLTableElement>(container, 'table');
    expect(tabela.style.minWidth).toBe('620px');
    expect(tabela.parentElement?.style.overflowX).toBe('auto');
  });
});

describe('ParametrosPage: escolher a linha de uma categoria sem linha', () => {
  it('Escolher linha — abre o seletor com as quinze linhas, a primeira escolhida, e Salvar e Cancelar', async () => {
    const { container } = await montar(<ParametrosPage />);

    await clicar(botaoComTexto(linhaDaCategoria(container, 'Investimento na Lojinha'), 'Escolher linha'));

    const linha = linhaDaCategoria(container, 'Investimento na Lojinha');
    const seletor = seletorDe(linha, 'Linha de relatório');
    expect(Array.from(seletor.options).map((o) => o.value)).toEqual(LINHAS_DE_RELATORIO);
    expect(seletor.value).toBe('Receita de contribuição');
    expect(todos(linha, 'button').map((b) => b.textContent)).toEqual(['Salvar', 'Cancelar']);
  });

  it('uma categoria de despesa já abre com uma linha de receita escolhida e as de receita à escolha', async () => {
    const { container } = await montar(<ParametrosPage />);

    await clicar(botaoComTexto(linhaDaCategoria(container, 'Movimentação'), 'Escolher linha'));

    const seletor = seletorDe(linhaDaCategoria(container, 'Movimentação'), 'Linha de relatório');
    expect(celulasDaCategoria(container, 'Movimentação')[1]).toBe('Despesa');
    expect(seletor.value).toBe('Receita de contribuição');
  });

  it('Cancelar — fecha o seletor e a categoria continua sem linha', async () => {
    const { container } = await montar(<ParametrosPage />);
    await clicar(botaoComTexto(linhaDaCategoria(container, 'Investimento na Lojinha'), 'Escolher linha'));

    await clicar(botaoComTexto(linhaDaCategoria(container, 'Investimento na Lojinha'), 'Cancelar'));

    expect(celulasDaCategoria(container, 'Investimento na Lojinha')[4]).toBe('FaltandoEscolher linha');
    expect(container.textContent).toContain('2 categorias ativas sem linha de relatório');
  });

  it('Salvar — a categoria ganha a linha escolhida e passa a oferecer trocar', async () => {
    const { container } = await montar(<ParametrosPage />);
    await clicar(botaoComTexto(linhaDaCategoria(container, 'Investimento na Lojinha'), 'Escolher linha'));
    await escolherOpcao(seletorDe(linhaDaCategoria(container, 'Investimento na Lojinha'), 'Linha de relatório'), 'Investimento em benfeitoria');

    await clicar(botaoComTexto(linhaDaCategoria(container, 'Investimento na Lojinha'), 'Salvar'));

    expect(celulasDaCategoria(container, 'Investimento na Lojinha')[4]).toBe('Investimento em benfeitoriatrocar');
    expect(linhaDaCategoria(container, 'Investimento na Lojinha').style.background).toBe('');
  });

  it('Salvar — o recado cita a categoria, a linha e quantos lançamentos entraram no relatório', async () => {
    const { container } = await montar(<ParametrosPage />);
    await clicar(botaoComTexto(linhaDaCategoria(container, 'Investimento na Lojinha'), 'Escolher linha'));
    await escolherOpcao(seletorDe(linhaDaCategoria(container, 'Investimento na Lojinha'), 'Linha de relatório'), 'Custo da Lojinha');

    await clicar(botaoComTexto(linhaDaCategoria(container, 'Investimento na Lojinha'), 'Salvar'));

    expect(recado(container)).toContain('“Investimento na Lojinha” agora aparece em Custo da Lojinha. 18 lançamentos que estavam fora do relatório entraram.');
  });

  it('Salvar uma — o aviso passa para o singular e desconta os lançamentos da categoria resolvida', async () => {
    const { container } = await montar(<ParametrosPage />);
    await clicar(botaoComTexto(linhaDaCategoria(container, 'Investimento na Lojinha'), 'Escolher linha'));

    await clicar(botaoComTexto(linhaDaCategoria(container, 'Investimento na Lojinha'), 'Salvar'));

    expect(container.textContent).toContain('1 categoria ativa sem linha de relatório');
    expect(container.textContent).toContain('26 lançamentos não aparecem no DRE');
  });

  it('Salvar as duas — o aviso vira a confirmação de que nada fica fora do DRE', async () => {
    const { container } = await montar(<ParametrosPage />);
    await salvarLinhaSugerida(container, 'Investimento na Lojinha');
    await salvarLinhaSugerida(container, 'Movimentação');

    expect(container.textContent).toContain('Toda categoria ativa tem linha de relatório. Nada fica fora do DRE.');
    expect(container.textContent).not.toContain('sem linha de relatório');
  });

  it('só uma categoria em edição por vez — escolher outra fecha a primeira', async () => {
    const { container } = await montar(<ParametrosPage />);
    await clicar(botaoComTexto(linhaDaCategoria(container, 'Investimento na Lojinha'), 'Escolher linha'));

    await clicar(botaoComTexto(linhaDaCategoria(container, 'Movimentação'), 'Escolher linha'));

    expect(todos(linhaDaCategoria(container, 'Investimento na Lojinha'), 'select')).toHaveLength(0);
    expect(todos(linhaDaCategoria(container, 'Movimentação'), 'select')).toHaveLength(1);
  });
});

describe('ParametrosPage: trocar a linha de uma categoria que já tem linha', () => {
  it('trocar — o botão tem o nome da categoria para quem usa leitor de tela', async () => {
    const { container } = await montar(<ParametrosPage />);

    const botao = elemento<HTMLButtonElement>(linhaDaCategoria(container, 'Combustível'), 'button');

    expect([botao.textContent, botao.getAttribute('aria-label')]).toEqual(['trocar', 'trocar a linha de Combustível']);
  });

  it('trocar — abre o seletor com a linha atual escolhida', async () => {
    const { container } = await montar(<ParametrosPage />);

    await clicar(elemento<HTMLButtonElement>(linhaDaCategoria(container, 'Combustível'), 'button'));

    expect(seletorDe(linhaDaCategoria(container, 'Combustível'), 'Linha de relatório').value).toBe('Deslocamento');
  });

  it('Salvar — troca a linha, mas o recado diz que os lançamentos "estavam fora do relatório"', async () => {
    const { container } = await montar(<ParametrosPage />);
    await clicar(elemento<HTMLButtonElement>(linhaDaCategoria(container, 'Combustível'), 'button'));
    await escolherOpcao(seletorDe(linhaDaCategoria(container, 'Combustível'), 'Linha de relatório'), 'Manutenção');

    await clicar(botaoComTexto(linhaDaCategoria(container, 'Combustível'), 'Salvar'));

    expect(celulasDaCategoria(container, 'Combustível')[4]).toBe('Manutençãotrocar');
    expect(recado(container)).toContain('“Combustível” agora aparece em Manutenção. 71 lançamentos que estavam fora do relatório entraram.');
  });

  it('trocar não muda o aviso de categorias sem linha', async () => {
    const { container } = await montar(<ParametrosPage />);
    await clicar(elemento<HTMLButtonElement>(linhaDaCategoria(container, 'Combustível'), 'button'));

    await clicar(botaoComTexto(linhaDaCategoria(container, 'Combustível'), 'Salvar'));

    expect(container.textContent).toContain('2 categorias ativas sem linha de relatório');
  });

  it('a linha escolhida em uma categoria não vaza para a seguinte: abrir outra começa pela linha dela', async () => {
    const { container } = await montar(<ParametrosPage />);
    await clicar(elemento<HTMLButtonElement>(linhaDaCategoria(container, 'Combustível'), 'button'));
    await escolherOpcao(seletorDe(linhaDaCategoria(container, 'Combustível'), 'Linha de relatório'), 'Manutenção');

    await clicar(elemento<HTMLButtonElement>(linhaDaCategoria(container, 'Administrativo'), 'button'));

    expect(seletorDe(linhaDaCategoria(container, 'Administrativo'), 'Linha de relatório').value).toBe('Administrativo');
  });
});

describe('ParametrosPage: categoria inativa sem linha de relatório', () => {
  const semLinha = (categoria: Record<string, unknown>) => ({ ...categoria, linhaRelatorio: null });

  beforeEach(() => {
    cenario.categorias = (categorias) => categorias.map((c) => (c['codigoSistema'] === 'EMPRESTIMO_ANTIGO' ? semLinha(c) : c));
  });

  it('não entra na contagem do aviso, mas continua oferecendo Escolher linha', async () => {
    const { container } = await montar(<ParametrosPage />);

    expect(container.textContent).toContain('2 categorias ativas sem linha de relatório');
    expect(celulasDaCategoria(container, 'Empréstimo (antigo)')[4]).toBe('FaltandoEscolher linha');
  });

  it('não é destacada como as ativas, só esmaecida', async () => {
    const { container } = await montar(<ParametrosPage />);

    const linha = linhaDaCategoria(container, 'Empréstimo (antigo)');

    expect([linha.style.background, linha.style.opacity]).toEqual(['', '0.58']);
  });
});

describe('ParametrosPage: o que muda ao trocar de aba', () => {
  it('trocar de aba — fecha a edição em andamento e o recado', async () => {
    const { container } = await montar(<ParametrosPage />);
    await clicar(botaoComTexto(linhaDaCategoria(container, 'Investimento na Lojinha'), 'Escolher linha'));
    await clicar(botaoComTexto(linhaDaCategoria(container, 'Investimento na Lojinha'), 'Salvar'));
    await clicar(elemento<HTMLButtonElement>(linhaDaCategoria(container, 'Combustível'), 'button'));
    expect(recado(container)).not.toBeNull();

    await abrirUnidades(container);
    await clicar(botaoComTexto(container, 'Categorias'));

    expect(recado(container)).toBeNull();
    expect(todos(container, 'select')).toHaveLength(0);
  });

  it('as linhas já salvas continuam salvas depois de ir e voltar entre as abas', async () => {
    const { container } = await montar(<ParametrosPage />);
    await clicar(botaoComTexto(linhaDaCategoria(container, 'Investimento na Lojinha'), 'Escolher linha'));
    await clicar(botaoComTexto(linhaDaCategoria(container, 'Investimento na Lojinha'), 'Salvar'));

    await abrirUnidades(container);
    await clicar(botaoComTexto(container, 'Categorias'));

    expect(celulasDaCategoria(container, 'Investimento na Lojinha')[4]).toBe('Receita de contribuiçãotrocar');
    expect(container.textContent).toContain('1 categoria ativa sem linha de relatório');
  });

  it('fechar recado — remove o recado da tela', async () => {
    const { container } = await montar(<ParametrosPage />);
    await clicar(botaoComTexto(linhaDaCategoria(container, 'Investimento na Lojinha'), 'Escolher linha'));
    await clicar(botaoComTexto(linhaDaCategoria(container, 'Investimento na Lojinha'), 'Salvar'));

    await clicar(elemento<HTMLButtonElement>(container, 'button[aria-label="fechar recado"]'));

    expect(recado(container)).toBeNull();
  });
});

describe('ParametrosPage: aba Unidades e regimes', () => {
  it('avisa quantas unidades ativas estão sem regime e explica o que o regime governa', async () => {
    const { container } = await montar(<ParametrosPage />);

    await abrirUnidades(container);

    expect(container.textContent).toContain('2 unidades sem regime definido');
    expect(container.textContent).toContain(
      'O regime governa o vocabulário da tela, quais categorias a unidade aceita e se a receita gera obrigação fiscal. É decisão da coordenação, não do sistema — e trava o seed das unidades.',
    );
  });

  it('lista as seis unidades na ordem do plano, com código e selo de regime', async () => {
    const { container } = await montar(<ParametrosPage />);

    await abrirUnidades(container);

    const nomes = ['CDD', 'Munay', 'Lojinha', 'Chácara', 'Dormitórios', 'Pessoal'];
    expect(nomes.map((n) => cartaoDaUnidade(container, n).firstElementChild?.textContent)).toEqual([
      'CDDCDDContribuição',
      'MunayMUNAYComercialCNPJ 41.882.310/0001-55',
      'LojinhaLOJINHAComercial',
      'ChácaraCHACARARegime a confirmar',
      'DormitóriosDORMITORIOSRegime a confirmar',
      'PessoalPESSOALContribuição',
    ]);
  });

  it('o selo de regime muda de tom: comercial em azul, contribuição em verde, a confirmar em pendente', async () => {
    const { container } = await montar(<ParametrosPage />);
    await abrirUnidades(container);

    const corDoSelo = (nome: string) => {
      const selo = Array.from(cartaoDaUnidade(container, nome).firstElementChild?.children ?? []).find((c) => c.tagName === 'SPAN' && (c as HTMLElement).style.borderRadius !== '') as HTMLElement;
      return selo.style.color;
    };
    expect(['Munay', 'CDD', 'Chácara'].map(corDoSelo)).toEqual(['var(--color-royal-ink)', 'var(--color-confirmed)', COR_PENDENTE]);
  });

  it('cada unidade mostra a nota; o CNPJ só aparece para quem tem documento', async () => {
    const { container } = await montar(<ParametrosPage />);

    await abrirUnidades(container);

    expect(cartaoDaUnidade(container, 'CDD').textContent).toContain('Vocabulário de contribuição obrigatório: não se diz venda, cliente nem preço.');
    expect(cartaoDaUnidade(container, 'CDD').textContent).not.toContain('CNPJ');
    expect(cartaoDaUnidade(container, 'Munay').textContent).toContain('MEI próprio. Shows, royalties, estúdio e cerimônias contratadas.');
  });

  it('Munay — mostra o faturamento do ano contra o teto e a barra com a fração em tom de marca', async () => {
    const { container } = await montar(<ParametrosPage />);

    await abrirUnidades(container);

    const cartao = cartaoDaUnidade(container, 'Munay');
    expect(cartao.textContent).toContain('Faturamento no ano contra o teto do regime43.700,00 de 81.000,00');
    expect(cartao.textContent).toContain('O teto é parâmetro da unidade, nunca constante no código — esse valor muda por lei.');
    expect(parseFloat(faixaDoTeto(cartao)?.style.width ?? '')).toBeCloseTo(53.95, 2);
    expect(faixaDoTeto(cartao)?.style.background).toBe(COR_DA_MARCA);
  });

  it('Lojinha — tem faturamento mas não tem teto: o bloco de faturamento não aparece', async () => {
    const { container } = await montar(<ParametrosPage />);

    await abrirUnidades(container);

    expect(cartaoDaUnidade(container, 'Lojinha').textContent).not.toContain('Faturamento no ano');
    expect(container.textContent).not.toContain('28.460,00');
  });

  it('a regra da unidade aparece embaixo: centro de custo, não fronteira de segurança', async () => {
    const { container } = await montar(<ParametrosPage />);

    await abrirUnidades(container);

    expect(container.textContent).toContain(
      'Unidade é centro de custo, não fronteira de segurança. Quem isola dados é a instituição; a unidade só organiza o relatório e decide o vocabulário da tela.',
    );
  });

  it('sem unidade sem regime — o aviso não aparece', async () => {
    cenario.unidades = (unidades) => unidades.map((u) => ({ ...u, regime: u['regime'] ?? 'CONTRIBUICAO' }));
    const { container } = await montar(<ParametrosPage />);

    await abrirUnidades(container);

    expect(container.textContent).not.toContain('sem regime definido');
  });

  it('uma só unidade sem regime — o aviso usa o singular', async () => {
    cenario.unidades = (unidades) => unidades.filter((u) => u['codigoSistema'] !== 'DORMITORIOS');
    const { container } = await montar(<ParametrosPage />);

    await abrirUnidades(container);

    expect(container.textContent).toContain('1 unidade sem regime definido');
  });

  it('unidade inativa sem regime — não conta no aviso, mas continua na lista com Regime a confirmar', async () => {
    cenario.unidades = (unidades) => unidades.map((u) => (u['codigoSistema'] === 'DORMITORIOS' ? { ...u, ativa: false } : u));
    const { container } = await montar(<ParametrosPage />);

    await abrirUnidades(container);

    expect(container.textContent).toContain('1 unidade sem regime definido');
    expect(cartaoDaUnidade(container, 'Dormitórios').textContent).toContain('Regime a confirmar');
  });
});

describe('ParametrosPage: barra do teto de faturamento', () => {
  const comFaturamento = (faturado: number) => (unidades: Registros) =>
    unidades.map((u) => (u['codigoSistema'] === 'MUNAY' ? { ...u, tetoFaturamentoAnual: reais(1000), faturamentoNoAno: reais(faturado) } : u));

  it.each<{ nome: string; faturado: number; largura: number; cor: string }>([
    { nome: 'metade do teto', faturado: 500, largura: 50, cor: COR_DA_MARCA },
    { nome: 'exatamente 80% do teto', faturado: 800, largura: 80, cor: COR_DA_MARCA },
    { nome: 'um pouco acima de 80% do teto', faturado: 801, largura: 80.1, cor: COR_PENDENTE },
    { nome: 'exatamente o teto', faturado: 1000, largura: 100, cor: COR_PENDENTE },
    { nome: 'acima do teto', faturado: 1200, largura: 100, cor: COR_PENDENTE },
  ])('faturamento em $nome — a barra ocupa $largura% e fica na cor $cor', async ({ faturado, largura, cor }) => {
    cenario.unidades = comFaturamento(faturado);
    const { container } = await montar(<ParametrosPage />);

    await abrirUnidades(container);

    const faixa = faixaDoTeto(cartaoDaUnidade(container, 'Munay'));
    expect(parseFloat(faixa?.style.width ?? '')).toBeCloseTo(largura, 1);
    expect(faixa?.style.background).toBe(cor);
  });

  it('acima do teto — o texto mostra o faturamento maior que o teto, sem aviso a mais', async () => {
    cenario.unidades = comFaturamento(1200);
    const { container } = await montar(<ParametrosPage />);

    await abrirUnidades(container);

    expect(cartaoDaUnidade(container, 'Munay').textContent).toContain('1.200,00 de 1.000,00');
  });
});

describe('ParametrosPage: aba Instituição', () => {
  it('lista os seis parâmetros da casa com rótulo, valor, nota e se é editável', async () => {
    const { container } = await montar(<ParametrosPage />);

    await abrirInstituicao(container);

    const cartoes = todos<HTMLElement>(container, 'span').filter((s) => ['Instituição', 'Fuso horário', 'Moeda', 'Consumo médio por consagrante', 'Validade da anamnese', 'Dia sugerido de fechamento'].includes(s.textContent ?? '') && s.style.flex !== '');
    expect(cartoes.map((c) => c.parentElement?.parentElement?.textContent)).toEqual([
      'InstituiçãoCéu do DespertarEditarO tenant. Fronteira de isolamento de dados.',
      'Fuso horárioAmerica/Sao_Paulofixo' + 'Datas de competência e caixa seguem este fuso.',
      'MoedaBRL · realfixo' + 'Valores em centavos inteiros, nunca em ponto flutuante.',
      'Consumo médio por consagrante0,18 LEditar' +
        'Base da estimativa de consumo. O sistema sugere recalibragem pelo histórico, nunca altera sozinho (EC3, EC4).',
      'Validade da anamnese12 mesesEditar' + 'Passado o prazo, a revalidação é completa, não incremental (RA1).',
      'Dia sugerido de fechamentodia 10 do mês seguinteEditar' +
        'Sugestão, não trava: o que trava o fechamento é a fila de conferência vazia (P1).',
    ]);
  });

  it('quatro parâmetros têm o botão Editar e os dois fixos não têm', async () => {
    const { container } = await montar(<ParametrosPage />);

    await abrirInstituicao(container);

    expect(todos(container, 'button').filter((b) => b.textContent === 'Editar')).toHaveLength(4);
    expect(container.textContent).toContain('fixo');
  });

  it('Editar — não faz nada visível: nada muda na tela', async () => {
    const { container } = await montar(<ParametrosPage />);
    await abrirInstituicao(container);
    const antes = container.textContent;

    await clicar(botaoComTexto(container, 'Editar'));

    expect(container.textContent).toBe(antes);
    expect(todos(container, 'input, select, textarea')).toHaveLength(0);
  });
});

describe('ParametrosPage: densidade', () => {
  it('escritório — as abas têm altura de 40px e podem quebrar de linha', async () => {
    const { container } = await montar(<ParametrosPage />);

    expect(botaoComTexto(container, 'Categorias').style.minHeight).toBe('40px');
    expect(botaoComTexto(container, 'Categorias').parentElement?.style.flexWrap).toBe('wrap');
  });

  it('campo — as abas ocupam a largura toda lado a lado, com o alvo de toque de campo', async () => {
    fixarDensidade(true);

    const { container } = await montar(<ParametrosPage />);

    expect(botaoComTexto(container, 'Categorias').style.minHeight).toBe('var(--target-field)');
    expect(botaoComTexto(container, 'Categorias').parentElement?.style.flexWrap).toBe('nowrap');
  });

  it.each<{ campo: boolean; respiro: string }>([
    { campo: false, respiro: '18px 20px' },
    { campo: true, respiro: '15px 16px' },
  ])('cartão de unidade com campo=$campo — tem respiro de $respiro', async ({ campo, respiro }) => {
    fixarDensidade(campo);
    const { container } = await montar(<ParametrosPage />);
    await abrirUnidades(container);

    expect(cartaoDaUnidade(container, 'CDD').style.padding).toBe(respiro);
  });
});
