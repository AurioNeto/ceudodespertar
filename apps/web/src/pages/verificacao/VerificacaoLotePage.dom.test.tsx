import type { ItemNaFila } from '@cdd/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { botaoComTexto, clicar, desmontarTudo, digitar, elemento, montar, todos } from '@/testes/montagem';
import { VerificacaoLotePage } from './VerificacaoLotePage';
import {
  SINAL_DE_ENTRADA,
  SINAL_DE_SAIDA,
  campoComRotulo,
  digitarNaCaixa,
  usarDensidade,
} from './apoioDeTeste';

type Transformacao = (lista: readonly ItemNaFila[]) => readonly ItemNaFila[];

const fila = vi.hoisted(() => ({ transformar: ((lista) => lista) as Transformacao }));
vi.mock('../../mocks/verificacao', async (importarOriginal) => {
  const original = await importarOriginal<{ filaDeVerificacaoInicial: readonly ItemNaFila[] }>();
  return {
    ...original,
    get filaDeVerificacaoInicial() {
      return fila.transformar(original.filaDeVerificacaoInicial);
    },
  };
});

const MOTIVOS_DA_FILA = [
  'mercado cerimônia mãe divina',
  'Enel — conta de luz',
  'gasolina para buscar mantimentos',
  'ração e vermífugo dos cavalos',
  'PIX recebido — Antônio Vieira',
  'venda de camisetas na lojinha',
  'garrafas e rótulos para o feitio',
  'TED — Hidro Serviços',
  'diarista pós-cerimônia',
  'recarga de extintor e suporte',
  'Transferência recebida do Nubank Paty',
  'contribuições da cerimônia de agosto',
];

const MOTIVOS_DE_ALTA_CONFIANCA = [
  'mercado cerimônia mãe divina',
  'Enel — conta de luz',
  'venda de camisetas na lojinha',
  'diarista pós-cerimônia',
  'recarga de extintor e suporte',
  'Transferência recebida do Nubank Paty',
];

const MOTIVOS_SEM_ALTA_CONFIANCA = [
  'gasolina para buscar mantimentos',
  'ração e vermífugo dos cavalos',
  'PIX recebido — Antônio Vieira',
  'garrafas e rótulos para o feitio',
  'TED — Hidro Serviços',
  'contribuições da cerimônia de agosto',
];

const FILA_INICIAL = [
  ['mercado cerimônia mãe divina', '28/08/2026 · Foto de comprovante · Lucia Prado · Alimentação de cerimônia', 'Alta confiança', `${SINAL_DE_SAIDA}187,40`],
  ['Enel — conta de luz', '12/08/2026 · Extrato bancário · importado · Administrativo', 'Alta confiança', `${SINAL_DE_SAIDA}738,15`],
  ['gasolina para buscar mantimentos', '19/08/2026 · Registro rápido · Chico Aguiar · Transporte', 'Média confiança', `${SINAL_DE_SAIDA}65,00`],
  ['ração e vermífugo dos cavalos', '20/08/2026 · Foto de comprovante · Chico Aguiar · Animais', 'Média confiança', `${SINAL_DE_SAIDA}128,90`],
  ['PIX recebido — Antônio Vieira', '15/08/2026 · Extrato bancário · importado · Doações', 'Baixa confiança', `${SINAL_DE_ENTRADA}3.000,00`],
  ['venda de camisetas na lojinha', '22/08/2026 · Registro rápido · Paty Munay · Vendas', 'Alta confiança', `${SINAL_DE_ENTRADA}285,00`],
  ['garrafas e rótulos para o feitio', '18/08/2026 · Foto de comprovante · Lucia Prado · Insumos de feitio', 'Baixa confiança', `${SINAL_DE_SAIDA}412,60`],
  ['TED — Hidro Serviços', '21/07/2026 · Extrato bancário · importado · Manutenção', 'Média confiança', `${SINAL_DE_SAIDA}890,00`],
  ['diarista pós-cerimônia', '31/07/2026 · Registro rápido · Lucia Prado · Administrativo', 'Alta confiança', `${SINAL_DE_SAIDA}340,00`],
  ['recarga de extintor e suporte', '24/08/2026 · Foto de comprovante · Paty Munay · Administrativo', 'Alta confiança', `${SINAL_DE_SAIDA}135,00`],
  ['Transferência recebida do Nubank Paty', '23/08/2026 · Extrato bancário · importado · Nubank Paty → Cora PJ', 'Alta confiança', '1.500,00'],
  ['contribuições da cerimônia de agosto', '24/08/2026 · Registro rápido · Frei Tobias · Contribuições', 'Média confiança', `${SINAL_DE_ENTRADA}940,00`],
];

beforeEach(() => {
  fila.transformar = (lista) => lista;
  usarDensidade('office');
});

afterEach(async () => {
  await desmontarTudo();
  vi.unstubAllGlobals();
});

const caixasDeLinha = (container: HTMLElement) =>
  todos<HTMLInputElement>(container, 'input[type="checkbox"][aria-label^="selecionar "]');

const linhasDaFila = (container: HTMLElement) => caixasDeLinha(container).map((caixa) => caixa.parentElement as HTMLElement);

const lerLinha = (linha: HTMLElement) => [
  linha.children[2]?.children[0]?.textContent,
  linha.children[2]?.children[1]?.textContent,
  linha.children[3]?.textContent,
  linha.children[4]?.textContent,
];

const tabelaDaFila = (container: HTMLElement) => linhasDaFila(container).map(lerLinha);
const motivosDaFila = (container: HTMLElement) => tabelaDaFila(container).map((linha) => linha[0]);

const linhaDoMotivo = (container: HTMLElement, motivo: string) => {
  const achada = linhasDaFila(container).find((linha) => lerLinha(linha)[0] === motivo);
  if (!achada) throw new Error(`linha não encontrada: ${motivo}`);
  return achada;
};

const marcar = (container: HTMLElement, motivo: string) =>
  clicar(elemento<HTMLInputElement>(linhaDoMotivo(container, motivo), 'input[type="checkbox"]'));

const marcarVarios = (container: HTMLElement, motivos: readonly string[]) =>
  motivos.reduce<Promise<void>>((anterior, motivo) => anterior.then(() => marcar(container, motivo)), Promise.resolve());

const caixaDeTodos = (container: HTMLElement) =>
  todos<HTMLInputElement>(container, 'input[type="checkbox"]').find((caixa) => !caixa.hasAttribute('aria-label'));

const filtrosDeOrigem = (container: HTMLElement) =>
  ['Todas', 'Comprovantes', 'Extrato', 'Registro rápido'].map((rotulo) => {
    const botao = todos<HTMLButtonElement>(container, 'button').find((candidato) => candidato.textContent?.startsWith(`${rotulo} (`));
    return [botao?.textContent, botao?.ariaPressed];
  });

const escolherFiltro = (container: HTMLElement, rotulo: string) => {
  const botao = todos<HTMLButtonElement>(container, 'button').find((candidato) => candidato.textContent?.startsWith(`${rotulo} (`));
  if (!botao) throw new Error(`filtro não encontrado: ${rotulo}`);
  return clicar(botao);
};

const mensagem = (container: HTMLElement) =>
  container.querySelector('button[aria-label="fechar aviso"]')?.previousElementSibling?.textContent ?? null;

const rotuloDaSelecao = (container: HTMLElement) =>
  todos(container, 'span').find((trecho) => /^\d+ selecionados?$/.test(trecho.textContent ?? ''))?.textContent ?? null;

const contagemDaFila = (container: HTMLElement) =>
  todos(container, 'span').find((trecho) => /(item na fila|itens na fila)$/.test(trecho.textContent ?? ''))?.textContent ?? null;

const botaoDeAltaConfianca = (container: HTMLElement) =>
  todos<HTMLButtonElement>(container, 'button').find((botao) => botao.textContent?.startsWith('Aprovar todos de alta confiança'));

const aprovarSelecionados = (container: HTMLElement) => clicar(botaoComTexto(container, 'Aprovar selecionados'));
const aprovarAltaConfianca = (container: HTMLElement) => clicar(botaoDeAltaConfianca(container) as HTMLButtonElement);
const revisar = (container: HTMLElement, motivo: string) => clicar(botaoComTexto(linhaDoMotivo(container, motivo), 'Revisar'));
const painelAberto = (container: HTMLElement) =>
  todos(container, 'span').some((trecho) => trecho.textContent === 'Revisar lançamento');
const aprovarNoPainel = (container: HTMLElement) => clicar(botaoComTexto(container, 'Aprovar e consolidar'));

describe('VerificacaoLotePage: cabeçalho e linhas da fila', () => {
  it('escritório — o cabeçalho traz o código F-05 (Doc 4: F-03 é a Fila de conferência), o título e o subtítulo', async () => {
    const { container } = await montar(<VerificacaoLotePage />);

    expect(elemento(container, 'header').textContent).toBe(
      'F-05 · Verificação de loteVerificação de loteO que a captura automática propôs, esperando uma pessoa confirmar · só Tesouraria e administradores',
    );
  });

  it('campo — o cabeçalho traz só o código F-05 e o título', async () => {
    usarDensidade('field');
    const { container } = await montar(<VerificacaoLotePage />);

    expect(elemento(container, 'header').textContent).toBe('F-05Verificação de lote');
  });

  it('escritório — as doze linhas da fila, na ordem do mock, com data, origem, remetente, categoria, confiança e valor', async () => {
    const { container } = await montar(<VerificacaoLotePage />);

    expect(tabelaDaFila(container)).toEqual(FILA_INICIAL);
  });

  it('campo — as mesmas doze linhas, com o mesmo conteúdo', async () => {
    usarDensidade('field');
    const { container } = await montar(<VerificacaoLotePage />);

    expect(tabelaDaFila(container)).toEqual(FILA_INICIAL);
  });

  it('a transferência — a meta mostra origem e destino no lugar da categoria, e o valor não leva sinal', async () => {
    const { container } = await montar(<VerificacaoLotePage />);

    const linha = lerLinha(linhaDoMotivo(container, 'Transferência recebida do Nubank Paty'));

    expect(linha[1]).toContain('Nubank Paty → Cora PJ');
    expect(linha[3]).toBe('1.500,00');
  });

  it('item sem categoria — a meta da linha diz sem categoria', async () => {
    fila.transformar = (lista) => lista.map((item) => (item.id === lista[0]?.id ? { ...item, categoria: null } : item));
    const { container } = await montar(<VerificacaoLotePage />);

    expect(tabelaDaFila(container)[0]?.[1]).toBe('28/08/2026 · Foto de comprovante · Lucia Prado · sem categoria');
  });

  it('cada linha tem uma caixa de seleção com o nome do motivo, o botão do motivo e o botão Revisar', async () => {
    const { container } = await montar(<VerificacaoLotePage />);

    const linha = linhaDoMotivo(container, 'Enel — conta de luz');

    expect(elemento<HTMLInputElement>(linha, 'input').getAttribute('aria-label')).toBe('selecionar Enel — conta de luz');
    expect(botaoComTexto(linha, 'Revisar')).toBeDefined();
    expect(todos(linha, 'button')).toHaveLength(2);
  });

  it('escritório — mostra quantos itens estão na fila; em campo, não', async () => {
    const escritorio = await montar(<VerificacaoLotePage />);
    const noEscritorio = contagemDaFila(escritorio.container);
    await escritorio.desmontar();
    usarDensidade('field');
    const campo = await montar(<VerificacaoLotePage />);

    expect(noEscritorio).toBe('12 itens na fila');
    expect(contagemDaFila(campo.container)).toBeNull();
  });

  it('a fila traz lançamentos de julho, período que a tela de registro dá por fechado desde 05/08', async () => {
    const { container } = await montar(<VerificacaoLotePage />);

    const datas = tabelaDaFila(container).map((linha) => (linha[1] as string).slice(0, 10));

    expect(datas.filter((data) => data.endsWith('/07/2026'))).toEqual(['21/07/2026', '31/07/2026']);
  });
});

describe('VerificacaoLotePage: filtro por origem', () => {
  it('estado inicial — Todas marcada, com a contagem de cada origem', async () => {
    const { container } = await montar(<VerificacaoLotePage />);

    expect(filtrosDeOrigem(container)).toEqual([
      ['Todas (12)', 'true'],
      ['Comprovantes (4)', 'false'],
      ['Extrato (4)', 'false'],
      ['Registro rápido (4)', 'false'],
    ]);
  });

  it.each([
    {
      filtro: 'Comprovantes',
      motivos: ['mercado cerimônia mãe divina', 'ração e vermífugo dos cavalos', 'garrafas e rótulos para o feitio', 'recarga de extintor e suporte'],
    },
    {
      filtro: 'Extrato',
      motivos: ['Enel — conta de luz', 'PIX recebido — Antônio Vieira', 'TED — Hidro Serviços', 'Transferência recebida do Nubank Paty'],
    },
    {
      filtro: 'Registro rápido',
      motivos: ['gasolina para buscar mantimentos', 'venda de camisetas na lojinha', 'diarista pós-cerimônia', 'contribuições da cerimônia de agosto'],
    },
  ])('filtro $filtro — mostra só as linhas dessa origem, marca o filtro e diz 4 itens na fila', async ({ filtro, motivos }) => {
    const { container } = await montar(<VerificacaoLotePage />);

    await escolherFiltro(container, filtro);

    expect(motivosDaFila(container)).toEqual(motivos);
    expect(filtrosDeOrigem(container).filter(([, marcado]) => marcado === 'true')).toHaveLength(1);
    expect(contagemDaFila(container)).toBe('4 itens na fila');
  });

  it('filtro Extrato e depois Todas — a fila volta inteira', async () => {
    const { container } = await montar(<VerificacaoLotePage />);
    await escolherFiltro(container, 'Extrato');

    await escolherFiltro(container, 'Todas');

    expect(motivosDaFila(container)).toEqual(MOTIVOS_DA_FILA);
  });

  it('um só item na fila filtrada — o texto usa o singular', async () => {
    const { container } = await montar(<VerificacaoLotePage />);
    await escolherFiltro(container, 'Extrato');
    await clicar(caixaDeTodos(container) as HTMLInputElement);
    await marcar(container, 'Enel — conta de luz');
    await aprovarSelecionados(container);

    expect(contagemDaFila(container)).toBe('1 item na fila');
  });
});

describe('VerificacaoLotePage: seleção', () => {
  it('sem seleção — não há barra de seleção', async () => {
    const { container } = await montar(<VerificacaoLotePage />);

    expect(rotuloDaSelecao(container)).toBeNull();
    expect(container.textContent).not.toContain('Aprovar selecionados');
  });

  it('marcar uma linha — a barra diz 1 selecionado e a linha fica marcada; desmarcar tira a barra', async () => {
    const { container } = await montar(<VerificacaoLotePage />);

    await marcar(container, 'Enel — conta de luz');
    const marcada = caixasDeLinha(container).filter((caixa) => caixa.checked).map((caixa) => caixa.getAttribute('aria-label'));
    const rotuloComUma = rotuloDaSelecao(container);
    await marcar(container, 'Enel — conta de luz');

    expect(marcada).toEqual(['selecionar Enel — conta de luz']);
    expect(rotuloComUma).toBe('1 selecionado');
    expect(rotuloDaSelecao(container)).toBeNull();
  });

  it('marcar duas linhas — a barra diz 2 selecionados', async () => {
    const { container } = await montar(<VerificacaoLotePage />);

    await marcarVarios(container, ['Enel — conta de luz', 'diarista pós-cerimônia']);

    expect(rotuloDaSelecao(container)).toBe('2 selecionados');
  });

  it('Selecionar todos visíveis — marca as doze linhas e a própria caixa', async () => {
    const { container } = await montar(<VerificacaoLotePage />);

    await clicar(caixaDeTodos(container) as HTMLInputElement);

    expect(rotuloDaSelecao(container)).toBe('12 selecionados');
    expect(caixasDeLinha(container).every((caixa) => caixa.checked)).toBe(true);
    expect((caixaDeTodos(container) as HTMLInputElement).checked).toBe(true);
  });

  it('Selecionar todos visíveis com filtro — marca só as visíveis', async () => {
    const { container } = await montar(<VerificacaoLotePage />);
    await escolherFiltro(container, 'Extrato');

    await clicar(caixaDeTodos(container) as HTMLInputElement);

    expect(rotuloDaSelecao(container)).toBe('4 selecionados');
  });

  it('uma só linha marcada — a caixa de todos continua desmarcada, e tocar nela marca as doze', async () => {
    const { container } = await montar(<VerificacaoLotePage />);
    await marcar(container, 'Enel — conta de luz');
    const antes = (caixaDeTodos(container) as HTMLInputElement).checked;

    await clicar(caixaDeTodos(container) as HTMLInputElement);

    expect(antes).toBe(false);
    expect(rotuloDaSelecao(container)).toBe('12 selecionados');
  });

  it('todas visíveis marcadas à mão — a caixa de todos marca sozinha', async () => {
    const { container } = await montar(<VerificacaoLotePage />);
    await escolherFiltro(container, 'Extrato');

    await marcarVarios(container, motivosDaFila(container) as string[]);

    expect((caixaDeTodos(container) as HTMLInputElement).checked).toBe(true);
  });

  it('Selecionar todos visíveis com uma seleção escondida pelo filtro — troca a seleção: a linha escondida sai dela', async () => {
    const { container } = await montar(<VerificacaoLotePage />);
    await marcar(container, 'mercado cerimônia mãe divina');
    await escolherFiltro(container, 'Extrato');

    await clicar(caixaDeTodos(container) as HTMLInputElement);

    expect(rotuloDaSelecao(container)).toBe('4 selecionados');
  });

  it('desmarcar a caixa de todos — limpa a seleção inteira, inclusive o que o filtro esconde', async () => {
    const { container } = await montar(<VerificacaoLotePage />);
    await marcar(container, 'mercado cerimônia mãe divina');
    await escolherFiltro(container, 'Extrato');
    await marcarVarios(container, motivosDaFila(container) as string[]);
    const comEscondido = rotuloDaSelecao(container);

    await clicar(caixaDeTodos(container) as HTMLInputElement);

    expect(comEscondido).toBe('5 selecionados');
    expect(rotuloDaSelecao(container)).toBeNull();
  });

  it('selecionar e trocar de filtro — a seleção continua contada, mesmo das linhas que sumiram da tela', async () => {
    const { container } = await montar(<VerificacaoLotePage />);
    await marcar(container, 'mercado cerimônia mãe divina');

    await escolherFiltro(container, 'Extrato');

    expect(rotuloDaSelecao(container)).toBe('1 selecionado');
    expect(caixasDeLinha(container).some((caixa) => caixa.checked)).toBe(false);
    expect((caixaDeTodos(container) as HTMLInputElement).checked).toBe(false);
  });

  it('Limpar seleção — desmarca tudo e some a barra', async () => {
    const { container } = await montar(<VerificacaoLotePage />);
    await marcarVarios(container, ['Enel — conta de luz', 'diarista pós-cerimônia']);

    await clicar(botaoComTexto(container, 'Limpar seleção'));

    expect(rotuloDaSelecao(container)).toBeNull();
    expect(caixasDeLinha(container).some((caixa) => caixa.checked)).toBe(false);
  });
});

describe('VerificacaoLotePage: aprovar os selecionados', () => {
  it('um selecionado — sai da fila e o aviso diz 1 lançamento aprovado e consolidado', async () => {
    const { container } = await montar(<VerificacaoLotePage />);
    await marcar(container, 'Enel — conta de luz');

    await aprovarSelecionados(container);

    expect(motivosDaFila(container)).toEqual(MOTIVOS_DA_FILA.filter((motivo) => motivo !== 'Enel — conta de luz'));
    expect(mensagem(container)).toBe('1 lançamento aprovado e consolidado.');
    expect(rotuloDaSelecao(container)).toBeNull();
  });

  it('três selecionados — saem da fila e o aviso vai ao plural', async () => {
    const { container } = await montar(<VerificacaoLotePage />);
    await marcarVarios(container, ['Enel — conta de luz', 'diarista pós-cerimônia', 'TED — Hidro Serviços']);

    await aprovarSelecionados(container);

    expect(mensagem(container)).toBe('3 lançamentos aprovados e consolidados.');
    expect(filtrosDeOrigem(container)[0]).toEqual(['Todas (9)', 'true']);
    expect(contagemDaFila(container)).toBe('9 itens na fila');
  });

  it('as contagens dos filtros — acompanham o que saiu', async () => {
    const { container } = await montar(<VerificacaoLotePage />);
    await marcarVarios(container, ['Enel — conta de luz', 'TED — Hidro Serviços']);

    await aprovarSelecionados(container);

    expect(filtrosDeOrigem(container).map(([texto]) => texto)).toEqual([
      'Todas (10)',
      'Comprovantes (4)',
      'Extrato (2)',
      'Registro rápido (4)',
    ]);
  });

  it('seleção escondida pelo filtro — Aprovar selecionados aprova também o que a tela não mostra', async () => {
    const { container } = await montar(<VerificacaoLotePage />);
    await marcar(container, 'mercado cerimônia mãe divina');
    await escolherFiltro(container, 'Extrato');

    await aprovarSelecionados(container);
    await escolherFiltro(container, 'Todas');

    expect(motivosDaFila(container)).not.toContain('mercado cerimônia mãe divina');
    expect(mensagem(container)).toBe('1 lançamento aprovado e consolidado.');
  });

  it('todos os doze — esvazia a fila, mostra o estado vazio e some a linha de selecionar todos', async () => {
    const { container } = await montar(<VerificacaoLotePage />);
    await clicar(caixaDeTodos(container) as HTMLInputElement);

    await aprovarSelecionados(container);

    expect(mensagem(container)).toBe('12 lançamentos aprovados e consolidados.');
    expect(container.textContent).toContain('Nada nessa fila');
    expect(caixaDeTodos(container)).toBeUndefined();
    expect(botaoDeAltaConfianca(container)).toBeUndefined();
  });

  it('o aviso — fecha pelo botão e é trocado pelo da próxima aprovação', async () => {
    const { container } = await montar(<VerificacaoLotePage />);
    await marcar(container, 'Enel — conta de luz');
    await aprovarSelecionados(container);
    const primeiro = mensagem(container);
    await marcar(container, 'diarista pós-cerimônia');
    await marcarVarios(container, ['TED — Hidro Serviços']);
    await aprovarSelecionados(container);
    const segundo = mensagem(container);

    await clicar(elemento(container, 'button[aria-label="fechar aviso"]'));

    expect(primeiro).toBe('1 lançamento aprovado e consolidado.');
    expect(segundo).toBe('2 lançamentos aprovados e consolidados.');
    expect(mensagem(container)).toBeNull();
  });

  it('o aviso — continua ao trocar de filtro', async () => {
    const { container } = await montar(<VerificacaoLotePage />);
    await marcar(container, 'Enel — conta de luz');
    await aprovarSelecionados(container);

    await escolherFiltro(container, 'Comprovantes');

    expect(mensagem(container)).toBe('1 lançamento aprovado e consolidado.');
  });
});

describe('VerificacaoLotePage: aprovar todos de alta confiança', () => {
  it('o botão mostra quantos são de alta confiança e está ligado', async () => {
    const { container } = await montar(<VerificacaoLotePage />);

    const botao = botaoDeAltaConfianca(container) as HTMLButtonElement;

    expect(botao.textContent).toBe('Aprovar todos de alta confiança (6)');
    expect(botao.disabled).toBe(false);
  });

  it('clicar — tira da fila as seis de alta confiança, sem exigir seleção, e o aviso conta', async () => {
    const { container } = await montar(<VerificacaoLotePage />);

    await aprovarAltaConfianca(container);

    expect(motivosDaFila(container)).toEqual(MOTIVOS_SEM_ALTA_CONFIANCA);
    expect(mensagem(container)).toBe('6 lançamentos de alta confiança aprovados.');
  });

  it('sem nenhuma de alta confiança — o botão mostra (0) e fica desligado', async () => {
    const { container } = await montar(<VerificacaoLotePage />);
    await aprovarAltaConfianca(container);

    const botao = botaoDeAltaConfianca(container) as HTMLButtonElement;

    expect(botao.textContent).toBe('Aprovar todos de alta confiança (0)');
    expect(botao.disabled).toBe(true);
  });

  it('com o filtro Extrato — aprova as de alta confiança de todas as origens, não só as visíveis', async () => {
    const { container } = await montar(<VerificacaoLotePage />);
    await escolherFiltro(container, 'Extrato');

    await aprovarAltaConfianca(container);
    const doExtrato = motivosDaFila(container);
    await escolherFiltro(container, 'Todas');

    expect(doExtrato).toEqual(['PIX recebido — Antônio Vieira', 'TED — Hidro Serviços']);
    expect(motivosDaFila(container)).toEqual(MOTIVOS_SEM_ALTA_CONFIANCA);
  });

  it('inclui os lançamentos de julho, de período fechado — o diarista de 31/07 é consolidado em lote (Doc 2, L5)', async () => {
    const { container } = await montar(<VerificacaoLotePage />);

    await aprovarAltaConfianca(container);

    expect(motivosDaFila(container)).not.toContain('diarista pós-cerimônia');
  });

  it('com uma restante — o aviso usa o singular', async () => {
    const { container } = await montar(<VerificacaoLotePage />);
    await marcarVarios(container, MOTIVOS_DE_ALTA_CONFIANCA.slice(1));
    await aprovarSelecionados(container);
    const rotuloDoBotao = (botaoDeAltaConfianca(container) as HTMLButtonElement).textContent;

    await aprovarAltaConfianca(container);

    expect(rotuloDoBotao).toBe('Aprovar todos de alta confiança (1)');
    expect(mensagem(container)).toBe('1 lançamento de alta confiança aprovado.');
  });

  it('com seleção de uma de alta e uma de média — a de alta sai da seleção junto, e a de média continua selecionada', async () => {
    const { container } = await montar(<VerificacaoLotePage />);
    await marcarVarios(container, ['mercado cerimônia mãe divina', 'gasolina para buscar mantimentos']);

    await aprovarAltaConfianca(container);

    expect(rotuloDaSelecao(container)).toBe('1 selecionado');
    expect(caixasDeLinha(container).filter((caixa) => caixa.checked).map((caixa) => caixa.getAttribute('aria-label'))).toEqual([
      'selecionar gasolina para buscar mantimentos',
    ]);
  });
});

describe('VerificacaoLotePage: fila vazia', () => {
  it('filtro sem itens com o resto da fila cheio — diz que tudo foi conferido, mesmo havendo itens em outras origens', async () => {
    const { container } = await montar(<VerificacaoLotePage />);
    await escolherFiltro(container, 'Comprovantes');
    await clicar(caixaDeTodos(container) as HTMLInputElement);
    await aprovarSelecionados(container);

    expect(container.textContent).toContain('Nada nessa fila');
    expect(container.textContent).toContain('Tudo que chegou pela captura automática já foi conferido.');
    expect(filtrosDeOrigem(container).slice(0, 2)).toEqual([
      ['Todas (8)', 'false'],
      ['Comprovantes (0)', 'true'],
    ]);
  });

  it('fila inteira vazia — os quatro filtros mostram (0) e a contagem diz 0 itens na fila', async () => {
    const { container } = await montar(<VerificacaoLotePage />);
    await clicar(caixaDeTodos(container) as HTMLInputElement);
    await aprovarSelecionados(container);

    expect(filtrosDeOrigem(container).map(([texto]) => texto)).toEqual([
      'Todas (0)',
      'Comprovantes (0)',
      'Extrato (0)',
      'Registro rápido (0)',
    ]);
    expect(contagemDaFila(container)).toBe('0 itens na fila');
  });
});

describe('VerificacaoLotePage: revisão pelo painel', () => {
  it('Revisar — abre o painel com os campos do item', async () => {
    const { container } = await montar(<VerificacaoLotePage />);

    await revisar(container, 'Enel — conta de luz');

    expect(painelAberto(container)).toBe(true);
    expect(campoComRotulo(container, 'Quanto foi').value).toBe('738,15');
    expect(campoComRotulo(container, 'O que foi').value).toBe('Enel — conta de luz');
    expect(container.textContent).toContain('Extrato bancário · importado do banco · 12/08/2026');
  });

  it('tocar no motivo da linha — abre o mesmo painel', async () => {
    const { container } = await montar(<VerificacaoLotePage />);
    const botaoDoMotivo = elemento<HTMLButtonElement>(linhaDoMotivo(container, 'diarista pós-cerimônia'), 'button');

    await clicar(botaoDoMotivo);

    expect(painelAberto(container)).toBe(true);
    expect(campoComRotulo(container, 'O que foi').value).toBe('diarista pós-cerimônia');
  });

  it('aprovar no painel — o item sai da fila, o painel fecha e o aviso diz aprovado e consolidado', async () => {
    const { container } = await montar(<VerificacaoLotePage />);
    await revisar(container, 'Enel — conta de luz');

    await aprovarNoPainel(container);

    expect(painelAberto(container)).toBe(false);
    expect(motivosDaFila(container)).not.toContain('Enel — conta de luz');
    expect(mensagem(container)).toBe('Lançamento aprovado e consolidado.');
    expect(filtrosDeOrigem(container)[0]).toEqual(['Todas (11)', 'true']);
  });

  it('aprovar com o valor corrigido — a fila só perde a linha: o valor corrigido não aparece em lugar nenhum', async () => {
    const { container } = await montar(<VerificacaoLotePage />);
    await revisar(container, 'Enel — conta de luz');
    await digitar(campoComRotulo(container, 'Quanto foi'), '999,99');

    await aprovarNoPainel(container);

    expect(container.textContent).not.toContain('999,99');
    expect(tabelaDaFila(container)).toEqual(FILA_INICIAL.filter((linha) => linha[0] !== 'Enel — conta de luz'));
  });

  it('aprovar no painel um item selecionado — ele sai também da seleção', async () => {
    const { container } = await montar(<VerificacaoLotePage />);
    await marcarVarios(container, ['Enel — conta de luz', 'diarista pós-cerimônia']);
    await revisar(container, 'Enel — conta de luz');

    await aprovarNoPainel(container);

    expect(rotuloDaSelecao(container)).toBe('1 selecionado');
  });

  it('devolver item com remetente — o aviso diz a quem voltou e o motivo, e o item sai da fila', async () => {
    const { container } = await montar(<VerificacaoLotePage />);
    await revisar(container, 'mercado cerimônia mãe divina');
    await clicar(botaoComTexto(container, 'Devolver'));
    await digitarNaCaixa(elemento<HTMLTextAreaElement>(container, 'textarea'), '  falta a nota fiscal  ');

    await clicar(botaoComTexto(container, 'Devolver'));

    expect(mensagem(container)).toBe('Devolvido a Lucia Prado: falta a nota fiscal');
    expect(painelAberto(container)).toBe(false);
    expect(motivosDaFila(container)).not.toContain('mercado cerimônia mãe divina');
  });

  it('devolver item importado, sem remetente — o aviso diz a quem enviou', async () => {
    const { container } = await montar(<VerificacaoLotePage />);
    await revisar(container, 'Enel — conta de luz');
    await clicar(botaoComTexto(container, 'Devolver'));
    await digitarNaCaixa(elemento<HTMLTextAreaElement>(container, 'textarea'), 'conferir o vencimento');

    await clicar(botaoComTexto(container, 'Devolver'));

    expect(mensagem(container)).toBe('Devolvido a quem enviou: conferir o vencimento');
  });

  it('fechar o painel — a fila e o aviso ficam como estavam', async () => {
    const { container } = await montar(<VerificacaoLotePage />);
    await revisar(container, 'Enel — conta de luz');

    await clicar(elemento(container, 'button[aria-label="fechar"]'));

    expect(painelAberto(container)).toBe(false);
    expect(tabelaDaFila(container)).toEqual(FILA_INICIAL);
    expect(mensagem(container)).toBeNull();
  });

  it('abrir o painel de outro item depois de fechar — vem com os campos do novo item, sem resto do anterior', async () => {
    const { container } = await montar(<VerificacaoLotePage />);
    await revisar(container, 'Enel — conta de luz');
    await digitar(campoComRotulo(container, 'O que foi'), 'texto que não vale');
    await clicar(elemento(container, 'button[aria-label="fechar"]'));

    await revisar(container, 'diarista pós-cerimônia');

    expect(campoComRotulo(container, 'O que foi').value).toBe('diarista pós-cerimônia');
  });

  it('campo — o painel ocupa a largura toda, colado embaixo', async () => {
    usarDensidade('field');
    const { container } = await montar(<VerificacaoLotePage />);

    await revisar(container, 'Enel — conta de luz');

    const painel = elemento(container, 'button[aria-label="fechar"]').parentElement?.parentElement as HTMLElement;
    expect(painel.style.width).toBe('100%');
    expect((painel.parentElement as HTMLElement).style.alignItems).toBe('flex-end');
  });
});
