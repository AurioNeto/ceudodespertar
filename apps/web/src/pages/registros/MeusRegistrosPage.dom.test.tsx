import type { LancamentoNaLista } from '@cdd/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { botaoComTexto, clicar, desmontarTudo, elemento, montar, todos } from '@/testes/montagem';
import { MeusRegistrosPage } from './MeusRegistrosPage';
import { barraDeEstado, lerRecibos, usarDensidade, valorDeEntrada, valorDeSaida, valorDeTransferencia } from './apoioDeTeste';

type Transformacao = (lista: readonly LancamentoNaLista[]) => readonly LancamentoNaLista[];

const registros = vi.hoisted(() => ({ transformar: ((lista) => lista) as Transformacao }));
vi.mock('../../mocks/lancamentos', async (importarOriginal) => {
  const original = await importarOriginal<{ meusLancamentos: readonly LancamentoNaLista[] }>();
  return {
    ...original,
    get meusLancamentos() {
      return registros.transformar(original.meusLancamentos);
    },
  };
});

const LISTA = 'Lista simplificada';
const VISAO_COMPLETA = 'Visão completa';

const PAGINA_1 = [
  'mercado cerimônia mãe divina',
  'contribuições da cerimônia de agosto',
  'doação de padrinho para o dormitório',
  'reforço do caixa em espécie',
];
const PAGINA_2 = [
  'contribuições da cerimônia de julho',
  'velas e incenso para o salão',
  'frete das garrafas do feitio',
  'hospedagem extra de dois participantes',
];

beforeEach(() => {
  registros.transformar = (lista) => lista;
  usarDensidade('office');
});

afterEach(async () => {
  await desmontarTudo();
  vi.unstubAllGlobals();
});

const linhasDaLista = (container: HTMLElement) =>
  todos<HTMLButtonElement>(container, 'button').filter((botao) => botao.querySelector('[data-numeric]') !== null);

const lerLinha = (linha: HTMLButtonElement) => [
  linha.children[1]?.children[0]?.textContent,
  linha.querySelector('[data-numeric]')?.textContent,
  linha.children[2]?.textContent,
];

const tabelaDaLista = (container: HTMLElement) => linhasDaLista(container).map(lerLinha);
const motivosDaLista = (container: HTMLElement) => tabelaDaLista(container).map((linha) => linha[0]);

const resumo = (container: HTMLElement) =>
  todos(container, 'span').find((trecho) => trecho.textContent?.includes(' · saídas '))?.textContent ?? null;

const anterior = (container: HTMLElement) => elemento<HTMLButtonElement>(container, 'button[aria-label="Página anterior"]');
const proxima = (container: HTMLElement) => elemento<HTMLButtonElement>(container, 'button[aria-label="Próxima página"]');
const textoDaPaginacao = (container: HTMLElement) => anterior(container).nextElementSibling?.textContent;

const abrirVisaoCompleta = (container: HTMLElement) => clicar(botaoComTexto(container, VISAO_COMPLETA));
const abrirNoCartao = (container: HTMLElement, motivo: string) => {
  const achada = linhasDaLista(container).find((linha) => lerLinha(linha)[0] === motivo);
  if (!achada) throw new Error(`linha não encontrada: ${motivo}`);
  return clicar(achada);
};

const contador = (container: HTMLElement) =>
  todos(container, 'div').find((trecho) => trecho.childElementCount === 0 && / de \d+$/.test(trecho.textContent ?? ''))
    ?.textContent;

const faixaDeCartoes = (container: HTMLElement) => elemento(container, 'dl').parentElement?.parentElement as HTMLElement;
const setaDoEscritorio = (container: HTMLElement, nome: 'anterior' | 'próximo') =>
  elemento<HTMLButtonElement>(container, `button[aria-label="${nome}"]`);
const pontos = (container: HTMLElement) => todos<HTMLButtonElement>(container, 'button[aria-label^="ir para o registro"]');
const visaoMarcada = (container: HTMLElement) => [
  [LISTA, botaoComTexto(container, LISTA).ariaPressed],
  [VISAO_COMPLETA, botaoComTexto(container, VISAO_COMPLETA).ariaPressed],
];

describe('MeusRegistrosPage: cabeçalho e lista simplificada', () => {
  it('escritório — o cabeçalho traz o código F-02, o título e o subtítulo dos últimos 30 dias', async () => {
    const { container } = await montar(<MeusRegistrosPage />);

    expect(elemento(container, 'header').textContent).toBe(
      'F-02 · Meus registrosMeus registrosO que você lançou nos últimos 30 dias · CDD',
    );
  });

  it('campo — o cabeçalho traz só o código F-02 e o título', async () => {
    usarDensidade('field');
    const { container } = await montar(<MeusRegistrosPage />);

    expect(elemento(container, 'header').textContent).toBe('F-02Meus registros');
  });

  it('abre na lista simplificada, com o seletor marcado nela', async () => {
    const { container } = await montar(<MeusRegistrosPage />);

    expect(visaoMarcada(container)).toEqual([
      [LISTA, 'true'],
      [VISAO_COMPLETA, 'false'],
    ]);
  });

  it('primeira página — quatro lançamentos de Aurio Neto, com valor com o sinal do tipo e só o tipo como meta', async () => {
    const { container } = await montar(<MeusRegistrosPage />);

    expect(tabelaDaLista(container)).toEqual([
      ['mercado cerimônia mãe divina', valorDeSaida('187,40'), 'Saída'],
      ['contribuições da cerimônia de agosto', valorDeEntrada('940,00'), 'Entrada'],
      ['doação de padrinho para o dormitório', valorDeEntrada('3.000,00'), 'Entrada'],
      ['reforço do caixa em espécie', valorDeTransferencia('600,00'), 'Transferência'],
    ]);
  });

  it('segunda página — os outros quatro, inclusive o de julho, apesar do subtítulo dos últimos 30 dias', async () => {
    const { container } = await montar(<MeusRegistrosPage />);

    await clicar(proxima(container));

    expect(tabelaDaLista(container)).toEqual([
      ['contribuições da cerimônia de julho', valorDeEntrada('1.120,00'), 'Entrada'],
      ['velas e incenso para o salão', valorDeSaida('96,30'), 'Saída'],
      ['frete das garrafas do feitio', valorDeSaida('230,00'), 'Saída'],
      ['hospedagem extra de dois participantes', valorDeEntrada('200,00'), 'Entrada'],
    ]);
  });

  it.each([
    { motivo: 'mercado cerimônia mãe divina', borda: 'var(--color-confirmed)' },
    { motivo: 'reforço do caixa em espécie', borda: 'var(--color-pending)' },
  ])('a barra de estado da linha "$motivo" tem a cor $borda', async ({ motivo, borda }) => {
    const { container } = await montar(<MeusRegistrosPage />);

    const linha = linhasDaLista(container).find((candidata) => lerLinha(candidata)[0] === motivo) as HTMLButtonElement;

    expect(barraDeEstado(linha).style.background).toBe(borda);
  });

  it('escritório — o resumo diz quantos lançamentos, as saídas e as entradas, sem as transferências', async () => {
    const { container } = await montar(<MeusRegistrosPage />);

    expect(resumo(container)).toBe('8 lançamentos · saídas 513,70 · entradas 5.260,00');
  });

  it('campo — não há resumo de totais', async () => {
    usarDensidade('field');
    const { container } = await montar(<MeusRegistrosPage />);

    expect(resumo(container)).toBeNull();
    expect(container.textContent).not.toContain('saídas');
  });
});

describe('MeusRegistrosPage: totais com estorno', () => {
  it('saída estornada — fica fora das saídas, mas segue na lista e na contagem (Doc 8 §14, estorno nos totais)', async () => {
    registros.transformar = (lista) =>
      lista.map((registro) => (registro.id === lista[0]?.id ? { ...registro, status: 'ESTORNADO' as const } : registro));
    const { container } = await montar(<MeusRegistrosPage />);

    expect(resumo(container)).toBe('8 lançamentos · saídas 326,30 · entradas 5.260,00');
    expect(motivosDaLista(container)).toContain('mercado cerimônia mãe divina');
  });

  it('entrada estornada — continua somada nas entradas, ao contrário do que Lançamentos faz (Doc 8 §14, estorno nos totais)', async () => {
    registros.transformar = (lista) =>
      lista.map((registro) => (registro.id === lista[1]?.id ? { ...registro, status: 'ESTORNADO' as const } : registro));
    const { container } = await montar(<MeusRegistrosPage />);

    expect(resumo(container)).toBe('8 lançamentos · saídas 513,70 · entradas 5.260,00');
  });

  it('a linha estornada — leva a barra de estado de estornado', async () => {
    registros.transformar = (lista) =>
      lista.map((registro) => (registro.id === lista[1]?.id ? { ...registro, status: 'ESTORNADO' as const } : registro));
    const { container } = await montar(<MeusRegistrosPage />);

    const linha = linhasDaLista(container).find((candidata) => lerLinha(candidata)[0] === 'contribuições da cerimônia de agosto') as HTMLButtonElement;

    expect(barraDeEstado(linha).style.background).toBe('var(--color-neutral)');
  });

  it('um só registro — o resumo usa o singular', async () => {
    registros.transformar = (lista) => lista.slice(0, 1);
    const { container } = await montar(<MeusRegistrosPage />);

    expect(resumo(container)).toBe('1 lançamento · saídas 187,40 · entradas 0,00');
  });
});

describe('MeusRegistrosPage: paginação da lista', () => {
  it('primeira página — oito registros em duas páginas, com anterior desligado', async () => {
    const { container } = await montar(<MeusRegistrosPage />);

    expect(textoDaPaginacao(container)).toBe('Página 1 de 2');
    expect(anterior(container).disabled).toBe(true);
    expect(proxima(container).disabled).toBe(false);
  });

  it('próxima — vai para a segunda página, a última, e desliga a próxima', async () => {
    const { container } = await montar(<MeusRegistrosPage />);

    await clicar(proxima(container));

    expect(textoDaPaginacao(container)).toBe('Página 2 de 2');
    expect(proxima(container).disabled).toBe(true);
    expect(motivosDaLista(container)).toEqual(PAGINA_2);
  });

  it('anterior — volta para a primeira página', async () => {
    const { container } = await montar(<MeusRegistrosPage />);
    await clicar(proxima(container));

    await clicar(anterior(container));

    expect(motivosDaLista(container)).toEqual(PAGINA_1);
  });

  it('o texto da página não traz a contagem de lançamentos, ao contrário de Lançamentos', async () => {
    const { container } = await montar(<MeusRegistrosPage />);

    expect(textoDaPaginacao(container)).not.toContain('lançamento');
  });

  it.each([
    { quantos: 4, texto: 'Página 1 de 1' },
    { quantos: 5, texto: 'Página 1 de 2' },
    { quantos: 0, texto: 'Página 1 de 1' },
  ])('com $quantos registros — o texto é "$texto"', async ({ quantos, texto }) => {
    registros.transformar = (lista) => lista.slice(0, quantos);
    const { container } = await montar(<MeusRegistrosPage />);

    expect(textoDaPaginacao(container)).toBe(texto);
  });

  it('campo — a paginação usa só as setas', async () => {
    usarDensidade('field');
    const { container } = await montar(<MeusRegistrosPage />);

    expect(anterior(container).textContent).toBe('‹');
    expect(proxima(container).textContent).toBe('›');
  });
});

describe('MeusRegistrosPage: visão completa em carrossel', () => {
  it('abrir a visão completa — marca o seletor, esconde a lista e mostra o primeiro de oito', async () => {
    const { container } = await montar(<MeusRegistrosPage />);

    await abrirVisaoCompleta(container);

    expect(visaoMarcada(container)).toEqual([
      [LISTA, 'false'],
      [VISAO_COMPLETA, 'true'],
    ]);
    expect(linhasDaLista(container)).toHaveLength(0);
    expect(container.textContent).not.toContain('Página 1 de');
    expect(contador(container)).toBe('1 de 8');
  });

  it('os oito recibos ficam na faixa, na ordem dos registros, cada um com o título de data e hora', async () => {
    const { container } = await montar(<MeusRegistrosPage />);

    await abrirVisaoCompleta(container);

    expect(lerRecibos(container).map((recibo) => [recibo.titulo, recibo.valor])).toEqual([
      ['Registrado em 28/08/2026 às 14:22', valorDeSaida('187,40')],
      ['Registrado em 24/08/2026 às 19:40', valorDeEntrada('940,00')],
      ['Registrado em 15/08/2026 às 17:03', valorDeEntrada('3.000,00')],
      ['Registrado em 09/08/2026 às 20:11', valorDeTransferencia('600,00')],
      ['Registrado em 28/07/2026 às 19:55', valorDeEntrada('1.120,00')],
      ['Registrado em 26/08/2026 às 18:05', valorDeSaida('96,30')],
      ['Registrado em 21/08/2026 às 12:40', valorDeSaida('230,00')],
      ['Registrado em 23/08/2026 às 08:30', valorDeEntrada('200,00')],
    ]);
  });

  it('o recibo da saída traz conta, categoria e cerimônia — e o rodapé de consolidado (Doc 4, F-02: não exibe conta nem categoria)', async () => {
    const { container } = await montar(<MeusRegistrosPage />);

    await abrirVisaoCompleta(container);

    expect(lerRecibos(container)[0]).toEqual({
      titulo: 'Registrado em 28/08/2026 às 14:22',
      valor: valorDeSaida('187,40'),
      linhas: [
        ['Tipo', 'Saída'],
        ['O que foi', 'mercado cerimônia mãe divina'],
        ['Data', '28/08/2026'],
        ['Grupo', 'Cozinha'],
        ['Categoria', 'Alimentação de cerimônia'],
        ['Conta de saída', 'Cora PJ · Pix'],
        ['Cerimônia', '05/09 · Mãe Divina'],
        ['Comprovante', 'IMG_2481.jpg'],
      ],
      rodape: 'Consolidado por Aurio Neto. Alteração só por estorno, com motivo registrado.',
    });
  });

  it('o recibo da transferência pendente — troca grupo e categoria por saiu de e entrou em, e o rodapé diz a conferir', async () => {
    const { container } = await montar(<MeusRegistrosPage />);

    await abrirVisaoCompleta(container);

    expect(lerRecibos(container)[3]).toEqual({
      titulo: 'Registrado em 09/08/2026 às 20:11',
      valor: valorDeTransferencia('600,00'),
      linhas: [
        ['Tipo', 'Transferência entre contas'],
        ['Motivo', 'reforço do caixa em espécie'],
        ['Data', '09/08/2026'],
        ['Saiu de', 'Cora PJ'],
        ['Entrou em', 'Espécie'],
        ['Comprovante', 'sem anexo'],
      ],
      rodape: 'A conferir: lançado por Aurio Neto, ainda sem consolidação da tesouraria.',
    });
  });

  it('o recibo da entrada — traz de onde veio, conta de entrada e cerimônia, e comprovante sem anexo', async () => {
    const { container } = await montar(<MeusRegistrosPage />);

    await abrirVisaoCompleta(container);

    expect(lerRecibos(container)[1]?.linhas).toEqual([
      ['Tipo', 'Entrada'],
      ['De onde veio', 'contribuições da cerimônia de agosto'],
      ['Data', '24/08/2026'],
      ['Grupo', 'CDD'],
      ['Categoria', 'Contribuições'],
      ['Conta de entrada', 'Cora PJ · Pix'],
      ['Cerimônia', '22/08 · Mãe Divina'],
      ['Comprovante', 'sem anexo'],
    ]);
  });

  it('escritório — a faixa mostra o primeiro cartão e o cartão tem 560px de largura, com 20px de vão', async () => {
    const { container } = await montar(<MeusRegistrosPage />);

    await abrirVisaoCompleta(container);

    expect(faixaDeCartoes(container).style.transform).toBe('translateX(0px)');
    expect(faixaDeCartoes(container).style.gap).toBe('20px');
    expect((elemento(container, 'dl').parentElement as HTMLElement).style.flex).toBe('0 0 560px');
  });

  it('escritório — próximo anda um cartão (580px) e o contador mostra 2 de 8', async () => {
    const { container } = await montar(<MeusRegistrosPage />);
    await abrirVisaoCompleta(container);

    await clicar(setaDoEscritorio(container, 'próximo'));

    expect(contador(container)).toBe('2 de 8');
    expect(faixaDeCartoes(container).style.transform).toBe('translateX(-580px)');
  });

  it('escritório — anterior no primeiro cartão volta ao último, e próximo no último volta ao primeiro', async () => {
    const { container } = await montar(<MeusRegistrosPage />);
    await abrirVisaoCompleta(container);

    await clicar(setaDoEscritorio(container, 'anterior'));
    const noPrimeiroParaOUltimo = contador(container);
    await clicar(setaDoEscritorio(container, 'próximo'));

    expect(noPrimeiroParaOUltimo).toBe('8 de 8');
    expect(contador(container)).toBe('1 de 8');
  });

  it('escritório — oito pontos, o do cartão atual mais largo, e tocar num ponto vai para aquele cartão', async () => {
    const { container } = await montar(<MeusRegistrosPage />);
    await abrirVisaoCompleta(container);
    const larguraInicial = pontos(container).map((ponto) => ponto.style.width);

    await clicar(pontos(container)[4] as HTMLButtonElement);

    expect(pontos(container)).toHaveLength(8);
    expect(larguraInicial).toEqual(['26px', '9px', '9px', '9px', '9px', '9px', '9px', '9px']);
    expect(contador(container)).toBe('5 de 8');
    expect(pontos(container).map((ponto) => ponto.style.width)).toEqual(['9px', '9px', '9px', '9px', '26px', '9px', '9px', '9px']);
  });

  it('campo — o cartão tem 328px, o vão é de 12px, e não há setas redondas nem pontos nem rodapé no recibo', async () => {
    usarDensidade('field');
    const { container } = await montar(<MeusRegistrosPage />);

    await abrirVisaoCompleta(container);

    expect((elemento(container, 'dl').parentElement as HTMLElement).style.flex).toBe('0 0 328px');
    expect(faixaDeCartoes(container).style.gap).toBe('12px');
    expect(container.querySelector('button[aria-label="próximo"]')).toBeNull();
    expect(pontos(container)).toHaveLength(0);
    expect(lerRecibos(container).every((recibo) => recibo.rodape === null)).toBe(true);
  });

  it('campo — os botões largos Anterior e Próximo andam 340px por cartão e dão a volta nas pontas', async () => {
    usarDensidade('field');
    const { container } = await montar(<MeusRegistrosPage />);
    await abrirVisaoCompleta(container);

    await clicar(botaoComTexto(container, 'Próximo ›'));
    const transformDoSegundo = faixaDeCartoes(container).style.transform;
    await clicar(botaoComTexto(container, '‹ Anterior'));
    await clicar(botaoComTexto(container, '‹ Anterior'));

    expect(transformDoSegundo).toBe('translateX(-340px)');
    expect(contador(container)).toBe('8 de 8');
  });
});

describe('MeusRegistrosPage: ir da lista para o cartão e voltar', () => {
  it('tocar numa linha da primeira página — abre a visão completa naquele cartão', async () => {
    const { container } = await montar(<MeusRegistrosPage />);

    await abrirNoCartao(container, 'doação de padrinho para o dormitório');

    expect(contador(container)).toBe('3 de 8');
    expect(faixaDeCartoes(container).style.transform).toBe('translateX(-1160px)');
    expect(visaoMarcada(container)[1]).toEqual([VISAO_COMPLETA, 'true']);
  });

  it('tocar numa linha da segunda página — o cartão é o da posição absoluta, quinto a oitavo', async () => {
    const { container } = await montar(<MeusRegistrosPage />);
    await clicar(proxima(container));

    await abrirNoCartao(container, 'velas e incenso para o salão');

    expect(contador(container)).toBe('6 de 8');
    expect(faixaDeCartoes(container).style.transform).toBe('translateX(-2900px)');
  });

  it('voltar à lista simplificada — mostra de novo a página em que estava', async () => {
    const { container } = await montar(<MeusRegistrosPage />);
    await clicar(proxima(container));
    await abrirNoCartao(container, 'velas e incenso para o salão');

    await clicar(botaoComTexto(container, LISTA));

    expect(motivosDaLista(container)).toEqual(PAGINA_2);
    expect(textoDaPaginacao(container)).toBe('Página 2 de 2');
  });

  it('alternar para a visão completa à mão — mantém o cartão em que ficou da última vez', async () => {
    const { container } = await montar(<MeusRegistrosPage />);
    await abrirNoCartao(container, 'doação de padrinho para o dormitório');
    await clicar(botaoComTexto(container, LISTA));

    await abrirVisaoCompleta(container);

    expect(contador(container)).toBe('3 de 8');
  });
});

describe('MeusRegistrosPage: sem nenhum registro', () => {
  it('lista — não mostra linha nenhuma nem estado vazio, só a paginação em 1 de 1', async () => {
    registros.transformar = () => [];
    const { container } = await montar(<MeusRegistrosPage />);

    expect(linhasDaLista(container)).toHaveLength(0);
    expect(textoDaPaginacao(container)).toBe('Página 1 de 1');
    expect(anterior(container).disabled).toBe(true);
    expect(proxima(container).disabled).toBe(true);
    expect(resumo(container)).toBe('0 lançamentos · saídas 0,00 · entradas 0,00');
  });

  it('visão completa — o contador mostra 1 de 0 e, ao tocar em próximo, o índice vira NaN', async () => {
    registros.transformar = () => [];
    const { container } = await montar(<MeusRegistrosPage />);
    await abrirVisaoCompleta(container);
    const antes = contador(container);

    await clicar(setaDoEscritorio(container, 'próximo'));

    expect(antes).toBe('1 de 0');
    expect(todos(container, 'div').some((trecho) => trecho.childElementCount === 0 && trecho.textContent === 'NaN de 0')).toBe(true);
  });
});
