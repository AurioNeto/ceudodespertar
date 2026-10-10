import { act } from 'react';
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
import { AyahuascaPage } from './AyahuascaPage';

type Densidade = 'office' | 'field';

function definirDensidade(densidade: Densidade) {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    media: consulta,
    matches: densidade === 'field',
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

const HOJE_DA_DEMONSTRACAO = '2026-09-02T12:00:00Z';

beforeEach(() => {
  definirDensidade('office');
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(HOJE_DA_DEMONSTRACAO));
});

afterEach(async () => {
  await desmontarTudo();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const COR = {
  confirmado: 'var(--color-confirmed)',
  atencao: 'var(--color-attention)',
  pendente: 'var(--color-pending)',
  royal: 'var(--color-royal)',
  royalDoSelo: 'var(--color-royal-ink)',
  neutro: 'var(--color-neutral)',
  linhaForte: 'var(--color-line-strong)',
} as const;

const folhasDe = (origem: ParentNode) =>
  todos<HTMLSpanElement>(origem, 'span').filter(
    (span) => span.childElementCount === 0 && span.textContent !== '' && span.getAttribute('aria-hidden') !== 'true',
  );

const textosDasFolhas = (origem: ParentNode) => folhasDe(origem).map((folha) => folha.textContent);

const indicador = (container: HTMLElement, rotulo: string) => {
  const cartao = folhaComTexto(container, 'span', rotulo).parentElement;
  return Array.from(cartao?.children ?? []).map((filho) => filho.textContent);
};

const corDoIndicador = (container: HTMLElement, rotulo: string) =>
  (folhaComTexto(container, 'span', rotulo).nextElementSibling as HTMLElement).style.color;

const textoDoAviso = (container: HTMLElement) =>
  elemento(container, 'button[aria-label="fechar aviso"]').previousElementSibling?.textContent;

const semAviso = (container: HTMLElement) => container.querySelector('button[aria-label="fechar aviso"]') === null;

const faixaDeAlerta = (container: HTMLElement) => {
  const icone = todos(container, 'svg').find((svg) => svg.closest('div')?.style.background === 'var(--color-pending-soft)');
  return icone?.nextElementSibling?.textContent ?? null;
};

const botaoPresente = (container: HTMLElement, texto: string) =>
  todos<HTMLButtonElement>(container, 'button').some((botao) => botao.textContent?.trim() === texto);

const campo = <T extends HTMLElement = HTMLInputElement>(origem: ParentNode, rotulo: string): T => {
  const etiqueta = todos<HTMLLabelElement>(origem, 'label').find((candidata) => candidata.textContent === rotulo);
  if (!etiqueta?.control) throw new Error(`campo não encontrado: ${rotulo}`);
  return etiqueta.control as T;
};

const cartaoDoLote = (container: HTMLElement, codigo: string) => {
  const achado = todos<HTMLButtonElement>(container, 'button').find((botao) => botao.textContent?.startsWith(codigo));
  if (!achado) throw new Error(`lote não encontrado: ${codigo}`);
  return achado;
};

const codigosDosLotes = (container: HTMLElement) =>
  todos<HTMLButtonElement>(container, 'button')
    .filter((botao) => /^Lote \d\d\/\d{4}/.test(botao.textContent ?? ''))
    .map((botao) => textosDasFolhas(botao)[0]);

const barraDoLote = (cartao: HTMLElement) => {
  const barra = todos<HTMLSpanElement>(cartao, 'span').find((span) => span.style.height === '100%');
  if (!barra) throw new Error('barra do lote não encontrada');
  return barra;
};

const painelDaFicha = (container: HTMLElement) =>
  elemento(container, 'button[aria-label="Fechar ficha"]').parentElement?.parentElement as HTMLElement;

const fichaAberta = (container: HTMLElement) => container.querySelector('button[aria-label="Fechar ficha"]') !== null;

const painelDoModal = (container: HTMLElement) =>
  elemento(container, 'button[aria-label="fechar"]').parentElement?.parentElement as HTMLElement;

const modalAberto = (container: HTMLElement) => container.querySelector('button[aria-label="fechar"]') !== null;

const tituloDoModal = (container: HTMLElement) => textosDasFolhas(painelDoModal(container))[0];

const elementosDeMovimento = (container: HTMLElement) => {
  const ancora = folhasDe(container).find((folha) => /^\d\d\/\d\d\/\d{4}/.test(folha.textContent ?? ''));
  const linha = ancora?.closest('div');
  return Array.from(linha?.parentElement?.children ?? []) as HTMLElement[];
};

const linhasDeMovimento = (container: HTMLElement) =>
  elementosDeMovimento(container).map((linha) => linha.textContent);

const reservaDe = (container: HTMLElement, nome: string) => {
  const titulo = folhaComTexto(container, 'span', nome);
  return titulo.parentElement?.parentElement as HTMLElement;
};

const abaAtiva = (container: HTMLElement) =>
  todos<HTMLButtonElement>(container, 'button[aria-pressed="true"]').map((botao) => botao.textContent);

async function montarAyahuasca() {
  const montado = await montar(<AyahuascaPage />);
  return montado.container;
}

const abrirAba = (container: HTMLElement, aba: 'Lotes' | 'Movimentos' | 'Reservas') =>
  clicar(botaoComTexto(container, aba));

async function abrirLote(container: HTMLElement, codigo: string) {
  await clicar(cartaoDoLote(container, codigo));
}

async function fecharFicha(container: HTMLElement) {
  await clicar(elemento(container, 'button[aria-label="Fechar ficha"]'));
}

async function colocarEmQuarentena(container: HTMLElement, codigo: string) {
  await abrirLote(container, codigo);
  await clicar(botaoComTexto(container, 'Pôr em quarentena'));
  await fecharFicha(container);
}

async function abrirEntradaDeFeitio(container: HTMLElement) {
  await clicar(botaoComTexto(container, 'Entrada de feitio'));
}

async function abrirSaida(container: HTMLElement) {
  await clicar(botaoComTexto(container, 'Registrar saída'));
}

async function abrirTransferencia(container: HTMLElement) {
  await clicar(botaoComTexto(container, 'Transferir'));
}

async function salvar(container: HTMLElement) {
  await clicar(botaoComTexto(container, 'Salvar'));
}

async function registrarEntradaDeFeitio(container: HTMLElement, codigo: string, litros: string) {
  await abrirEntradaDeFeitio(container);
  await digitar(campo(container, 'Código do lote'), codigo);
  await digitar(campo(container, 'Litros'), litros);
  await salvar(container);
}

async function registrarSaida(container: HTMLElement, litros: string, trabalho = '') {
  await abrirSaida(container);
  await digitar(campo(container, 'Trabalho'), trabalho);
  await digitar(campo(container, 'Litros'), litros);
  await salvar(container);
}

describe('AyahuascaPage: cabeçalho nas duas densidades', () => {
  it('escritório — mostra o código com o nome da tela, o título, o subtítulo e as três ações', async () => {
    const container = await montarAyahuasca();

    const cabecalho = elemento(container, 'header');

    expect(elemento(cabecalho, 'h1').textContent).toBe('Ayahuasca');
    expect(folhaComTexto(cabecalho, 'div', 'E-02 · Ayahuasca')).toBeTruthy();
    expect(folhaComTexto(cabecalho, 'p', 'Lotes, movimentos e reservas por trabalho · CDD')).toBeTruthy();
    expect(todos(cabecalho, 'button').map((botao) => botao.textContent)).toEqual([
      'Entrada de feitio',
      'Registrar saída',
      'Transferir',
    ]);
  });

  it('campo — mostra só o código e o título, sem subtítulo, com as mesmas três ações', async () => {
    definirDensidade('field');
    const container = await montarAyahuasca();

    const cabecalho = elemento(container, 'header');

    expect(folhaComTexto(cabecalho, 'div', 'E-02')).toBeTruthy();
    expect(cabecalho.querySelector('p')).toBeNull();
    expect(todos(cabecalho, 'button').map((botao) => botao.textContent)).toEqual([
      'Entrada de feitio',
      'Registrar saída',
      'Transferir',
    ]);
  });
});

describe('AyahuascaPage: indicadores', () => {
  it.each([
    { nome: 'escritório', densidade: 'office' as const },
    { nome: 'campo', densidade: 'field' as const },
  ])('$nome — mostra estoque, reservado, livre e previsto, cada um com a nota', async ({ densidade }) => {
    definirDensidade(densidade);
    const container = await montarAyahuasca();

    expect(indicador(container, 'Em estoque')).toEqual(['Em estoque', '54,5 L', '3 lotes com daime']);
    expect(indicador(container, 'Reservado')).toEqual(['Reservado', '9,0 L', 'separado para trabalhos confirmados']);
    expect(indicador(container, 'Livre')).toEqual(['Livre', '45,5 L', 'disponível para novas reservas']);
    expect(indicador(container, 'Previsto até out.')).toEqual(['Previsto até out.', '29,0 L', '3 trabalhos na agenda']);
  });

  it('livre positivo — usa o tom confirmado; reservado e previsto usam a cor do texto', async () => {
    const container = await montarAyahuasca();

    expect(corDoIndicador(container, 'Livre')).toBe(COR.confirmado);
    expect(corDoIndicador(container, 'Reservado')).toBe('var(--text-primary)');
    expect(corDoIndicador(container, 'Previsto até out.')).toBe('var(--text-primary)');
  });

  it('estado inicial — sem faixa de alerta: o previsto cabe no estoque e nada está em quarentena', async () => {
    const container = await montarAyahuasca();

    expect(faixaDeAlerta(container)).toBeNull();
  });
});

describe('AyahuascaPage: abas', () => {
  it('estado inicial — abre em Lotes, com as três abas e só ela marcada', async () => {
    const container = await montarAyahuasca();

    expect(abaAtiva(container)).toEqual(['Lotes']);
    expect(botaoPresente(container, 'Movimentos')).toBe(true);
    expect(botaoPresente(container, 'Reservas')).toBe(true);
  });

  it.each([
    { nome: 'Movimentos', aba: 'Movimentos' as const, marca: 'Saída para trabalho' },
    { nome: 'Reservas', aba: 'Reservas' as const, marca: 'Reservar separa do livre' },
  ])('aba $nome — troca o conteúdo e tira os lotes da tela', async ({ aba, marca }) => {
    const container = await montarAyahuasca();

    await abrirAba(container, aba);

    expect(abaAtiva(container)).toEqual([aba]);
    expect(container.textContent).toContain(marca);
    expect(codigosDosLotes(container)).toEqual([]);
  });

  it('voltar para Lotes — mostra os quatro lotes de novo', async () => {
    const container = await montarAyahuasca();
    await abrirAba(container, 'Movimentos');

    await abrirAba(container, 'Lotes');

    expect(codigosDosLotes(container)).toHaveLength(4);
  });
});

describe('AyahuascaPage: aba Lotes', () => {
  it.each([
    { nome: 'escritório', densidade: 'office' as const },
    { nome: 'campo', densidade: 'field' as const },
  ])('$nome — lista os quatro lotes na ordem do cadastro', async ({ densidade }) => {
    definirDensidade(densidade);
    const container = await montarAyahuasca();

    expect(codigosDosLotes(container)).toEqual(['Lote 12/2025', 'Lote 06/2026', 'Lote 03/2026', 'Lote 09/2025']);
  });

  it('lote em uso — mostra código, situação, origem e data, restante de entrada, força, local e guardião', async () => {
    const container = await montarAyahuasca();

    expect(textosDasFolhas(cartaoDoLote(container, 'Lote 12/2025'))).toEqual([
      'Lote 12/2025',
      'Em uso',
      'Feitio de dezembro · CDD · 18/12/2025',
      '23,5 L',
      'de 42,0 L',
      'Força 2 · Despensa do salão',
      'Chico Aguiar',
    ]);
  });

  it.each([
    { nome: 'em uso', codigo: 'Lote 12/2025', situacao: 'Em uso', cor: COR.confirmado },
    { nome: 'lacrado', codigo: 'Lote 06/2026', situacao: 'Lacrado', cor: COR.royalDoSelo },
    { nome: 'esgotado', codigo: 'Lote 09/2025', situacao: 'Esgotado', cor: COR.neutro },
  ])('lote $nome — o selo tem o texto $situacao no tom correspondente', async ({ codigo, situacao, cor }) => {
    const container = await montarAyahuasca();

    const selo = folhaComTexto<HTMLSpanElement>(cartaoDoLote(container, codigo), 'span', situacao);

    expect(selo.style.color).toBe(cor);
  });

  it.each([
    { nome: 'com saldo pela metade', codigo: 'Lote 12/2025', largura: 55.95, cor: COR.royal },
    { nome: 'quase cheio', codigo: 'Lote 06/2026', largura: 90, cor: COR.royal },
    { nome: 'com um terço', codigo: 'Lote 03/2026', largura: 33.33, cor: COR.royal },
  ])('barra do lote $nome — a largura é o restante sobre a entrada, em royal', async ({ codigo, largura, cor }) => {
    const container = await montarAyahuasca();

    const barra = barraDoLote(cartaoDoLote(container, codigo));

    expect(parseFloat(barra.style.width)).toBeCloseTo(largura, 2);
    expect(barra.style.background).toBe(cor);
  });

  it('barra do lote esgotado — fica vazia e na cor da linha forte', async () => {
    const container = await montarAyahuasca();

    const barra = barraDoLote(cartaoDoLote(container, 'Lote 09/2025'));

    expect(barra.style.width).toBe('0%');
    expect(barra.style.background).toBe(COR.linhaForte);
  });
});

describe('AyahuascaPage: ficha do lote', () => {
  it('clicar no lote — abre a ficha com o código, a situação e os oito dados', async () => {
    const container = await montarAyahuasca();

    await abrirLote(container, 'Lote 12/2025');

    expect(textosDasFolhas(painelDaFicha(container)).slice(0, 18)).toEqual([
      'Lote 12/2025',
      'Em uso',
      'Restante',
      '23,5 L',
      'Entrada',
      '42,0 L',
      'Força',
      'Força 2',
      'Origem',
      'Feitio de dezembro · CDD',
      'Local',
      'Despensa do salão',
      'Guardião',
      'Chico Aguiar',
      'Envase',
      '47 garrafas de 500 ml',
      'Análise',
      'aprovada em 20/12/2025',
    ]);
  });

  it('ficha — lista os movimentos do lote, do mais novo para o mais antigo, com sinal e litros', async () => {
    const container = await montarAyahuasca();

    await abrirLote(container, 'Lote 12/2025');

    expect(textosDasFolhas(painelDaFicha(container)).slice(18)).toEqual([
      'Movimentos deste lote',
      '22/08/2026',
      'Saída para trabalho · Mãe Divina · agosto',
      '− 8,0 L',
      '25/07/2026',
      'Saída para trabalho · São Miguel · julho',
      '− 7,5 L',
      '18/12/2025',
      'Entrada · Feitio de dezembro',
      '+ 42,0 L',
    ]);
  });

  it('ficha de lote com transferência e perda — mostra os rótulos e o sinal de menos nos dois', async () => {
    const container = await montarAyahuasca();

    await abrirLote(container, 'Lote 03/2026');
    const doLote3 = textosDasFolhas(painelDaFicha(container)).slice(19);
    await fecharFicha(container);
    await abrirLote(container, 'Lote 09/2025');
    const doLote4 = textosDasFolhas(painelDaFicha(container)).slice(19);

    expect(doLote3).toContain('Transferência · Repasse ao Céu do Vale');
    expect(doLote3).toContain('− 3,0 L');
    expect(doLote4).toEqual(['10/11/2025', 'Perda · Garrafa quebrada no transporte', '− 1,5 L']);
  });

  it('Fechar ficha — fecha a ficha', async () => {
    const container = await montarAyahuasca();
    await abrirLote(container, 'Lote 12/2025');

    await fecharFicha(container);

    expect(fichaAberta(container)).toBe(false);
  });

  it('clicar no fundo escuro — fecha a ficha', async () => {
    const container = await montarAyahuasca();
    await abrirLote(container, 'Lote 12/2025');

    await clicar(painelDaFicha(container).parentElement as HTMLElement);

    expect(fichaAberta(container)).toBe(false);
  });

  it('clicar dentro da ficha — não fecha', async () => {
    const container = await montarAyahuasca();
    await abrirLote(container, 'Lote 12/2025');

    await clicar(painelDaFicha(container));

    expect(fichaAberta(container)).toBe(true);
  });

  it('campo — abre a mesma ficha, com os mesmos dados', async () => {
    definirDensidade('field');
    const container = await montarAyahuasca();

    await abrirLote(container, 'Lote 06/2026');

    expect(textosDasFolhas(painelDaFicha(container)).slice(0, 6)).toEqual([
      'Lote 06/2026',
      'Lacrado',
      'Restante',
      '27,0 L',
      'Entrada',
      '30,0 L',
    ]);
  });
});

describe('AyahuascaPage: quarentena', () => {
  it('lote que não está em quarentena — a ficha oferece Pôr em quarentena', async () => {
    const container = await montarAyahuasca();

    await abrirLote(container, 'Lote 12/2025');

    expect(botaoPresente(container, 'Pôr em quarentena')).toBe(true);
    expect(botaoPresente(container, 'Tirar da quarentena')).toBe(false);
  });

  it('Pôr em quarentena — avisa, muda o selo da ficha e passa a oferecer Tirar da quarentena', async () => {
    const container = await montarAyahuasca();
    await abrirLote(container, 'Lote 12/2025');

    await clicar(botaoComTexto(container, 'Pôr em quarentena'));

    expect(textoDoAviso(container)).toBe('Lote 12/2025 posto em quarentena — fora do estoque disponível.');
    expect(textosDasFolhas(painelDaFicha(container))[1]).toBe('Quarentena');
    expect(folhaComTexto<HTMLSpanElement>(painelDaFicha(container), 'span', 'Quarentena').style.color).toBe(COR.pendente);
    expect(botaoPresente(container, 'Tirar da quarentena')).toBe(true);
  });

  it('Pôr em quarentena — tira o lote de Em estoque e de Livre, e a faixa avisa quanto está em quarentena', async () => {
    const container = await montarAyahuasca();

    await colocarEmQuarentena(container, 'Lote 12/2025');

    expect(indicador(container, 'Em estoque')).toEqual(['Em estoque', '31,0 L', '3 lotes com daime']);
    expect(indicador(container, 'Livre')).toEqual(['Livre', '22,0 L', 'disponível para novas reservas']);
    expect(faixaDeAlerta(container)).toBe('Há 23,5 L em quarentena, fora do estoque disponível.');
  });

  it('Pôr em quarentena — a contagem de lotes com daime continua contando o lote em quarentena', async () => {
    const container = await montarAyahuasca();

    await colocarEmQuarentena(container, 'Lote 12/2025');

    expect(indicador(container, 'Em estoque')[2]).toBe('3 lotes com daime');
  });

  it('lote em quarentena — o cartão mostra o selo Quarentena e a barra na cor pendente', async () => {
    const container = await montarAyahuasca();

    await colocarEmQuarentena(container, 'Lote 12/2025');

    const cartao = cartaoDoLote(container, 'Lote 12/2025');
    expect(folhaComTexto<HTMLSpanElement>(cartao, 'span', 'Quarentena').style.color).toBe(COR.pendente);
    expect(barraDoLote(cartao).style.background).toBe(COR.pendente);
  });

  it('Tirar da quarentena — avisa e devolve o lote ao estoque como Em uso', async () => {
    const container = await montarAyahuasca();
    await abrirLote(container, 'Lote 12/2025');
    await clicar(botaoComTexto(container, 'Pôr em quarentena'));

    await clicar(botaoComTexto(container, 'Tirar da quarentena'));

    expect(textoDoAviso(container)).toBe('Lote 12/2025 saiu da quarentena.');
    expect(textosDasFolhas(painelDaFicha(container))[1]).toBe('Em uso');
    await fecharFicha(container);
    expect(indicador(container, 'Em estoque')[1]).toBe('54,5 L');
    expect(faixaDeAlerta(container)).toBeNull();
  });

  it('lote lacrado que passa pela quarentena — volta como Em uso, não como Lacrado', async () => {
    const container = await montarAyahuasca();
    await abrirLote(container, 'Lote 06/2026');
    await clicar(botaoComTexto(container, 'Pôr em quarentena'));

    await clicar(botaoComTexto(container, 'Tirar da quarentena'));

    expect(textosDasFolhas(painelDaFicha(container))[1]).toBe('Em uso');
  });

  it('lote esgotado que passa pela quarentena — volta como Esgotado', async () => {
    const container = await montarAyahuasca();
    await abrirLote(container, 'Lote 09/2025');
    await clicar(botaoComTexto(container, 'Pôr em quarentena'));

    await clicar(botaoComTexto(container, 'Tirar da quarentena'));

    expect(textosDasFolhas(painelDaFicha(container))[1]).toBe('Esgotado');
  });

  it('estoque abaixo do previsto — a faixa diz quanto falta e esconde o aviso da quarentena', async () => {
    const container = await montarAyahuasca();

    await colocarEmQuarentena(container, 'Lote 06/2026');

    expect(faixaDeAlerta(container)).toBe(
      'Os trabalhos da agenda pedem 29,0 L e o estoque tem 27,5 L. Faltam 1,5 L até o bailado de 27/09.',
    );
    expect(container.textContent).not.toContain('em quarentena, fora do estoque disponível');
  });

  it('estoque igual ao previsto — não mostra a faixa de alerta', async () => {
    const container = await montarAyahuasca();
    await abrirSaida(container);
    await escolherOpcao(campo<HTMLSelectElement>(container, 'Lote'), '2');
    await digitar(campo(container, 'Litros'), '25,5');

    await salvar(container);

    expect(indicador(container, 'Em estoque')[1]).toBe('29,0 L');
    expect(faixaDeAlerta(container)).toBeNull();
  });

  it('estoque um décimo abaixo do previsto — mostra a faixa com a falta de 0,1 L', async () => {
    const container = await montarAyahuasca();
    await abrirSaida(container);
    await escolherOpcao(campo<HTMLSelectElement>(container, 'Lote'), '2');
    await digitar(campo(container, 'Litros'), '25,6');

    await salvar(container);

    expect(faixaDeAlerta(container)).toBe(
      'Os trabalhos da agenda pedem 29,0 L e o estoque tem 28,9 L. Faltam 0,1 L até o bailado de 27/09.',
    );
  });

  it('livre exatamente zero — continua como disponível, na cor confirmado', async () => {
    const container = await montarAyahuasca();
    await abrirSaida(container);
    await digitar(campo(container, 'Litros'), '23,5');
    await salvar(container);
    vi.setSystemTime(new Date('2026-09-02T12:00:05Z'));
    await abrirSaida(container);
    await digitar(campo(container, 'Litros'), '18');
    await salvar(container);
    vi.setSystemTime(new Date('2026-09-02T12:00:10Z'));
    await abrirSaida(container);
    await digitar(campo(container, 'Litros'), '4');

    await salvar(container);

    expect(indicador(container, 'Livre')).toEqual(['Livre', '0,0 L', 'disponível para novas reservas']);
    expect(corDoIndicador(container, 'Livre')).toBe(COR.confirmado);
  });

  it('reservas acima do estoque — Livre fica negativo, na cor de atenção, com a nota que explica', async () => {
    const container = await montarAyahuasca();
    await colocarEmQuarentena(container, 'Lote 12/2025');
    await colocarEmQuarentena(container, 'Lote 06/2026');

    expect(indicador(container, 'Livre')).toEqual(['Livre', '-5,0 L', 'reservas passam do estoque']);
    expect(corDoIndicador(container, 'Livre')).toBe(COR.atencao);
  });
});

describe('AyahuascaPage: aba Movimentos', () => {
  it('escritório — lista os oito movimentos na ordem do cadastro, com data, tipo, lote, destino, responsável e litros', async () => {
    const container = await montarAyahuasca();

    await abrirAba(container, 'Movimentos');

    expect(linhasDeMovimento(container)).toEqual([
      '22/08/2026Saída para trabalhoLote 12/2025Mãe Divina · agosto · Chico Aguiar− 8,0 L',
      '25/07/2026Saída para trabalhoLote 12/2025São Miguel · julho · Chico Aguiar− 7,5 L',
      '22/06/2026EntradaLote 06/2026Feitio de junho · Chico Aguiar+ 30,0 L',
      '20/06/2026Saída para trabalhoLote 03/2026São João · junho · Lucia Prado− 5,0 L',
      '02/06/2026TransferênciaLote 03/2026Repasse ao Céu do Vale · Aurio Neto− 3,0 L',
      '14/03/2026EntradaLote 03/2026Recebido do Céu do Mar · Lucia Prado+ 12,0 L',
      '18/12/2025EntradaLote 12/2025Feitio de dezembro · Chico Aguiar+ 42,0 L',
      '10/11/2025PerdaLote 09/2025Garrafa quebrada no transporte · Chico Aguiar− 1,5 L',
    ]);
  });

  it('escritório — cada linha leva o filete embaixo, menos a última', async () => {
    const container = await montarAyahuasca();

    await abrirAba(container, 'Movimentos');

    const filetes = elementosDeMovimento(container).map((linha) => linha.style.borderBottom);
    expect(filetes).toEqual([
      ...Array(7).fill('var(--border-hairline)'),
      '0px',
    ]);
  });

  it('campo — mostra o destino em cima e data, tipo e lote embaixo, sem o responsável', async () => {
    definirDensidade('field');
    const container = await montarAyahuasca();

    await abrirAba(container, 'Movimentos');

    expect(linhasDeMovimento(container).slice(0, 3)).toEqual([
      'Mãe Divina · agosto22/08/2026 · Saída para trabalho · Lote 12/2025− 8,0 L',
      'São Miguel · julho25/07/2026 · Saída para trabalho · Lote 12/2025− 7,5 L',
      'Feitio de junho22/06/2026 · Entrada · Lote 06/2026+ 30,0 L',
    ]);
    expect(container.textContent).not.toContain('Chico Aguiar');
  });

  it.each([
    { nome: 'entrada', rotulo: 'Entrada', cor: COR.confirmado },
    { nome: 'perda', rotulo: 'Perda', cor: COR.atencao },
    { nome: 'transferência', rotulo: 'Transferência', cor: COR.royal },
    { nome: 'saída', rotulo: 'Saída para trabalho', cor: 'var(--text-primary)' },
  ])('movimento de $nome — o rótulo tem a cor correspondente', async ({ rotulo, cor }) => {
    const container = await montarAyahuasca();
    await abrirAba(container, 'Movimentos');

    const rotuloDoPrimeiro = folhaComTexto<HTMLSpanElement>(container, 'span', rotulo);

    expect(rotuloDoPrimeiro.style.color).toBe(cor);
  });
});

describe('AyahuascaPage: avisos', () => {
  it('fechar aviso — tira o aviso da tela e não desfaz o que o aviso contou', async () => {
    const container = await montarAyahuasca();
    await registrarSaida(container, '8', 'Mãe Divina · setembro');

    await clicar(elemento(container, 'button[aria-label="fechar aviso"]'));

    expect(semAviso(container)).toBe(true);
    expect(textosDasFolhas(cartaoDoLote(container, 'Lote 12/2025'))[3]).toBe('15,5 L');
  });

  it('aviso aberto — continua na tela quando a aba muda', async () => {
    const container = await montarAyahuasca();
    await registrarSaida(container, '8', 'Mãe Divina · setembro');

    await abrirAba(container, 'Movimentos');

    expect(textoDoAviso(container)).toBe('Baixa de 8,0 L em Lote 12/2025.');
  });

  it('um aviso novo — troca o anterior em vez de empilhar', async () => {
    const container = await montarAyahuasca();
    await registrarSaida(container, '8', 'Mãe Divina · setembro');
    vi.setSystemTime(new Date('2026-09-02T12:00:05Z'));

    await registrarSaida(container, '1', 'São Miguel');

    expect(todos(container, 'button[aria-label="fechar aviso"]')).toHaveLength(1);
    expect(textoDoAviso(container)).toBe('Baixa de 1,0 L em Lote 12/2025.');
  });

  it('aviso aberto — continua na tela quando a ficha de um lote abre', async () => {
    const container = await montarAyahuasca();
    await registrarSaida(container, '8', 'Mãe Divina · setembro');

    await abrirLote(container, 'Lote 12/2025');

    expect(fichaAberta(container)).toBe(true);
    expect(textoDoAviso(container)).toBe('Baixa de 8,0 L em Lote 12/2025.');
  });

  it.each([
    { nome: 'entrada de feitio', abrir: abrirEntradaDeFeitio },
    { nome: 'saída', abrir: abrirSaida },
    { nome: 'transferência', abrir: abrirTransferencia },
  ])('aviso aberto — continua na tela quando o modal de $nome abre', async ({ abrir }) => {
    const container = await montarAyahuasca();
    await registrarSaida(container, '8', 'Mãe Divina · setembro');

    await abrir(container);

    expect(modalAberto(container)).toBe(true);
    expect(textoDoAviso(container)).toBe('Baixa de 8,0 L em Lote 12/2025.');
  });
});

describe('AyahuascaPage: aba Reservas', () => {
  it('lista as três reservas com dia e mês, litros previstos e a situação de cada uma', async () => {
    const container = await montarAyahuasca();

    await abrirAba(container, 'Reservas');

    expect(textosDasFolhas(reservaDe(container, 'Mãe Divina'))).toEqual([
      'Mãe Divina',
      '5/set · 9,0 L previstos',
      'Reservado',
    ]);
    expect(textosDasFolhas(reservaDe(container, 'Trabalho de cura'))).toEqual([
      'Trabalho de cura',
      '19/set · 6,0 L previstos',
      'Sem reserva',
    ]);
    expect(textosDasFolhas(reservaDe(container, 'Bailado de São Miguel'))).toEqual([
      'Bailado de São Miguel',
      '27/set · 14,0 L previstos',
      'Sem reserva',
    ]);
  });

  it('reserva feita — o selo é confirmado e o botão é Liberar; sem reserva, o selo é pendente e o botão é Reservar', async () => {
    const container = await montarAyahuasca();

    await abrirAba(container, 'Reservas');

    expect(folhaComTexto<HTMLSpanElement>(reservaDe(container, 'Mãe Divina'), 'span', 'Reservado').style.color).toBe(COR.confirmado);
    expect(botaoPresente(container, 'Liberar')).toBe(true);
    expect(folhaComTexto<HTMLSpanElement>(reservaDe(container, 'Trabalho de cura'), 'span', 'Sem reserva').style.color).toBe(COR.pendente);
    expect(todos(container, 'button').filter((botao) => botao.textContent === 'Reservar')).toHaveLength(2);
  });

  it('reserva feita — o cartão leva a borda lateral verde; sem reserva, a borda é a linha forte', async () => {
    const container = await montarAyahuasca();

    await abrirAba(container, 'Reservas');

    expect([
      reservaDe(container, 'Mãe Divina').style.borderLeft,
      reservaDe(container, 'Trabalho de cura').style.borderLeft,
    ]).toEqual([`3px solid ${COR.confirmado}`, `3px solid ${COR.linhaForte}`]);
  });

  it('Reservar — avisa com os litros e o trabalho, e soma ao Reservado e tira do Livre', async () => {
    const container = await montarAyahuasca();
    await abrirAba(container, 'Reservas');

    await clicar(
      todos<HTMLButtonElement>(reservaDe(container, 'Trabalho de cura'), 'button').find(
        (botao) => botao.textContent === 'Reservar',
      ) as HTMLElement,
    );

    expect(textoDoAviso(container)).toBe('6,0 L reservados para Trabalho de cura.');
    expect(indicador(container, 'Reservado')[1]).toBe('15,0 L');
    expect(indicador(container, 'Livre')[1]).toBe('39,5 L');
    expect(textosDasFolhas(reservaDe(container, 'Trabalho de cura'))[2]).toBe('Reservado');
  });

  it('Liberar — avisa que os litros voltam para o livre e devolve o Reservado e o Livre', async () => {
    const container = await montarAyahuasca();
    await abrirAba(container, 'Reservas');

    await clicar(botaoComTexto(reservaDe(container, 'Mãe Divina'), 'Liberar'));

    expect(textoDoAviso(container)).toBe('Reserva liberada: 9,0 L voltam para o livre.');
    expect(indicador(container, 'Reservado')[1]).toBe('0,0 L');
    expect(indicador(container, 'Livre')[1]).toBe('54,5 L');
    expect(textosDasFolhas(reservaDe(container, 'Mãe Divina'))[2]).toBe('Sem reserva');
  });

  it('reservar os três trabalhos — Reservado chega a 29,0 L e Livre a 25,5 L', async () => {
    const container = await montarAyahuasca();
    await abrirAba(container, 'Reservas');

    await clicar(botaoComTexto(reservaDe(container, 'Trabalho de cura'), 'Reservar'));
    await clicar(botaoComTexto(reservaDe(container, 'Bailado de São Miguel'), 'Reservar'));

    expect(indicador(container, 'Reservado')[1]).toBe('29,0 L');
    expect(indicador(container, 'Livre')[1]).toBe('25,5 L');
  });

  it('reservar e liberar — não mexe em Previsto: ele soma todos os trabalhos, reservados ou não', async () => {
    const container = await montarAyahuasca();
    await abrirAba(container, 'Reservas');

    await clicar(botaoComTexto(reservaDe(container, 'Mãe Divina'), 'Liberar'));

    expect(indicador(container, 'Previsto até out.')[1]).toBe('29,0 L');
  });

  it('reservar — não baixa nenhum lote: a reserva só separa do livre', async () => {
    const container = await montarAyahuasca();
    await abrirAba(container, 'Reservas');
    await clicar(botaoComTexto(reservaDe(container, 'Trabalho de cura'), 'Reservar'));

    await abrirAba(container, 'Lotes');

    expect(textosDasFolhas(cartaoDoLote(container, 'Lote 12/2025'))[3]).toBe('23,5 L');
    expect(indicador(container, 'Em estoque')[1]).toBe('54,5 L');
  });
});

describe('AyahuascaPage: modal de movimento', () => {
  it.each([
    { nome: 'Entrada de feitio', abrir: abrirEntradaDeFeitio, titulo: 'Entrada de feitio' },
    { nome: 'Registrar saída', abrir: abrirSaida, titulo: 'Registrar saída' },
    { nome: 'Transferir', abrir: abrirTransferencia, titulo: 'Transferir para outra unidade' },
  ])('botão $nome — abre o modal com o título $titulo', async ({ abrir, titulo }) => {
    const container = await montarAyahuasca();

    await abrir(container);

    expect(tituloDoModal(container)).toBe(titulo);
  });

  it('modal aberto — Cancelar fecha', async () => {
    const container = await montarAyahuasca();
    await abrirSaida(container);

    await clicar(botaoComTexto(painelDoModal(container), 'Cancelar'));

    expect(modalAberto(container)).toBe(false);
  });

  it('modal aberto — o X fecha', async () => {
    const container = await montarAyahuasca();
    await abrirSaida(container);

    await clicar(elemento(container, 'button[aria-label="fechar"]'));

    expect(modalAberto(container)).toBe(false);
  });

  it('modal aberto — clicar no fundo escuro fecha', async () => {
    const container = await montarAyahuasca();
    await abrirSaida(container);

    await clicar(painelDoModal(container).parentElement as HTMLElement);

    expect(modalAberto(container)).toBe(false);
  });

  it('modal aberto — clicar dentro dele não fecha', async () => {
    const container = await montarAyahuasca();
    await abrirSaida(container);

    await clicar(painelDoModal(container));

    expect(modalAberto(container)).toBe(true);
  });

  it('modal fechado sem salvar — reaberto, vem vazio', async () => {
    const container = await montarAyahuasca();
    await abrirEntradaDeFeitio(container);
    await digitar(campo(container, 'Código do lote'), 'Lote 99/2026');
    await clicar(botaoComTexto(painelDoModal(container), 'Cancelar'));

    await abrirEntradaDeFeitio(container);

    expect(campo(container, 'Código do lote').value).toBe('');
  });

  it('modal fechado sem salvar — não mexe em lotes, movimentos nem avisos', async () => {
    const container = await montarAyahuasca();
    await abrirEntradaDeFeitio(container);
    await digitar(campo(container, 'Código do lote'), 'Lote 99/2026');
    await digitar(campo(container, 'Litros'), '10');

    await clicar(botaoComTexto(painelDoModal(container), 'Cancelar'));

    expect(codigosDosLotes(container)).toHaveLength(4);
    expect(semAviso(container)).toBe(true);
    expect(indicador(container, 'Em estoque')[1]).toBe('54,5 L');
  });
});

describe('AyahuascaPage: modal de entrada de feitio', () => {
  it('abre com código e origem vazios, força 2 e litros vazios, e os textos de exemplo', async () => {
    const container = await montarAyahuasca();

    await abrirEntradaDeFeitio(container);

    expect(campo(container, 'Código do lote').value).toBe('');
    expect(campo(container, 'Código do lote').placeholder).toBe('Lote 12/2026');
    expect(campo(container, 'Origem').value).toBe('');
    expect(campo(container, 'Origem').placeholder).toBe('Feitio de dezembro · CDD');
    expect(campo<HTMLSelectElement>(container, 'Força').value).toBe('Força 2');
    expect(campo(container, 'Litros').value).toBe('');
    expect(campo(container, 'Litros').placeholder).toBe('9');
    expect(campo(container, 'Litros').inputMode).toBe('decimal');
  });

  it('força — oferece Força 1, 2 e 3', async () => {
    const container = await montarAyahuasca();

    await abrirEntradaDeFeitio(container);

    expect(Array.from(campo<HTMLSelectElement>(container, 'Força').options).map((opcao) => opcao.value)).toEqual([
      'Força 1',
      'Força 2',
      'Força 3',
    ]);
  });

  it('sem código — mostra o erro do código, na caixa de erro e como motivo do bloqueio, e Salvar fica desabilitado', async () => {
    const container = await montarAyahuasca();

    await abrirEntradaDeFeitio(container);

    const erro = 'Dê um código ao lote (ex.: Lote 01/2027).';
    const botao = botaoComTexto(painelDoModal(container), 'Salvar');
    expect(todos(painelDoModal(container), 'span').filter((span) => span.textContent === erro)).toHaveLength(2);
    expect(botao.disabled).toBe(true);
    expect(botao.title).toBe(erro);
  });

  it('código só com espaços — continua pedindo o código', async () => {
    const container = await montarAyahuasca();
    await abrirEntradaDeFeitio(container);

    await digitar(campo(container, 'Código do lote'), '    ');

    expect(painelDoModal(container).textContent).toContain('Dê um código ao lote');
  });

  it('com código e sem litros — pede os litros que entraram', async () => {
    const container = await montarAyahuasca();
    await abrirEntradaDeFeitio(container);

    await digitar(campo(container, 'Código do lote'), 'Lote 01/2027');

    expect(painelDoModal(container).textContent).toContain('Informe quantos litros entraram.');
    expect(botaoComTexto(painelDoModal(container), 'Salvar').disabled).toBe(true);
  });

  it.each([
    { nome: 'zero', digitado: '0' },
    { nome: 'negativo', digitado: '-3' },
    { nome: 'texto que não é número', digitado: 'abc' },
    { nome: 'só espaços', digitado: '   ' },
    { nome: 'prefixo hexadecimal (0x10)', digitado: '0x10' },
  ])('litros $nome — continua pedindo os litros e Salvar fica desabilitado', async ({ digitado }) => {
    const container = await montarAyahuasca();
    await abrirEntradaDeFeitio(container);
    await digitar(campo(container, 'Código do lote'), 'Lote 01/2027');

    await digitar(campo(container, 'Litros'), digitado);

    expect(painelDoModal(container).textContent).toContain('Informe quantos litros entraram.');
    expect(botaoComTexto(painelDoModal(container), 'Salvar').disabled).toBe(true);
  });

  it('código e litros válidos — some o erro e Salvar fica habilitado', async () => {
    const container = await montarAyahuasca();
    await abrirEntradaDeFeitio(container);
    await digitar(campo(container, 'Código do lote'), 'Lote 01/2027');

    await digitar(campo(container, 'Litros'), '12,5');

    expect(painelDoModal(container).textContent).not.toContain('Dê um código');
    expect(painelDoModal(container).textContent).not.toContain('Informe quantos litros');
    expect(botaoComTexto(painelDoModal(container), 'Salvar').disabled).toBe(false);
  });

  it.each([
    { nome: 'vírgula decimal', digitado: '12,5', esperado: '12,5 L' },
    { nome: 'ponto decimal', digitado: '12.5', esperado: '12,5 L' },
    { nome: 'decimal sem a parte inteira', digitado: ',5', esperado: '0,5 L' },
    { nome: 'texto depois do número', digitado: '9L', esperado: '9,0 L' },
    { nome: 'milhar com vírgula (1.500,00)', digitado: '1.500,00', esperado: '1,5 L' },
  ])('litros com $nome — o lote nasce com $esperado', async ({ digitado, esperado }) => {
    const container = await montarAyahuasca();

    await registrarEntradaDeFeitio(container, 'Lote 01/2027', digitado);

    expect(textoDoAviso(container)).toBe(`Lote 01/2027 criado com ${esperado}.`);
  });

  it('Salvar — cria o lote no topo da lista, lacrado, com os dados fixos da casa de feitio', async () => {
    const container = await montarAyahuasca();

    await registrarEntradaDeFeitio(container, 'Lote 01/2027', '12,5');

    expect(codigosDosLotes(container)[0]).toBe('Lote 01/2027');
    expect(textosDasFolhas(cartaoDoLote(container, 'Lote 01/2027'))).toEqual([
      'Lote 01/2027',
      'Lacrado',
      'Feitio · CDD · 02/09/2026',
      '12,5 L',
      'de 12,5 L',
      'Força 2 · Casa de feitio',
      'Chico Aguiar',
    ]);
  });

  it('Salvar — fecha o modal e avisa com o código e os litros', async () => {
    const container = await montarAyahuasca();

    await registrarEntradaDeFeitio(container, 'Lote 01/2027', '12,5');

    expect(modalAberto(container)).toBe(false);
    expect(textoDoAviso(container)).toBe('Lote 01/2027 criado com 12,5 L.');
  });

  it('Salvar — soma a entrada em Em estoque e em Livre, e conta mais um lote com daime', async () => {
    const container = await montarAyahuasca();

    await registrarEntradaDeFeitio(container, 'Lote 01/2027', '12,5');

    expect(indicador(container, 'Em estoque')).toEqual(['Em estoque', '67,0 L', '4 lotes com daime']);
    expect(indicador(container, 'Livre')[1]).toBe('58,0 L');
  });

  it('Salvar — a barra do lote novo nasce cheia, na cor royal', async () => {
    const container = await montarAyahuasca();

    await registrarEntradaDeFeitio(container, 'Lote 01/2027', '12,5');

    const barra = barraDoLote(cartaoDoLote(container, 'Lote 01/2027'));
    expect(barra.style.width).toBe('100%');
    expect(barra.style.background).toBe(COR.royal);
  });

  it('Salvar — registra o movimento de entrada no topo de Movimentos, com a origem como destino e Chico Aguiar', async () => {
    const container = await montarAyahuasca();
    await registrarEntradaDeFeitio(container, 'Lote 01/2027', '12,5');

    await abrirAba(container, 'Movimentos');

    expect(linhasDeMovimento(container)[0]).toBe(
      '02/09/2026EntradaLote 01/2027Feitio · CDD · Chico Aguiar+ 12,5 L',
    );
    expect(linhasDeMovimento(container)).toHaveLength(9);
  });

  it('Salvar com origem, força e código com espaços — usa a origem e a força escolhidas e apara os espaços', async () => {
    const container = await montarAyahuasca();
    await abrirEntradaDeFeitio(container);
    await digitar(campo(container, 'Código do lote'), '  Lote 01/2027  ');
    await digitar(campo(container, 'Origem'), '  Feitio de janeiro · CDD  ');
    await escolherOpcao(campo<HTMLSelectElement>(container, 'Força'), 'Força 3');
    await digitar(campo(container, 'Litros'), '20');

    await salvar(container);

    expect(textosDasFolhas(cartaoDoLote(container, 'Lote 01/2027'))).toEqual([
      'Lote 01/2027',
      'Lacrado',
      'Feitio de janeiro · CDD · 02/09/2026',
      '20,0 L',
      'de 20,0 L',
      'Força 3 · Casa de feitio',
      'Chico Aguiar',
    ]);
  });

  it('Salvar — a ficha do lote novo mostra o envase em garrafas de 500 ml, a análise e a entrada', async () => {
    const container = await montarAyahuasca();
    await registrarEntradaDeFeitio(container, 'Lote 01/2027', '12,5');

    await abrirLote(container, 'Lote 01/2027');

    const folhas = textosDasFolhas(painelDaFicha(container));
    expect(folhas).toContain('25 garrafas de 500 ml');
    expect(folhas).toContain('aguardando análise');
    expect(folhas.slice(-3)).toEqual(['02/09/2026', 'Entrada · Feitio · CDD', '+ 12,5 L']);
  });

  it.each([
    { nome: 'um quarto de litro', litros: '0,25', garrafas: '1 garrafas de 500 ml' },
    { nome: 'nove litros e um quarto', litros: '9,25', garrafas: '19 garrafas de 500 ml' },
    { nome: 'litros cheios', litros: '9', garrafas: '18 garrafas de 500 ml' },
    { nome: 'fração abaixo de meia garrafa', litros: '9,1', garrafas: '18 garrafas de 500 ml' },
  ])('envase de $nome — arredonda as garrafas para o inteiro mais próximo', async ({ litros, garrafas }) => {
    const container = await montarAyahuasca();
    await registrarEntradaDeFeitio(container, 'Lote 01/2027', litros);

    await abrirLote(container, 'Lote 01/2027');

    expect(textosDasFolhas(painelDaFicha(container))).toContain(garrafas);
  });

  it('código igual ao de um lote que já existe — é aceito e a lista fica com dois lotes com o mesmo código', async () => {
    const container = await montarAyahuasca();

    await registrarEntradaDeFeitio(container, 'Lote 12/2025', '5');

    expect(codigosDosLotes(container)).toEqual(['Lote 12/2025', 'Lote 12/2025', 'Lote 06/2026', 'Lote 03/2026', 'Lote 09/2025']);
  });

  it('a data do lote e do movimento não vem do relógio — com o relógio em 2027 continua 02/09/2026', async () => {
    vi.setSystemTime(new Date('2027-03-15T12:00:00Z'));
    const container = await montarAyahuasca();

    await registrarEntradaDeFeitio(container, 'Lote 01/2027', '12,5');

    expect(textosDasFolhas(cartaoDoLote(container, 'Lote 01/2027'))[2]).toBe('Feitio · CDD · 02/09/2026');
  });

  it('dois feitios seguidos — entram os dois, o mais novo no topo', async () => {
    const container = await montarAyahuasca();
    await registrarEntradaDeFeitio(container, 'Lote 01/2027', '10');
    vi.setSystemTime(new Date('2026-09-02T12:00:05Z'));

    await registrarEntradaDeFeitio(container, 'Lote 02/2027', '6');

    expect(codigosDosLotes(container).slice(0, 2)).toEqual(['Lote 02/2027', 'Lote 01/2027']);
    expect(indicador(container, 'Em estoque')[1]).toBe('70,5 L');
  });

  it('campo — abre o mesmo modal e cria o lote do mesmo jeito', async () => {
    definirDensidade('field');
    const container = await montarAyahuasca();

    await registrarEntradaDeFeitio(container, 'Lote 01/2027', '12,5');

    expect(textoDoAviso(container)).toBe('Lote 01/2027 criado com 12,5 L.');
    expect(codigosDosLotes(container)[0]).toBe('Lote 01/2027');
  });
});

describe('AyahuascaPage: modal de saída', () => {
  it('abre com o primeiro lote com daime escolhido, trabalho e litros vazios, e os textos de exemplo', async () => {
    const container = await montarAyahuasca();

    await abrirSaida(container);

    expect(campo<HTMLSelectElement>(container, 'Lote').selectedOptions[0]?.textContent).toBe('Lote 12/2025 · 23,5 L');
    expect(campo(container, 'Trabalho').value).toBe('');
    expect(campo(container, 'Trabalho').placeholder).toBe('Mãe Divina · setembro');
    expect(campo(container, 'Litros').value).toBe('');
  });

  it('lote — oferece só os lotes com saldo e fora da quarentena, com o saldo no rótulo', async () => {
    const container = await montarAyahuasca();

    await abrirSaida(container);

    expect(Array.from(campo<HTMLSelectElement>(container, 'Lote').options).map((opcao) => opcao.textContent)).toEqual([
      'Lote 12/2025 · 23,5 L',
      'Lote 06/2026 · 27,0 L',
      'Lote 03/2026 · 4,0 L',
    ]);
  });

  it('lote em quarentena — sai da lista de lotes da saída', async () => {
    const container = await montarAyahuasca();
    await colocarEmQuarentena(container, 'Lote 12/2025');

    await abrirSaida(container);

    expect(Array.from(campo<HTMLSelectElement>(container, 'Lote').options).map((opcao) => opcao.textContent)).toEqual([
      'Lote 06/2026 · 27,0 L',
      'Lote 03/2026 · 4,0 L',
    ]);
  });

  it('sem litros — pede quantos litros vão sair e bloqueia Salvar', async () => {
    const container = await montarAyahuasca();

    await abrirSaida(container);

    expect(painelDoModal(container).textContent).toContain('Informe quantos litros vão sair.');
    expect(botaoComTexto(painelDoModal(container), 'Salvar').disabled).toBe(true);
  });

  it.each([
    { nome: 'zero', digitado: '0' },
    { nome: 'negativo', digitado: '-2' },
    { nome: 'texto que não é número', digitado: 'muito' },
  ])('litros $nome — continua pedindo quantos litros vão sair', async ({ digitado }) => {
    const container = await montarAyahuasca();
    await abrirSaida(container);

    await digitar(campo(container, 'Litros'), digitado);

    expect(painelDoModal(container).textContent).toContain('Informe quantos litros vão sair.');
  });

  it('litros acima do saldo — diz quanto o lote tem e bloqueia Salvar', async () => {
    const container = await montarAyahuasca();
    await abrirSaida(container);

    await digitar(campo(container, 'Litros'), '23,6');

    expect(painelDoModal(container).textContent).toContain('Lote 12/2025 tem só 23,5 L disponíveis.');
    expect(botaoComTexto(painelDoModal(container), 'Salvar').disabled).toBe(true);
  });

  it('litros iguais ao saldo — são aceitos', async () => {
    const container = await montarAyahuasca();
    await abrirSaida(container);

    await digitar(campo(container, 'Litros'), '23,5');

    expect(botaoComTexto(painelDoModal(container), 'Salvar').disabled).toBe(false);
  });

  it('trocar o lote — a validação passa a olhar o saldo do lote escolhido', async () => {
    const container = await montarAyahuasca();
    await abrirSaida(container);
    await digitar(campo(container, 'Litros'), '10');

    await escolherOpcao(campo<HTMLSelectElement>(container, 'Lote'), '3');

    expect(painelDoModal(container).textContent).toContain('Lote 03/2026 tem só 4,0 L disponíveis.');
  });

  it('litros com ponto de milhar — 1.500,00 é lido como 1,5 e a saída é aceita', async () => {
    const container = await montarAyahuasca();
    await abrirSaida(container);

    await digitar(campo(container, 'Litros'), '1.500,00');

    expect(botaoComTexto(painelDoModal(container), 'Salvar').disabled).toBe(false);
  });

  it('Salvar — baixa o lote, fecha o modal e avisa a baixa com os litros e o código', async () => {
    const container = await montarAyahuasca();

    await registrarSaida(container, '8', 'Mãe Divina · setembro');

    expect(modalAberto(container)).toBe(false);
    expect(textoDoAviso(container)).toBe('Baixa de 8,0 L em Lote 12/2025.');
    expect(textosDasFolhas(cartaoDoLote(container, 'Lote 12/2025'))[3]).toBe('15,5 L');
  });

  it('Salvar — tira os litros de Em estoque e de Livre, e baixa a barra do lote', async () => {
    const container = await montarAyahuasca();

    await registrarSaida(container, '8', 'Mãe Divina · setembro');

    expect(indicador(container, 'Em estoque')[1]).toBe('46,5 L');
    expect(indicador(container, 'Livre')[1]).toBe('37,5 L');
    expect(parseFloat(barraDoLote(cartaoDoLote(container, 'Lote 12/2025')).style.width)).toBeCloseTo(36.9, 1);
  });

  it('Salvar — registra a saída no topo de Movimentos, com o trabalho como destino e Aurio Neto como responsável', async () => {
    const container = await montarAyahuasca();
    await registrarSaida(container, '8', '  Mãe Divina · setembro  ');

    await abrirAba(container, 'Movimentos');

    expect(linhasDeMovimento(container)[0]).toBe(
      '02/09/2026Saída para trabalhoLote 12/2025Mãe Divina · setembro · Aurio Neto− 8,0 L',
    );
  });

  it('Salvar sem o trabalho — usa "trabalho" como destino', async () => {
    const container = await montarAyahuasca();
    await registrarSaida(container, '8');

    await abrirAba(container, 'Movimentos');

    expect(linhasDeMovimento(container)[0]).toBe('02/09/2026Saída para trabalhoLote 12/2025trabalho · Aurio Neto− 8,0 L');
  });

  it('Salvar — a ficha do lote passa a listar o movimento novo no topo', async () => {
    const container = await montarAyahuasca();
    await registrarSaida(container, '8', 'Mãe Divina · setembro');

    await abrirLote(container, 'Lote 12/2025');

    expect(textosDasFolhas(painelDaFicha(container)).slice(19, 22)).toEqual([
      '02/09/2026',
      'Saída para trabalho · Mãe Divina · setembro',
      '− 8,0 L',
    ]);
  });

  it('saída de todo o saldo — o lote vira Esgotado, com a barra vazia, e sai da lista de lotes da próxima saída', async () => {
    const container = await montarAyahuasca();
    await abrirSaida(container);
    await escolherOpcao(campo<HTMLSelectElement>(container, 'Lote'), '3');
    await digitar(campo(container, 'Litros'), '4');
    await salvar(container);

    const cartao = cartaoDoLote(container, 'Lote 03/2026');
    expect(textosDasFolhas(cartao).slice(0, 2)).toEqual(['Lote 03/2026', 'Esgotado']);
    expect(barraDoLote(cartao).style.width).toBe('0%');
    await abrirSaida(container);
    expect(Array.from(campo<HTMLSelectElement>(container, 'Lote').options).map((opcao) => opcao.textContent)).toEqual([
      'Lote 12/2025 · 23,5 L',
      'Lote 06/2026 · 27,0 L',
    ]);
  });

  it('saída de parte do saldo de um lote lacrado — ele continua Lacrado', async () => {
    const container = await montarAyahuasca();
    await abrirSaida(container);
    await escolherOpcao(campo<HTMLSelectElement>(container, 'Lote'), '2');
    await digitar(campo(container, 'Litros'), '3');
    await salvar(container);

    expect(textosDasFolhas(cartaoDoLote(container, 'Lote 06/2026')).slice(0, 2)).toEqual(['Lote 06/2026', 'Lacrado']);
  });

  it('saída com duas casas decimais — o saldo do lote guarda uma casa só: 0,25 L tira 0,2 L e o movimento mostra 0,3 L', async () => {
    const container = await montarAyahuasca();

    await registrarSaida(container, '0,25', 'Teste de bancada');

    expect(textosDasFolhas(cartaoDoLote(container, 'Lote 12/2025'))[3]).toBe('23,3 L');
    await abrirAba(container, 'Movimentos');
    expect(linhasDeMovimento(container)[0]).toContain('− 0,3 L');
  });

  it('saída que deixa menos de 0,05 L — o lote vira Esgotado com saldo que ainda existia', async () => {
    const container = await montarAyahuasca();
    await abrirSaida(container);
    await escolherOpcao(campo<HTMLSelectElement>(container, 'Lote'), '3');
    await digitar(campo(container, 'Litros'), '3,96');
    await salvar(container);

    expect(textosDasFolhas(cartaoDoLote(container, 'Lote 03/2026')).slice(0, 4)).toEqual([
      'Lote 03/2026',
      'Esgotado',
      'Recebido do Céu do Mar · 14/03/2026',
      '0,0 L',
    ]);
  });

  it('saída maior que o livre — é aceita, e Livre fica negativo porque a saída não olha as reservas', async () => {
    const container = await montarAyahuasca();
    await abrirSaida(container);
    await escolherOpcao(campo<HTMLSelectElement>(container, 'Lote'), '2');
    await digitar(campo(container, 'Litros'), '27');
    await salvar(container);
    await abrirSaida(container);
    await digitar(campo(container, 'Litros'), '23,5');
    await salvar(container);

    expect(indicador(container, 'Livre')).toEqual(['Livre', '-5,0 L', 'reservas passam do estoque']);
  });

  it('todos os lotes em quarentena — a saída não tem lote para escolher e pede um lote com daime', async () => {
    const container = await montarAyahuasca();
    await colocarEmQuarentena(container, 'Lote 12/2025');
    await colocarEmQuarentena(container, 'Lote 06/2026');
    await colocarEmQuarentena(container, 'Lote 03/2026');

    await abrirSaida(container);

    expect(campo<HTMLSelectElement>(container, 'Lote').options).toHaveLength(0);
    expect(painelDoModal(container).textContent).toContain('Escolha um lote com daime disponível.');
    expect(botaoComTexto(painelDoModal(container), 'Salvar').disabled).toBe(true);
  });

  it('a data e o responsável da saída não vêm do relógio nem da sessão — 02/09/2026 e Aurio Neto com o relógio em 2027', async () => {
    vi.setSystemTime(new Date('2027-03-15T12:00:00Z'));
    const container = await montarAyahuasca();
    await registrarSaida(container, '8', 'Mãe Divina');

    await abrirAba(container, 'Movimentos');

    expect(linhasDeMovimento(container)[0]).toBe('02/09/2026Saída para trabalhoLote 12/2025Mãe Divina · Aurio Neto− 8,0 L');
  });

  it('campo — abre o mesmo modal e baixa o lote do mesmo jeito', async () => {
    definirDensidade('field');
    const container = await montarAyahuasca();

    await registrarSaida(container, '8', 'Mãe Divina · setembro');

    expect(textoDoAviso(container)).toBe('Baixa de 8,0 L em Lote 12/2025.');
  });
});

describe('AyahuascaPage: modal de transferência', () => {
  it('abre com o lote, a unidade de destino e os litros, com o texto de exemplo da unidade', async () => {
    const container = await montarAyahuasca();

    await abrirTransferencia(container);

    expect(campo<HTMLSelectElement>(container, 'Lote').selectedOptions[0]?.textContent).toBe('Lote 12/2025 · 23,5 L');
    expect(campo(container, 'Unidade de destino').value).toBe('');
    expect(campo(container, 'Unidade de destino').placeholder).toBe('Céu do Vale');
    expect(todos(painelDoModal(container), 'label').map((etiqueta) => etiqueta.textContent)).toEqual([
      'Lote',
      'Unidade de destino',
      'Litros',
    ]);
  });

  it('litros acima do saldo — diz quanto o lote tem, como na saída', async () => {
    const container = await montarAyahuasca();
    await abrirTransferencia(container);

    await digitar(campo(container, 'Litros'), '24');

    expect(painelDoModal(container).textContent).toContain('Lote 12/2025 tem só 23,5 L disponíveis.');
  });

  it('todos os lotes em quarentena — a transferência também não tem lote para escolher', async () => {
    const container = await montarAyahuasca();
    await colocarEmQuarentena(container, 'Lote 12/2025');
    await colocarEmQuarentena(container, 'Lote 06/2026');
    await colocarEmQuarentena(container, 'Lote 03/2026');

    await abrirTransferencia(container);

    expect(campo<HTMLSelectElement>(container, 'Lote').options).toHaveLength(0);
    expect(painelDoModal(container).textContent).toContain('Escolha um lote com daime disponível.');
  });

  it('Salvar — baixa o lote, fecha o modal e avisa a transferência com os litros e o código', async () => {
    const container = await montarAyahuasca();
    await abrirTransferencia(container);
    await digitar(campo(container, 'Unidade de destino'), 'Céu do Vale');
    await digitar(campo(container, 'Litros'), '3');

    await salvar(container);

    expect(textoDoAviso(container)).toBe('Transferência de 3,0 L de Lote 12/2025.');
    expect(textosDasFolhas(cartaoDoLote(container, 'Lote 12/2025'))[3]).toBe('20,5 L');
    expect(modalAberto(container)).toBe(false);
  });

  it('Salvar — registra a transferência no topo de Movimentos, com a unidade como destino e sinal de menos', async () => {
    const container = await montarAyahuasca();
    await abrirTransferencia(container);
    await digitar(campo(container, 'Unidade de destino'), '  Céu do Vale  ');
    await digitar(campo(container, 'Litros'), '3');
    await salvar(container);

    await abrirAba(container, 'Movimentos');

    expect(linhasDeMovimento(container)[0]).toBe('02/09/2026TransferênciaLote 12/2025Céu do Vale · Aurio Neto− 3,0 L');
  });

  it('Salvar sem a unidade — usa "outra unidade" como destino', async () => {
    const container = await montarAyahuasca();
    await abrirTransferencia(container);
    await digitar(campo(container, 'Litros'), '3');
    await salvar(container);

    await abrirAba(container, 'Movimentos');

    expect(linhasDeMovimento(container)[0]).toBe('02/09/2026TransferênciaLote 12/2025outra unidade · Aurio Neto− 3,0 L');
  });

  it('transferência de todo o saldo — o lote vira Esgotado', async () => {
    const container = await montarAyahuasca();
    await abrirTransferencia(container);
    await escolherOpcao(campo<HTMLSelectElement>(container, 'Lote'), '3');
    await digitar(campo(container, 'Litros'), '4');
    await salvar(container);

    expect(textosDasFolhas(cartaoDoLote(container, 'Lote 03/2026')).slice(0, 2)).toEqual(['Lote 03/2026', 'Esgotado']);
  });
});

describe('AyahuascaPage: alvo de toque por densidade', () => {
  it.each([
    { nome: 'escritório', densidade: 'office' as const },
    { nome: 'campo', densidade: 'field' as const },
  ])('$nome — os botões do cabeçalho usam o alvo de escritório', async ({ densidade }) => {
    definirDensidade(densidade);
    const container = await montarAyahuasca();

    const alvos = todos<HTMLButtonElement>(elemento(container, 'header'), 'button').map(
      (botao) => botao.style.minHeight,
    );

    expect(alvos).toEqual(['var(--target-office)', 'var(--target-office)', 'var(--target-office)']);
  });

  it('campo — as abas usam o alvo de campo e os botões de Reservas, o de escritório', async () => {
    definirDensidade('field');
    const container = await montarAyahuasca();

    const aba = botaoComTexto(container, 'Movimentos');
    await abrirAba(container, 'Reservas');

    expect(aba.style.minHeight).toBe('var(--target-field)');
    expect(botaoComTexto(reservaDe(container, 'Mãe Divina'), 'Liberar').style.minHeight).toBe('var(--target-office)');
  });

  it('campo — o modal de movimento usa o alvo de escritório nos campos e nos botões', async () => {
    definirDensidade('field');
    const container = await montarAyahuasca();

    await abrirEntradaDeFeitio(container);

    expect(campo(container, 'Código do lote').style.minHeight).toBe('var(--target-office)');
    expect(campo(container, 'Litros').style.minHeight).toBe('var(--target-office)');
    expect(botaoComTexto(painelDoModal(container), 'Salvar').style.minHeight).toBe('var(--target-office)');
  });
});

describe('AyahuascaPage: acessibilidade do modal e da ficha', () => {
  const pressionarEsc = () =>
    act(async () => {
      document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

  it('modal de movimento — não se declara como diálogo: sem role dialog nem aria-modal', async () => {
    const container = await montarAyahuasca();

    await abrirSaida(container);

    expect(container.querySelector('[role="dialog"], [aria-modal]')).toBeNull();
  });

  it('modal de movimento — Esc não fecha', async () => {
    const container = await montarAyahuasca();
    await abrirSaida(container);

    await pressionarEsc();

    expect(modalAberto(container)).toBe(true);
  });

  it('modal de movimento — abrir não move o foco para dentro dele', async () => {
    const container = await montarAyahuasca();

    await abrirSaida(container);

    expect(painelDoModal(container).contains(document.activeElement)).toBe(false);
  });

  it('ficha do lote — não se declara como diálogo e Esc não fecha', async () => {
    const container = await montarAyahuasca();
    await abrirLote(container, 'Lote 12/2025');

    await pressionarEsc();

    expect(container.querySelector('[role="dialog"], [aria-modal]')).toBeNull();
    expect(fichaAberta(container)).toBe(true);
  });
});
