import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  botaoComTexto,
  clicar,
  desmontarTudo,
  digitar,
  elemento,
  folhaComTexto,
  montar,
  todos,
} from '@/testes/montagem';
import { FeitioPage } from './FeitioPage';

const fila = vi.hoisted(() => ({ confirmados: null as boolean[] | null, litrosDoPrimeiroAnterior: null as number | null }));

vi.mock('@/pages/estoque/FeitioPage/mocks/feitio', async (importOriginal) => {
  const original = await importOriginal<Record<string, any>>();
  return {
    ...original,
    get emAndamento() {
      const feitio = original.emAndamento;
      const confirmados = fila.confirmados;
      return confirmados
        ? { ...feitio, custos: feitio.custos.map((custo: object, i: number) => ({ ...custo, confirmado: confirmados[i] })) }
        : feitio;
    },
    get anteriores() {
      const litros = fila.litrosDoPrimeiroAnterior;
      const [primeiro, ...demais] = original.anteriores;
      return litros === null ? original.anteriores : [{ ...primeiro, litrosProduzidos: litros }, ...demais];
    },
  };
});

type Densidade = 'office' | 'field';

function definirDensidade(densidade: Densidade) {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    media: consulta,
    matches: densidade === 'field',
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

beforeEach(() => {
  definirDensidade('office');
});

afterEach(async () => {
  await desmontarTudo();
  fila.confirmados = null;
  fila.litrosDoPrimeiroAnterior = null;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const COR = {
  confirmado: 'var(--color-confirmed)',
  royal: 'var(--color-royal)',
  neutro: 'var(--color-neutral)',
  textoSecundario: 'var(--text-secondary)',
} as const;

const folhasDe = (origem: ParentNode) =>
  todos<HTMLSpanElement>(origem, 'span').filter(
    (span) => span.childElementCount === 0 && span.textContent !== '' && span.getAttribute('aria-hidden') !== 'true',
  );

const textosDasFolhas = (origem: ParentNode) => folhasDe(origem).map((folha) => folha.textContent);

const numero = (container: HTMLElement, rotulo: string) => {
  const bloco = folhaComTexto(container, 'span', rotulo).parentElement;
  return Array.from(bloco?.children ?? []).map((filho) => filho.textContent);
};

const corDoNumero = (container: HTMLElement, rotulo: string) =>
  (folhaComTexto(container, 'span', rotulo).nextElementSibling as HTMLElement).style.color;

const cartaoDe = (container: HTMLElement, rotulo: string) => {
  const cartao = folhaComTexto(container, 'span', rotulo).parentElement;
  if (!cartao) throw new Error(`cartão não encontrado: ${rotulo}`);
  return cartao;
};

const secaoDe = (container: HTMLElement, titulo: string) => {
  const secao = folhaComTexto(container, 'span', titulo).parentElement?.parentElement;
  if (!secao) throw new Error(`seção não encontrada: ${titulo}`);
  return secao;
};

const totalDaSecao = (container: HTMLElement, titulo: string) =>
  textosDasFolhas(secaoDe(container, titulo).children[0] as HTMLElement)[1];

const linhasDaSecao = (container: HTMLElement, titulo: string) =>
  Array.from(secaoDe(container, titulo).children[1]?.children ?? []).map((linha) => linha.textContent);

const textoDoRecado = (container: HTMLElement) =>
  container.querySelector('[role="status"] > span')?.textContent ?? null;

const semRecado = (container: HTMLElement) => container.querySelector('[role="status"]') === null;

const campo = <T extends HTMLElement = HTMLInputElement>(origem: ParentNode, rotulo: string): T => {
  const etiqueta = todos<HTMLLabelElement>(origem, 'label').find((candidata) => candidata.textContent === rotulo);
  if (!etiqueta?.control) throw new Error(`campo não encontrado: ${rotulo}`);
  return etiqueta.control as T;
};

const botaoPresente = (origem: ParentNode, texto: string) =>
  todos<HTMLButtonElement>(origem, 'button').some((botao) => botao.textContent?.trim() === texto);

const painelDeConclusao = (container: HTMLElement) => cartaoDe(container, 'Quanto saiu da panela');

const painelAberto = (container: HTMLElement) =>
  folhasDe(container).some((folha) => folha.textContent === 'Quanto saiu da panela');

const caixaDoLoteProduzido = (container: HTMLElement) => {
  const rotuloDoLote = folhasDe(container).find((folha) => folha.textContent === 'Lote 09/2026');
  return rotuloDoLote?.parentElement ?? null;
};

const glifoDe = (icone: Element | null) =>
  Array.from(icone?.classList ?? []).find((classe) => classe.startsWith('lucide-'));

const gradeDosCampos = (container: HTMLElement) =>
  todos<HTMLDivElement>(painelDeConclusao(container), 'div').find((div) => div.style.gridTemplateColumns !== '');

const barrasDeComparacao = (container: HTMLElement) =>
  todos<HTMLDivElement>(cartaoDe(container, 'Fazer ou comprar'), 'div').filter((barra) =>
    barra.style.width.endsWith('%'),
  );

async function montarFeitio() {
  const montado = await montar(<FeitioPage />);
  return montado.container;
}

async function abrirConclusao(container: HTMLElement) {
  await clicar(botaoComTexto(container, 'Concluir o feitio'));
}

async function preencherLitros(container: HTMLElement, litros: string) {
  await digitar(campo(painelDeConclusao(container), 'Litros produzidos'), litros);
}

async function concluirComLitros(container: HTMLElement, litros: string) {
  await abrirConclusao(container);
  await preencherLitros(container, litros);
  await clicar(botaoComTexto(container, 'Concluir e criar o lote'));
}

describe('FeitioPage: cabeçalho nas duas densidades', () => {
  it('escritório — mostra o código com o nome da tela, o título e o subtítulo, sem ação no cabeçalho', async () => {
    const container = await montarFeitio();

    const cabecalho = elemento(container, 'header');

    expect(elemento(cabecalho, 'h1').textContent).toBe('Feitio');
    expect(folhaComTexto(cabecalho, 'div', 'S-04 · Feitio')).toBeTruthy();
    expect(folhaComTexto(cabecalho, 'p', 'Onde evento, custo e estoque se encontram · CDD')).toBeTruthy();
    expect(todos(cabecalho, 'button')).toHaveLength(0);
  });

  it('campo — mostra só o código e o título, sem subtítulo', async () => {
    definirDensidade('field');
    const container = await montarFeitio();

    const cabecalho = elemento(container, 'header');

    expect(folhaComTexto(cabecalho, 'div', 'S-04')).toBeTruthy();
    expect(cabecalho.querySelector('p')).toBeNull();
  });
});

describe('FeitioPage: feitio em andamento', () => {
  it.each([
    { nome: 'escritório', densidade: 'office' as const },
    { nome: 'campo', densidade: 'field' as const },
  ])('$nome — mostra o gasto, o custo por litro ainda sem número e o preço de comprar de fora', async ({ densidade }) => {
    definirDensidade(densidade);
    const container = await montarFeitio();

    expect(numero(container, 'Gasto até agora')).toEqual(['Gasto até agora', 'R$ 15.460,00', 'R$ 12.100,00 de matéria-prima']);
    expect(numero(container, 'Custo por litro')).toEqual(['Custo por litro', 'só no fim', 'depende de quanto sair']);
    expect(numero(container, 'Comprar de fora sai a')).toEqual([
      'Comprar de fora sai a',
      'R$ 420,00/L',
      'Céu do Mar · março de 2026',
    ]);
  });

  it('custo por litro antes de concluir — usa a cor de texto secundário, sem o verde de confirmado', async () => {
    const container = await montarFeitio();

    expect(corDoNumero(container, 'Custo por litro')).toBe(COR.textoSecundario);
  });

  it('cartão do feitio — mostra o nome, o selo Em andamento, o período aberto, o local e quem está fazendo', async () => {
    const container = await montarFeitio();

    expect(folhaComTexto(container, 'span', 'Feitio de setembro')).toBeTruthy();
    expect(folhaComTexto<HTMLSpanElement>(container, 'span', 'Em andamento').style.color).toBe('var(--color-royal-ink)');
    expect(folhaComTexto(container, 'span', '08/09/2026 · ainda na panela · Casa de feitio · Chácara')).toBeTruthy();
    expect(textosDasFolhas(cartaoDe(container, 'Quem está fazendo').parentElement as HTMLElement)).toContain('Chico Aguiar');
  });

  it('quem está fazendo — lista os cinco participantes na ordem do cadastro', async () => {
    const container = await montarFeitio();

    const faixa = cartaoDe(container, 'Quem está fazendo');

    expect(textosDasFolhas(faixa)).toEqual([
      'Quem está fazendo',
      'Chico Aguiar',
      'Sérgio Bittencourt',
      'Tobias Aguiar',
      'Rosa Silveira',
      'Carlos Menezes',
    ]);
  });

  it('sem lote produzido — a caixa do lote não aparece', async () => {
    const container = await montarFeitio();

    expect(caixaDoLoteProduzido(container)).toBeNull();
    expect(container.textContent).not.toContain('Um feitio gera exatamente um lote.');
  });

  it('matéria-prima — mostra o total e uma linha por insumo, com quantidade, origem e custo', async () => {
    const container = await montarFeitio();

    expect(totalDaSecao(container, 'Matéria-prima')).toBe('R$ 12.100,00');
    expect(linhasDaSecao(container, 'Matéria-prima')).toEqual([
      'Jagube240 kgColheita própria · sítio do ChicoR$ 6.700,00',
      'Chacrona180 kgCompra · Céu do MarR$ 4.500,00',
      'Lenha3 m³Compra · Serraria IbiúnaR$ 900,00',
    ]);
  });

  it('o resto do custo — mostra o total e uma linha por lançamento, com categoria, código e valor', async () => {
    const container = await montarFeitio();

    expect(totalDaSecao(container, 'O resto do custo')).toBe('R$ 3.360,00');
    expect(linhasDaSecao(container, 'O resto do custo')).toEqual([
      'Ajuda de custo aos que ficaramPrestadores de serviçolanc-9040R$ 1.700,00',
      'Alimentação da equipe · três diasAlimentação de cerimônialanc-9041R$ 860,00',
      'Diesel e deslocamento da colheitaCombustívellanc-9052R$ 540,00',
      'Gás de cozinha · dois botijõesCusto de feitiolanc-9053R$ 260,00',
    ]);
  });

  it('aviso de custo parcial — conta os lançamentos na fila e diz quanto está confirmado do total', async () => {
    const container = await montarFeitio();

    expect(container.textContent).toContain(
      '2 lançamentos ainda na fila de verificação. O custo por litro que sair daqui é parcial: R$ 14.660,00 confirmados de R$ 15.460,00 registrados. Conferir a fila antes de concluir fecha a conta de verdade.',
    );
  });

  it('o texto de porquê apurar — fica sempre na tela', async () => {
    const container = await montarFeitio();

    expect(folhaComTexto(container, 'div', 'O feitio deixa de ser despesa dispersa')).toBeTruthy();
    expect(container.textContent).toContain('quanto custa o litro que ela produz');
  });

  it('comparação antes de concluir — a barra do feitio fica vazia com a frase de espera, e a de fora mostra o preço', async () => {
    const container = await montarFeitio();

    const cartao = cartaoDe(container, 'Fazer ou comprar');

    expect(textosDasFolhas(cartao)).toEqual([
      'Fazer ou comprar',
      'Feitio em andamento',
      'fecha quando o feitio concluir',
      'Comprar de Céu do Mar',
      'R$ 420,00/L',
      'A comparação fecha quando o feitio concluir. Antes disso o custo existe e os litros não, e dividir um pelo outro daria um número inventado.',
    ]);
    expect(barrasDeComparacao(container).map((barra) => barra.style.width)).toEqual(['0%', '100%']);
  });

  it('feitios anteriores — lista os três com lote, litros, custo total e custo por litro', async () => {
    const container = await montarFeitio();

    const linhas = Array.from(cartaoDe(container, 'Feitios anteriores').children[1]?.children ?? []).map(
      (linha) => linha.textContent,
    );

    expect(linhas).toEqual([
      'Feitio de junhoLote 06/202630,0 LR$ 9.840,00R$ 328,00/L',
      'Feitio de marçoLote 03/202648,0 LR$ 14.100,00R$ 293,75/L',
      'Feitio de dezembroLote 12/202542,0 LR$ 12.180,00R$ 290,00/L',
    ]);
  });

  it('feitios anteriores com litros fracionados (30,5) — a linha mostra os litros sem arredondar e o custo por litro sobre eles', async () => {
    fila.litrosDoPrimeiroAnterior = 30.5;
    const container = await montarFeitio();

    const primeiraLinha = cartaoDe(container, 'Feitios anteriores').children[1]?.children[0];

    expect(primeiraLinha?.textContent).toBe('Feitio de junhoLote 06/202630,5 LR$ 9.840,00R$ 322,62/L');
  });
});

describe('FeitioPage: Concluir o feitio', () => {
  it('estado inicial — oferece o botão com a frase de que concluir cria o lote e fecha o custo', async () => {
    const container = await montarFeitio();

    expect(botaoPresente(container, 'Concluir o feitio')).toBe(true);
    expect(
      folhaComTexto(
        container,
        'span',
        'Concluir cria o lote e fecha o custo. Depois disso o feitio não aceita mais consumo.',
      ),
    ).toBeTruthy();
    expect(painelAberto(container)).toBe(false);
  });

  it('clicar em Concluir o feitio — abre o painel e esconde o botão e a frase', async () => {
    const container = await montarFeitio();

    await abrirConclusao(container);

    expect(painelAberto(container)).toBe(true);
    expect(botaoPresente(container, 'Concluir o feitio')).toBe(false);
    expect(container.textContent).not.toContain('Concluir cria o lote e fecha o custo.');
  });

  it('painel aberto — começa com litros vazios, Força 2 e a data de 11/09/2026', async () => {
    const container = await montarFeitio();

    await abrirConclusao(container);

    const painel = painelDeConclusao(container);
    expect(campo(painel, 'Litros produzidos').value).toBe('');
    expect(campo(painel, 'Litros produzidos').placeholder).toBe('0,0');
    expect(campo(painel, 'Litros produzidos').inputMode).toBe('decimal');
    expect(campo(painel, 'Força').value).toBe('Força 2');
    expect(campo(painel, 'Data de encerramento').value).toBe('11/09/2026');
    expect(folhaComTexto(painel, 'span', 'Vai junto com o lote, para a vida toda.')).toBeTruthy();
  });

  it('painel aberto — explica que concluir gera um lote e fecha o feitio para novos consumos', async () => {
    const container = await montarFeitio();

    await abrirConclusao(container);

    expect(painelDeConclusao(container).textContent).toContain(
      'Concluir gera um lote — nem zero nem dois — com a força que você escrever, e fecha o feitio para novos consumos.',
    );
  });

  it('a data de encerramento começa em 11/09/2026 mesmo com o relógio em outro dia', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2027-03-15T12:00:00Z'));
    const container = await montarFeitio();

    await abrirConclusao(container);

    expect(campo(painelDeConclusao(container), 'Data de encerramento').value).toBe('11/09/2026');
  });

  it('sem litros — Concluir e criar o lote fica desabilitado, com o motivo dos litros no botão e embaixo dele', async () => {
    const container = await montarFeitio();

    await abrirConclusao(container);

    const motivo = 'Quantos litros saíram? Sem isso não há lote nem custo por litro.';
    const botao = botaoComTexto(painelDeConclusao(container), 'Concluir e criar o lote');
    expect(botao.disabled).toBe(true);
    expect(botao.title).toBe(motivo);
    expect(folhaComTexto(painelDeConclusao(container), 'span', motivo)).toBeTruthy();
  });

  it('sem litros — não mostra a prévia do custo por litro', async () => {
    const container = await montarFeitio();

    await abrirConclusao(container);

    expect(painelDeConclusao(container).textContent).not.toContain('/L');
  });

  it.each([
    { nome: 'zero', digitado: '0' },
    { nome: 'negativo', digitado: '-5' },
    { nome: 'texto que não é número', digitado: 'muito' },
    { nome: 'número com texto depois (9L)', digitado: '9L' },
    { nome: 'milhar com vírgula (1.500,00)', digitado: '1.500,00' },
    { nome: 'só espaços', digitado: '   ' },
  ])('litros $nome — contam como zero: o botão fica desabilitado e não há prévia', async ({ digitado }) => {
    const container = await montarFeitio();
    await abrirConclusao(container);

    await preencherLitros(container, digitado);

    const painel = painelDeConclusao(container);
    expect(botaoComTexto(painel, 'Concluir e criar o lote').disabled).toBe(true);
    expect(painel.textContent).not.toContain('/L');
    expect(painel.textContent).toContain('Quantos litros saíram?');
  });

  it.each([
    { nome: 'vírgula decimal', digitado: '40,5', previa: '40,5 L', porLitro: 'R$ 381,73/L' },
    { nome: 'ponto decimal', digitado: '40.5', previa: '40,5 L', porLitro: 'R$ 381,73/L' },
    { nome: 'decimal sem a parte inteira', digitado: ',5', previa: '0,5 L', porLitro: 'R$ 30.920,00/L' },
    { nome: 'inteiro', digitado: '40', previa: '40,0 L', porLitro: 'R$ 386,50/L' },
    { nome: 'prefixo hexadecimal (0x10)', digitado: '0x10', previa: '16,0 L', porLitro: 'R$ 966,25/L' },
  ])(
    'litros com $nome — libera o botão e mostra a prévia com $previa e $porLitro',
    async ({ digitado, previa, porLitro }) => {
      const container = await montarFeitio();
      await abrirConclusao(container);

      await preencherLitros(container, digitado);

      const painel = painelDeConclusao(container);
      expect(botaoComTexto(painel, 'Concluir e criar o lote').disabled).toBe(false);
      expect(textosDasFolhas(painel).filter((texto) => texto?.includes('R$'))).toEqual([
        `R$ 15.460,00 em ${previa}`,
        porLitro,
      ]);
    },
  );

  it('litros 40 — a prévia mostra o total em 40,0 L e o custo por litro', async () => {
    const container = await montarFeitio();
    await abrirConclusao(container);

    await preencherLitros(container, '40');

    expect(textosDasFolhas(painelDeConclusao(container)).filter((texto) => texto?.includes('R$'))).toEqual([
      'R$ 15.460,00 em 40,0 L',
      'R$ 386,50/L',
    ]);
  });

  it('litros que não dividem exato — a prévia arredonda o custo por litro em centavos', async () => {
    const container = await montarFeitio();
    await abrirConclusao(container);

    await preencherLitros(container, '30');

    expect(painelDeConclusao(container).textContent).toContain('R$ 515,33/L');
  });

  it('força vazia — o botão fica desabilitado e o motivo é o da força', async () => {
    const container = await montarFeitio();
    await abrirConclusao(container);
    await preencherLitros(container, '40');

    await digitar(campo(painelDeConclusao(container), 'Força'), '   ');

    const botao = botaoComTexto(painelDeConclusao(container), 'Concluir e criar o lote');
    expect(botao.disabled).toBe(true);
    expect(botao.title).toBe('A força vai no lote e acompanha o sacramento até o fim.');
  });

  it('data de encerramento vazia — o botão fica desabilitado e o motivo é a data', async () => {
    const container = await montarFeitio();
    await abrirConclusao(container);
    await preencherLitros(container, '40');

    await digitar(campo(painelDeConclusao(container), 'Data de encerramento'), '');

    const botao = botaoComTexto(painelDeConclusao(container), 'Concluir e criar o lote');
    expect(botao.disabled).toBe(true);
    expect(botao.title).toBe('Concluir exige a data de encerramento.');
  });

  it('litros e força ausentes ao mesmo tempo — o motivo mostrado é o dos litros, que vem primeiro', async () => {
    const container = await montarFeitio();
    await abrirConclusao(container);
    await digitar(campo(painelDeConclusao(container), 'Força'), '');

    const botao = botaoComTexto(painelDeConclusao(container), 'Concluir e criar o lote');
    expect(botao.title).toBe('Quantos litros saíram? Sem isso não há lote nem custo por litro.');
  });

  it('Cancelar — fecha o painel, volta o botão Concluir o feitio e não conclui nada', async () => {
    const container = await montarFeitio();
    await abrirConclusao(container);

    await clicar(botaoComTexto(painelDeConclusao(container), 'Cancelar'));

    expect(painelAberto(container)).toBe(false);
    expect(botaoPresente(container, 'Concluir o feitio')).toBe(true);
    expect(semRecado(container)).toBe(true);
    expect(folhaComTexto(container, 'span', 'Em andamento')).toBeTruthy();
  });

  it('Cancelar e abrir de novo — o painel volta com o que foi digitado antes', async () => {
    const container = await montarFeitio();
    await abrirConclusao(container);
    await preencherLitros(container, '40');
    await digitar(campo(painelDeConclusao(container), 'Força'), 'Força 3');
    await digitar(campo(painelDeConclusao(container), 'Data de encerramento'), '12/09/2026');
    await clicar(botaoComTexto(painelDeConclusao(container), 'Cancelar'));

    await abrirConclusao(container);

    const painel = painelDeConclusao(container);
    expect(campo(painel, 'Litros produzidos').value).toBe('40');
    expect(campo(painel, 'Força').value).toBe('Força 3');
    expect(campo(painel, 'Data de encerramento').value).toBe('12/09/2026');
  });

  it('campo — o painel abre com os mesmos campos e a mesma validação', async () => {
    definirDensidade('field');
    const container = await montarFeitio();

    await abrirConclusao(container);

    const painel = painelDeConclusao(container);
    expect(campo(painel, 'Força').value).toBe('Força 2');
    expect(botaoComTexto(painel, 'Concluir e criar o lote').disabled).toBe(true);
  });
});

describe('FeitioPage: aviso de custo parcial com outra fila de verificação', () => {
  it('um lançamento só na fila — o aviso usa o singular e confirma o resto', async () => {
    fila.confirmados = [true, true, true, false];

    const container = await montarFeitio();

    expect(container.textContent).toContain(
      '1 lançamento ainda na fila de verificação. O custo por litro que sair daqui é parcial: R$ 15.200,00 confirmados de R$ 15.460,00 registrados.',
    );
  });

  it('três lançamentos na fila e um confirmado — o aviso conta os três', async () => {
    fila.confirmados = [true, false, false, false];

    const container = await montarFeitio();

    expect(container.textContent).toContain(
      '3 lançamentos ainda na fila de verificação. O custo por litro que sair daqui é parcial: R$ 13.800,00 confirmados de R$ 15.460,00 registrados.',
    );
  });

  it('nenhum lançamento na fila — o aviso de custo parcial não aparece', async () => {
    fila.confirmados = [true, true, true, true];

    const container = await montarFeitio();

    expect(container.textContent).not.toContain('ainda na fila de verificação');
    expect(container.textContent).not.toContain('parcial');
  });
});

describe('FeitioPage: painel de conclusão por densidade', () => {
  it.each([
    { nome: 'escritório', densidade: 'office' as const, colunas: 'repeat(3, 1fr)' },
    { nome: 'campo', densidade: 'field' as const, colunas: '1fr' },
  ])('$nome — a grade dos três campos usa as colunas $colunas', async ({ densidade, colunas }) => {
    definirDensidade(densidade);
    const container = await montarFeitio();

    await abrirConclusao(container);

    expect(gradeDosCampos(container)?.style.gridTemplateColumns).toBe(colunas);
  });
});

describe('FeitioPage: feitio concluído', () => {
  it('Concluir e criar o lote — mostra o recado com os litros, a força e o custo por litro', async () => {
    const container = await montarFeitio();

    await concluirComLitros(container, '40');

    expect(textoDoRecado(container)).toBe(
      'Feitio de setembro concluído: 40,0 L de força 2 entraram no estoque como Lote 09/2026. Custo apurado de R$ 386,50 por litro.',
    );
  });

  it('Concluir — fecha o painel e some o botão Concluir o feitio com a frase dele', async () => {
    const container = await montarFeitio();

    await concluirComLitros(container, '40');

    expect(painelAberto(container)).toBe(false);
    expect(botaoPresente(container, 'Concluir o feitio')).toBe(false);
    expect(container.textContent).not.toContain('Concluir cria o lote e fecha o custo.');
  });

  it('Concluir — o selo vira Concluído e o período ganha o fim, sem o "ainda na panela"', async () => {
    const container = await montarFeitio();

    await concluirComLitros(container, '40');

    expect(folhaComTexto<HTMLSpanElement>(container, 'span', 'Concluído').style.color).toBe(COR.confirmado);
    expect(folhaComTexto(container, 'span', '08/09/2026 a 11/09/2026 · Casa de feitio · Chácara')).toBeTruthy();
    expect(container.textContent).not.toContain('Em andamento');
    expect(container.textContent).not.toContain('ainda na panela');
  });

  it('Concluir — a caixa do lote mostra o código fixo Lote 09/2026, os litros, a força e que um feitio gera um lote', async () => {
    const container = await montarFeitio();

    await concluirComLitros(container, '40');

    expect(textosDasFolhas(caixaDoLoteProduzido(container) as HTMLElement)).toEqual([
      'Lote 09/2026',
      '40,0 L',
      'Força 2',
      'Um feitio gera exatamente um lote.',
    ]);
  });

  it('Concluir — a caixa do lote abre com o ícone de check, antes do código do lote', async () => {
    const container = await montarFeitio();

    await concluirComLitros(container, '40');

    expect(glifoDe((caixaDoLoteProduzido(container) as HTMLElement).firstElementChild)).toBe('lucide-circle-check');
  });

  it('Concluir — o custo por litro ganha o número, sobre os litros produzidos, no verde de confirmado', async () => {
    const container = await montarFeitio();

    await concluirComLitros(container, '40');

    expect(numero(container, 'Custo por litro')).toEqual(['Custo por litro', 'R$ 386,50', 'sobre 40,0 L']);
    expect(corDoNumero(container, 'Custo por litro')).toBe(COR.confirmado);
  });

  it('Concluir — o gasto até agora e o aviso de custo parcial continuam como estavam', async () => {
    const container = await montarFeitio();

    await concluirComLitros(container, '40');

    expect(numero(container, 'Gasto até agora')[1]).toBe('R$ 15.460,00');
    expect(container.textContent).toContain('2 lançamentos ainda na fila de verificação.');
  });

  it('Concluir — a comparação mostra a barra do feitio feito em casa e quanto saiu mais barato', async () => {
    const container = await montarFeitio();

    await concluirComLitros(container, '40');

    const cartao = cartaoDe(container, 'Fazer ou comprar');
    expect(textosDasFolhas(cartao).slice(0, 5)).toEqual([
      'Fazer ou comprar',
      'Feitio de setembro · feito em casa',
      'R$ 386,50/L',
      'Comprar de Céu do Mar',
      'R$ 420,00/L',
    ]);
    expect(cartao.textContent).toContain('Fazer saiu R$ 33,50 mais barato por litro — R$ 1.340,00 no total deste feitio.');
    expect(cartao.textContent).not.toContain('A comparação fecha quando o feitio concluir.');
  });

  it('Concluir — a barra do feitio é proporcional ao preço de fora, e a de fora fica cheia', async () => {
    const container = await montarFeitio();

    await concluirComLitros(container, '40');

    const larguras = barrasDeComparacao(container).map((barra) => barra.style.width);
    expect(parseFloat(larguras[0] as string)).toBeCloseTo(92.02, 2);
    expect(larguras[1]).toBe('100%');
  });

  it('Concluir com litros em hexadecimal (0x10) — o recado e a caixa do lote usam 16,0 L, como o painel', async () => {
    const container = await montarFeitio();

    await concluirComLitros(container, '0x10');

    expect(textoDoRecado(container)).toContain('16,0 L de força 2 entraram no estoque como Lote 09/2026. Custo apurado de R$ 966,25 por litro.');
    expect(textosDasFolhas(caixaDoLoteProduzido(container) as HTMLElement)[1]).toBe('16,0 L');
  });

  it('Concluir com litros fracionados (42,5) — o recado divide o gasto pelos litros sem arredondar', async () => {
    const container = await montarFeitio();

    await concluirComLitros(container, '42,5');

    expect(textoDoRecado(container)).toBe(
      'Feitio de setembro concluído: 42,5 L de força 2 entraram no estoque como Lote 09/2026. Custo apurado de R$ 363,76 por litro.',
    );
  });

  it('Concluir com litros fracionados (42,5) — o número Custo por litro divide o gasto pelos litros sem arredondar', async () => {
    const container = await montarFeitio();

    await concluirComLitros(container, '42,5');

    expect(numero(container, 'Custo por litro')).toEqual(['Custo por litro', 'R$ 363,76', 'sobre 42,5 L']);
  });

  it('Concluir com litros fracionados (42,5) — a caixa do lote mostra os litros sem arredondar', async () => {
    const container = await montarFeitio();

    await concluirComLitros(container, '42,5');

    expect(textosDasFolhas(caixaDoLoteProduzido(container) as HTMLElement)[1]).toBe('42,5 L');
  });

  it('Concluir com litros fracionados (42,5) — a comparação usa o mesmo custo por litro e a economia sobre 42,5 L', async () => {
    const container = await montarFeitio();

    await concluirComLitros(container, '42,5');

    const cartao = cartaoDe(container, 'Fazer ou comprar');
    expect(textosDasFolhas(cartao)[2]).toBe('R$ 363,76/L');
    expect(cartao.textContent).toContain(
      'Fazer saiu R$ 56,24 mais barato por litro — R$ 2.390,00 no total deste feitio.',
    );
  });

  it('Concluir com custo por litro acima do preço de fora — a frase continua dizendo "mais barato", com valores negativos', async () => {
    const container = await montarFeitio();

    await concluirComLitros(container, '10');

    expect(cartaoDe(container, 'Fazer ou comprar').textContent).toContain(
      'Fazer saiu R$ -1.126,00 mais barato por litro — R$ -11.260,00 no total deste feitio.',
    );
  });

  it('Concluir com custo por litro acima do preço de fora — a barra do feitio é limitada a 100%', async () => {
    const container = await montarFeitio();

    await concluirComLitros(container, '10');

    expect(barrasDeComparacao(container).map((barra) => barra.style.width)).toEqual(['100%', '100%']);
  });

  it('Concluir com a força escrita em outro formato — o recado põe a força em minúsculas e a caixa mostra como foi escrita', async () => {
    const container = await montarFeitio();
    await abrirConclusao(container);
    await preencherLitros(container, '40');
    await digitar(campo(painelDeConclusao(container), 'Força'), 'Força 3 Reforçada');

    await clicar(botaoComTexto(container, 'Concluir e criar o lote'));

    expect(textoDoRecado(container)).toContain('40,0 L de força 3 reforçada entraram no estoque');
    expect(textosDasFolhas(caixaDoLoteProduzido(container) as HTMLElement)[2]).toBe('Força 3 Reforçada');
  });

  it('Concluir com outra data de encerramento — o período mostra a data digitada e o lote continua Lote 09/2026', async () => {
    const container = await montarFeitio();
    await abrirConclusao(container);
    await preencherLitros(container, '40');
    await digitar(campo(painelDeConclusao(container), 'Data de encerramento'), '05/10/2026');

    await clicar(botaoComTexto(container, 'Concluir e criar o lote'));

    expect(folhaComTexto(container, 'span', '08/09/2026 a 05/10/2026 · Casa de feitio · Chácara')).toBeTruthy();
    expect(caixaDoLoteProduzido(container)).not.toBeNull();
  });

  it('Concluir com uma data que não é data — aceita o texto como está, sem validar', async () => {
    const container = await montarFeitio();
    await abrirConclusao(container);
    await preencherLitros(container, '40');
    await digitar(campo(painelDeConclusao(container), 'Data de encerramento'), 'depois da lua cheia');

    await clicar(botaoComTexto(container, 'Concluir e criar o lote'));

    expect(folhaComTexto(container, 'span', '08/09/2026 a depois da lua cheia · Casa de feitio · Chácara')).toBeTruthy();
  });

  it('Concluir — não mexe nos feitios anteriores nem na matéria-prima', async () => {
    const container = await montarFeitio();

    await concluirComLitros(container, '40');

    expect(totalDaSecao(container, 'Matéria-prima')).toBe('R$ 12.100,00');
    expect(Array.from(cartaoDe(container, 'Feitios anteriores').children[1]?.children ?? [])).toHaveLength(3);
  });

  it('fechar recado — tira o recado e mantém o feitio concluído', async () => {
    const container = await montarFeitio();
    await concluirComLitros(container, '40');

    await clicar(elemento(container, 'button[aria-label="fechar recado"]'));

    expect(semRecado(container)).toBe(true);
    expect(folhaComTexto(container, 'span', 'Concluído')).toBeTruthy();
  });

  it('campo — conclui do mesmo jeito, com o mesmo recado e os mesmos números', async () => {
    definirDensidade('field');
    const container = await montarFeitio();

    await concluirComLitros(container, '40');

    expect(textoDoRecado(container)).toContain('Custo apurado de R$ 386,50 por litro.');
    expect(numero(container, 'Custo por litro')).toEqual(['Custo por litro', 'R$ 386,50', 'sobre 40,0 L']);
  });
});

describe('FeitioPage: alvo de toque por densidade', () => {
  it.each([
    { nome: 'escritório', densidade: 'office' as const, alvo: 'var(--target-office)' },
    { nome: 'campo', densidade: 'field' as const, alvo: 'var(--target-field)' },
  ])('$nome — o botão Concluir o feitio usa o alvo $alvo', async ({ densidade, alvo }) => {
    definirDensidade(densidade);
    const container = await montarFeitio();

    expect(botaoComTexto(container, 'Concluir o feitio').style.minHeight).toBe(alvo);
  });

  it.each([
    { nome: 'escritório', densidade: 'office' as const, alvo: 'var(--target-office)' },
    { nome: 'campo', densidade: 'field' as const, alvo: 'var(--target-field)' },
  ])('$nome — os campos e os botões do painel usam o alvo $alvo', async ({ densidade, alvo }) => {
    definirDensidade(densidade);
    const container = await montarFeitio();
    await abrirConclusao(container);

    const painel = painelDeConclusao(container);
    expect(campo(painel, 'Litros produzidos').style.minHeight).toBe(alvo);
    expect(botaoComTexto(painel, 'Concluir e criar o lote').style.minHeight).toBe(alvo);
    expect(botaoComTexto(painel, 'Cancelar').style.minHeight).toBe(alvo);
  });
});
