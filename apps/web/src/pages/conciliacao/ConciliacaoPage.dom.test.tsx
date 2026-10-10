import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { botaoComTexto, clicar, desmontarTudo, elemento, escolherOpcao, montar, todos } from '@/testes/montagem';
import { ConciliacaoPage } from './ConciliacaoPage';

const MENOS = '− ';

const TITULO_DAS_LINHAS = 'Saiu dinheiro que ninguém registrou';
const TITULO_DAS_SUGESTOES = 'Sugestões de casamento';
const TITULO_DOS_LANCAMENTOS = 'Registramos algo que não saiu do banco';

const SUGESTAO_ASSAI =
  'Alta confiançamesmo valor, mesma data, mesma conta' +
  'No bancoASSAI ATACADISTA IBIUNA02/09487,40' +
  'No sistemamercado do trabalho de setembro02/09487,40' +
  'CasarNão é o mesmo';
const SUGESTAO_POSTO =
  'Alta confiançamesmo valor, um dia de diferença' +
  'No bancoPOSTO IPIRANGA IBIUNA05/09320,00' +
  'No sistemacombustível da van04/09320,00' +
  'CasarNão é o mesmo';
const SUGESTAO_CORREIOS =
  'Média confiançamesmo valor, quatro dias de diferença' +
  'No bancoCORREIOS AGF IBIUNA30/08517,90' +
  'No sistemaenvio de camisetas da lojinha26/08517,90' +
  'CasarNão é o mesmo';

const MOTIVOS = [
  'Tarifa bancária, sem lançamento correspondente',
  'Movimentação pessoal em conta de terceiro',
  'Estorno do próprio banco',
  'Duplicidade do extrato',
];

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

const coluna = (container: HTMLElement, titulo: string) => {
  const achada = todos<HTMLElement>(container, 'section').find((s) => s.querySelector('header')?.textContent?.startsWith(titulo));
  if (!achada) throw new Error(`coluna não encontrada: ${titulo}`);
  return achada;
};

const contagemDaColuna = (container: HTMLElement, titulo: string) =>
  coluna(container, titulo).querySelector('header [data-numeric]')?.textContent;

const cartoesDaColuna = (container: HTMLElement, titulo: string) => Array.from(coluna(container, titulo).children).slice(1) as HTMLElement[];

const textosDaColuna = (container: HTMLElement, titulo: string) => cartoesDaColuna(container, titulo).map((c) => c.textContent);

const cartaoDaLinha = (container: HTMLElement, descricao: string) => {
  const achado = cartoesDaColuna(container, TITULO_DAS_LINHAS).find((c) => c.textContent?.includes(descricao));
  if (!achado) throw new Error(`linha do extrato não encontrada: ${descricao}`);
  return achado;
};

const cartaoDaSugestao = (container: HTMLElement, descricao: string) => {
  const achado = cartoesDaColuna(container, TITULO_DAS_SUGESTOES).find((c) => c.textContent?.includes(descricao));
  if (!achado) throw new Error(`sugestão não encontrada: ${descricao}`);
  return achado;
};

const indicador = (container: HTMLElement, rotulo: string) => {
  const nome = todos<HTMLSpanElement>(container, 'span').find((s) => s.textContent === rotulo && s.nextElementSibling?.hasAttribute('data-numeric'));
  return nome?.nextElementSibling?.textContent;
};

const indicadores = (container: HTMLElement) => ['Sem par', 'Sugestões', 'Conciliadas', 'Ignoradas'].map((r) => indicador(container, r));

const seletorDe = (origem: HTMLElement, rotulo: string) => {
  const etiqueta = todos<HTMLLabelElement>(origem, 'label').find((l) => l.textContent === rotulo);
  const campo = etiqueta ? document.getElementById(etiqueta.htmlFor) : null;
  if (!(campo instanceof HTMLSelectElement)) throw new Error(`seletor não encontrado: ${rotulo}`);
  return campo;
};

const recado = (container: HTMLElement) => container.querySelector('[role="status"]')?.textContent ?? null;

async function ignorarLinha(container: HTMLElement, descricao: string) {
  await clicar(botaoComTexto(cartaoDaLinha(container, descricao), 'Ignorar'));
  await clicar(botaoComTexto(cartaoDaLinha(container, descricao), 'Ignorar'));
}

describe('ConciliacaoPage: cabeçalho', () => {
  it('escritório — mostra os dois códigos por extenso, o título e o subtítulo', async () => {
    const { container } = await montar(<ConciliacaoPage />);

    const cabecalho = elemento(container, 'header');
    expect(cabecalho.textContent).toContain('F-25 e F-26 · Importação e conciliação');
    expect(elemento(cabecalho, 'h1').textContent).toBe('Conciliação');
    expect(cabecalho.textContent).toContain('O extrato é a verdade bancária; o registro é a intenção · CDD');
  });

  it('campo — mostra os dois códigos abreviados, sem subtítulo', async () => {
    fixarDensidade(true);

    const { container } = await montar(<ConciliacaoPage />);

    expect(elemento(container, 'header').textContent).toBe('F-25 · F-26Conciliação');
  });
});

describe('ConciliacaoPage: painel de importação', () => {
  it('Conta — oferece as três contas com extrato e abre na primeira', async () => {
    const { container } = await montar(<ConciliacaoPage />);

    const conta = seletorDe(container, 'Conta');

    expect(Array.from(conta.options).map((o) => [o.value, o.textContent])).toEqual([
      ['cora', 'Cora PJ'],
      ['nubank', 'Nubank Paty'],
      ['itau', 'Itaú Munay'],
    ]);
    expect(conta.value).toBe('cora');
  });

  it('o arquivo do banco aparece com o formato OFX', async () => {
    const { container } = await montar(<ConciliacaoPage />);

    expect(container.textContent).toContain('Arquivo do banco');
    expect(container.textContent).toContain('extrato-cora-2026-09.ofx');
    expect(container.textContent).toContain('OFX');
  });

  it('já abre importado — o botão se chama Reimportar e Importar extrato nunca aparece', async () => {
    const { container } = await montar(<ConciliacaoPage />);

    expect(botaoComTexto(container, 'Reimportar')).toBeDefined();
    expect(todos(container, 'button').filter((b) => b.textContent === 'Importar extrato')).toHaveLength(0);
  });

  it('resumo da importação — arquivo, período, linhas lidas e quantas já existiam', async () => {
    const { container } = await montar(<ConciliacaoPage />);

    expect(container.textContent).toContain('extrato-cora-2026-09.ofx · 01/09/2026 a 12/09/2026 · 14 linhas lidas');
    expect(container.textContent).toContain('3 já existiam e não entraram de novo');
  });

  it('Reimportar — avisa as linhas lidas e que reimportar não duplica nada, sem mexer nas listas', async () => {
    const { container } = await montar(<ConciliacaoPage />);

    await clicar(botaoComTexto(container, 'Reimportar'));

    expect(recado(container)).toContain(
      '14 linhas lidas. 3 já existiam pelo identificador do banco e não entraram de novo — reimportar o mesmo arquivo não duplica nada.',
    );
    expect(indicadores(container)).toEqual(['8', '3', '0', '0']);
  });

  it('trocar a conta — não muda o arquivo nem as colunas: continuam as linhas do Cora PJ', async () => {
    const { container } = await montar(<ConciliacaoPage />);

    await escolherOpcao(seletorDe(container, 'Conta'), 'itau');

    expect(seletorDe(container, 'Conta').value).toBe('itau');
    expect(container.textContent).toContain('extrato-cora-2026-09.ofx');
    expect(contagemDaColuna(container, TITULO_DAS_LINHAS)).toBe('5');
  });
});

describe('ConciliacaoPage: números do topo', () => {
  it('Sem par conta as linhas do banco e as sugestões, e não os lançamentos sem linha', async () => {
    const { container } = await montar(<ConciliacaoPage />);

    expect(indicadores(container)).toEqual(['8', '3', '0', '0']);
    expect(container.textContent).toContain('linhas e lançamentos a resolver');
  });

  it('as notas de cada número dizem o que ele conta', async () => {
    const { container } = await montar(<ConciliacaoPage />);

    expect(container.textContent).toContain('propostas pelo motor');
    expect(container.textContent).toContain('nesta sessão');
    expect(container.textContent).toContain('com motivo registrado');
  });
});

describe('ConciliacaoPage: coluna de linhas do banco sem lançamento', () => {
  it('lista as cinco linhas na ordem do extrato, com dia e mês, descrição e valor com sinal', async () => {
    const { container } = await montar(<ConciliacaoPage />);

    expect(contagemDaColuna(container, TITULO_DAS_LINHAS)).toBe('5');
    expect(textosDaColuna(container, TITULO_DAS_LINHAS)).toEqual([
      `03/09TRANSF PIX MARIA S SANTOS${MENOS}1.480,00Registrar lançamentoIgnorar`,
      '01/09TED RECEBIDA J R OLIVEIRA+ 2.500,00Registrar lançamentoIgnorar',
      `06/09SUPERMERCADO BOM PRECO${MENOS}230,00Registrar lançamentoIgnorar`,
      `09/09TARIFA PACOTE SERVICOS${MENOS}45,00Registrar lançamentoIgnorar`,
      `12/09NETFLIX.COM${MENOS}89,90Registrar lançamentoIgnorar`,
    ]);
  });

  it('Registrar lançamento — não faz nada visível: nada muda na tela', async () => {
    const { container } = await montar(<ConciliacaoPage />);
    const antes = container.textContent;

    await clicar(botaoComTexto(cartaoDaLinha(container, 'NETFLIX.COM'), 'Registrar lançamento'));

    expect(container.textContent).toBe(antes);
  });

  it('Ignorar — abre o motivo com as quatro opções, escolhido o primeiro, e troca os botões por Ignorar e Voltar', async () => {
    const { container } = await montar(<ConciliacaoPage />);

    await clicar(botaoComTexto(cartaoDaLinha(container, 'NETFLIX.COM'), 'Ignorar'));

    const cartao = cartaoDaLinha(container, 'NETFLIX.COM');
    const motivo = seletorDe(cartao, 'Motivo');
    expect(Array.from(motivo.options).map((o) => o.textContent)).toEqual(MOTIVOS);
    expect(motivo.value).toBe(MOTIVOS[0]);
    expect(todos(cartao, 'button').map((b) => b.textContent)).toEqual(['Ignorar', 'Voltar']);
  });

  it('Voltar — fecha o motivo e a linha volta a ter Registrar lançamento e Ignorar', async () => {
    const { container } = await montar(<ConciliacaoPage />);
    await clicar(botaoComTexto(cartaoDaLinha(container, 'NETFLIX.COM'), 'Ignorar'));

    await clicar(botaoComTexto(cartaoDaLinha(container, 'NETFLIX.COM'), 'Voltar'));

    expect(todos(cartaoDaLinha(container, 'NETFLIX.COM'), 'button').map((b) => b.textContent)).toEqual(['Registrar lançamento', 'Ignorar']);
    expect(contagemDaColuna(container, TITULO_DAS_LINHAS)).toBe('5');
  });

  it('abrir o motivo de outra linha — fecha o da primeira: só uma linha em ignorar por vez', async () => {
    const { container } = await montar(<ConciliacaoPage />);
    await clicar(botaoComTexto(cartaoDaLinha(container, 'NETFLIX.COM'), 'Ignorar'));

    await clicar(botaoComTexto(cartaoDaLinha(container, 'TARIFA PACOTE'), 'Ignorar'));

    expect(todos(cartaoDaLinha(container, 'NETFLIX.COM'), 'select')).toHaveLength(0);
    expect(todos(cartaoDaLinha(container, 'TARIFA PACOTE'), 'select')).toHaveLength(1);
  });

  it('confirmar Ignorar — tira a linha, soma uma ignorada, desconta do Sem par e registra o motivo no recado', async () => {
    const { container } = await montar(<ConciliacaoPage />);
    await clicar(botaoComTexto(cartaoDaLinha(container, 'TARIFA PACOTE'), 'Ignorar'));
    await escolherOpcao(seletorDe(cartaoDaLinha(container, 'TARIFA PACOTE'), 'Motivo'), MOTIVOS[2] as string);

    await clicar(botaoComTexto(cartaoDaLinha(container, 'TARIFA PACOTE'), 'Ignorar'));

    expect(contagemDaColuna(container, TITULO_DAS_LINHAS)).toBe('4');
    expect(container.textContent).not.toContain('TARIFA PACOTE SERVICOS');
    expect(indicadores(container)).toEqual(['7', '3', '0', '1']);
    expect(recado(container)).toContain('Linha ignorada com o motivo registrado: “Estorno do próprio banco”.');
  });

  it('o motivo escolhido fica para a próxima linha ignorada, sem voltar ao primeiro', async () => {
    const { container } = await montar(<ConciliacaoPage />);
    await clicar(botaoComTexto(cartaoDaLinha(container, 'TARIFA PACOTE'), 'Ignorar'));
    await escolherOpcao(seletorDe(cartaoDaLinha(container, 'TARIFA PACOTE'), 'Motivo'), MOTIVOS[3] as string);
    await clicar(botaoComTexto(cartaoDaLinha(container, 'TARIFA PACOTE'), 'Ignorar'));

    await clicar(botaoComTexto(cartaoDaLinha(container, 'NETFLIX.COM'), 'Ignorar'));

    expect(seletorDe(cartaoDaLinha(container, 'NETFLIX.COM'), 'Motivo').value).toBe(MOTIVOS[3]);
  });

  it('ignorar todas as linhas — troca a lista pelo estado de que nada sobrou do lado do banco', async () => {
    const { container } = await montar(<ConciliacaoPage />);

    await ignorarLinha(container, 'TRANSF PIX');
    await ignorarLinha(container, 'TED RECEBIDA');
    await ignorarLinha(container, 'SUPERMERCADO');
    await ignorarLinha(container, 'TARIFA PACOTE');
    await ignorarLinha(container, 'NETFLIX.COM');

    expect(contagemDaColuna(container, TITULO_DAS_LINHAS)).toBe('0');
    expect(coluna(container, TITULO_DAS_LINHAS).textContent).toContain('Nada sobrando do lado do banco');
    expect(coluna(container, TITULO_DAS_LINHAS).textContent).toContain('Toda linha do extrato encontrou seu par.');
    expect(indicadores(container)).toEqual(['3', '3', '0', '5']);
  });
});

describe('ConciliacaoPage: coluna de sugestões de casamento', () => {
  it('mostra as três sugestões na ordem do motor, com a força, o porquê e os dois lados', async () => {
    const { container } = await montar(<ConciliacaoPage />);

    expect(contagemDaColuna(container, TITULO_DAS_SUGESTOES)).toBe('3');
    expect(textosDaColuna(container, TITULO_DAS_SUGESTOES)).toEqual([SUGESTAO_ASSAI, SUGESTAO_POSTO, SUGESTAO_CORREIOS]);
  });

  it('Casar — tira a sugestão, soma uma conciliada e desconta do Sem par', async () => {
    const { container } = await montar(<ConciliacaoPage />);

    await clicar(botaoComTexto(cartaoDaSugestao(container, 'ASSAI'), 'Casar'));

    expect(contagemDaColuna(container, TITULO_DAS_SUGESTOES)).toBe('2');
    expect(container.textContent).not.toContain('ASSAI ATACADISTA IBIUNA');
    expect(indicadores(container)).toEqual(['7', '2', '1', '0']);
  });

  it.each<{ casada: string; ficam: string[] }>([
    { casada: 'ASSAI', ficam: [SUGESTAO_POSTO, SUGESTAO_CORREIOS] },
    { casada: 'POSTO', ficam: [SUGESTAO_ASSAI, SUGESTAO_CORREIOS] },
    { casada: 'CORREIOS', ficam: [SUGESTAO_ASSAI, SUGESTAO_POSTO] },
  ])('Casar $casada — só a casada sai da lista: as outras duas ficam, na mesma ordem', async ({ casada, ficam }) => {
    const { container } = await montar(<ConciliacaoPage />);

    await clicar(botaoComTexto(cartaoDaSugestao(container, casada), 'Casar'));

    expect(textosDaColuna(container, TITULO_DAS_SUGESTOES)).toEqual(ficam);
  });

  it('Casar — o recado diz que a data de caixa passou a ser a do extrato, com a data completa', async () => {
    const { container } = await montar(<ConciliacaoPage />);

    await clicar(botaoComTexto(cartaoDaSugestao(container, 'CORREIOS'), 'Casar'));

    expect(recado(container)).toContain(
      'Casado. A data de caixa do lançamento “envio de camisetas da lojinha” passou a ser 30/08/2026, vinda do extrato — nunca o contrário.',
    );
  });

  it('Casar — as colunas de linhas e de lançamentos ficam como estavam', async () => {
    const { container } = await montar(<ConciliacaoPage />);

    await clicar(botaoComTexto(cartaoDaSugestao(container, 'ASSAI'), 'Casar'));

    expect([contagemDaColuna(container, TITULO_DAS_LINHAS), contagemDaColuna(container, TITULO_DOS_LANCAMENTOS)]).toEqual(['5', '3']);
  });

  it('Não é o mesmo — devolve a linha para o topo da coluna do banco e o lançamento para o topo da coluna do sistema', async () => {
    const { container } = await montar(<ConciliacaoPage />);

    await clicar(botaoComTexto(cartaoDaSugestao(container, 'ASSAI'), 'Não é o mesmo'));

    expect(textosDaColuna(container, TITULO_DAS_LINHAS)[0]).toBe(`02/09ASSAI ATACADISTA IBIUNA${MENOS}487,40Registrar lançamentoIgnorar`);
    expect(textosDaColuna(container, TITULO_DOS_LANCAMENTOS)[0]).toBe(`02/09mercado do trabalho de setembro${MENOS}487,40Cora PJ · Aurio Neto`);
    expect([contagemDaColuna(container, TITULO_DAS_LINHAS), contagemDaColuna(container, TITULO_DAS_SUGESTOES), contagemDaColuna(container, TITULO_DOS_LANCAMENTOS)]).toEqual(['6', '2', '4']);
  });

  it.each<{ recusada: string; ficam: string[]; linha: string; lancamento: string }>([
    {
      recusada: 'ASSAI',
      ficam: [SUGESTAO_POSTO, SUGESTAO_CORREIOS],
      linha: `02/09ASSAI ATACADISTA IBIUNA${MENOS}487,40Registrar lançamentoIgnorar`,
      lancamento: `02/09mercado do trabalho de setembro${MENOS}487,40Cora PJ · Aurio Neto`,
    },
    {
      recusada: 'POSTO',
      ficam: [SUGESTAO_ASSAI, SUGESTAO_CORREIOS],
      linha: `05/09POSTO IPIRANGA IBIUNA${MENOS}320,00Registrar lançamentoIgnorar`,
      lancamento: `04/09combustível da van${MENOS}320,00Cora PJ · Chico Aguiar`,
    },
    {
      recusada: 'CORREIOS',
      ficam: [SUGESTAO_ASSAI, SUGESTAO_POSTO],
      linha: `30/08CORREIOS AGF IBIUNA${MENOS}517,90Registrar lançamentoIgnorar`,
      lancamento: `26/08envio de camisetas da lojinha${MENOS}517,90Cora PJ · Paty Munay`,
    },
  ])(
    'Não é o mesmo $recusada — só ela sai da lista, e a linha e o lançamento dela voltam para o topo de cada coluna',
    async ({ recusada, ficam, linha, lancamento }) => {
      const { container } = await montar(<ConciliacaoPage />);

      await clicar(botaoComTexto(cartaoDaSugestao(container, recusada), 'Não é o mesmo'));

      expect({
        sugestoes: textosDaColuna(container, TITULO_DAS_SUGESTOES),
        topoDasLinhas: textosDaColuna(container, TITULO_DAS_LINHAS)[0],
        topoDosLancamentos: textosDaColuna(container, TITULO_DOS_LANCAMENTOS)[0],
      }).toEqual({ sugestoes: ficam, topoDasLinhas: linha, topoDosLancamentos: lancamento });
    },
  );

  it('Não é o mesmo — o Sem par não muda, porque a linha volta e a sugestão sai', async () => {
    const { container } = await montar(<ConciliacaoPage />);

    await clicar(botaoComTexto(cartaoDaSugestao(container, 'ASSAI'), 'Não é o mesmo'));

    expect(indicadores(container)).toEqual(['8', '2', '0', '0']);
  });

  it('Não é o mesmo — o recado diz que os dois voltaram para as colunas de quem está sem par', async () => {
    const { container } = await montar(<ConciliacaoPage />);

    await clicar(botaoComTexto(cartaoDaSugestao(container, 'POSTO'), 'Não é o mesmo'));

    expect(recado(container)).toContain('Sugestão recusada. Os dois voltaram para as colunas de quem está sem par.');
  });

  it('a linha devolvida pode ser ignorada como qualquer outra', async () => {
    const { container } = await montar(<ConciliacaoPage />);
    await clicar(botaoComTexto(cartaoDaSugestao(container, 'ASSAI'), 'Não é o mesmo'));

    await clicar(botaoComTexto(cartaoDaLinha(container, 'ASSAI'), 'Ignorar'));

    expect(todos(cartaoDaLinha(container, 'ASSAI'), 'select')).toHaveLength(1);
  });

  it('casar as três — troca a lista pelo estado de que nenhuma sugestão está aberta', async () => {
    const { container } = await montar(<ConciliacaoPage />);

    await clicar(botaoComTexto(cartaoDaSugestao(container, 'ASSAI'), 'Casar'));
    await clicar(botaoComTexto(cartaoDaSugestao(container, 'POSTO'), 'Casar'));
    await clicar(botaoComTexto(cartaoDaSugestao(container, 'CORREIOS'), 'Casar'));

    expect(coluna(container, TITULO_DAS_SUGESTOES).textContent).toContain('Nenhuma sugestão aberta');
    expect(coluna(container, TITULO_DAS_SUGESTOES).textContent).toContain('O motor não encontra mais pares prováveis.');
    expect(indicadores(container)).toEqual(['5', '0', '3', '0']);
  });

  it('um novo recado troca o anterior, e fechar recado o remove', async () => {
    const { container } = await montar(<ConciliacaoPage />);
    await clicar(botaoComTexto(cartaoDaSugestao(container, 'ASSAI'), 'Casar'));
    await clicar(botaoComTexto(cartaoDaSugestao(container, 'POSTO'), 'Não é o mesmo'));

    expect(todos(container, '[role="status"]')).toHaveLength(1);
    expect(recado(container)).toContain('Sugestão recusada');

    await clicar(elemento<HTMLButtonElement>(container, 'button[aria-label="fechar recado"]'));

    expect(recado(container)).toBeNull();
  });
});

describe('ConciliacaoPage: coluna de lançamentos sem linha no banco', () => {
  it('lista os três lançamentos com dia e mês, motivo, sinal pela natureza, conta e quem registrou', async () => {
    const { container } = await montar(<ConciliacaoPage />);

    expect(contagemDaColuna(container, TITULO_DOS_LANCAMENTOS)).toBe('3');
    expect(textosDaColuna(container, TITULO_DOS_LANCAMENTOS)).toEqual([
      `28/08mercado cerimônia mãe divina${MENOS}187,40Cora PJ · Aurio Neto`,
      '22/08venda de camisetas na lojinha+ 285,00Cora PJ · Paty Munay',
      `05/09diesel do caminhão${MENOS}370,70Cora PJ · Chico Aguiar`,
    ]);
  });

  it('não tem nenhuma ação: nem botão nem campo', async () => {
    const { container } = await montar(<ConciliacaoPage />);

    expect(todos(coluna(container, TITULO_DOS_LANCAMENTOS), 'button')).toHaveLength(0);
  });
});

describe('ConciliacaoPage: explicações das colunas', () => {
  it.each<{ titulo: string; nota: string }>([
    {
      titulo: TITULO_DAS_LINHAS,
      nota: 'Linhas do banco sem lançamento correspondente. É o problema de omissão saindo da invisibilidade.',
    },
    {
      titulo: TITULO_DAS_SUGESTOES,
      nota: 'Por valor, proximidade de data e conta. O sistema propõe; quem confirma é você.',
    },
    {
      titulo: TITULO_DOS_LANCAMENTOS,
      nota: 'Lançamentos que o extrato não confirma. Pode ser espécie, cartão, ou erro de conta.',
    },
  ])('coluna "$titulo" — explica o que ela mostra', async ({ titulo, nota }) => {
    const { container } = await montar(<ConciliacaoPage />);

    expect(coluna(container, titulo).querySelector('header')?.textContent).toContain(nota);
  });
});

describe('ConciliacaoPage: densidade', () => {
  it('escritório — o botão Reimportar tem o alvo de escritório', async () => {
    const { container } = await montar(<ConciliacaoPage />);

    expect(botaoComTexto(container, 'Reimportar').style.minHeight).toBe('var(--target-office)');
  });

  it('campo — só o Reimportar passa para o alvo de campo; Casar e Ignorar ficam no de escritório', async () => {
    fixarDensidade(true);

    const { container } = await montar(<ConciliacaoPage />);

    expect(botaoComTexto(container, 'Reimportar').style.minHeight).toBe('var(--target-field)');
    expect(botaoComTexto(cartaoDaSugestao(container, 'ASSAI'), 'Casar').style.minHeight).toBe('var(--target-office)');
    expect(botaoComTexto(cartaoDaLinha(container, 'NETFLIX.COM'), 'Ignorar').style.minHeight).toBe('var(--target-office)');
  });

  it('campo — mostra as mesmas colunas e contagens', async () => {
    fixarDensidade(true);

    const { container } = await montar(<ConciliacaoPage />);

    expect([TITULO_DAS_LINHAS, TITULO_DAS_SUGESTOES, TITULO_DOS_LANCAMENTOS].map((t) => contagemDaColuna(container, t))).toEqual(['5', '3', '3']);
    expect(indicadores(container)).toEqual(['8', '3', '0', '0']);
  });
});
