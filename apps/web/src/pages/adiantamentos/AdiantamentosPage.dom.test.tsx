import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Adiantamento } from '@cdd/contracts';
import { botaoComTexto, clicar, desmontarTudo, digitar, elemento, escolherOpcao, montar, todos } from '@/testes/montagem';
import { AdiantamentosPage } from './AdiantamentosPage';

const cenario = vi.hoisted(() => ({ adiantamentos: undefined as readonly Adiantamento[] | undefined }));

vi.mock('@/mocks/adiantamentos', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('@/mocks/adiantamentos')>();
  return {
    ...original,
    get adiantamentos() {
      return cenario.adiantamentos ?? original.adiantamentos;
    },
  };
});

const HOJE_DA_DEMONSTRACAO = '2026-09-02T12:00:00Z';

const fixarDensidade = (campo: boolean) =>
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    media: consulta,
    matches: campo,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));

beforeEach(() => {
  fixarDensidade(false);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(HOJE_DA_DEMONSTRACAO));
});

afterEach(async () => {
  await desmontarTudo();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  cenario.adiantamentos = undefined;
});

const textosDasFolhas = (raiz: Element): string[] =>
  todos(raiz, '*')
    .filter((no) => no.childElementCount === 0 && no.textContent !== '')
    .map((no) => no.textContent ?? '');

const folhasComTexto = (container: HTMLElement, texto: string) =>
  todos(container, '*').filter((no) => no.childElementCount === 0 && no.textContent === texto);

const blocoDoRotulo = (container: HTMLElement, rotulo: string, posicao = 0): string[] => {
  const achado = folhasComTexto(container, rotulo)[posicao];
  if (!achado?.parentElement) throw new Error(`rótulo não encontrado: ${rotulo}`);
  return textosDasFolhas(achado.parentElement);
};

const campoPeloRotulo = <T extends HTMLInputElement | HTMLSelectElement = HTMLInputElement>(
  container: HTMLElement,
  rotulo: string,
): T => {
  const etiqueta = todos<HTMLLabelElement>(container, 'label').find((candidata) => candidata.textContent === rotulo);
  const campo = etiqueta ? container.ownerDocument.getElementById(etiqueta.htmlFor) : null;
  if (!campo) throw new Error(`campo não encontrado: ${rotulo}`);
  return campo as T;
};

const secao = (container: HTMLElement, rotulo: string): HTMLElement | undefined =>
  todos<HTMLElement>(container, 'section').find((candidata) => textosDasFolhas(candidata)[0] === rotulo);

const linhasDaSecao = (container: HTMLElement, rotulo: string): HTMLElement[] => {
  const alvo = secao(container, rotulo);
  return alvo ? todos<HTMLElement>(alvo, ':scope > div').filter((filho) => filho.querySelector(':scope > span[data-numeric]')) : [];
};

const textosDasLinhas = (container: HTMLElement, rotulo: string) =>
  linhasDaSecao(container, rotulo).map(textosDasFolhas);

const textosDosBotoes = (raiz: ParentNode) => todos(raiz, 'button').map((botao) => botao.textContent?.trim());

const linhaDe = (container: HTMLElement, rotulo: string, pessoa: string, motivo: string): HTMLElement => {
  const achada = linhasDaSecao(container, rotulo).find(
    (linha) => textosDasFolhas(linha)[0] === pessoa && linha.textContent?.includes(motivo),
  );
  if (!achada) throw new Error(`linha não encontrada: ${pessoa} / ${motivo}`);
  return achada;
};

const recadoMostrado = (container: HTMLElement) => {
  const faixa = container.querySelector('[role="status"]');
  return faixa ? (textosDasFolhas(faixa)[0] ?? null) : null;
};

const verComo = (container: HTMLElement, nome: string) => {
  const botao = todos<HTMLButtonElement>(container, 'button[aria-pressed]').find((candidato) =>
    candidato.textContent?.startsWith(nome),
  );
  if (!botao) throw new Error(`perspectiva não encontrada: ${nome}`);
  return clicar(botao);
};

const perspectivaMarcada = (container: HTMLElement) =>
  todos<HTMLButtonElement>(container, 'button[aria-pressed="true"]').map((botao) => botao.textContent);

const mensagemDoCampo = (campo: HTMLElement) => {
  const alvo = campo.getAttribute('aria-describedby');
  return alvo ? (campo.ownerDocument.getElementById(alvo)?.textContent ?? null) : null;
};

const LINHA_DE_PATY_A_AUTORIZAR = ['Aguardando sua autorização', 'Paty Munay', 'compras da cozinha'] as const;
const LINHA_DE_CARLOS_A_AUTORIZAR = ['Aguardando sua autorização', 'Carlos Andrade', 'conserto da bomba'] as const;
const LINHA_DE_PATY_A_RESSARCIR = ['A ressarcir', 'Paty Munay', 'camisetas da lojinha'] as const;
const LINHA_DE_LUCIA_A_RESSARCIR = ['A ressarcir', 'Lucia Prado', 'ferragens do dormitório'] as const;

async function autorizarComoMadrinha(container: HTMLElement, linha: readonly [string, string, string]) {
  await verComo(container, 'Marta Neto');
  await clicar(botaoComTexto(linhaDe(container, ...linha), 'Autorizar'));
}

async function abrirNovoAdiantamento(container: HTMLElement) {
  await clicar(botaoComTexto(container, 'Novo adiantamento'));
}

async function registrarNovoAdiantamento(container: HTMLElement, valor: string, motivo: string) {
  await abrirNovoAdiantamento(container);
  await digitar(campoPeloRotulo(container, 'Valor'), valor);
  await digitar(campoPeloRotulo(container, 'Do que foi a despesa'), motivo);
  await clicar(botaoComTexto(container, 'Registrar'));
}

describe('AdiantamentosPage: cabeçalho, perspectivas e resumo', () => {
  it('cabeçalho em escritório — mostra o código com o nome da tela, o título e o subtítulo', async () => {
    const { container } = await montar(<AdiantamentosPage />);

    expect(textosDasFolhas(elemento(container, 'header'))).toEqual([
      'F-11 · Adiantamentos e reembolsos',
      'Adiantamentos',
      'Quem tirou do próprio bolso e ainda não voltou · CDD',
    ]);
  });

  it('perspectivas — abre em Aurio Neto, da Tesouraria, sem vínculo de autoridade', async () => {
    const { container } = await montar(<AdiantamentosPage />);

    expect(perspectivaMarcada(container)).toEqual(['Aurio NetoTesouraria']);
    expect(folhasComTexto(container, 'Sem vínculo de autoridade no cadastro de pessoas.')).toHaveLength(1);
    expect(folhasComTexto(container, 'Protótipo · ver como')).toHaveLength(1);
    expect(
      folhasComTexto(container, 'Vale só nesta tela — o menu continua o do seu usuário. Sai com o backend.'),
    ).toHaveLength(1);
  });

  it('perspectivas — oferece as três, com nome e grupo', async () => {
    const { container } = await montar(<AdiantamentosPage />);

    expect(todos(container, 'button[aria-pressed]').map((botao) => botao.textContent)).toEqual([
      'Aurio NetoTesouraria',
      'Marta NetoGovernança',
      'Renato DiasAdministrador',
    ]);
  });

  it('resumo — conta o que aguarda autorização e soma o valor, soma o que está a ressarcir e diz o mais antigo, e conta os fechados', async () => {
    const { container } = await montar(<AdiantamentosPage />);

    expect(blocoDoRotulo(container, 'Aguardando autorização')).toEqual(['Aguardando autorização', '2', '1.497,67']);
    expect(blocoDoRotulo(container, 'A ressarcir')).toEqual(['A ressarcir', '1.969,26', 'o mais antigo há 53 dias']);
    expect(blocoDoRotulo(container, 'Fechados')).toEqual(['Fechados', '1', 'ressarcidos ou recusados']);
  });

  it('Tesouraria — vê o botão Novo adiantamento no cabeçalho', async () => {
    const { container } = await montar(<AdiantamentosPage />);

    expect(textosDosBotoes(elemento(container, 'header'))).toEqual(['Novo adiantamento']);
  });

  it('Governança — troca a nota do vínculo e esconde o botão Novo adiantamento', async () => {
    const { container } = await montar(<AdiantamentosPage />);

    await verComo(container, 'Marta Neto');

    expect(perspectivaMarcada(container)).toEqual(['Marta NetoGovernança']);
    expect(folhasComTexto(container, 'Vínculo de madrinha ativo desde 12/2018.')).toHaveLength(1);
    expect(textosDosBotoes(elemento(container, 'header'))).toEqual([]);
  });

  it('Administrador — mostra a nota de que não tem vínculo e mantém o botão Novo adiantamento', async () => {
    const { container } = await montar(<AdiantamentosPage />);

    await verComo(container, 'Renato Dias');

    expect(folhasComTexto(container, 'Administrador sem vínculo de padrinho ou madrinha.')).toHaveLength(1);
    expect(textosDosBotoes(elemento(container, 'header'))).toEqual(['Novo adiantamento']);
  });
});

describe('AdiantamentosPage: o que cada perspectiva vê', () => {
  it('Tesouraria — não recebe a fila de autorização e vê o aviso no lugar', async () => {
    const { container } = await montar(<AdiantamentosPage />);

    expect(secao(container, 'Aguardando sua autorização')).toBeUndefined();
    expect(folhasComTexto(container, 'A fila de autorização não vem para o seu grupo')).toHaveLength(1);
    expect(container.textContent).toContain(
      'Autorizar adiantamento é da Governança e da Administração. Tesouraria não recebe esta lista — ela não é escondida na tela, ela não é consultada no servidor.',
    );
  });

  it('Tesouraria — vê a lista a ressarcir, com o botão Ressarcir em cada linha, e a idade de quem passa de 30 dias', async () => {
    const { container } = await montar(<AdiantamentosPage />);

    expect(textosDasLinhas(container, 'A ressarcir')).toEqual([
      [
        'Paty Munay',
        'A ressarcir',
        'há 53 dias',
        'camisetas da lojinha, lote de agosto · 11/07/2026 · Nubank Paty',
        'autorizado por Marta Neto em 14/07/2026',
        '1.700,86',
      ],
      [
        'Lucia Prado',
        'A ressarcir',
        'ferragens do dormitório · 06/08/2026 · Nubank Paty',
        'autorizado por Marta Neto em 08/08/2026',
        '268,40',
      ],
    ]);
    expect(linhasDaSecao(container, 'A ressarcir').map((linha) => textosDosBotoes(linha))).toEqual([
      ['Ressarcir'],
      ['Ressarcir'],
    ]);
    expect(container.textContent).toContain(
      'O ressarcimento é transferência de valor igual ao adiantado, e não gera lançamento novo — a despesa já entrou na data em que a pessoa gastou.',
    );
  });

  it('todas as perspectivas — veem os fechados, com quem autorizou, quando foi ressarcido e por qual conta', async () => {
    const { container } = await montar(<AdiantamentosPage />);

    expect(textosDasLinhas(container, 'Fechados')).toEqual([
      [
        'Carlos Andrade',
        'Ressarcido',
        'diesel do feitio de junho · 19/06/2026 · Caixa Carlão',
        'autorizado por Aurio Neto (padrinho) em 20/06/2026 · ressarcido em 02/07/2026 por Cora PJ',
        '612,00',
      ],
    ]);
    expect(linhasDaSecao(container, 'Fechados').map((linha) => textosDosBotoes(linha))).toEqual([[]]);
  });

  it('Governança — recebe a fila de autorização com Autorizar e Recusar em cada linha, sem idade nem aviso de ausência', async () => {
    const { container } = await montar(<AdiantamentosPage />);

    await verComo(container, 'Marta Neto');

    expect(textosDasLinhas(container, 'Aguardando sua autorização')).toEqual([
      [
        'Paty Munay',
        'Aguardando autorização',
        'compras da cozinha e tecidos do altar · 24/08/2026 · Cartão Itaú Paty',
        '1.067,67',
      ],
      ['Carlos Andrade', 'Aguardando autorização', 'conserto da bomba do poço · 01/09/2026 · Nubank Carlão', '430,00'],
    ]);
    expect(linhasDaSecao(container, 'Aguardando sua autorização').map((linha) => textosDosBotoes(linha))).toEqual([
      ['Autorizar', 'Recusar'],
      ['Autorizar', 'Recusar'],
    ]);
    expect(folhasComTexto(container, 'A fila de autorização não vem para o seu grupo')).toHaveLength(0);
  });

  it('Governança — vê a lista a ressarcir sem o botão: a tesouraria ressarce', async () => {
    const { container } = await montar(<AdiantamentosPage />);

    await verComo(container, 'Marta Neto');

    expect(textosDasLinhas(container, 'A ressarcir').map((linha) => linha.at(-1))).toEqual([
      'a tesouraria ressarce',
      'a tesouraria ressarce',
    ]);
    expect(linhasDaSecao(container, 'A ressarcir').map((linha) => textosDosBotoes(linha))).toEqual([[], []]);
  });

  it('Administrador — recebe a fila de autorização e também pode ressarcir', async () => {
    const { container } = await montar(<AdiantamentosPage />);

    await verComo(container, 'Renato Dias');

    expect(linhasDaSecao(container, 'Aguardando sua autorização')).toHaveLength(2);
    expect(linhasDaSecao(container, 'A ressarcir').map((linha) => textosDosBotoes(linha))).toEqual([
      ['Ressarcir'],
      ['Ressarcir'],
    ]);
  });

  it('trocar de perspectiva — o que foi feito antes continua: os adiantamentos são do estado da tela', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await autorizarComoMadrinha(container, LINHA_DE_PATY_A_AUTORIZAR);

    await verComo(container, 'Aurio Neto');

    expect(textosDasLinhas(container, 'A ressarcir').map((linha) => linha[0])).toEqual([
      'Paty Munay',
      'Paty Munay',
      'Lucia Prado',
    ]);
  });
});

describe('AdiantamentosPage: selo e borda de cada estado', () => {
  it.each([
    { secao: 'A ressarcir', pessoa: 'Paty Munay', motivo: 'camisetas', selo: 'A ressarcir', cor: 'var(--color-royal-ink)', borda: 'var(--color-royal)' },
    { secao: 'Fechados', pessoa: 'Carlos Andrade', motivo: 'diesel', selo: 'Ressarcido', cor: 'var(--color-confirmed)', borda: 'var(--color-confirmed)' },
  ])('linha $selo — o selo e a borda esquerda seguem o estado', async ({ secao, pessoa, motivo, selo, cor, borda }) => {
    const { container } = await montar(<AdiantamentosPage />);

    const linha = linhaDe(container, secao, pessoa, motivo);

    expect((folhasComTexto(linha, selo)[0] as HTMLElement).style.color).toBe(cor);
    expect(linha.style.borderLeft).toContain(borda);
  });

  it('linha aguardando autorização — o selo e a borda esquerda ficam no tom pending', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await verComo(container, 'Marta Neto');

    const linha = linhaDe(container, ...LINHA_DE_PATY_A_AUTORIZAR);

    expect((folhasComTexto(linha, 'Aguardando autorização')[0] as HTMLElement).style.color).toBe('var(--color-pending)');
    expect(linha.style.borderLeft).toContain('var(--color-pending)');
  });

  it('linha recusada — o selo e a borda esquerda ficam no tom attention', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await verComo(container, 'Marta Neto');
    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_AUTORIZAR), 'Recusar'));
    await digitar(campoPeloRotulo(container, 'Motivo da recusa'), 'sem nota');
    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_AUTORIZAR), 'Recusar'));

    const linha = linhaDe(container, 'Fechados', 'Paty Munay', 'compras da cozinha');

    expect((folhasComTexto(linha, 'Recusado')[0] as HTMLElement).style.color).toBe('var(--color-attention)');
    expect(linha.style.borderLeft).toContain('var(--color-attention)');
  });

  it('selo de idade — a ressarcir há mais de 30 dias leva o selo no tom attention', async () => {
    const { container } = await montar(<AdiantamentosPage />);

    const selo = folhasComTexto(linhaDe(container, ...LINHA_DE_PATY_A_RESSARCIR), 'há 53 dias')[0] as HTMLElement;

    expect(selo.style.color).toBe('var(--color-attention)');
  });
});

describe('AdiantamentosPage: autorizar', () => {
  it('autorizar com vínculo de madrinha — o adiantamento passa a a ressarcir, autorizado por ela hoje, e o recado avisa a tesouraria', async () => {
    const { container } = await montar(<AdiantamentosPage />);

    await autorizarComoMadrinha(container, LINHA_DE_PATY_A_AUTORIZAR);

    expect(textosDasLinhas(container, 'Aguardando sua autorização').map((linha) => linha[0])).toEqual(['Carlos Andrade']);
    expect(textosDasLinhas(container, 'A ressarcir')[0]).toEqual([
      'Paty Munay',
      'A ressarcir',
      'compras da cozinha e tecidos do altar · 24/08/2026 · Cartão Itaú Paty',
      'autorizado por Marta Neto em 02/09/2026',
      '1.067,67',
      'a tesouraria ressarce',
    ]);
    expect(recadoMostrado(container)).toBe(
      'Adiantamento de Paty Munay autorizado. Entrou na fila de reembolsos da tesouraria.',
    );
  });

  it('autorizar — atualiza o resumo: menos um aguardando e mais valor a ressarcir', async () => {
    const { container } = await montar(<AdiantamentosPage />);

    await autorizarComoMadrinha(container, LINHA_DE_PATY_A_AUTORIZAR);

    expect(blocoDoRotulo(container, 'Aguardando autorização')).toEqual(['Aguardando autorização', '1', '430,00']);
    expect(blocoDoRotulo(container, 'A ressarcir')).toEqual(['A ressarcir', '3.036,93', 'o mais antigo há 53 dias']);
  });

  it('autorizar os dois — a fila fica vazia, com o estado vazio e o resumo nada parado', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await autorizarComoMadrinha(container, LINHA_DE_PATY_A_AUTORIZAR);

    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_CARLOS_A_AUTORIZAR), 'Autorizar'));

    expect(folhasComTexto(container, 'Nada aguardando')).toHaveLength(1);
    expect(folhasComTexto(container, 'Todo adiantamento registrado já passou por autorização.')).toHaveLength(1);
    expect(blocoDoRotulo(container, 'Aguardando autorização')).toEqual(['Aguardando autorização', '0', 'nada parado']);
  });

  it('autorizar sem vínculo de autoridade — o Administrador vê a barreira de dois eixos e nada muda', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await verComo(container, 'Renato Dias');

    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_AUTORIZAR), 'Autorizar'));

    expect(folhasComTexto(container, 'Você tem acesso a esta tela, mas não a esta operação')).toHaveLength(1);
    expect(container.textContent).toContain(
      'Autorizar adiantamento exige vínculo ativo de padrinho ou madrinha na data da despesa. Renato Dias tem a permissão do grupo Administrador, e a operação mesmo assim falha — porque autoridade espiritual não se concede pela tela de acesso, e sim no cadastro de pessoas.',
    );
    expect(folhasComTexto(container, 'Peça a um padrinho ou madrinha. O adiantamento de Paty Munay, de 1.067,67, continua aguardando.')).toHaveLength(1);
    expect(textosDasLinhas(container, 'Aguardando sua autorização')).toHaveLength(2);
    expect(recadoMostrado(container)).toBeNull();
  });

  it('barreira — fica no adiantamento mais recente em que se tentou, e some ao trocar de perspectiva', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await verComo(container, 'Renato Dias');
    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_AUTORIZAR), 'Autorizar'));

    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_CARLOS_A_AUTORIZAR), 'Autorizar'));

    expect(folhasComTexto(container, 'Peça a um padrinho ou madrinha. O adiantamento de Carlos Andrade, de 430,00, continua aguardando.')).toHaveLength(1);
    await verComo(container, 'Marta Neto');
    expect(folhasComTexto(container, 'Você tem acesso a esta tela, mas não a esta operação')).toHaveLength(0);
  });

  it('autorizar depois da barreira — a madrinha autoriza e a barreira some', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await verComo(container, 'Renato Dias');
    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_AUTORIZAR), 'Autorizar'));

    await verComo(container, 'Marta Neto');
    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_AUTORIZAR), 'Autorizar'));

    expect(folhasComTexto(container, 'Você tem acesso a esta tela, mas não a esta operação')).toHaveLength(0);
    expect(textosDasLinhas(container, 'A ressarcir')[0]?.[0]).toBe('Paty Munay');
  });
});

describe('AdiantamentosPage: recusar', () => {
  it('Recusar — troca os botões da linha pelo campo do motivo, com Recusar bloqueado e o porquê escrito', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await verComo(container, 'Marta Neto');

    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_AUTORIZAR), 'Recusar'));

    const linha = linhaDe(container, ...LINHA_DE_PATY_A_AUTORIZAR);
    expect(textosDosBotoes(linha)).toEqual(['Recusar', 'Voltar']);
    expect(botaoComTexto(linha, 'Recusar').disabled).toBe(true);
    expect(campoPeloRotulo(container, 'Motivo da recusa').placeholder).toBe('o que impede de autorizar');
    expect(folhasComTexto(container, 'A recusa exige um motivo escrito.')).toHaveLength(1);
    expect(textosDosBotoes(linhaDe(container, ...LINHA_DE_CARLOS_A_AUTORIZAR))).toEqual(['Autorizar', 'Recusar']);
  });

  it('motivo só de espaços — o botão Recusar continua bloqueado', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await verComo(container, 'Marta Neto');
    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_AUTORIZAR), 'Recusar'));

    await digitar(campoPeloRotulo(container, 'Motivo da recusa'), '     ');

    expect(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_AUTORIZAR), 'Recusar').disabled).toBe(true);
  });

  it('recusar com motivo — o adiantamento vai para os fechados como Recusado, com o motivo aparado, e o recado confirma', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await verComo(container, 'Marta Neto');
    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_AUTORIZAR), 'Recusar'));
    await digitar(campoPeloRotulo(container, 'Motivo da recusa'), '  sem nota fiscal  ');

    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_AUTORIZAR), 'Recusar'));

    expect(textosDasLinhas(container, 'Aguardando sua autorização').map((linha) => linha[0])).toEqual(['Carlos Andrade']);
    expect(textosDasLinhas(container, 'Fechados')[0]).toEqual([
      'Paty Munay',
      'Recusado',
      'compras da cozinha e tecidos do altar · 24/08/2026 · Cartão Itaú Paty',
      'recusado: sem nota fiscal',
      '1.067,67',
    ]);
    expect(recadoMostrado(container)).toBe('Adiantamento de Paty Munay recusado, com o motivo registrado.');
    expect(blocoDoRotulo(container, 'Fechados')).toEqual(['Fechados', '2', 'ressarcidos ou recusados']);
  });

  it('recusar com motivo — o campo do motivo da recusa seguinte abre vazio, com Recusar bloqueado', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await verComo(container, 'Marta Neto');
    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_AUTORIZAR), 'Recusar'));
    await digitar(campoPeloRotulo(container, 'Motivo da recusa'), 'sem nota fiscal');
    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_AUTORIZAR), 'Recusar'));

    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_CARLOS_A_AUTORIZAR), 'Recusar'));

    expect(campoPeloRotulo(container, 'Motivo da recusa').value).toBe('');
    expect(botaoComTexto(linhaDe(container, ...LINHA_DE_CARLOS_A_AUTORIZAR), 'Recusar').disabled).toBe(true);
  });

  it('Voltar — desfaz o campo do motivo e devolve Autorizar e Recusar, sem recusar nada', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await verComo(container, 'Marta Neto');
    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_AUTORIZAR), 'Recusar'));

    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_AUTORIZAR), 'Voltar'));

    expect(textosDosBotoes(linhaDe(container, ...LINHA_DE_PATY_A_AUTORIZAR))).toEqual(['Autorizar', 'Recusar']);
    expect(textosDasLinhas(container, 'Fechados')).toHaveLength(1);
  });

  it('motivo digitado e Voltar — o texto fica guardado e aparece no campo de outra linha', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await verComo(container, 'Marta Neto');
    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_AUTORIZAR), 'Recusar'));
    await digitar(campoPeloRotulo(container, 'Motivo da recusa'), 'sem nota fiscal');
    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_AUTORIZAR), 'Voltar'));

    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_CARLOS_A_AUTORIZAR), 'Recusar'));

    expect(campoPeloRotulo(container, 'Motivo da recusa').value).toBe('sem nota fiscal');
    expect(botaoComTexto(linhaDe(container, ...LINHA_DE_CARLOS_A_AUTORIZAR), 'Recusar').disabled).toBe(false);
  });

  it('trocar de perspectiva com o campo do motivo aberto — fecha o campo', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await verComo(container, 'Marta Neto');
    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_AUTORIZAR), 'Recusar'));

    await verComo(container, 'Renato Dias');

    expect(todos(container, 'label').map((rotulo) => rotulo.textContent)).not.toContain('Motivo da recusa');
  });
});

describe('AdiantamentosPage: ressarcir', () => {
  it('Ressarcir — abre na linha o formulário com a conta, a data de hoje e o valor igual ao adiantado', async () => {
    const { container } = await montar(<AdiantamentosPage />);

    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_RESSARCIR), 'Ressarcir'));

    const linha = linhaDe(container, ...LINHA_DE_PATY_A_RESSARCIR);
    expect(campoPeloRotulo<HTMLSelectElement>(linha, 'Conta de saída').value).toBe('cora');
    expect(campoPeloRotulo(linha, 'Data').value).toBe('2026-09-02');
    expect(campoPeloRotulo(linha, 'Valor').value).toBe('1.700,86');
    expect(campoPeloRotulo(linha, 'Valor').readOnly).toBe(true);
    expect(mensagemDoCampo(campoPeloRotulo(linha, 'Valor'))).toBe('igual ao adiantado');
    expect(textosDosBotoes(linha)).toEqual(['Confirmar', 'Voltar']);
  });

  it('contas de saída — oferece Cora PJ e Espécie', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_RESSARCIR), 'Ressarcir'));

    const opcoes = todos<HTMLOptionElement>(campoPeloRotulo<HTMLSelectElement>(container, 'Conta de saída'), 'option');

    expect(opcoes.map((opcao) => [opcao.value, opcao.textContent])).toEqual([
      ['cora', 'Cora PJ'],
      ['especie', 'Espécie'],
    ]);
  });

  it('Confirmar — vai para os fechados como Ressarcido na data e na conta escolhidas, e o recado diz que não é despesa nova', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_RESSARCIR), 'Ressarcir'));
    await escolherOpcao(campoPeloRotulo<HTMLSelectElement>(container, 'Conta de saída'), 'especie');
    await digitar(campoPeloRotulo(container, 'Data'), '2026-09-10');

    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_RESSARCIR), 'Confirmar'));

    expect(textosDasLinhas(container, 'A ressarcir').map((linha) => linha[0])).toEqual(['Lucia Prado']);
    expect(textosDasLinhas(container, 'Fechados')[0]).toEqual([
      'Paty Munay',
      'Ressarcido',
      'camisetas da lojinha, lote de agosto · 11/07/2026 · Nubank Paty',
      'autorizado por Marta Neto em 14/07/2026 · ressarcido em 10/09/2026 por Espécie',
      '1.700,86',
    ]);
    expect(recadoMostrado(container)).toBe(
      'Ressarcimento de 1.700,86 a Paty Munay registrado como transferência de Espécie. Nenhuma despesa nova — ela já foi lançada em 11/07/2026.',
    );
  });

  it('ressarcir — atualiza o resumo: o total a ressarcir cai, o mais antigo muda e os fechados sobem', async () => {
    const { container } = await montar(<AdiantamentosPage />);

    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_RESSARCIR), 'Ressarcir'));
    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_RESSARCIR), 'Confirmar'));

    expect(blocoDoRotulo(container, 'A ressarcir')).toEqual(['A ressarcir', '268,40', 'o mais antigo há 27 dias']);
    expect(blocoDoRotulo(container, 'Fechados')).toEqual(['Fechados', '2', 'ressarcidos ou recusados']);
  });

  it('ressarcir os dois — a lista fica vazia, com o estado vazio e o resumo nada pendente', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_RESSARCIR), 'Ressarcir'));
    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_RESSARCIR), 'Confirmar'));
    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_LUCIA_A_RESSARCIR), 'Ressarcir'));

    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_LUCIA_A_RESSARCIR), 'Confirmar'));

    expect(folhasComTexto(container, 'Ninguém esperando dinheiro de volta')).toHaveLength(1);
    expect(folhasComTexto(container, 'Todo adiantamento autorizado já foi ressarcido.')).toHaveLength(1);
    expect(blocoDoRotulo(container, 'A ressarcir')).toEqual(['A ressarcir', '0,00', 'nada pendente']);
  });

  it('Voltar — fecha o formulário da linha e não ressarce', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_RESSARCIR), 'Ressarcir'));

    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_RESSARCIR), 'Voltar'));

    expect(textosDosBotoes(linhaDe(container, ...LINHA_DE_PATY_A_RESSARCIR))).toEqual(['Ressarcir']);
    expect(textosDasLinhas(container, 'A ressarcir')).toHaveLength(2);
  });

  it('conta e data escolhidas — ficam guardadas e aparecem no formulário de outra linha', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_RESSARCIR), 'Ressarcir'));
    await escolherOpcao(campoPeloRotulo<HTMLSelectElement>(container, 'Conta de saída'), 'especie');
    await digitar(campoPeloRotulo(container, 'Data'), '2026-09-15');
    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_RESSARCIR), 'Voltar'));

    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_LUCIA_A_RESSARCIR), 'Ressarcir'));

    expect(campoPeloRotulo<HTMLSelectElement>(container, 'Conta de saída').value).toBe('especie');
    expect(campoPeloRotulo(container, 'Data').value).toBe('2026-09-15');
  });

  it('ressarcimento confirmado — a conta e a data escolhidas continuam no formulário de outra linha', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_RESSARCIR), 'Ressarcir'));
    await escolherOpcao(campoPeloRotulo<HTMLSelectElement>(container, 'Conta de saída'), 'especie');
    await digitar(campoPeloRotulo(container, 'Data'), '2026-09-10');
    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_RESSARCIR), 'Confirmar'));

    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_LUCIA_A_RESSARCIR), 'Ressarcir'));

    expect(campoPeloRotulo<HTMLSelectElement>(container, 'Conta de saída').value).toBe('especie');
    expect(campoPeloRotulo(container, 'Data').value).toBe('2026-09-10');
  });

  it('data do ressarcimento apagada — o adiantamento fecha como Ressarcido, mas a linha não diz quando nem por qual conta', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_RESSARCIR), 'Ressarcir'));
    await digitar(campoPeloRotulo(container, 'Data'), '');

    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_RESSARCIR), 'Confirmar'));

    expect(textosDasLinhas(container, 'Fechados')[0]).toEqual([
      'Paty Munay',
      'Ressarcido',
      'camisetas da lojinha, lote de agosto · 11/07/2026 · Nubank Paty',
      'autorizado por Marta Neto em 14/07/2026',
      '1.700,86',
    ]);
  });

  it('trocar de perspectiva com o formulário de ressarcimento aberto — fecha o formulário', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_RESSARCIR), 'Ressarcir'));

    await verComo(container, 'Renato Dias');

    expect(todos(container, 'label').map((rotulo) => rotulo.textContent)).not.toContain('Conta de saída');
  });

  it('recado — o botão de fechar tira o recado da tela', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_RESSARCIR), 'Ressarcir'));
    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_RESSARCIR), 'Confirmar'));

    await clicar(elemento(container, 'button[aria-label="fechar recado"]'));

    expect(recadoMostrado(container)).toBeNull();
  });
});

describe('AdiantamentosPage: novo adiantamento', () => {
  it('Novo adiantamento — abre o formulário com a primeira pessoa, as contas dela, a data de hoje e o botão bloqueado', async () => {
    const { container } = await montar(<AdiantamentosPage />);

    await abrirNovoAdiantamento(container);

    expect(folhasComTexto(container, 'Novo adiantamento')).toHaveLength(1);
    expect(campoPeloRotulo<HTMLSelectElement>(container, 'Quem adiantou').value).toBe('p-paty');
    expect(campoPeloRotulo<HTMLSelectElement>(container, 'Conta pessoal usada').value).toBe('nubank');
    expect(campoPeloRotulo(container, 'Valor').placeholder).toBe('0,00');
    expect(campoPeloRotulo(container, 'Data da despesa').value).toBe('2026-09-02');
    expect(campoPeloRotulo(container, 'Do que foi a despesa').placeholder).toBe('o que foi comprado, em uma linha');
    expect(botaoComTexto(container, 'Registrar').disabled).toBe(true);
    expect(folhasComTexto(container, 'Informe conta pessoal, valor maior que zero e a despesa.')).toHaveLength(1);
    expect(folhasComTexto(container, 'Depois de registrado, precisa da autorização de um padrinho ou madrinha para entrar na fila de reembolso.')).toHaveLength(1);
  });

  it('quem adiantou — oferece as três pessoas com conta pessoal ou sem ela', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await abrirNovoAdiantamento(container);

    const opcoes = todos<HTMLOptionElement>(campoPeloRotulo<HTMLSelectElement>(container, 'Quem adiantou'), 'option');

    expect(opcoes.map((opcao) => opcao.textContent)).toEqual(['Paty Munay', 'Carlos Andrade', 'Lucia Prado']);
  });

  it('contas pessoais — só aparecem as da pessoa escolhida, com a dica', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await abrirNovoAdiantamento(container);

    const contasDePaty = todos<HTMLOptionElement>(campoPeloRotulo<HTMLSelectElement>(container, 'Conta pessoal usada'), 'option');
    await escolherOpcao(campoPeloRotulo<HTMLSelectElement>(container, 'Quem adiantou'), 'p-carlao');
    const contasDeCarlos = todos<HTMLOptionElement>(campoPeloRotulo<HTMLSelectElement>(container, 'Conta pessoal usada'), 'option');

    expect(contasDePaty.map((opcao) => opcao.textContent)).toEqual(['Nubank Paty', 'Cartão Itaú Paty']);
    expect(contasDeCarlos.map((opcao) => opcao.textContent)).toEqual(['Nubank Carlão', 'Caixa Carlão']);
    expect(campoPeloRotulo<HTMLSelectElement>(container, 'Conta pessoal usada').value).toBe('nubank-carlao');
    expect(folhasComTexto(container, 'só as contas dessa pessoa aparecem aqui')).toHaveLength(1);
  });

  it('pessoa sem conta pessoal — o campo da conta vira um aviso e o botão continua bloqueado, mesmo com tudo preenchido', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await abrirNovoAdiantamento(container);
    await escolherOpcao(campoPeloRotulo<HTMLSelectElement>(container, 'Quem adiantou'), 'p-lucia');
    await digitar(campoPeloRotulo(container, 'Valor'), '100');
    await digitar(campoPeloRotulo(container, 'Do que foi a despesa'), 'feira');

    expect(
      folhasComTexto(container, 'Esta pessoa não tem conta pessoal cadastrada. Adiantamento só sai de conta de terceiro.'),
    ).toHaveLength(1);
    expect(todos(container, 'label').map((rotulo) => rotulo.textContent)).not.toContain('Conta pessoal usada');
    expect(botaoComTexto(container, 'Registrar').disabled).toBe(true);
  });

  it.each([
    { digitado: '2000', habilitado: true },
    { digitado: '2000,50', habilitado: true },
    { digitado: '2000.50', habilitado: true },
    { digitado: '1.500', habilitado: true },
    { digitado: '1e3', habilitado: true },
    { digitado: '1.500,00', habilitado: false },
    { digitado: '0', habilitado: false },
    { digitado: '-5', habilitado: false },
    { digitado: 'abc', habilitado: false },
    { digitado: '', habilitado: false },
  ])('valor "$digitado" com despesa preenchida — o botão habilitado é $habilitado', async ({ digitado, habilitado }) => {
    const { container } = await montar(<AdiantamentosPage />);
    await abrirNovoAdiantamento(container);
    await digitar(campoPeloRotulo(container, 'Do que foi a despesa'), 'feira');

    await digitar(campoPeloRotulo(container, 'Valor'), digitado);

    expect(botaoComTexto(container, 'Registrar').disabled).toBe(!habilitado);
  });

  it('despesa só de espaços — o botão continua bloqueado mesmo com valor', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await abrirNovoAdiantamento(container);
    await digitar(campoPeloRotulo(container, 'Valor'), '100');

    await digitar(campoPeloRotulo(container, 'Do que foi a despesa'), '   ');

    expect(botaoComTexto(container, 'Registrar').disabled).toBe(true);
  });

  it('Registrar — o adiantamento entra no topo aguardando autorização, com a despesa aparada, e o formulário fecha', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await abrirNovoAdiantamento(container);
    await escolherOpcao(campoPeloRotulo<HTMLSelectElement>(container, 'Conta pessoal usada'), 'cartao-itau');
    await digitar(campoPeloRotulo(container, 'Valor'), '250,5');
    await digitar(campoPeloRotulo(container, 'Data da despesa'), '2026-09-01');
    await digitar(campoPeloRotulo(container, 'Do que foi a despesa'), '  lâmpadas do corredor  ');

    await clicar(botaoComTexto(container, 'Registrar'));

    await verComo(container, 'Marta Neto');
    expect(textosDasLinhas(container, 'Aguardando sua autorização')[0]).toEqual([
      'Paty Munay',
      'Aguardando autorização',
      'lâmpadas do corredor · 01/09/2026 · Cartão Itaú Paty',
      '250,50',
    ]);
    expect(textosDasLinhas(container, 'Aguardando sua autorização')).toHaveLength(3);
  });

  it('Registrar — mostra o recado, atualiza o resumo e fecha o formulário', async () => {
    const { container } = await montar(<AdiantamentosPage />);

    await registrarNovoAdiantamento(container, '250,5', 'lâmpadas do corredor');

    expect(recadoMostrado(container)).toBe('Adiantamento registrado. Aguarda autorização de um padrinho ou madrinha.');
    expect(blocoDoRotulo(container, 'Aguardando autorização')).toEqual(['Aguardando autorização', '3', '1.748,17']);
    expect(folhasComTexto(container, 'Novo adiantamento')).toHaveLength(0);
  });

  it('adiantamento novo — a madrinha o autoriza como qualquer outro, e ele entra a ressarcir', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await registrarNovoAdiantamento(container, '100', 'tinta');

    await autorizarComoMadrinha(container, ['Aguardando sua autorização', 'Paty Munay', 'tinta']);

    expect(textosDasLinhas(container, 'A ressarcir').map((linha) => linha[2])).toContain(
      'tinta · 02/09/2026 · Nubank Paty',
    );
  });

  it('data da despesa apagada — o adiantamento é aceito e a linha mostra 01/01/1900', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await abrirNovoAdiantamento(container);
    await digitar(campoPeloRotulo(container, 'Valor'), '100');
    await digitar(campoPeloRotulo(container, 'Data da despesa'), '');
    await digitar(campoPeloRotulo(container, 'Do que foi a despesa'), 'tinta');

    await clicar(botaoComTexto(container, 'Registrar'));

    await verComo(container, 'Marta Neto');
    expect(textosDasLinhas(container, 'Aguardando sua autorização')[0]?.[2]).toBe('tinta · 01/01/1900 · Nubank Paty');
  });

  it('Cancelar — fecha o formulário sem registrar, e o que foi digitado não volta', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await abrirNovoAdiantamento(container);
    await digitar(campoPeloRotulo(container, 'Valor'), '300');
    await clicar(botaoComTexto(container, 'Cancelar'));

    await abrirNovoAdiantamento(container);

    expect(campoPeloRotulo(container, 'Valor').value).toBe('');
    expect(blocoDoRotulo(container, 'Aguardando autorização')[1]).toBe('2');
  });

  it('clicar em Novo adiantamento de novo — fecha o formulário', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await abrirNovoAdiantamento(container);

    await abrirNovoAdiantamento(container);

    expect(folhasComTexto(container, 'Novo adiantamento')).toHaveLength(0);
  });

  it('abrir o formulário — limpa o recado que estava na tela', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_RESSARCIR), 'Ressarcir'));
    await clicar(botaoComTexto(linhaDe(container, ...LINHA_DE_PATY_A_RESSARCIR), 'Confirmar'));
    expect(recadoMostrado(container)).not.toBeNull();

    await abrirNovoAdiantamento(container);

    expect(recadoMostrado(container)).toBeNull();
  });

  it('trocar de perspectiva com o formulário aberto — fecha o formulário', async () => {
    const { container } = await montar(<AdiantamentosPage />);
    await abrirNovoAdiantamento(container);

    await verComo(container, 'Renato Dias');

    expect(folhasComTexto(container, 'Novo adiantamento')).toHaveLength(0);
  });
});

describe('AdiantamentosPage em campo', () => {
  beforeEach(() => {
    fixarDensidade(true);
  });

  it('cabeçalho — mostra só o código F-11 e o título, sem subtítulo', async () => {
    const { container } = await montar(<AdiantamentosPage />);

    expect(textosDasFolhas(elemento(container, 'header'))).toEqual(['F-11', 'Adiantamentos']);
  });

  it('resumo e listas — trazem os mesmos valores do escritório', async () => {
    const { container } = await montar(<AdiantamentosPage />);

    expect(blocoDoRotulo(container, 'Aguardando autorização')).toEqual(['Aguardando autorização', '2', '1.497,67']);
    expect(blocoDoRotulo(container, 'A ressarcir')).toEqual(['A ressarcir', '1.969,26', 'o mais antigo há 53 dias']);
    expect(textosDasLinhas(container, 'A ressarcir')).toHaveLength(2);
    expect(textosDasLinhas(container, 'Fechados')).toHaveLength(1);
  });

  it('autorizar — funciona do mesmo jeito que no escritório', async () => {
    const { container } = await montar(<AdiantamentosPage />);

    await autorizarComoMadrinha(container, LINHA_DE_PATY_A_AUTORIZAR);

    expect(recadoMostrado(container)).toBe(
      'Adiantamento de Paty Munay autorizado. Entrou na fila de reembolsos da tesouraria.',
    );
  });

  it('novo adiantamento — registra do mesmo jeito que no escritório', async () => {
    const { container } = await montar(<AdiantamentosPage />);

    await registrarNovoAdiantamento(container, '100', 'tinta');

    expect(recadoMostrado(container)).toBe('Adiantamento registrado. Aguarda autorização de um padrinho ou madrinha.');
  });
});

describe('AdiantamentosPage: variações que a demonstração não alcança', () => {
  it('sem nenhum fechado — a seção Fechados não aparece e o resumo mostra 0', async () => {
    const demonstracao = (await vi.importActual<typeof import('@/mocks/adiantamentos')>('@/mocks/adiantamentos'))
      .adiantamentos;
    cenario.adiantamentos = demonstracao.filter((adiantamento) => adiantamento.status !== 'RESSARCIDO');
    const { container } = await montar(<AdiantamentosPage />);

    expect(secao(container, 'Fechados')).toBeUndefined();
    expect(blocoDoRotulo(container, 'Fechados')).toEqual(['Fechados', '0', 'ressarcidos ou recusados']);
  });

  it('a ressarcir com menos de 30 dias — não mostra o selo de idade', async () => {
    const demonstracao = (await vi.importActual<typeof import('@/mocks/adiantamentos')>('@/mocks/adiantamentos'))
      .adiantamentos;
    cenario.adiantamentos = demonstracao.filter((adiantamento) => adiantamento.id !== 'a-3');
    const { container } = await montar(<AdiantamentosPage />);

    expect(textosDasLinhas(container, 'A ressarcir')[0]).not.toContain('há 27 dias');
    expect(blocoDoRotulo(container, 'A ressarcir')[2]).toBe('o mais antigo há 27 dias');
  });
});
