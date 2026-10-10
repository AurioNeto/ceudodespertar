import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { botaoComTexto, clicar, desmontarTudo, digitar, elemento, escolherOpcao, montar, todos } from '@/testes/montagem';
import { DevolucoesPage } from './DevolucoesPage';
import {
  AGORA_FIXO,
  botaoDoRecado,
  campoDoRotulo,
  cartaoDoRotulo,
  fixarDensidade,
  folhaComTextoExato,
  itensDaListaDoCartao,
  recadoDaTela,
  textoDaFolhaPai,
} from './apoioDeTeste';

const cenario = vi.hoisted(() => ({ solicitadasEm: undefined as readonly string[] | undefined }));

vi.mock('@/mocks/devolucoes', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('@/mocks/devolucoes')>();
  return {
    ...original,
    get fila() {
      const datas = cenario.solicitadasEm;
      if (!datas) return original.fila;
      return original.fila.slice(0, datas.length).map((devolucao, i) => Object.assign({}, devolucao, { solicitadaEm: datas[i]! }));
    },
  };
});

beforeEach(() => {
  fixarDensidade('office');
  vi.setSystemTime(AGORA_FIXO);
});

afterEach(async () => {
  cenario.solicitadasEm = undefined;
  await desmontarTudo();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const CARLOS = 'Carlos Menezes';
const OTAVIO = 'Otávio Lins';
const INSTITUTO = 'Instituto Semente Viva';

const cartaoDaFila = (container: HTMLElement, nome: string): HTMLElement => {
  const titulo = todos<HTMLSpanElement>(container, 'span').find(
    (span) => span.textContent === nome && span.style.font === 'var(--text-title-sm)',
  );
  const cartao = titulo?.closest<HTMLElement>('div[style*="border: var(--border-hairline)"]');
  if (!cartao) throw new Error(`cartão da fila não encontrado: ${nome}`);
  return cartao;
};
const nomesNaFila = (container: HTMLElement) =>
  todos<HTMLButtonElement>(container, 'button')
    .filter((botao) => botao.textContent?.startsWith('Devolver R$'))
    .map((botao) => botao.textContent);
const abrirPainel = (container: HTMLElement, nome: string, valor: string) =>
  clicar(botaoComTexto(cartaoDaFila(container, nome), `Devolver ${valor}`));
const confirmar = (cartao: HTMLElement) => clicar(botaoComTexto(cartao, 'Confirmar a devolução'));
const jaDevolvidas = (container: HTMLElement) => itensDaListaDoCartao(cartaoDoRotulo(container, 'Já devolvidas'));
const numero = (container: HTMLElement, rotulo: string) => textoDaFolhaPai(container, rotulo);
const cabecalho = (container: HTMLElement) => elemento(container, 'header').textContent;

describe('DevolucoesPage: cabeçalho e totais', () => {
  it.each([
    {
      densidade: 'office' as const,
      esperado: 'E-09 · Devoluções a pagarDevoluções a pagarO que o Acolhimento pediu e a Tesouraria paga · CDD',
    },
    { densidade: 'field' as const, esperado: 'E-09Devoluções a pagar' },
  ])('densidade $densidade — o cabeçalho é $esperado', async ({ densidade, esperado }) => {
    fixarDensidade(densidade);

    const { container } = await montar(<DevolucoesPage />);

    expect(cabecalho(container)).toBe(esperado);
  });

  it('ao abrir — soma a fila (R$ 2.550,00 em 3 pedidos), aponta quem espera há mais tempo e conta 1 devolvida', async () => {
    const { container } = await montar(<DevolucoesPage />);

    expect(numero(container, 'A devolver')).toBe('A devolverR$ 2.550,003 pedidos');
    expect(numero(container, 'Esperando há mais tempo')).toBe('Esperando há mais tempo54 diasOtávio Lins');
    expect(numero(container, 'Devolvidas este ano')).toBe('Devolvidas este ano1já pagas e estornadas');
  });

  it('espera de mais de 30 dias — o número de Esperando há mais tempo vem na cor de atenção', async () => {
    const { container } = await montar(<DevolucoesPage />);

    const dias = folhaComTextoExato(container, '54 dias')!;

    expect(dias.style.color).toBe('var(--color-attention)');
  });

  it('o número de Esperando há mais tempo — sai da cor de atenção quando a mais antiga tem 30 dias ou menos', async () => {
    const { container } = await montar(<DevolucoesPage />);

    await abrirPainel(container, OTAVIO, 'R$ 540,00');
    await confirmar(cartaoDaFila(container, OTAVIO));

    const dias = folhaComTextoExato(container, '17 dias')!;
    expect(numero(container, 'Esperando há mais tempo')).toBe('Esperando há mais tempo17 diasCarlos Menezes');
    expect(dias.style.color).toBe('var(--text-primary)');
  });

  it('fila em ordem — Carlos, Otávio e o instituto, como vêm da tesouraria', async () => {
    const { container } = await montar(<DevolucoesPage />);

    expect(nomesNaFila(container)).toEqual(['Devolver R$ 210,00', 'Devolver R$ 540,00', 'Devolver R$ 1.800,00']);
  });
});

describe('DevolucoesPage: cartões da fila', () => {
  it('participante com 17 dias de espera — mostra evento, pagamento, pedido com os dias, quem registrou, motivo e a receita original', async () => {
    const { container } = await montar(<DevolucoesPage />);

    expect(cartaoDaFila(container, CARLOS).textContent).toBe(
      'Carlos MenezesR$ 210,00' +
        'EventoTrabalho de Cura · 22/08/2026' +
        'Pagou em14/08/2026 · Pix · Cora PJ' +
        'Pediu em25/08/2026 · há 17 dias' +
        'Quem registrouMárcia Lemos · Acolhimento' +
        'Internação da mãe na véspera. Avisou no mesmo dia e pediu o valor de volta.' +
        'Receita originallanc-8712competência 08/2026' +
        'Devolver R$ 210,00Valor integral do que foi pago. Não se digita aqui, e não se negocia.',
    );
  });

  it('pedido com 54 dias e período fechado — leva o selo de dias esperando e o de período fechado', async () => {
    const { container } = await montar(<DevolucoesPage />);

    expect(cartaoDaFila(container, OTAVIO).textContent).toBe(
      'Otávio Lins54 dias esperandoR$ 540,00' +
        'EventoJornada de julho · 18/07/2026' +
        'Pagou em02/07/2026 · Pix · Cora PJ' +
        'Pediu em19/07/2026 · há 54 dias' +
        'Quem registrouJoana Ribeiro · Acolhimento' +
        'Não conseguiu vir. Pediu a devolução no dia seguinte e ainda não recebeu.' +
        'Receita originallanc-8390competência 07/2026período fechado' +
        'Devolver R$ 540,00Valor integral do que foi pago. Não se digita aqui, e não se negocia.',
    );
  });

  it('devolução a contratante — leva o selo Contratante e nenhum selo de espera, com 14 dias', async () => {
    const { container } = await montar(<DevolucoesPage />);

    expect(cartaoDaFila(container, INSTITUTO).textContent).toBe(
      'Instituto Semente VivaContratanteR$ 1.800,00' +
        'EventoCerimônia contratada · 30/08/2026' +
        'Pagou em10/08/2026 · Transferência · Cora PJ' +
        'Pediu em28/08/2026 · há 14 dias' +
        'Quem registrouTeresa Andrade · Governança' +
        'Contratação cancelada pelo contratante com dois dias de antecedência. Sinal integral a devolver.' +
        'Receita originallanc-8801competência 08/2026' +
        'Devolver R$ 1.800,00Valor integral do que foi pago. Não se digita aqui, e não se negocia.',
    );
  });

  it('selos — Contratante em royal, dias esperando em atenção e período fechado em neutro', async () => {
    const { container } = await montar(<DevolucoesPage />);

    expect(folhaComTextoExato(container, 'Contratante')!.style.color).toBe('var(--color-royal-ink)');
    expect(folhaComTextoExato(container, '54 dias esperando')!.style.color).toBe('var(--color-attention)');
    expect(folhaComTextoExato(container, 'período fechado')!.style.color).toBe('var(--color-neutral)');
  });
});

describe('DevolucoesPage: painel de pagamento', () => {
  it('Devolver — abre o painel no cartão, com conta Cora PJ, data de hoje da tesouraria e a dica da data de caixa', async () => {
    const { container } = await montar(<DevolucoesPage />);

    await abrirPainel(container, CARLOS, 'R$ 210,00');

    const cartao = cartaoDaFila(container, CARLOS);
    expect(cartao.textContent).toContain('De onde sai e quando');
    expect(campoDoRotulo<HTMLSelectElement>(cartao, 'Conta').value).toBe('cora');
    expect(campoDoRotulo(cartao, 'Data da saída').value).toBe('11/09/2026');
    expect(cartao.textContent).toContain('A data de caixa, não a da solicitação.');
  });

  it('conta — oferece as quatro contas ativas, na ordem', async () => {
    const { container } = await montar(<DevolucoesPage />);
    await abrirPainel(container, CARLOS, 'R$ 210,00');

    const opcoes = todos<HTMLOptionElement>(campoDoRotulo(cartaoDaFila(container, CARLOS), 'Conta'), 'option');

    expect(opcoes.map((opcao) => [opcao.value, opcao.textContent])).toEqual([
      ['cora', 'Cora PJ'],
      ['especie', 'Espécie'],
      ['nubank', 'Nubank Paty'],
      ['itau', 'Itaú Munay'],
    ]);
  });

  it('painel aberto — o botão Devolver daquele cartão dá lugar a Confirmar a devolução e Cancelar', async () => {
    const { container } = await montar(<DevolucoesPage />);

    await abrirPainel(container, CARLOS, 'R$ 210,00');

    const cartao = cartaoDaFila(container, CARLOS);
    expect(todos<HTMLButtonElement>(cartao, 'button').map((botao) => botao.textContent)).toEqual([
      'Confirmar a devolução',
      'Cancelar',
    ]);
    expect(nomesNaFila(container)).toEqual(['Devolver R$ 540,00', 'Devolver R$ 1.800,00']);
  });

  it('competência aberta — o estorno vai para a competência original', async () => {
    const { container } = await montar(<DevolucoesPage />);

    await abrirPainel(container, CARLOS, 'R$ 210,00');

    expect(cartaoDaFila(container, CARLOS).textContent).toContain('Vai gerar o estorno de lanc-8712 na competência 08/2026.');
  });

  it('competência fechada — o estorno vai para 09/2026, o mês corrente da tela, com a explicação do período já prestado', async () => {
    const { container } = await montar(<DevolucoesPage />);

    await abrirPainel(container, OTAVIO, 'R$ 540,00');

    expect(cartaoDaFila(container, OTAVIO).textContent).toContain(
      'Vai gerar o estorno de lanc-8390 na competência 09/2026 — a competência original (07/2026) está fechada, ' +
        'e o estorno entra no mês corrente em vez de reabrir um período já prestado.',
    );
  });

  it('Cancelar no painel — fecha e devolve o botão Devolver, sem pagar nada', async () => {
    const { container } = await montar(<DevolucoesPage />);
    await abrirPainel(container, CARLOS, 'R$ 210,00');

    await clicar(botaoComTexto(cartaoDaFila(container, CARLOS), 'Cancelar'));

    expect(nomesNaFila(container)).toHaveLength(3);
    expect(numero(container, 'A devolver')).toBe('A devolverR$ 2.550,003 pedidos');
    expect(recadoDaTela(container)).toBeNull();
  });

  it('abrir o painel de outro cartão — fecha o que estava aberto: só um painel por vez', async () => {
    const { container } = await montar(<DevolucoesPage />);
    await abrirPainel(container, CARLOS, 'R$ 210,00');

    await abrirPainel(container, OTAVIO, 'R$ 540,00');

    expect(cartaoDaFila(container, CARLOS).textContent).not.toContain('De onde sai e quando');
    expect(cartaoDaFila(container, OTAVIO).textContent).toContain('De onde sai e quando');
  });

  it('data editada e painel cancelado — ao abrir de novo a data volta a ser a de hoje da tesouraria', async () => {
    const { container } = await montar(<DevolucoesPage />);
    await abrirPainel(container, CARLOS, 'R$ 210,00');
    await digitar(campoDoRotulo(cartaoDaFila(container, CARLOS), 'Data da saída'), '01/01/2026');
    await clicar(botaoComTexto(cartaoDaFila(container, CARLOS), 'Cancelar'));

    await abrirPainel(container, CARLOS, 'R$ 210,00');

    expect(campoDoRotulo(cartaoDaFila(container, CARLOS), 'Data da saída').value).toBe('11/09/2026');
  });

  it('conta escolhida e painel cancelado — ao abrir o painel de outro cartão a conta continua a escolhida', async () => {
    const { container } = await montar(<DevolucoesPage />);
    await abrirPainel(container, CARLOS, 'R$ 210,00');
    await escolherOpcao(campoDoRotulo<HTMLSelectElement>(cartaoDaFila(container, CARLOS), 'Conta'), 'especie');
    await clicar(botaoComTexto(cartaoDaFila(container, CARLOS), 'Cancelar'));

    await abrirPainel(container, OTAVIO, 'R$ 540,00');

    expect(campoDoRotulo<HTMLSelectElement>(cartaoDaFila(container, OTAVIO), 'Conta').value).toBe('especie');
  });
});

describe('DevolucoesPage: confirmar a devolução', () => {
  it('Confirmar — tira o pedido da fila e refaz os totais: R$ 2.340,00 em 2 pedidos e 2 devolvidas', async () => {
    const { container } = await montar(<DevolucoesPage />);
    await abrirPainel(container, CARLOS, 'R$ 210,00');

    await confirmar(cartaoDaFila(container, CARLOS));

    expect(nomesNaFila(container)).toEqual(['Devolver R$ 540,00', 'Devolver R$ 1.800,00']);
    expect(numero(container, 'A devolver')).toBe('A devolverR$ 2.340,002 pedidos');
    expect(numero(container, 'Devolvidas este ano')).toBe('Devolvidas este ano2já pagas e estornadas');
  });

  it('Confirmar — põe a devolução no topo de Já devolvidas, com evento e dia, data, conta, estorno e valor', async () => {
    const { container } = await montar(<DevolucoesPage />);
    await abrirPainel(container, CARLOS, 'R$ 210,00');

    await confirmar(cartaoDaFila(container, CARLOS));

    expect(jaDevolvidas(container)).toEqual([
      'Carlos MenezesTrabalho de Cura · 22/08 · 11/09/2026 · Cora PJest-8712R$ 210,00',
      'Helena DuarteConcentração · 12/07 · 24/07/2026 · Cora PJest-8402R$ 160,00',
    ]);
  });

  it('Confirmar — avisa o valor, a conta, a competência do estorno e que nenhuma despesa nova foi criada', async () => {
    const { container } = await montar(<DevolucoesPage />);
    await abrirPainel(container, CARLOS, 'R$ 210,00');

    await confirmar(cartaoDaFila(container, CARLOS));

    expect(recadoDaTela(container)).toBe(
      'R$ 210,00 devolvidos a Carlos Menezes por Cora PJ. O estorno entrou na competência 08/2026 e anulou lanc-8712 — nenhuma despesa nova foi criada.',
    );
  });

  it('conta Espécie e data digitada — a devolução e o aviso usam o que foi escolhido', async () => {
    const { container } = await montar(<DevolucoesPage />);
    await abrirPainel(container, CARLOS, 'R$ 210,00');
    await escolherOpcao(campoDoRotulo<HTMLSelectElement>(cartaoDaFila(container, CARLOS), 'Conta'), 'especie');
    await digitar(campoDoRotulo(cartaoDaFila(container, CARLOS), 'Data da saída'), '15/09/2026');

    await confirmar(cartaoDaFila(container, CARLOS));

    expect(jaDevolvidas(container)[0]).toBe('Carlos MenezesTrabalho de Cura · 22/08 · 15/09/2026 · Espécieest-8712R$ 210,00');
    expect(recadoDaTela(container)).toContain('devolvidos a Carlos Menezes por Espécie.');
  });

  it('competência fechada — o aviso diz que o estorno entrou em 09/2026 e anulou o lançamento original', async () => {
    const { container } = await montar(<DevolucoesPage />);
    await abrirPainel(container, OTAVIO, 'R$ 540,00');

    await confirmar(cartaoDaFila(container, OTAVIO));

    expect(recadoDaTela(container)).toBe(
      'R$ 540,00 devolvidos a Otávio Lins por Cora PJ. O estorno entrou na competência 09/2026 e anulou lanc-8390 — nenhuma despesa nova foi criada.',
    );
    expect(jaDevolvidas(container)[0]).toBe('Otávio LinsJornada de julho · 18/07 · 11/09/2026 · Cora PJest-8390R$ 540,00');
  });

  it('data da saída apagada — é aceita sem validação e a linha em Já devolvidas fica com o campo vazio', async () => {
    const { container } = await montar(<DevolucoesPage />);
    await abrirPainel(container, CARLOS, 'R$ 210,00');
    await digitar(campoDoRotulo(cartaoDaFila(container, CARLOS), 'Data da saída'), '');

    await confirmar(cartaoDaFila(container, CARLOS));

    expect(jaDevolvidas(container)[0]).toBe('Carlos MenezesTrabalho de Cura · 22/08 ·  · Cora PJest-8712R$ 210,00');
  });

  it('devolução a contratante — o estorno leva o número do lançamento original sem o prefixo lanc-', async () => {
    const { container } = await montar(<DevolucoesPage />);
    await abrirPainel(container, INSTITUTO, 'R$ 1.800,00');

    await confirmar(cartaoDaFila(container, INSTITUTO));

    expect(jaDevolvidas(container)[0]).toBe(
      'Instituto Semente VivaCerimônia contratada · 30/08 · 11/09/2026 · Cora PJest-8801R$ 1.800,00',
    );
  });

  it('x do recado — dispensa o aviso, e abrir outro painel também o apaga', async () => {
    const { container } = await montar(<DevolucoesPage />);
    await abrirPainel(container, CARLOS, 'R$ 210,00');
    await confirmar(cartaoDaFila(container, CARLOS));

    await clicar(botaoDoRecado(container)!);
    const aoFechar = recadoDaTela(container);
    await abrirPainel(container, OTAVIO, 'R$ 540,00');
    await confirmar(cartaoDaFila(container, OTAVIO));
    await abrirPainel(container, INSTITUTO, 'R$ 1.800,00');

    expect(aoFechar).toBeNull();
    expect(recadoDaTela(container)).toBeNull();
  });

  it('as três devolvidas — a fila vira Ninguém esperando, e os números zeram com o traço em Esperando há mais tempo', async () => {
    const { container } = await montar(<DevolucoesPage />);
    await abrirPainel(container, CARLOS, 'R$ 210,00');
    await confirmar(cartaoDaFila(container, CARLOS));
    await abrirPainel(container, OTAVIO, 'R$ 540,00');
    await confirmar(cartaoDaFila(container, OTAVIO));
    await abrirPainel(container, INSTITUTO, 'R$ 1.800,00');

    await confirmar(cartaoDaFila(container, INSTITUTO));

    expect(nomesNaFila(container)).toEqual([]);
    expect(container.textContent).toContain(
      'Ninguém esperandoToda devolução pedida já foi paga. A fila vazia é o estado normal, não uma conquista.',
    );
    expect(numero(container, 'A devolver')).toBe('A devolverR$ 0,000 pedidos');
    expect(numero(container, 'Esperando há mais tempo')).toBe('Esperando há mais tempo—fila vazia');
    expect(numero(container, 'Devolvidas este ano')).toBe('Devolvidas este ano4já pagas e estornadas');
  });

  it('as três devolvidas — a última paga fica no topo de Já devolvidas, com Helena por último', async () => {
    const { container } = await montar(<DevolucoesPage />);
    await abrirPainel(container, CARLOS, 'R$ 210,00');
    await confirmar(cartaoDaFila(container, CARLOS));
    await abrirPainel(container, OTAVIO, 'R$ 540,00');
    await confirmar(cartaoDaFila(container, OTAVIO));
    await abrirPainel(container, INSTITUTO, 'R$ 1.800,00');

    await confirmar(cartaoDaFila(container, INSTITUTO));

    expect(jaDevolvidas(container).map((item) => item.slice(0, 12))).toEqual([
      'Instituto Se',
      'Otávio LinsJ',
      'Carlos Menez',
      'Helena Duart',
    ]);
  });
});

describe('DevolucoesPage: o que a tela explica', () => {
  it('espelho — diz que pedir e pagar são dois atos de duas pessoas e que o Acolhimento não vê a tela', async () => {
    const { container } = await montar(<DevolucoesPage />);

    expect(container.textContent).toContain(
      'Pedir e pagar são dois atos, de duas pessoasO Acolhimento cancelou a inscrição e registrou que a pessoa pediu o valor de volta. ' +
        'Esta tela é a outra metade, e o Acolhimento não a enxerga — é a fronteira “sem acesso a saída financeira do evento” escrita como desenho, não como aviso.',
    );
  });

  it('devolver não é gastar — explica que entra como estorno do lançamento original, e não como despesa nova', async () => {
    const { container } = await montar(<DevolucoesPage />);

    const texto = cartaoDoRotulo(container, 'Devolver não é gastar').textContent;

    expect(texto).toContain('Por isso a devolução entra como estorno do lançamento original, e não como despesa nova');
    expect(texto).toContain('É a mesma família de F2 (pagar fatura é transferência, não despesa), E1 (empréstimo é patrimonial) e A5 (ressarcir adiantamento não gera despesa nova).');
  });

  it('faltaram e não pediram — conta 3 pessoas e R$ 600,00 que continuam com a casa, e lista cada uma', async () => {
    const { container } = await montar(<DevolucoesPage />);

    const cartao = cartaoDoRotulo(container, 'Faltaram e não pediram');

    expect(cartao.textContent).toContain('3 pessoas · R$ 600,00 que continuam com a casa');
    expect(itensDaListaDoCartao(cartao)).toEqual([
      'Rosa SilveiraTrabalho de Cura · 22/08R$ 160,00',
      'Tobias AguiarTrabalho de Cura · 22/08R$ 80,00',
      'Bruna CamargoJornada de julho · 18/07R$ 360,00',
    ]);
  });

  it('faltaram e não pediram — não mudam quando uma devolução é paga', async () => {
    const { container } = await montar(<DevolucoesPage />);
    await abrirPainel(container, CARLOS, 'R$ 210,00');

    await confirmar(cartaoDaFila(container, CARLOS));

    expect(cartaoDoRotulo(container, 'Faltaram e não pediram').textContent).toContain('3 pessoas · R$ 600,00');
  });

  it('já devolvidas — começa com uma devolução da Helena Duarte', async () => {
    const { container } = await montar(<DevolucoesPage />);

    expect(jaDevolvidas(container)).toEqual(['Helena DuarteConcentração · 12/07 · 24/07/2026 · Cora PJest-8402R$ 160,00']);
  });
});

describe('DevolucoesPage: densidade', () => {
  it.each([
    { densidade: 'office' as const, colunasDosNumeros: 'repeat(3, minmax(0,1fr))', colunasDoPainel: '1fr 1fr', respiro: '18px 20px', alvo: 'var(--target-office)' },
    { densidade: 'field' as const, colunasDosNumeros: 'repeat(2, minmax(0,1fr))', colunasDoPainel: '1fr', respiro: '15px 16px', alvo: 'var(--target-field)' },
  ])('densidade $densidade — números em $colunasDosNumeros, painel em $colunasDoPainel, cartão com respiro $respiro e botões com alvo $alvo', async ({ densidade, colunasDosNumeros, colunasDoPainel, respiro, alvo }) => {
    fixarDensidade(densidade);
    const { container } = await montar(<DevolucoesPage />);
    await clicar(botaoComTexto(cartaoDaFila(container, CARLOS), 'Devolver R$ 210,00'));

    const grade = folhaComTextoExato(container, 'A devolver')!.parentElement!.parentElement!;
    const cartao = cartaoDaFila(container, CARLOS);
    const painel = cartao.querySelector<HTMLElement>('div[style*="grid-template-columns"]')!;
    expect([grade.style.gridTemplateColumns, painel.style.gridTemplateColumns]).toEqual([colunasDosNumeros, colunasDoPainel]);
    expect([cartao.style.padding, botaoComTexto(cartao, 'Confirmar a devolução').style.minHeight]).toEqual([respiro, alvo]);
  });

  it.each([
    { densidade: 'office' as const, padding: '18px 24px 30px', larguraMaxima: '980px' },
    { densidade: 'field' as const, padding: '14px 16px 26px', larguraMaxima: '' },
  ])('densidade $densidade — o corpo da tela usa padding $padding e largura máxima "$larguraMaxima"', async ({ densidade, padding, larguraMaxima }) => {
    fixarDensidade(densidade);

    const { container } = await montar(<DevolucoesPage />);

    const corpo = elemento(container, 'header').nextElementSibling as HTMLElement;
    expect([corpo.style.padding, corpo.style.maxWidth]).toEqual([padding, larguraMaxima]);
  });
});

describe('DevolucoesPage: dias esperando contra o hoje da tesouraria (11/09/2026)', () => {
  it.each([
    { pedido: '12/08/2026', dias: '30 dias', selo: false },
    { pedido: '11/08/2026', dias: '31 dias', selo: true },
    { pedido: '10/09/2026', dias: '1 dia', selo: false },
    { pedido: '11/09/2026', dias: '0 dias', selo: false },
    { pedido: '12/09/2026', dias: '0 dias', selo: false },
    { pedido: '01/01/2026', dias: '253 dias', selo: true },
  ])('pedido em $pedido — conta $dias e o selo de dias esperando aparece: $selo', async ({ pedido, dias, selo }) => {
    cenario.solicitadasEm = [pedido];

    const { container } = await montar(<DevolucoesPage />);

    const cartao = cartaoDaFila(container, CARLOS);
    expect(cartao.textContent).toContain(`Pediu em${pedido} · há ${dias}`);
    expect(cartao.textContent?.includes(`${dias} esperando`)).toBe(selo);
  });

  it('pedido de dois dias antes do hoje — a fila diz há 2 dias, no plural', async () => {
    cenario.solicitadasEm = ['09/09/2026'];

    const { container } = await montar(<DevolucoesPage />);

    expect(numero(container, 'Esperando há mais tempo')).toBe('Esperando há mais tempo2 diasCarlos Menezes');
  });

  it('pedido de 30 dias — o número de Esperando há mais tempo fica sem a cor de atenção; com 31 dias, ganha', async () => {
    cenario.solicitadasEm = ['12/08/2026'];
    const trinta = await montar(<DevolucoesPage />);
    cenario.solicitadasEm = ['11/08/2026'];
    const trintaEUm = await montar(<DevolucoesPage />);

    expect(folhaComTextoExato(trinta.container, '30 dias')!.style.color).toBe('var(--text-primary)');
    expect(folhaComTextoExato(trintaEUm.container, '31 dias')!.style.color).toBe('var(--color-attention)');
  });

  it('vários pedidos — Esperando há mais tempo aponta o mais antigo, qualquer que seja a posição na fila', async () => {
    cenario.solicitadasEm = ['12/08/2026', '01/08/2026', '20/08/2026'];

    const { container } = await montar(<DevolucoesPage />);

    expect(numero(container, 'Esperando há mais tempo')).toBe('Esperando há mais tempo41 diasOtávio Lins');
  });

  it('dois pedidos com a mesma espera — Esperando há mais tempo fica com o primeiro da fila', async () => {
    cenario.solicitadasEm = ['20/08/2026', '20/08/2026'];

    const { container } = await montar(<DevolucoesPage />);

    expect(numero(container, 'Esperando há mais tempo')).toBe('Esperando há mais tempo22 diasCarlos Menezes');
  });
});
