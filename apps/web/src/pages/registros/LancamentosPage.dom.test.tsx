import type { LancamentoNaLista } from '@cdd/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  botaoComTexto,
  clicar,
  desmontarTudo,
  digitar,
  elemento,
  escolherOpcao,
  folhaComTexto,
  montar,
  todos,
} from '@/testes/montagem';
import { LancamentosPage } from './LancamentosPage';
import {
  barraDeEstado,
  campoRotulado,
  lerRecibos,
  teclarEsc,
  usarDensidade,
  valorDeEntrada,
  valorDeSaida,
  valorDeTransferencia,
} from './apoioDeTeste';

type Transformacao = (lista: readonly LancamentoNaLista[]) => readonly LancamentoNaLista[];

const livro = vi.hoisted(() => ({ transformar: ((lista) => lista) as Transformacao }));
vi.mock('@/mocks/lancamentos', async (importarOriginal) => {
  const original = await importarOriginal<{ lancamentos: readonly LancamentoNaLista[] }>();
  return {
    ...original,
    get lancamentos() {
      return livro.transformar(original.lancamentos);
    },
  };
});

const BUSCA = 'Buscar por motivo, fornecedor ou quem lançou';

const SAIDA = '− ';
const ENTRADA = '+ ';

beforeEach(() => {
  livro.transformar = (lista) => lista;
  usarDensidade('office');
});

afterEach(async () => {
  await desmontarTudo();
  vi.unstubAllGlobals();
});

const linhasDoEscritorio = (container: HTMLElement) => {
  const colunaDoLancamento = todos(container, 'span').find((trecho) => trecho.textContent === 'Lançamento');
  const tabela = colunaDoLancamento?.parentElement?.parentElement;
  return tabela ? todos<HTMLButtonElement>(tabela, ':scope > button') : [];
};

const lerLinhaDoEscritorio = (linha: HTMLButtonElement) => {
  const [data, lancamento, quem, grupo, tipo, valor] = Array.from(linha.children);
  return [
    data?.textContent,
    lancamento?.children[0]?.textContent,
    lancamento?.children[1]?.textContent,
    quem?.textContent,
    grupo?.textContent,
    tipo?.textContent,
    valor?.textContent,
  ];
};

const tabelaDoEscritorio = (container: HTMLElement) => linhasDoEscritorio(container).map(lerLinhaDoEscritorio);
const motivosNoEscritorio = (container: HTMLElement) => tabelaDoEscritorio(container).map((linha) => linha[1]);

const linhasDeCampo = (container: HTMLElement) =>
  todos<HTMLButtonElement>(container, 'button').filter((botao) => botao.querySelector('[data-numeric]') !== null);

const lerLinhaDeCampo = (linha: HTMLButtonElement) => [
  linha.children[1]?.children[0]?.textContent,
  linha.querySelector('[data-numeric]')?.textContent,
  linha.children[2]?.textContent,
];

const tabelaDeCampo = (container: HTMLElement) => linhasDeCampo(container).map(lerLinhaDeCampo);
const motivosEmCampo = (container: HTMLElement) => tabelaDeCampo(container).map((linha) => linha[0]);

const totalDe = (container: HTMLElement, rotulo: string) =>
  folhaComTexto<HTMLElement>(container, 'span', rotulo).nextElementSibling?.textContent;

const totais = (container: HTMLElement) => [
  totalDe(container, 'Entradas'),
  totalDe(container, 'Saídas'),
  totalDe(container, 'Saldo do período'),
  totalDe(container, 'A conferir'),
];

const anterior = (container: HTMLElement) => elemento<HTMLButtonElement>(container, 'button[aria-label="Página anterior"]');
const proxima = (container: HTMLElement) => elemento<HTMLButtonElement>(container, 'button[aria-label="Próxima página"]');
const textoDaPaginacao = (container: HTMLElement) =>
  anterior(container).nextElementSibling?.textContent;

const filtrarPor = (container: HTMLElement, rotulo: string, valor: string) =>
  escolherOpcao(campoRotulado<HTMLSelectElement>(container, rotulo), valor);
const buscar = (container: HTMLElement, texto: string) =>
  digitar(elemento<HTMLInputElement>(container, `input[aria-label="${BUSCA}"]`), texto);

const gaveta = (container: HTMLElement) => {
  const titulo = todos<HTMLElement>(container, 'span').find((s) => s.textContent === 'Detalhe do lançamento');
  return titulo ? (titulo.parentElement?.parentElement as HTMLElement) : null;
};

const lerGaveta = (painel: HTMLElement) => {
  const [recibo] = lerRecibos(painel);
  const rotuloDoHistorico = folhaComTexto<HTMLElement>(painel, 'span', 'Histórico');
  const entradas = Array.from(rotuloDoHistorico.parentElement?.children ?? []).slice(1);
  return {
    situacao: (painel.children[0] as HTMLElement).children[1]?.textContent,
    recibo,
    historico: entradas.map((entrada) => [entrada.children[0]?.textContent, entrada.children[1]?.textContent]),
  };
};

const abrirLinhaDoEscritorio = (container: HTMLElement, motivo: string) => {
  const achada = linhasDoEscritorio(container).find((linha) => lerLinhaDoEscritorio(linha)[1] === motivo);
  if (!achada) throw new Error(`linha não encontrada: ${motivo}`);
  return clicar(achada);
};

const abrirLinhaDeCampo = (container: HTMLElement, motivo: string) => {
  const achada = linhasDeCampo(container).find((linha) => lerLinhaDeCampo(linha)[0] === motivo);
  if (!achada) throw new Error(`linha não encontrada: ${motivo}`);
  return clicar(achada);
};

const PAGINA_1_DE_AGOSTO = [
  ['28/08', 'mercado cerimônia mãe divina', 'Assaí Atacadista · Cora PJ', 'Aurio Neto', 'Cozinha', 'Saída', `${SAIDA}187,40`],
  ['27/08', 'material de obra do dormitório', 'Depósito São Jorge · Cora PJ', 'Lucia Prado', 'Dormitório', 'Saída', `${SAIDA}1.245,00`],
  ['24/08', 'contribuições da cerimônia de agosto', 'Corpo de fardados · Cora PJ', 'Aurio Neto', 'CDD', 'Entrada', `${ENTRADA}940,00`],
  ['23/08', 'repasse do caixa da lojinha', 'Nubank Paty → Cora PJ', 'Paty Munay', '—', 'Transferência', '1.500,00'],
  ['22/08', 'venda de camisetas na lojinha', 'Balcão da lojinha · Nubank Paty', 'Paty Munay', 'Lojinha', 'Entrada', `${ENTRADA}285,00`],
  ['20/08', 'ração e vermífugo dos cavalos', 'Agropecuária Vale · Cora PJ', 'Chico Aguiar', 'Chácara (Infraestrutura)', 'Saída', `${SAIDA}128,90`],
  ['19/08', 'gasolina para buscar mantimentos', 'Posto Ipiranga · Espécie', 'Chico Aguiar', 'Chácara (Infraestrutura)', 'Saída', `${SAIDA}65,00`],
  ['18/08', 'garrafas e rótulos para o feitio', 'Vidraria Nova · Cora PJ', 'Lucia Prado', 'CDD', 'Saída', `${SAIDA}412,60`],
];

const PAGINA_2_DE_AGOSTO = [
  ['15/08', 'doação de padrinho para o dormitório', 'Sr. Antônio Vieira · Cora PJ', 'Aurio Neto', 'Dormitório', 'Entrada', `${ENTRADA}3.000,00`],
  ['12/08', 'conta de luz da chácara', 'Enel · Cora PJ', 'Paty Munay', 'Chácara (Infraestrutura)', 'Saída', `${SAIDA}738,15`],
  ['09/08', 'reforço do caixa em espécie', 'Cora PJ → Espécie', 'Aurio Neto', '—', 'Transferência', '600,00'],
  ['26/08', 'velas e incenso para o salão', 'Casa das Velas · Espécie', 'Aurio Neto', 'CDD', 'Saída', `${SAIDA}96,30`],
  ['21/08', 'frete das garrafas do feitio', 'Transportes Céu Azul · Cora PJ', 'Aurio Neto', 'CDD', 'Saída', `${SAIDA}230,00`],
  ['23/08', 'hospedagem extra de dois participantes', 'Participantes de 22/08 · Espécie', 'Aurio Neto', 'Dormitório', 'Entrada', `${ENTRADA}200,00`],
];

describe('LancamentosPage: cabeçalho e lista nas duas densidades', () => {
  it('escritório — o cabeçalho traz o código F-03, o título e o subtítulo da unidade', async () => {
    const { container } = await montar(<LancamentosPage />);

    expect(elemento(container, 'h1').textContent).toBe('Lançamentos');
    expect(elemento(container, 'header').textContent).toBe(
      'F-03 · LançamentosLançamentosTodos os lançamentos da unidade, de todas as pessoas · CDD',
    );
  });

  it('campo — o cabeçalho traz só o código F-03 e o título', async () => {
    usarDensidade('field');
    const { container } = await montar(<LancamentosPage />);

    expect(elemento(container, 'header').textContent).toBe('F-03Lançamentos');
  });

  it('escritório — a tabela tem as seis colunas e as oito primeiras linhas de agosto, na ordem do livro', async () => {
    const { container } = await montar(<LancamentosPage />);

    const cabecalho = folhaComTexto<HTMLElement>(container, 'span', 'Data').parentElement as HTMLElement;
    expect(Array.from(cabecalho.children).map((coluna) => coluna.textContent)).toEqual([
      'Data',
      'Lançamento',
      'Quem lançou',
      'Grupo',
      'Tipo',
      'Valor',
    ]);
    expect(tabelaDoEscritorio(container)).toEqual(PAGINA_1_DE_AGOSTO);
  });

  it('escritório — a segunda página traz as seis linhas restantes, fora de ordem de data (o livro não ordena)', async () => {
    const { container } = await montar(<LancamentosPage />);

    await clicar(proxima(container));

    expect(tabelaDoEscritorio(container)).toEqual(PAGINA_2_DE_AGOSTO);
  });

  it('escritório — lançamento sem fornecedor — a linha mostra o traço no lugar do fornecedor', async () => {
    livro.transformar = (lista) =>
      lista.map((registro) => (registro.id === lista[0]?.id ? { ...registro, contraparte: null } : registro));
    const { container } = await montar(<LancamentosPage />);

    expect(tabelaDoEscritorio(container)[0]?.[2]).toBe('— · Cora PJ');
  });

  it('campo — as linhas mostram descrição, valor com o sinal do tipo e data, tipo e quem lançou', async () => {
    usarDensidade('field');
    const { container } = await montar(<LancamentosPage />);

    expect(tabelaDeCampo(container)).toEqual([
      ['mercado cerimônia mãe divina', valorDeSaida('187,40'), '28/08 · Saída · Aurio Neto'],
      ['material de obra do dormitório', valorDeSaida('1.245,00'), '27/08 · Saída · Lucia Prado'],
      ['contribuições da cerimônia de agosto', valorDeEntrada('940,00'), '24/08 · Entrada · Aurio Neto'],
      ['repasse do caixa da lojinha', valorDeTransferencia('1.500,00'), '23/08 · Transferência · Paty Munay'],
      ['venda de camisetas na lojinha', valorDeEntrada('285,00'), '22/08 · Entrada · Paty Munay'],
      ['ração e vermífugo dos cavalos', valorDeSaida('128,90'), '20/08 · Saída · Chico Aguiar'],
      ['gasolina para buscar mantimentos', valorDeSaida('65,00'), '19/08 · Saída · Chico Aguiar'],
      ['garrafas e rótulos para o feitio', valorDeSaida('412,60'), '18/08 · Saída · Lucia Prado'],
    ]);
  });

  it.each([
    { motivo: 'material de obra do dormitório', borda: 'var(--color-pending)' },
    { motivo: 'mercado cerimônia mãe divina', borda: 'var(--color-confirmed)' },
    { motivo: 'gasolina para buscar mantimentos', borda: 'var(--color-neutral)' },
  ])('campo — a barra de estado da linha "$motivo" tem a cor $borda', async ({ motivo, borda }) => {
    usarDensidade('field');
    const { container } = await montar(<LancamentosPage />);

    const linha = linhasDeCampo(container).find((candidata) => lerLinhaDeCampo(candidata)[0] === motivo) as HTMLButtonElement;

    expect(barraDeEstado(linha).style.background).toBe(borda);
  });

  it('escritório — o valor do lançamento estornado é riscado e o do vivo não', async () => {
    const { container } = await montar(<LancamentosPage />);

    const valores = linhasDoEscritorio(container).map((linha) => (linha.children[5] as HTMLElement).style.textDecoration);

    expect(valores).toEqual(['', '', '', '', '', '', 'line-through', '']);
  });

  it('escritório — a linha pendente e a estornada têm a marca na borda esquerda; as outras ficam sem cor', async () => {
    const { container } = await montar(<LancamentosPage />);

    const bordas = linhasDoEscritorio(container).map((linha) => linha.style.borderLeft);

    expect(bordas).toEqual([
      '3px solid transparent',
      '3px solid var(--color-pending)',
      '3px solid transparent',
      '3px solid transparent',
      '3px solid transparent',
      '3px solid transparent',
      '3px solid var(--color-neutral)',
      '3px solid transparent',
    ]);
  });
});

describe('LancamentosPage: totais do recorte, com o estorno', () => {
  it('agosto, sem filtro — soma as entradas e as saídas vivas, o saldo e quantas faltam conferir', async () => {
    const { container } = await montar(<LancamentosPage />);

    expect(totais(container)).toEqual(['4.425,00', '3.038,35', '1.386,65', '3 de 14']);
  });

  it('o lançamento estornado de saída — aparece na lista mas fica fora das saídas (Doc 8 §14, estorno nos totais)', async () => {
    const { container } = await montar(<LancamentosPage />);
    await filtrarPor(container, 'Situação', 'ESTORNADO');

    expect(motivosNoEscritorio(container)).toEqual(['gasolina para buscar mantimentos']);
    expect(totais(container)).toEqual(['0,00', '0,00', '0,00', '0 de 1']);
  });

  it('entrada estornada — também fica fora das entradas, ao contrário de Meus registros (Doc 8 §14, estorno nos totais)', async () => {
    livro.transformar = (lista) =>
      lista.map((registro) => (registro.id === lista[2]?.id ? { ...registro, status: 'ESTORNADO' as const } : registro));
    const { container } = await montar(<LancamentosPage />);

    expect(totais(container)).toEqual(['3.485,00', '3.038,35', '446,65', '3 de 14']);
    expect(motivosNoEscritorio(container)).toContain('contribuições da cerimônia de agosto');
  });

  it.each([
    { nome: 'todo o histórico', filtro: ['Período', 'todos'], esperado: ['5.545,00', '4.268,35', '1.276,65', '3 de 17'] },
    { nome: 'julho', filtro: ['Período', '2026-07'], esperado: ['1.120,00', '1.230,00', '-110,00', '0 de 3'] },
    { nome: 'só entradas', filtro: ['Tipo', 'ENTRADA'], esperado: ['4.425,00', '0,00', '4.425,00', '0 de 4'] },
    { nome: 'só saídas', filtro: ['Tipo', 'SAIDA'], esperado: ['0,00', '3.038,35', '-3.038,35', '2 de 8'] },
    { nome: 'só transferências', filtro: ['Tipo', 'TRANSFERENCIA'], esperado: ['0,00', '0,00', '0,00', '1 de 2'] },
    { nome: 'grupo Dormitório', filtro: ['Grupo', 'Dormitório'], esperado: ['3.200,00', '1.245,00', '1.955,00', '1 de 3'] },
    { nome: 'situação a conferir', filtro: ['Situação', 'A_CONFERIR'], esperado: ['0,00', '1.475,00', '-1.475,00', '3 de 3'] },
    { nome: 'situação consolidado', filtro: ['Situação', 'CONFIRMADO'], esperado: ['4.425,00', '1.563,35', '2.861,65', '0 de 10'] },
  ])('filtro $nome — os totais são $esperado', async ({ filtro, esperado }) => {
    const { container } = await montar(<LancamentosPage />);

    await filtrarPor(container, filtro[0] as string, filtro[1] as string);

    expect(totais(container)).toEqual(esperado);
  });

  it('campo — só três totais: entradas, saídas e saldo, sem o contador de a conferir', async () => {
    usarDensidade('field');
    const { container } = await montar(<LancamentosPage />);

    expect(totalDe(container, 'Entradas')).toBe('4.425,00');
    expect(totalDe(container, 'Saídas')).toBe('3.038,35');
    expect(totalDe(container, 'Saldo')).toBe('1.386,65');
    expect(container.textContent).not.toContain('A conferir');
    expect(container.textContent).not.toContain('Saldo do período');
  });
});

describe('LancamentosPage: filtros no escritório', () => {
  it('estado inicial — período agosto, tudo mais em todos e a busca vazia, com as opções de cada filtro', async () => {
    const { container } = await montar(<LancamentosPage />);

    const opcoes = (rotulo: string) =>
      todos<HTMLOptionElement>(campoRotulado(container, rotulo), 'option').map((opcao) => [opcao.value, opcao.textContent]);
    expect(campoRotulado<HTMLSelectElement>(container, 'Período').value).toBe('2026-08');
    expect(campoRotulado<HTMLSelectElement>(container, 'Tipo').value).toBe('todos');
    expect(campoRotulado<HTMLSelectElement>(container, 'Grupo').value).toBe('todos');
    expect(campoRotulado<HTMLSelectElement>(container, 'Situação').value).toBe('todos');
    expect(elemento<HTMLInputElement>(container, `input[aria-label="${BUSCA}"]`).value).toBe('');
    expect(opcoes('Período')).toEqual([
      ['2026-08', 'Agosto 2026'],
      ['2026-07', 'Julho 2026'],
      ['todos', 'Todo o histórico'],
    ]);
    expect(opcoes('Tipo')).toEqual([
      ['todos', 'Todos'],
      ['SAIDA', 'Saída'],
      ['ENTRADA', 'Entrada'],
      ['TRANSFERENCIA', 'Transferência'],
    ]);
    expect(opcoes('Situação')).toEqual([
      ['todos', 'Todas'],
      ['A_CONFERIR', 'A conferir'],
      ['CONFIRMADO', 'Consolidado'],
      ['ESTORNADO', 'Estornado'],
    ]);
    expect(opcoes('Grupo')).toEqual([
      ['todos', 'Todos os grupos'],
      ['Lojinha', 'Lojinha'],
      ['Dormitório', 'Dormitório'],
      ['Chácara (Infraestrutura)', 'Chácara (Infraestrutura)'],
      ['CDD', 'CDD'],
      ['Cozinha', 'Cozinha'],
      ['Secretaria', 'Secretaria'],
    ]);
  });

  it('período julho — lista só os três lançamentos de julho', async () => {
    const { container } = await montar(<LancamentosPage />);

    await filtrarPor(container, 'Período', '2026-07');

    expect(motivosNoEscritorio(container)).toEqual([
      'diarista pós-cerimônia',
      'contribuições da cerimônia de julho',
      'reparo da bomba d’água',
    ]);
  });

  it('tipo transferência — lista as duas transferências de agosto', async () => {
    const { container } = await montar(<LancamentosPage />);

    await filtrarPor(container, 'Tipo', 'TRANSFERENCIA');

    expect(motivosNoEscritorio(container)).toEqual(['repasse do caixa da lojinha', 'reforço do caixa em espécie']);
  });

  it('tipo saída e grupo Chácara — combina os dois filtros', async () => {
    const { container } = await montar(<LancamentosPage />);

    await filtrarPor(container, 'Tipo', 'SAIDA');
    await filtrarPor(container, 'Grupo', 'Chácara (Infraestrutura)');

    expect(motivosNoEscritorio(container)).toEqual([
      'ração e vermífugo dos cavalos',
      'gasolina para buscar mantimentos',
      'conta de luz da chácara',
    ]);
  });

  it('situação a conferir — lista só os pendentes de agosto, de qualquer tipo', async () => {
    const { container } = await montar(<LancamentosPage />);

    await filtrarPor(container, 'Situação', 'A_CONFERIR');

    expect(motivosNoEscritorio(container)).toEqual([
      'material de obra do dormitório',
      'reforço do caixa em espécie',
      'frete das garrafas do feitio',
    ]);
  });

  it.each([
    { busca: 'lucia', motivos: ['material de obra do dormitório', 'garrafas e rótulos para o feitio'] },
    { busca: 'LUCIA', motivos: ['material de obra do dormitório', 'garrafas e rótulos para o feitio'] },
    { busca: '  lucia  ', motivos: ['material de obra do dormitório', 'garrafas e rótulos para o feitio'] },
    { busca: 'frete', motivos: ['frete das garrafas do feitio'] },
    { busca: 'enel', motivos: ['conta de luz da chácara'] },
    { busca: 'assaí', motivos: ['mercado cerimônia mãe divina'] },
    { busca: 'garrafas', motivos: ['garrafas e rótulos para o feitio', 'frete das garrafas do feitio'] },
  ])('busca "$busca" — acha por motivo, fornecedor ou quem lançou, sem ligar para caixa nem espaços das pontas', async ({ busca, motivos }) => {
    const { container } = await montar(<LancamentosPage />);

    await buscar(container, busca);

    expect(motivosNoEscritorio(container)).toEqual(motivos);
  });

  it('busca sem acento — "assai" não acha o fornecedor Assaí Atacadista', async () => {
    const { container } = await montar(<LancamentosPage />);

    await buscar(container, 'assai');

    expect(motivosNoEscritorio(container)).toEqual([]);
  });

  it('busca pelo nome da conta ou do grupo — não acha, porque só olha motivo, fornecedor e quem lançou', async () => {
    const { container } = await montar(<LancamentosPage />);

    await buscar(container, 'Cozinha');

    expect(motivosNoEscritorio(container)).toEqual([]);
  });

  it('busca em todo o histórico — acha também o que é de julho', async () => {
    const { container } = await montar(<LancamentosPage />);
    await filtrarPor(container, 'Período', 'todos');

    await buscar(container, 'dona rosa');

    expect(motivosNoEscritorio(container)).toEqual(['diarista pós-cerimônia']);
  });

  it('Limpar filtros — volta período, tipo, grupo, situação e busca ao estado inicial', async () => {
    const { container } = await montar(<LancamentosPage />);
    await filtrarPor(container, 'Período', 'todos');
    await filtrarPor(container, 'Tipo', 'ENTRADA');
    await filtrarPor(container, 'Grupo', 'CDD');
    await filtrarPor(container, 'Situação', 'CONFIRMADO');
    await buscar(container, 'padrinho');

    await clicar(botaoComTexto(container, 'Limpar filtros'));

    expect(campoRotulado<HTMLSelectElement>(container, 'Período').value).toBe('2026-08');
    expect(campoRotulado<HTMLSelectElement>(container, 'Tipo').value).toBe('todos');
    expect(campoRotulado<HTMLSelectElement>(container, 'Grupo').value).toBe('todos');
    expect(campoRotulado<HTMLSelectElement>(container, 'Situação').value).toBe('todos');
    expect(elemento<HTMLInputElement>(container, `input[aria-label="${BUSCA}"]`).value).toBe('');
    expect(tabelaDoEscritorio(container)).toEqual(PAGINA_1_DE_AGOSTO);
  });
});

describe('LancamentosPage: filtro de tipo em campo', () => {
  const chaveDoTipo = (container: HTMLElement) =>
    ['Todos', 'Saída', 'Entrada', 'Transf.'].map((rotulo) => [rotulo, botaoComTexto(container, rotulo).ariaPressed]);

  it('campo — só os quatro botões de tipo, com Todos marcado, e nenhum select, busca nem limpar filtros', async () => {
    usarDensidade('field');
    const { container } = await montar(<LancamentosPage />);

    expect(chaveDoTipo(container)).toEqual([
      ['Todos', 'true'],
      ['Saída', 'false'],
      ['Entrada', 'false'],
      ['Transf.', 'false'],
    ]);
    expect(container.querySelector('select')).toBeNull();
    expect(container.querySelector('input')).toBeNull();
    expect(container.textContent).not.toContain('Limpar filtros');
  });

  it.each([
    { botao: 'Saída', motivos: ['mercado cerimônia mãe divina', 'material de obra do dormitório', 'ração e vermífugo dos cavalos', 'gasolina para buscar mantimentos', 'garrafas e rótulos para o feitio', 'conta de luz da chácara', 'velas e incenso para o salão', 'frete das garrafas do feitio'], totais: ['0,00', '3.038,35', '-3.038,35'] },
    { botao: 'Entrada', motivos: ['contribuições da cerimônia de agosto', 'venda de camisetas na lojinha', 'doação de padrinho para o dormitório', 'hospedagem extra de dois participantes'], totais: ['4.425,00', '0,00', '4.425,00'] },
    { botao: 'Transf.', motivos: ['repasse do caixa da lojinha', 'reforço do caixa em espécie'], totais: ['0,00', '0,00', '0,00'] },
  ])('campo — o botão $botao filtra a lista e os totais, e fica marcado', async ({ botao, motivos, totais: esperados }) => {
    usarDensidade('field');
    const { container } = await montar(<LancamentosPage />);

    await clicar(botaoComTexto(container, botao));

    expect(motivosEmCampo(container)).toEqual(motivos.slice(0, 8));
    expect([totalDe(container, 'Entradas'), totalDe(container, 'Saídas'), totalDe(container, 'Saldo')]).toEqual(esperados);
    expect(botaoComTexto(container, botao).ariaPressed).toBe('true');
  });

  it('campo — voltar para Todos devolve as oito primeiras linhas de agosto', async () => {
    usarDensidade('field');
    const { container } = await montar(<LancamentosPage />);
    await clicar(botaoComTexto(container, 'Entrada'));

    await clicar(botaoComTexto(container, 'Todos'));

    expect(motivosEmCampo(container)).toHaveLength(8);
    expect(motivosEmCampo(container)[0]).toBe('mercado cerimônia mãe divina');
  });

  it('campo — o período fica fixo em agosto: lançamentos de julho nunca aparecem', async () => {
    usarDensidade('field');
    const { container } = await montar(<LancamentosPage />);
    await clicar(proxima(container));

    expect(motivosEmCampo(container)).not.toContain('diarista pós-cerimônia');
    expect(motivosEmCampo(container)).toHaveLength(6);
  });
});

describe('LancamentosPage: paginação', () => {
  it('primeira página — 14 lançamentos em duas páginas, com anterior desligado', async () => {
    const { container } = await montar(<LancamentosPage />);

    expect(textoDaPaginacao(container)).toBe('Página 1 de 2 · 14 lançamentos');
    expect(anterior(container).disabled).toBe(true);
    expect(proxima(container).disabled).toBe(false);
    expect(anterior(container).textContent).toBe('‹ Anterior');
    expect(proxima(container).textContent).toBe('Próxima ›');
  });

  it('próxima — vai para a segunda e última página e desliga a próxima', async () => {
    const { container } = await montar(<LancamentosPage />);

    await clicar(proxima(container));

    expect(textoDaPaginacao(container)).toBe('Página 2 de 2 · 14 lançamentos');
    expect(proxima(container).disabled).toBe(true);
    expect(anterior(container).disabled).toBe(false);
  });

  it('anterior — volta da segunda para a primeira página', async () => {
    const { container } = await montar(<LancamentosPage />);
    await clicar(proxima(container));

    await clicar(anterior(container));

    expect(textoDaPaginacao(container)).toBe('Página 1 de 2 · 14 lançamentos');
    expect(tabelaDoEscritorio(container)).toEqual(PAGINA_1_DE_AGOSTO);
  });

  it('todo o histórico — 17 lançamentos em três páginas, a última com um só', async () => {
    const { container } = await montar(<LancamentosPage />);
    await filtrarPor(container, 'Período', 'todos');

    await clicar(proxima(container));
    await clicar(proxima(container));

    expect(textoDaPaginacao(container)).toBe('Página 3 de 3 · 17 lançamentos');
    expect(motivosNoEscritorio(container)).toEqual(['hospedagem extra de dois participantes']);
  });

  it('um só lançamento — o texto usa o singular e os dois botões ficam desligados', async () => {
    const { container } = await montar(<LancamentosPage />);

    await filtrarPor(container, 'Situação', 'ESTORNADO');

    expect(textoDaPaginacao(container)).toBe('Página 1 de 1 · 1 lançamento');
    expect(anterior(container).disabled).toBe(true);
    expect(proxima(container).disabled).toBe(true);
  });

  it('trocar um filtro na segunda página — volta para a primeira, mesmo quando o novo recorte também tem várias páginas', async () => {
    const { container } = await montar(<LancamentosPage />);
    await clicar(proxima(container));

    await filtrarPor(container, 'Período', 'todos');

    expect(textoDaPaginacao(container)).toBe('Página 1 de 3 · 17 lançamentos');
  });

  it('trocar um filtro na segunda página para um recorte de uma página só — mostra a primeira e única', async () => {
    const { container } = await montar(<LancamentosPage />);
    await clicar(proxima(container));

    await filtrarPor(container, 'Tipo', 'SAIDA');

    expect(textoDaPaginacao(container)).toBe('Página 1 de 1 · 8 lançamentos');
  });

  it('Limpar filtros na terceira página — não volta à primeira: a página é limitada ao total e mostra a segunda de duas (Doc 8 §14, paginação)', async () => {
    const { container } = await montar(<LancamentosPage />);
    await filtrarPor(container, 'Período', 'todos');
    await clicar(proxima(container));
    await clicar(proxima(container));

    await clicar(botaoComTexto(container, 'Limpar filtros'));

    expect(textoDaPaginacao(container)).toBe('Página 2 de 2 · 14 lançamentos');
    expect(tabelaDoEscritorio(container)).toEqual(PAGINA_2_DE_AGOSTO);
  });

  it('Limpar filtros na segunda página de duas — continua na segunda página', async () => {
    const { container } = await montar(<LancamentosPage />);
    await clicar(proxima(container));

    await clicar(botaoComTexto(container, 'Limpar filtros'));

    expect(textoDaPaginacao(container)).toBe('Página 2 de 2 · 14 lançamentos');
  });

  it('campo — os botões da paginação são só as setas, com os mesmos nomes acessíveis', async () => {
    usarDensidade('field');
    const { container } = await montar(<LancamentosPage />);

    expect(anterior(container).textContent).toBe('‹');
    expect(proxima(container).textContent).toBe('›');
    expect(textoDaPaginacao(container)).toBe('Página 1 de 2 · 14 lançamentos');
  });

  it('campo — a segunda página traz as seis linhas restantes', async () => {
    usarDensidade('field');
    const { container } = await montar(<LancamentosPage />);

    await clicar(proxima(container));

    expect(motivosEmCampo(container)).toEqual(PAGINA_2_DE_AGOSTO.map((linha) => linha[1]));
  });

  it('abrir o detalhe e depois paginar — a gaveta fecha', async () => {
    const { container } = await montar(<LancamentosPage />);
    await abrirLinhaDoEscritorio(container, 'mercado cerimônia mãe divina');

    await clicar(proxima(container));

    expect(gaveta(container)).toBeNull();
  });

  it('abrir o detalhe e depois mudar um filtro — a gaveta fecha', async () => {
    const { container } = await montar(<LancamentosPage />);
    await abrirLinhaDoEscritorio(container, 'mercado cerimônia mãe divina');

    await filtrarPor(container, 'Tipo', 'SAIDA');

    expect(gaveta(container)).toBeNull();
  });
});

describe('LancamentosPage: recorte vazio', () => {
  it('escritório — mostra o estado vazio com dois Limpar filtros, totais zerados, A conferir 0 de 0 e nenhuma paginação', async () => {
    const { container } = await montar(<LancamentosPage />);

    await buscar(container, 'nada com este nome');

    expect(container.textContent).toContain('Nenhum lançamento neste recorte');
    expect(container.textContent).toContain('Troque o período ou limpe os filtros para ver o livro inteiro.');
    expect(todos(container, 'button').filter((botao) => botao.textContent === 'Limpar filtros')).toHaveLength(2);
    expect(totais(container)).toEqual(['0,00', '0,00', '0,00', '0 de 0']);
    expect(container.textContent).not.toContain('Página');
    expect(linhasDoEscritorio(container)).toHaveLength(0);
  });

  it('o Limpar filtros do estado vazio — volta tudo ao inicial e a lista reaparece', async () => {
    const { container } = await montar(<LancamentosPage />);
    await buscar(container, 'nada com este nome');
    const doEstadoVazio = todos(container, 'button').filter((botao) => botao.textContent === 'Limpar filtros')[1] as HTMLButtonElement;

    await clicar(doEstadoVazio);

    expect(elemento<HTMLInputElement>(container, `input[aria-label="${BUSCA}"]`).value).toBe('');
    expect(tabelaDoEscritorio(container)).toEqual(PAGINA_1_DE_AGOSTO);
  });

  it('campo — sem lançamentos, o estado vazio traz um Limpar filtros que, sem filtro além do tipo, apenas reabre o livro', async () => {
    usarDensidade('field');
    livro.transformar = () => [];
    const { container } = await montar(<LancamentosPage />);

    expect(container.textContent).toContain('Nenhum lançamento neste recorte');
    expect(todos(container, 'button').filter((botao) => botao.textContent === 'Limpar filtros')).toHaveLength(1);
    expect(container.textContent).not.toContain('Página');
  });
});

describe('LancamentosPage: gaveta de detalhe', () => {
  it('lançamento consolidado de saída — mostra situação, recibo com quem lançou e histórico com a consolidação', async () => {
    const { container } = await montar(<LancamentosPage />);

    await abrirLinhaDoEscritorio(container, 'mercado cerimônia mãe divina');

    expect(lerGaveta(gaveta(container) as HTMLElement)).toEqual({
      situacao: 'Consolidado',
      recibo: {
        titulo: 'Registrado em 28/08/2026 às 14:22',
        valor: valorDeSaida('187,40'),
        linhas: [
          ['Tipo', 'Saída'],
          ['O que foi', 'mercado cerimônia mãe divina'],
          ['Data', '28/08/2026'],
          ['Grupo', 'Cozinha'],
          ['Categoria', 'Alimentação de cerimônia'],
          ['Conta de saída', 'Cora PJ · Pix'],
          ['Quem lançou', 'Aurio Neto'],
          ['Comprovante', 'IMG_2481.jpg'],
        ],
        rodape: 'Consolidado por Aurio Neto. Alteração só por estorno, com motivo registrado.',
      },
      historico: [
        ['28/08/2026 14:22', 'Lançado por Aurio Neto.'],
        ['28/08/2026 21:04', 'Consolidado por Aurio Neto.'],
      ],
    });
  });

  it('lançamento a conferir — a situação é A conferir e o histórico diz que aguarda a tesouraria', async () => {
    const { container } = await montar(<LancamentosPage />);

    await abrirLinhaDoEscritorio(container, 'material de obra do dormitório');

    const gavetaAberta = lerGaveta(gaveta(container) as HTMLElement);
    expect(gavetaAberta.situacao).toBe('A conferir');
    expect(gavetaAberta.recibo?.rodape).toBe('A conferir: lançado por Lucia Prado, ainda sem consolidação da tesouraria.');
    expect(gavetaAberta.historico).toEqual([
      ['27/08/2026 09:14', 'Lançado por Lucia Prado.'],
      ['—', 'Aguardando conferência da tesouraria.'],
    ]);
  });

  it('lançamento a conferir — Estornar fica habilitado, embora só o consolidado se corrija por estorno (Doc 2, L2)', async () => {
    const { container } = await montar(<LancamentosPage />);

    await abrirLinhaDoEscritorio(container, 'material de obra do dormitório');

    expect(botaoComTexto(gaveta(container) as HTMLElement, 'Estornar').disabled).toBe(false);
  });

  it('lançamento estornado — a situação é Estornado e o histórico ganha a linha do estorno', async () => {
    const { container } = await montar(<LancamentosPage />);

    await abrirLinhaDoEscritorio(container, 'gasolina para buscar mantimentos');

    const gavetaAberta = lerGaveta(gaveta(container) as HTMLElement);
    expect(gavetaAberta.situacao).toBe('Estornado');
    expect(gavetaAberta.recibo?.rodape).toBe('Estornado — o lançamento fica no histórico com a marca de estorno.');
    expect(gavetaAberta.historico).toEqual([
      ['19/08/2026 11:30', 'Lançado por Chico Aguiar.'],
      ['19/08/2026 21:04', 'Consolidado por Aurio Neto.'],
      ['20/08/2026 09:30', 'Estornado: valor lançado em duplicidade.'],
    ]);
  });

  it.each([
    { situacao: 'Consolidado', motivo: 'mercado cerimônia mãe divina', tom: 'confirmed' },
    { situacao: 'A conferir', motivo: 'material de obra do dormitório', tom: 'pending' },
    { situacao: 'Estornado', motivo: 'gasolina para buscar mantimentos', tom: 'neutral' },
  ])('lançamento $situacao — o selo da situação na gaveta fica no tom $tom', async ({ situacao, motivo, tom }) => {
    const { container } = await montar(<LancamentosPage />);
    await abrirLinhaDoEscritorio(container, motivo);

    const selo = (gaveta(container) as HTMLElement).children[0]?.children[1] as HTMLElement;

    expect([selo.textContent, selo.style.color, selo.style.background]).toEqual([
      situacao,
      `var(--color-${tom})`,
      `var(--color-${tom}-soft)`,
    ]);
  });

  it('lançamento consolidado por outra pessoa — o histórico diz sempre Consolidado por Aurio Neto, às 21:04', async () => {
    const { container } = await montar(<LancamentosPage />);

    await abrirLinhaDoEscritorio(container, 'venda de camisetas na lojinha');

    expect(lerGaveta(gaveta(container) as HTMLElement).historico).toEqual([
      ['22/08/2026 21:15', 'Lançado por Paty Munay.'],
      ['22/08/2026 21:04', 'Consolidado por Aurio Neto.'],
    ]);
  });

  it('entrada — o recibo traz os rótulos de entrada, sem sinal de saída, e Comprovante sem anexo', async () => {
    const { container } = await montar(<LancamentosPage />);

    await abrirLinhaDoEscritorio(container, 'contribuições da cerimônia de agosto');

    const { recibo } = lerGaveta(gaveta(container) as HTMLElement);
    expect(recibo?.valor).toBe(valorDeEntrada('940,00'));
    expect(recibo?.linhas).toEqual([
      ['Tipo', 'Entrada'],
      ['De onde veio', 'contribuições da cerimônia de agosto'],
      ['Data', '24/08/2026'],
      ['Grupo', 'CDD'],
      ['Categoria', 'Contribuições'],
      ['Conta de entrada', 'Cora PJ · Pix'],
      ['Quem lançou', 'Aurio Neto'],
      ['Comprovante', 'sem anexo'],
    ]);
  });

  it('transferência — o recibo troca grupo e categoria por saiu de e entrou em, e traz a situação', async () => {
    const { container } = await montar(<LancamentosPage />);

    await abrirLinhaDoEscritorio(container, 'repasse do caixa da lojinha');

    const { recibo } = lerGaveta(gaveta(container) as HTMLElement);
    expect(recibo?.valor).toBe(valorDeTransferencia('1.500,00'));
    expect(recibo?.linhas).toEqual([
      ['Tipo', 'Transferência entre contas'],
      ['Motivo', 'repasse do caixa da lojinha'],
      ['Data', '23/08/2026'],
      ['Saiu de', 'Nubank Paty'],
      ['Entrou em', 'Cora PJ'],
      ['Quem lançou', 'Paty Munay'],
      ['Situação', 'Consolidado'],
    ]);
  });

  it('lançamento com mais de uma categoria — o recibo junta as categorias por vírgula', async () => {
    const { container } = await montar(<LancamentosPage />);
    await clicar(proxima(container));

    await abrirLinhaDoEscritorio(container, 'frete das garrafas do feitio');

    expect(lerGaveta(gaveta(container) as HTMLElement).recibo?.linhas).toContainEqual([
      'Categoria',
      'Transporte, Insumos de feitio',
    ]);
  });

  it('abrir uma linha — a linha fica com o fundo de selecionada e as outras ficam transparentes', async () => {
    const { container } = await montar(<LancamentosPage />);

    await abrirLinhaDoEscritorio(container, 'material de obra do dormitório');

    expect(linhasDoEscritorio(container).map((linha) => linha.style.background).slice(0, 3)).toEqual([
      'transparent',
      'var(--bg-sunken)',
      'transparent',
    ]);
  });

  it('com comprovante — Ver comprovante fica habilitado; sem comprovante, desabilitado', async () => {
    const { container } = await montar(<LancamentosPage />);
    await abrirLinhaDoEscritorio(container, 'mercado cerimônia mãe divina');
    const habilitadoComAnexo = !botaoComTexto(gaveta(container) as HTMLElement, 'Ver comprovante').disabled;

    await clicar(elemento(container, 'button[aria-label="Fechar detalhe"]'));
    await abrirLinhaDoEscritorio(container, 'contribuições da cerimônia de agosto');

    expect(habilitadoComAnexo).toBe(true);
    expect(botaoComTexto(gaveta(container) as HTMLElement, 'Ver comprovante').disabled).toBe(true);
  });

  it('lançamento vivo — Estornar fica habilitado, sem motivo de bloqueio na tela', async () => {
    const { container } = await montar(<LancamentosPage />);

    await abrirLinhaDoEscritorio(container, 'mercado cerimônia mãe divina');

    const estornar = botaoComTexto(gaveta(container) as HTMLElement, 'Estornar');
    expect(estornar.disabled).toBe(false);
    expect(gaveta(container)?.textContent).not.toContain('Este lançamento já foi estornado.');
  });

  it('lançamento estornado — Estornar fica desabilitado, com o motivo na tela e no title', async () => {
    const { container } = await montar(<LancamentosPage />);

    await abrirLinhaDoEscritorio(container, 'gasolina para buscar mantimentos');

    const estornar = botaoComTexto(gaveta(container) as HTMLElement, 'Estornar');
    expect(estornar.disabled).toBe(true);
    expect(estornar.title).toBe('Este lançamento já foi estornado.');
    expect(gaveta(container)?.textContent).toContain('Este lançamento já foi estornado.');
  });

  it('Estornar e Ver comprovante — o clique não muda nada: a gaveta continua aberta, com o mesmo conteúdo', async () => {
    const { container } = await montar(<LancamentosPage />);
    await abrirLinhaDoEscritorio(container, 'mercado cerimônia mãe divina');
    const antes = lerGaveta(gaveta(container) as HTMLElement);

    await clicar(botaoComTexto(gaveta(container) as HTMLElement, 'Estornar'));
    await clicar(botaoComTexto(gaveta(container) as HTMLElement, 'Ver comprovante'));

    expect(lerGaveta(gaveta(container) as HTMLElement)).toEqual(antes);
  });

  it('fechar — o botão Fechar detalhe fecha a gaveta', async () => {
    const { container } = await montar(<LancamentosPage />);
    await abrirLinhaDoEscritorio(container, 'mercado cerimônia mãe divina');

    await clicar(elemento(container, 'button[aria-label="Fechar detalhe"]'));

    expect(gaveta(container)).toBeNull();
  });

  it('tocar fora da gaveta fecha; tocar dentro dela não fecha', async () => {
    const { container } = await montar(<LancamentosPage />);
    await abrirLinhaDoEscritorio(container, 'mercado cerimônia mãe divina');
    const painel = gaveta(container) as HTMLElement;

    await clicar(painel);
    const abertaAposTocarDentro = gaveta(container) !== null;
    await clicar(painel.parentElement as HTMLElement);

    expect(abertaAposTocarDentro).toBe(true);
    expect(gaveta(container)).toBeNull();
  });

  it('a gaveta não se declara como diálogo e o Esc, teclado dentro dela, não a fecha', async () => {
    const { container } = await montar(<LancamentosPage />);
    await abrirLinhaDoEscritorio(container, 'mercado cerimônia mãe divina');

    await teclarEsc(elemento(container, 'button[aria-label="Fechar detalhe"]'));

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.querySelector('[aria-modal]')).toBeNull();
    expect(gaveta(container)).not.toBeNull();
  });

  it('escritório — a gaveta é um painel lateral de 480px no máximo; em campo ocupa a largura toda, colada embaixo', async () => {
    const escritorio = await montar(<LancamentosPage />);
    await abrirLinhaDoEscritorio(escritorio.container, 'mercado cerimônia mãe divina');
    const painelDoEscritorio = gaveta(escritorio.container) as HTMLElement;
    const larguraNoEscritorio = painelDoEscritorio.style.width;
    const alinhamentoNoEscritorio = (painelDoEscritorio.parentElement as HTMLElement).style.alignItems;
    await escritorio.desmontar();
    usarDensidade('field');
    const campo = await montar(<LancamentosPage />);

    await abrirLinhaDeCampo(campo.container, 'mercado cerimônia mãe divina');

    const painelDeCampo = gaveta(campo.container) as HTMLElement;
    expect(larguraNoEscritorio).toBe('min(480px, 100%)');
    expect(alinhamentoNoEscritorio).toBe('stretch');
    expect(painelDeCampo.style.width).toBe('100%');
    expect((painelDeCampo.parentElement as HTMLElement).style.alignItems).toBe('flex-end');
  });

  it('campo — tocar numa linha abre a mesma gaveta, com o mesmo conteúdo do escritório', async () => {
    usarDensidade('field');
    const { container } = await montar(<LancamentosPage />);

    await abrirLinhaDeCampo(container, 'material de obra do dormitório');

    const gavetaAberta = lerGaveta(gaveta(container) as HTMLElement);
    expect(gavetaAberta.situacao).toBe('A conferir');
    expect(gavetaAberta.recibo?.titulo).toBe('Registrado em 27/08/2026 às 09:14');
    expect(gavetaAberta.recibo?.valor).toBe(valorDeSaida('1.245,00'));
  });
});
