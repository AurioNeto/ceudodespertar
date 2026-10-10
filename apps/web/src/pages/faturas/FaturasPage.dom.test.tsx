import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContaId, Fatura } from '@cdd/contracts';
import { dataLocal } from '@cdd/contracts';
import { botaoComTexto, clicar, desmontarTudo, digitar, elemento, escolherOpcao, montar, todos } from '@/testes/montagem';
import { FaturasPage } from './FaturasPage';

const cenario = vi.hoisted(() => ({ faturas: undefined as readonly Fatura[] | undefined }));

vi.mock('@/mocks/faturas', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('@/mocks/faturas')>();
  return {
    ...original,
    get faturas() {
      return cenario.faturas ?? original.faturas;
    },
  };
});

beforeEach(() => {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    media: consulta,
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
});

afterEach(async () => {
  await desmontarTudo();
  vi.unstubAllGlobals();
  cenario.faturas = undefined;
});

const linhasDaTabela = (container: HTMLElement) => todos<HTMLTableRowElement>(container, 'tbody tr');
const linhaDaCompra = (container: HTMLElement, motivo: string) => {
  const achada = linhasDaTabela(container).find((linha) => linha.textContent?.includes(motivo));
  if (!achada) throw new Error(`compra não encontrada: ${motivo}`);
  return achada;
};

async function abrirFaturaDeSetembro(container: HTMLElement) {
  const botaoDaFatura = todos<HTMLButtonElement>(container, 'button').find((botao) =>
    botao.textContent?.includes('setembro de 2026'),
  );
  if (!botaoDaFatura) throw new Error('fatura de setembro não encontrada');
  await clicar(botaoDaFatura);
}

const COR_DO_SELO_PENDENTE = 'var(--color-pending)';
const FUNDO_DO_SELO_PENDENTE = 'var(--color-pending-soft)';

const selosPendentesDaLinha = (linha: HTMLElement) =>
  todos<HTMLSpanElement>(linha, 'span').filter((span) => span.style.color === COR_DO_SELO_PENDENTE);

describe('FaturasPage: selo das compras a conferir', () => {
  it('compra a conferir — leva um único selo com o texto exato A conferir, no tom pendente', async () => {
    const { container } = await montar(<FaturasPage />);
    await abrirFaturaDeSetembro(container);

    const selos = selosPendentesDaLinha(linhaDaCompra(container, 'aluguel de betoneira'));

    expect(selos.map((selo) => [selo.textContent, selo.style.color, selo.style.background])).toEqual([
      ['A conferir', COR_DO_SELO_PENDENTE, FUNDO_DO_SELO_PENDENTE],
    ]);
  });

  it('compra já confirmada — não leva selo nenhum e o texto A conferir não aparece na linha', async () => {
    const { container } = await montar(<FaturasPage />);
    await abrirFaturaDeSetembro(container);

    const linha = linhaDaCompra(container, 'mercado do trabalho de setembro');

    expect(selosPendentesDaLinha(linha)).toHaveLength(0);
    expect(linha.textContent).not.toContain('A conferir');
  });
});

const textosDasFolhas = (raiz: Element): string[] =>
  todos(raiz, '*')
    .filter((no) => no.childElementCount === 0 && no.textContent !== '')
    .map((no) => no.textContent ?? '');

const folhasComTexto = (container: HTMLElement, texto: string) =>
  todos(container, '*').filter((no) => no.childElementCount === 0 && no.textContent === texto);

const blocoDoRotulo = (container: HTMLElement, rotulo: string): string[] => {
  const achado = folhasComTexto(container, rotulo)[0];
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

const botoesDoTopo = (container: HTMLElement) => todos<HTMLButtonElement>(container, 'button[aria-pressed]');

const botoesDaListaDeFaturas = (container: HTMLElement): HTMLButtonElement[] => {
  const rotuloDaLista = todos(container, 'span').find((no) => no.textContent?.startsWith('Faturas de '));
  if (!rotuloDaLista?.parentElement) throw new Error('lista de faturas não encontrada');
  return todos<HTMLButtonElement>(rotuloDaLista.parentElement, ':scope > button');
};

const linhasDaLista = (container: HTMLElement) => botoesDaListaDeFaturas(container).map(textosDasFolhas);

const faturaAtiva = (container: HTMLElement) =>
  botoesDaListaDeFaturas(container)
    .filter((botao) => botao.getAttribute('aria-current') === 'true')
    .map((botao) => textosDasFolhas(botao)[0]);

const tituloDoDetalhe = (container: HTMLElement) =>
  todos(container, 'span').find((no) => /^Cartão .+ · \S+ de \d{4}$/.test(no.textContent ?? ''))?.textContent;

const abrirFatura = (container: HTMLElement, competencia: string) => {
  const botao = botoesDaListaDeFaturas(container).find((candidato) => candidato.textContent?.includes(competencia));
  if (!botao) throw new Error(`fatura não encontrada: ${competencia}`);
  return clicar(botao);
};

const escolherCartao = (container: HTMLElement, nome: string) => {
  const botao = botoesDoTopo(container).find((candidato) => candidato.textContent?.includes(nome));
  if (!botao) throw new Error(`cartão não encontrado: ${nome}`);
  return clicar(botao);
};

const recadoMostrado = (container: HTMLElement) => {
  const faixa = container.querySelector('[role="status"]');
  return faixa ? (textosDasFolhas(faixa)[0] ?? null) : null;
};

const linhaDePagamento = (container: HTMLElement) =>
  todos(container, 'div').find((no) => no.textContent?.startsWith('Paga em'))?.textContent ?? null;

const dividaDoCartao = (container: HTMLElement, nome: string) => {
  const botao = botoesDoTopo(container).find((candidato) => candidato.textContent?.includes(nome));
  if (!botao) throw new Error(`cartão não encontrado: ${nome}`);
  return textosDasFolhas(botao);
};

const textosDosBotoes = (container: HTMLElement) => todos(container, 'button').map((botao) => botao.textContent?.trim());

async function registrarPagamentoDaFaturaAberta(container: HTMLElement) {
  await clicar(botaoComTexto(container, 'Fechar fatura'));
  await clicar(botaoComTexto(container, 'Registrar pagamento'));
  await clicar(botaoComTexto(container, 'Confirmar pagamento'));
}

const fixarDensidade = (campo: boolean) =>
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    media: consulta,
    matches: campo,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));

describe('FaturasPage em escritório: cabeçalho, cartões e lista de faturas', () => {
  it('cabeçalho — mostra o código com o nome da tela, o título e o subtítulo', async () => {
    const { container } = await montar(<FaturasPage />);

    expect(textosDasFolhas(elemento(container, 'header'))).toEqual([
      'F-09 · Faturas de cartão',
      'Faturas de cartão',
      'A compra é despesa; pagar a fatura é transferência · CDD',
    ]);
  });

  it('cartões do topo — mostram nome, descrição e o que a casa ainda deve, somando as faturas que não estão pagas', async () => {
    const { container } = await montar(<FaturasPage />);

    expect(botoesDoTopo(container).map(textosDasFolhas)).toEqual([
      ['Cartão Cora PJ', 'cartão corporativo · CNPJ do CDD', '4.132,50', 'em aberto'],
      ['Cartão Itaú Paty', 'cartão pessoal usado em nome da casa', '1.679,97', 'em aberto'],
    ]);
  });

  it('cartões do topo — abre com o primeiro cartão marcado', async () => {
    const { container } = await montar(<FaturasPage />);

    expect(botoesDoTopo(container).map((botao) => botao.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
  });

  it('dívida do cartão — em tom de atenção quando há dívida', async () => {
    const { container } = await montar(<FaturasPage />);

    const valor = folhasComTexto(botoesDoTopo(container)[0] as HTMLElement, '4.132,50')[0] as HTMLElement;

    expect(valor.style.color).toBe('var(--color-attention)');
  });

  it('lista de faturas — mostra as do cartão com competência, selo, total e número de compras', async () => {
    const { container } = await montar(<FaturasPage />);

    expect(linhasDaLista(container)).toEqual([
      ['setembro de 2026', 'Aberta', '1.284,90', '3 compras'],
      ['agosto de 2026', 'Fechada, a pagar', '2.847,60', '6 compras'],
      ['julho de 2026', 'Paga', '3.512,40', '5 compras'],
    ]);
    expect(folhasComTexto(container, 'Faturas de Cartão Cora PJ')).toHaveLength(1);
  });

  it.each([
    { competencia: 'setembro de 2026', rotulo: 'Aberta', cor: 'var(--color-royal-ink)', fundo: 'var(--color-royal-soft)' },
    { competencia: 'agosto de 2026', rotulo: 'Fechada, a pagar', cor: 'var(--color-pending)', fundo: 'var(--color-pending-soft)' },
    { competencia: 'julho de 2026', rotulo: 'Paga', cor: 'var(--color-confirmed)', fundo: 'var(--color-confirmed-soft)' },
  ])('selo da fatura de $competencia — diz $rotulo no tom $cor', async ({ competencia, rotulo, cor, fundo }) => {
    const { container } = await montar(<FaturasPage />);

    const linha = botoesDaListaDeFaturas(container).find((botao) => botao.textContent?.includes(competencia)) as HTMLElement;
    const selo = folhasComTexto(linha, rotulo)[0] as HTMLElement;

    expect([selo.style.color, selo.style.background]).toEqual([cor, fundo]);
  });

  it('fatura aberta de início — é a primeira fechada do conjunto, e não a primeira da lista', async () => {
    const { container } = await montar(<FaturasPage />);

    expect(faturaAtiva(container)).toEqual(['agosto de 2026']);
    expect(tituloDoDetalhe(container)).toBe('Cartão Cora PJ · agosto de 2026');
  });
});

describe('FaturasPage em escritório: detalhe da fatura', () => {
  it('números — mostram o total, a contagem de compras e as datas de fechamento e vencimento', async () => {
    const { container } = await montar(<FaturasPage />);

    expect(blocoDoRotulo(container, 'Total da fatura')).toEqual(['Total da fatura', '2.847,60']);
    expect(blocoDoRotulo(container, 'Compras')).toEqual(['Compras', '6']);
    expect(blocoDoRotulo(container, 'Fecha em')).toEqual(['Fecha em', '28/08/2026']);
    expect(blocoDoRotulo(container, 'Vence em')).toEqual(['Vence em', '05/09/2026']);
  });

  it('selo da fatura — o detalhe repete o selo da lista', async () => {
    const { container } = await montar(<FaturasPage />);

    expect(folhasComTexto(container, 'Fechada, a pagar')).toHaveLength(2);
  });

  it('explicação — diz que pagar a fatura não é uma despesa nova', async () => {
    const { container } = await montar(<FaturasPage />);

    expect(folhasComTexto(container, 'Pagar a fatura não é uma despesa nova')).toHaveLength(1);
  });

  it('tabela de compras — tem as cinco colunas e uma linha por compra, mais a do total', async () => {
    const { container } = await montar(<FaturasPage />);

    expect(todos(container, 'th').map((cabecalho) => cabecalho.textContent)).toEqual([
      'Data',
      'Compra',
      'Grupo',
      'Quem registrou',
      'Valor',
    ]);
    expect(linhasDaTabela(container)).toHaveLength(7);
  });

  it('linha de uma compra — mostra dia e mês, motivo, categoria, grupo, quem registrou e valor', async () => {
    const { container } = await montar(<FaturasPage />);

    expect(textosDasFolhas(linhaDaCompra(container, 'material elétrico do dormitório'))).toEqual([
      '11/08',
      'material elétrico do dormitório',
      'Obra do dormitório',
      'Dormitório',
      'Lucia Prado',
      '764,80',
    ]);
  });

  it('linha do total — repete o total da fatura no fim da tabela', async () => {
    const { container } = await montar(<FaturasPage />);

    const ultima = linhasDaTabela(container).at(-1) as HTMLElement;

    expect(textosDasFolhas(ultima)).toEqual(['Total', '2.847,60']);
  });

  it('fatura fechada — oferece Registrar pagamento e explica que grava uma transferência', async () => {
    const { container } = await montar(<FaturasPage />);

    expect(textosDosBotoes(container)).toContain('Registrar pagamento');
    expect(textosDosBotoes(container)).not.toContain('Fechar fatura');
    expect(folhasComTexto(container, 'Grava uma transferência da conta escolhida para o cartão.')).toHaveLength(1);
  });

  it('fatura aberta — oferece Fechar fatura e avisa que a compra nova entra na seguinte, com a conta de compras a conferir', async () => {
    const { container } = await montar(<FaturasPage />);

    await abrirFatura(container, 'setembro de 2026');

    expect(textosDosBotoes(container)).toContain('Fechar fatura');
    expect(textosDosBotoes(container)).not.toContain('Registrar pagamento');
    expect(container.textContent).toContain(
      'Depois de fechada, compra nova neste cartão entra na fatura seguinte. 1 compra ainda a conferir — fechar a fatura não confere ninguém.',
    );
  });

  it('fatura paga — diz quando e de que conta foi paga e não oferece ação nenhuma', async () => {
    const { container } = await montar(<FaturasPage />);

    await abrirFatura(container, 'julho de 2026');

    expect(linhaDePagamento(container)).toBe('Paga em 05/08/2026 por transferência de Cora PJ.');
    expect(folhasComTexto(container, 'Fatura paga. Correção só por estorno do lançamento de origem.')).toHaveLength(1);
    expect(textosDosBotoes(container)).not.toContain('Registrar pagamento');
    expect(textosDosBotoes(container)).not.toContain('Fechar fatura');
  });

  it('alerta do cartão — o cartão pessoal mostra o aviso dos adiantamentos, e o corporativo não mostra aviso', async () => {
    const { container } = await montar(<FaturasPage />);
    const aviso = 'Cartão pessoal: cada compra desta fatura gera um adiantamento a ressarcir.';
    expect(folhasComTexto(container, aviso)).toHaveLength(0);

    await escolherCartao(container, 'Cartão Itaú Paty');

    expect(folhasComTexto(container, aviso)).toHaveLength(1);
  });
});

describe('FaturasPage: escolher cartão e fatura', () => {
  it('escolher o outro cartão — marca o cartão, troca a lista e abre a primeira fatura que não está paga', async () => {
    const { container } = await montar(<FaturasPage />);

    await escolherCartao(container, 'Cartão Itaú Paty');

    expect(botoesDoTopo(container).map((botao) => botao.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
    expect(folhasComTexto(container, 'Faturas de Cartão Itaú Paty')).toHaveLength(1);
    expect(linhasDaLista(container)).toEqual([
      ['setembro de 2026', 'Aberta', '612,30', '2 compras'],
      ['agosto de 2026', 'Fechada, a pagar', '1.067,67', '4 compras'],
    ]);
    expect(tituloDoDetalhe(container)).toBe('Cartão Itaú Paty · setembro de 2026');
  });

  it('voltar ao primeiro cartão — abre setembro, a primeira que não está paga, e não agosto, como no início', async () => {
    const { container } = await montar(<FaturasPage />);
    await escolherCartao(container, 'Cartão Itaú Paty');

    await escolherCartao(container, 'Cartão Cora PJ');

    expect(faturaAtiva(container)).toEqual(['setembro de 2026']);
  });

  it('escolher outra fatura — marca a fatura e mostra as compras dela', async () => {
    const { container } = await montar(<FaturasPage />);

    await abrirFatura(container, 'setembro de 2026');

    expect(faturaAtiva(container)).toEqual(['setembro de 2026']);
    expect(blocoDoRotulo(container, 'Total da fatura')).toEqual(['Total da fatura', '1.284,90']);
    expect(blocoDoRotulo(container, 'Vence em')).toEqual(['Vence em', '05/10/2026']);
  });

  it('escolher outra fatura com o formulário de pagamento aberto — fecha o formulário e limpa o recado', async () => {
    const { container } = await montar(<FaturasPage />);
    await abrirFatura(container, 'setembro de 2026');
    await clicar(botaoComTexto(container, 'Fechar fatura'));
    await clicar(botaoComTexto(container, 'Registrar pagamento'));
    expect(textosDosBotoes(container)).toContain('Confirmar pagamento');
    expect(recadoMostrado(container)).not.toBeNull();

    await abrirFatura(container, 'julho de 2026');

    expect(textosDosBotoes(container)).not.toContain('Confirmar pagamento');
    expect(recadoMostrado(container)).toBeNull();
  });

  it('escolher o outro cartão com o formulário de pagamento aberto — fecha o formulário', async () => {
    const { container } = await montar(<FaturasPage />);
    await clicar(botaoComTexto(container, 'Registrar pagamento'));

    await escolherCartao(container, 'Cartão Itaú Paty');

    expect(textosDosBotoes(container)).not.toContain('Confirmar pagamento');
  });
});

describe('FaturasPage: fechar a fatura', () => {
  it('Fechar fatura — a fatura vira Fechada, a pagar, com o recado, e a dívida do cartão não muda', async () => {
    const { container } = await montar(<FaturasPage />);
    await abrirFatura(container, 'setembro de 2026');

    await clicar(botaoComTexto(container, 'Fechar fatura'));

    expect(linhasDaLista(container)[0]).toEqual(['setembro de 2026', 'Fechada, a pagar', '1.284,90', '3 compras']);
    expect(recadoMostrado(container)).toBe(
      'Fatura fechada. Compras novas neste cartão entram na fatura da competência seguinte.',
    );
    expect(dividaDoCartao(container, 'Cartão Cora PJ')[2]).toBe('4.132,50');
  });

  it('fatura recém-fechada — passa a oferecer Registrar pagamento no lugar de Fechar fatura', async () => {
    const { container } = await montar(<FaturasPage />);
    await abrirFatura(container, 'setembro de 2026');

    await clicar(botaoComTexto(container, 'Fechar fatura'));

    expect(textosDosBotoes(container)).toContain('Registrar pagamento');
    expect(textosDosBotoes(container)).not.toContain('Fechar fatura');
  });

  it('fechar a fatura de um cartão — não mexe nas faturas do outro cartão', async () => {
    const { container } = await montar(<FaturasPage />);
    await abrirFatura(container, 'setembro de 2026');
    await clicar(botaoComTexto(container, 'Fechar fatura'));

    await escolherCartao(container, 'Cartão Itaú Paty');

    expect(linhasDaLista(container)[0]).toEqual(['setembro de 2026', 'Aberta', '612,30', '2 compras']);
  });

  it('recado — o botão de fechar o recado o tira da tela', async () => {
    const { container } = await montar(<FaturasPage />);
    await abrirFatura(container, 'setembro de 2026');
    await clicar(botaoComTexto(container, 'Fechar fatura'));

    await clicar(elemento(container, 'button[aria-label="fechar recado"]'));

    expect(recadoMostrado(container)).toBeNull();
  });
});

describe('FaturasPage: registrar o pagamento', () => {
  it('Registrar pagamento — abre o formulário no lugar do botão, com a conta, a data de hoje e o valor da fatura', async () => {
    const { container } = await montar(<FaturasPage />);

    await clicar(botaoComTexto(container, 'Registrar pagamento'));

    expect(folhasComTexto(container, 'Registrar o pagamento')).toHaveLength(1);
    expect(campoPeloRotulo<HTMLSelectElement>(container, 'Conta de saída').value).toBe('cora');
    expect(campoPeloRotulo(container, 'Data do pagamento').value).toBe('2026-09-02');
    expect(campoPeloRotulo(container, 'Valor').value).toBe('2.847,60');
    expect(textosDosBotoes(container)).toEqual(expect.arrayContaining(['Confirmar pagamento', 'Cancelar']));
    expect(textosDosBotoes(container)).not.toContain('Registrar pagamento');
  });

  it('formulário de pagamento — oferece as contas de saída e o valor não se edita', async () => {
    const { container } = await montar(<FaturasPage />);
    await clicar(botaoComTexto(container, 'Registrar pagamento'));

    const opcoes = todos<HTMLOptionElement>(campoPeloRotulo<HTMLSelectElement>(container, 'Conta de saída'), 'option');

    expect(opcoes.map((opcao) => [opcao.value, opcao.textContent])).toEqual([
      ['cora', 'Cora PJ'],
      ['especie', 'Espécie'],
      ['itau', 'Itaú Munay'],
    ]);
    expect(campoPeloRotulo(container, 'Valor').readOnly).toBe(true);
    expect(folhasComTexto(container, 'igual ao total da fatura, sem edição')).toHaveLength(1);
    expect(folhasComTexto(container, 'Isto grava uma transferência, não um lançamento de despesa.')).toHaveLength(1);
  });

  it('Cancelar — fecha o formulário, a fatura segue fechada e não há recado', async () => {
    const { container } = await montar(<FaturasPage />);
    await clicar(botaoComTexto(container, 'Registrar pagamento'));

    await clicar(botaoComTexto(container, 'Cancelar'));

    expect(textosDosBotoes(container)).toContain('Registrar pagamento');
    expect(linhasDaLista(container)[1]).toEqual(['agosto de 2026', 'Fechada, a pagar', '2.847,60', '6 compras']);
    expect(recadoMostrado(container)).toBeNull();
  });

  it('Confirmar pagamento — a fatura vira Paga em hoje, a dívida do cartão cai e o recado diz que não é despesa', async () => {
    const { container } = await montar(<FaturasPage />);
    await clicar(botaoComTexto(container, 'Registrar pagamento'));

    await clicar(botaoComTexto(container, 'Confirmar pagamento'));

    expect(linhaDePagamento(container)).toBe('Paga em 02/09/2026 por transferência de Cora PJ.');
    expect(linhasDaLista(container)[1]).toEqual(['agosto de 2026', 'Paga', '2.847,60', '6 compras']);
    expect(dividaDoCartao(container, 'Cartão Cora PJ')[2]).toBe('1.284,90');
    expect(recadoMostrado(container)).toBe(
      'Pagamento registrado como transferência. Nenhuma despesa nova foi criada — as compras já estavam lançadas.',
    );
    expect(textosDosBotoes(container)).not.toContain('Confirmar pagamento');
  });

  it('Confirmar pagamento com outra conta e outra data — a fatura paga diz a data e a conta escolhidas', async () => {
    const { container } = await montar(<FaturasPage />);
    await clicar(botaoComTexto(container, 'Registrar pagamento'));
    await escolherOpcao(campoPeloRotulo<HTMLSelectElement>(container, 'Conta de saída'), 'especie');
    await digitar(campoPeloRotulo(container, 'Data do pagamento'), '2026-09-10');

    await clicar(botaoComTexto(container, 'Confirmar pagamento'));

    expect(linhaDePagamento(container)).toBe('Paga em 10/09/2026 por transferência de Espécie.');
  });

  it('data do pagamento apagada — o pagamento é aceito e a fatura diz Paga em 01/01/1900', async () => {
    const { container } = await montar(<FaturasPage />);
    await clicar(botaoComTexto(container, 'Registrar pagamento'));
    await digitar(campoPeloRotulo(container, 'Data do pagamento'), '');

    await clicar(botaoComTexto(container, 'Confirmar pagamento'));

    expect(linhaDePagamento(container)).toBe('Paga em 01/01/1900 por transferência de Cora PJ.');
  });

  it('conta e data escolhidas — ficam guardadas quando se cancela e se abre o formulário de novo', async () => {
    const { container } = await montar(<FaturasPage />);
    await clicar(botaoComTexto(container, 'Registrar pagamento'));
    await escolherOpcao(campoPeloRotulo<HTMLSelectElement>(container, 'Conta de saída'), 'itau');
    await digitar(campoPeloRotulo(container, 'Data do pagamento'), '2026-09-15');
    await clicar(botaoComTexto(container, 'Cancelar'));

    await clicar(botaoComTexto(container, 'Registrar pagamento'));

    expect(campoPeloRotulo<HTMLSelectElement>(container, 'Conta de saída').value).toBe('itau');
    expect(campoPeloRotulo(container, 'Data do pagamento').value).toBe('2026-09-15');
  });

  it('pagar a fatura do outro cartão — baixa só a dívida dele e mantém a do primeiro', async () => {
    const { container } = await montar(<FaturasPage />);
    await escolherCartao(container, 'Cartão Itaú Paty');
    await abrirFatura(container, 'agosto de 2026');

    await clicar(botaoComTexto(container, 'Registrar pagamento'));
    await clicar(botaoComTexto(container, 'Confirmar pagamento'));

    expect(dividaDoCartao(container, 'Cartão Itaú Paty')[2]).toBe('612,30');
    expect(dividaDoCartao(container, 'Cartão Cora PJ')[2]).toBe('4.132,50');
  });

  it('cartão sem nada a pagar — mostra 0,00 em tom neutro', async () => {
    const { container } = await montar(<FaturasPage />);
    await clicar(botaoComTexto(container, 'Registrar pagamento'));
    await clicar(botaoComTexto(container, 'Confirmar pagamento'));
    await abrirFatura(container, 'setembro de 2026');

    await registrarPagamentoDaFaturaAberta(container);

    const valor = folhasComTexto(botoesDoTopo(container)[0] as HTMLElement, '0,00')[0] as HTMLElement;
    expect(valor.style.color).toBe('var(--text-meta)');
    expect(dividaDoCartao(container, 'Cartão Cora PJ')[2]).toBe('0,00');
  });
});

describe('FaturasPage em campo', () => {
  beforeEach(() => {
    fixarDensidade(true);
  });

  it('cabeçalho — mostra só o código F-09 e o título, sem subtítulo', async () => {
    const { container } = await montar(<FaturasPage />);

    expect(textosDasFolhas(elemento(container, 'header'))).toEqual(['F-09', 'Faturas de cartão']);
  });

  it('tabela de compras — esconde as colunas Grupo e Quem registrou', async () => {
    const { container } = await montar(<FaturasPage />);

    expect(todos(container, 'th').map((cabecalho) => cabecalho.textContent)).toEqual(['Data', 'Compra', 'Valor']);
  });

  it('linha de uma compra — mostra dia e mês, motivo, categoria e valor, sem grupo nem quem registrou', async () => {
    const { container } = await montar(<FaturasPage />);

    expect(textosDasFolhas(linhaDaCompra(container, 'material elétrico do dormitório'))).toEqual([
      '11/08',
      'material elétrico do dormitório',
      'Obra do dormitório',
      '764,80',
    ]);
  });

  it('linha do total — repete o total da fatura no fim da tabela', async () => {
    const { container } = await montar(<FaturasPage />);

    expect(textosDasFolhas(linhasDaTabela(container).at(-1) as HTMLElement)).toEqual(['Total', '2.847,60']);
  });

  it('números e lista — trazem os mesmos valores do escritório', async () => {
    const { container } = await montar(<FaturasPage />);

    expect(blocoDoRotulo(container, 'Total da fatura')).toEqual(['Total da fatura', '2.847,60']);
    expect(linhasDaLista(container)[1]).toEqual(['agosto de 2026', 'Fechada, a pagar', '2.847,60', '6 compras']);
    expect(dividaDoCartao(container, 'Cartão Cora PJ')[2]).toBe('4.132,50');
  });

  it('formulário de pagamento — abre com os mesmos campos e confirma como no escritório', async () => {
    const { container } = await montar(<FaturasPage />);

    await clicar(botaoComTexto(container, 'Registrar pagamento'));
    await clicar(botaoComTexto(container, 'Confirmar pagamento'));

    expect(linhaDePagamento(container)).toBe('Paga em 02/09/2026 por transferência de Cora PJ.');
  });
});

describe('FaturasPage: estados vazios e variações que a demonstração não alcança', () => {
  const faturasDaDemonstracao = async () => (await vi.importActual<typeof import('@/mocks/faturas')>('@/mocks/faturas')).faturas;

  const comAlteracao = (lista: readonly Fatura[], id: string, alteracao: Partial<Fatura>): Fatura[] =>
    lista.map((fatura) => (fatura.id === id ? Object.assign({}, fatura, alteracao) : fatura));

  const comprasTodasComStatus = (fatura: Fatura, status: 'CONFIRMADO' | 'A_CONFERIR') =>
    fatura.compras.map((compra) => Object.assign({}, compra, { status }));

  it('cartão sem faturas — mostra o estado vazio e a dívida zerada em tom neutro', async () => {
    cenario.faturas = (await faturasDaDemonstracao()).filter((fatura) => fatura.contaId !== 'cartao-itau');
    const { container } = await montar(<FaturasPage />);

    await escolherCartao(container, 'Cartão Itaú Paty');

    expect(folhasComTexto(container, 'Nenhuma fatura neste cartão')).toHaveLength(1);
    expect(
      folhasComTexto(container, 'A primeira fatura nasce com a primeira compra registrada nesta conta.'),
    ).toHaveLength(1);
    expect(linhasDaLista(container)).toEqual([]);
    expect(dividaDoCartao(container, 'Cartão Itaú Paty')).toEqual([
      'Cartão Itaú Paty',
      'cartão pessoal usado em nome da casa',
      '0,00',
      'em aberto',
    ]);
    expect(todos(container, 'table')).toHaveLength(0);
  });

  it('fatura sem compras — mostra o estado vazio no lugar da tabela, com total e contagem zerados', async () => {
    cenario.faturas = comAlteracao(await faturasDaDemonstracao(), 'f-cora-08', { compras: [] });
    const { container } = await montar(<FaturasPage />);

    expect(folhasComTexto(container, 'Nenhuma compra ainda')).toHaveLength(1);
    expect(folhasComTexto(container, 'As compras aparecem aqui conforme forem registradas neste cartão.')).toHaveLength(1);
    expect(todos(container, 'table')).toHaveLength(0);
    expect(blocoDoRotulo(container, 'Total da fatura')).toEqual(['Total da fatura', '0,00']);
    expect(blocoDoRotulo(container, 'Compras')).toEqual(['Compras', '0']);
    expect(linhasDaLista(container)[1]).toEqual(['agosto de 2026', 'Fechada, a pagar', '0,00', '0 compras']);
  });

  it('fatura aberta com duas compras a conferir — o aviso usa o plural', async () => {
    const demonstracao = await faturasDaDemonstracao();
    const setembro = demonstracao.find((fatura) => fatura.id === 'f-cora-09') as Fatura;
    cenario.faturas = comAlteracao(demonstracao, 'f-cora-09', { compras: comprasTodasComStatus(setembro, 'A_CONFERIR') });
    const { container } = await montar(<FaturasPage />);

    await abrirFatura(container, 'setembro de 2026');

    expect(container.textContent).toContain('3 compras ainda a conferir — fechar a fatura não confere ninguém.');
  });

  it('fatura aberta sem compra a conferir — o aviso não fala de conferência', async () => {
    const demonstracao = await faturasDaDemonstracao();
    const setembro = demonstracao.find((fatura) => fatura.id === 'f-cora-09') as Fatura;
    cenario.faturas = comAlteracao(demonstracao, 'f-cora-09', { compras: comprasTodasComStatus(setembro, 'CONFIRMADO') });
    const { container } = await montar(<FaturasPage />);

    await abrirFatura(container, 'setembro de 2026');

    expect(container.textContent).toContain('Depois de fechada, compra nova neste cartão entra na fatura seguinte.');
    expect(container.textContent).not.toContain('ainda a conferir');
  });

  it('compra sem grupo — mostra um traço na coluna Grupo', async () => {
    const demonstracao = await faturasDaDemonstracao();
    const agosto = demonstracao.find((fatura) => fatura.id === 'f-cora-08') as Fatura;
    const semGrupoNaPrimeira = agosto.compras.map((compra, posicao) =>
      posicao === 0 ? Object.assign({}, compra, { grupo: null }) : compra,
    );
    cenario.faturas = comAlteracao(demonstracao, 'f-cora-08', { compras: semGrupoNaPrimeira });
    const { container } = await montar(<FaturasPage />);

    expect(textosDasFolhas(linhaDaCompra(container, 'mercado da cerimônia de agosto'))).toEqual([
      '02/08',
      'mercado da cerimônia de agosto',
      'Alimentação de cerimônia',
      '—',
      'Aurio Neto',
      '487,40',
    ]);
  });

  it('escolher um cartão cuja primeira fatura já está paga — abre a primeira que não está paga', async () => {
    cenario.faturas = comAlteracao(await faturasDaDemonstracao(), 'f-itau-09', {
      status: 'PAGA',
      pagaEm: dataLocal('2026-09-01'),
      contaPagamentoId: 'cora' as ContaId,
    });
    const { container } = await montar(<FaturasPage />);

    await escolherCartao(container, 'Cartão Itaú Paty');

    expect(faturaAtiva(container)).toEqual(['agosto de 2026']);
  });

  it('fatura paga sem conta de pagamento conhecida — diz só a data, sem a conta', async () => {
    cenario.faturas = comAlteracao(await faturasDaDemonstracao(), 'f-cora-07', { contaPagamentoId: null });
    const { container } = await montar(<FaturasPage />);

    await abrirFatura(container, 'julho de 2026');

    expect(linhaDePagamento(container)).toBe('Paga em 05/08/2026.');
  });
});
