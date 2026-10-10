import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContratacaoNaTela } from '@/mocks/contratacoes';
import { botaoComTexto, clicar, desmontarTudo, digitar, elemento, escolherOpcao, montar, todos } from '@/testes/montagem';
import { ContratacoesPage } from './ContratacoesPage';
import {
  AGORA_FIXO,
  botaoDoRecado,
  campoDoRotulo,
  cartaoDoRotulo,
  fixarDensidade,
  folhaComTextoExato,
  recadoDaTela,
  textoDaFolhaPai,
} from './apoioDeTeste';

const cenario = vi.hoisted(() => ({ primeira: undefined as Partial<ContratacaoNaTela> | undefined }));

vi.mock('@/mocks/contratacoes', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('@/mocks/contratacoes')>();
  return {
    ...original,
    get contratacoes() {
      const ajuste = cenario.primeira;
      if (!ajuste) return original.contratacoes;
      return original.contratacoes.map((contratacao, i) => (i === 0 ? Object.assign({}, contratacao, ajuste) : contratacao));
    },
  };
});

beforeEach(() => {
  fixarDensidade('office');
  vi.setSystemTime(AGORA_FIXO);
});

afterEach(async () => {
  cenario.primeira = undefined;
  await desmontarTudo();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const LUZ_DO_NORTE = 'Instituto Luz do Norte';
const ESTRELA_GUIA = 'Centro Estrela Guia';
const JACI = 'Casa de Cura Jaci';
const SEMENTE_VIVA = 'Instituto Semente Viva';

const cartaoDaContratacao = (container: HTMLElement, contratante: string): HTMLElement => {
  const titulo = todos<HTMLSpanElement>(container, 'span').find(
    (span) => span.textContent === contratante && span.style.font === 'var(--text-title-sm)',
  );
  const cartao = titulo?.closest<HTMLElement>('div[style*="border: var(--border-hairline)"]');
  if (!cartao) throw new Error(`cartão da contratação não encontrado: ${contratante}`);
  return cartao;
};
const nomesDosCartoes = (container: HTMLElement) =>
  todos<HTMLSpanElement>(container, 'span')
    .filter((span) => span.style.font === 'var(--text-title-sm)')
    .map((span) => span.textContent);
const numero = (container: HTMLElement, rotulo: string) => textoDaFolhaPai(container, rotulo);
const painelDeRecebimento = (cartao: HTMLElement) => folhaComTextoExato(cartao, 'Onde entrou e quando');
const registrarRecebimento = (container: HTMLElement, contratante: string) =>
  clicar(botaoComTexto(cartaoDaContratacao(container, contratante), 'Registrar recebimento'));
const confirmarRecebimento = (container: HTMLElement, contratante: string) =>
  clicar(botaoComTexto(cartaoDaContratacao(container, contratante), 'Confirmar o recebimento'));
const confirmarProposta = (container: HTMLElement, contratante: string) =>
  clicar(botaoComTexto(cartaoDaContratacao(container, contratante), 'Confirmar a proposta'));
const barraDoTeto = (container: HTMLElement) => elemento<HTMLDivElement>(container, '[role="img"]');
const largurasDaBarra = (container: HTMLElement) =>
  Array.from(barraDoTeto(container).children).map((trecho) => Number.parseFloat((trecho as HTMLElement).style.width));
const cabecalho = (container: HTMLElement) => elemento(container, 'header').textContent;
const classesDosIcones = (origem: ParentNode) =>
  todos<SVGElement>(origem, 'svg').map((icone) => icone.getAttribute('class') ?? '');

describe('ContratacoesPage: cabeçalho e totais', () => {
  it.each([
    {
      densidade: 'office' as const,
      esperado: 'E-13 · ContrataçõesContrataçõesO que a Munay toca fora de casa · unidade comercial',
    },
    { densidade: 'field' as const, esperado: 'E-13Contratações' },
  ])('densidade $densidade — o cabeçalho é $esperado', async ({ densidade, esperado }) => {
    fixarDensidade(densidade);

    const { container } = await montar(<ContratacoesPage />);

    expect(cabecalho(container)).toBe(esperado);
  });

  it('ao abrir — soma só a confirmada sem recebimento, conta uma proposta e mostra o faturamento do ano', async () => {
    const { container } = await montar(<ContratacoesPage />);

    expect(numero(container, 'A receber')).toBe('A receberR$ 3.200,001 contratação confirmada');
    expect(numero(container, 'Em proposta')).toBe('Em proposta1ainda não é dinheiro');
    expect(numero(container, 'Faturamento no ano')).toBe('Faturamento no anoR$ 43.700,00de R$ 81.000,00 do teto do MEI');
  });

  it('cartões — uma contratação por cartão, na ordem: proposta, confirmada, realizada e cancelada', async () => {
    const { container } = await montar(<ContratacoesPage />);

    expect(nomesDosCartoes(container)).toEqual([LUZ_DO_NORTE, ESTRELA_GUIA, JACI, SEMENTE_VIVA]);
  });

  it('explicação de quem faz — diz que contratação é ato comercial da Munay e fica fora do Acolhimento', async () => {
    const { container } = await montar(<ContratacoesPage />);

    expect(container.textContent).toContain(
      'Contratação é ato comercial da Munay, não recepçãoNegociar cachê com outra instituição não é acolher ninguém — por isso esta tela fica fora do Acolhimento.',
    );
  });

  it('pé da tela — explica por que cachê são duas categorias, CACHE_RECEBIDO e CACHE_PAGO', async () => {
    const { container } = await montar(<ContratacoesPage />);

    expect(cartaoDoRotulo(container, 'Por que cachê são duas categorias e não uma').textContent).toContain(
      'CACHE_RECEBIDOreceita da MunayO contratante paga para a Munay tocar.CACHE_PAGOdespesa da MunayA Munay paga quem tocou.',
    );
  });
});

describe('ContratacoesPage: teto do MEI', () => {
  it('ao abrir — soma o faturamento do ano e o que está a receber contra o teto, com o CNPJ da Munay', async () => {
    const { container } = await montar(<ContratacoesPage />);

    expect(cartaoDoRotulo(container, 'Faturamento contra o teto do MEI').textContent).toContain(
      'Faturamento contra o teto do MEICNPJ 41.882.310/0001-55R$ 46.900,00 de R$ 81.000,00',
    );
  });

  it('barra do teto — descreve o percentual projetado e divide em o que já entrou e o que está a receber', async () => {
    const { container } = await montar(<ContratacoesPage />);

    expect(barraDoTeto(container).getAttribute('aria-label')).toBe('58% do teto com o que está a receber');
    expect(largurasDaBarra(container)[0]).toBeCloseTo(53.95, 2);
    expect(largurasDaBarra(container)[1]).toBeCloseTo(3.95, 2);
  });

  it('confirmar a proposta de R$ 2.400,00 — entra no a receber e a barra sobe para 61%', async () => {
    const { container } = await montar(<ContratacoesPage />);

    await confirmarProposta(container, LUZ_DO_NORTE);

    expect(cartaoDoRotulo(container, 'Faturamento contra o teto do MEI').textContent).toContain('R$ 49.300,00 de R$ 81.000,00');
    expect(barraDoTeto(container).getAttribute('aria-label')).toBe('61% do teto com o que está a receber');
  });

  it('registrar o recebimento de R$ 3.200,00 — o valor deixa de contar: o faturamento do ano não sobe e a barra cai para 54%', async () => {
    const { container } = await montar(<ContratacoesPage />);
    await registrarRecebimento(container, ESTRELA_GUIA);

    await confirmarRecebimento(container, ESTRELA_GUIA);

    expect(numero(container, 'Faturamento no ano')).toBe('Faturamento no anoR$ 43.700,00de R$ 81.000,00 do teto do MEI');
    expect(cartaoDoRotulo(container, 'Faturamento contra o teto do MEI').textContent).toContain('R$ 43.700,00 de R$ 81.000,00');
    expect(barraDoTeto(container).getAttribute('aria-label')).toBe('54% do teto com o que está a receber');
    expect(largurasDaBarra(container)[1]).toBe(0);
  });
});

describe('ContratacoesPage: cartões', () => {
  it('proposta faturada — mostra os dois lados, os custos, o resultado e o botão de confirmar a proposta', async () => {
    const { container } = await montar(<ContratacoesPage />);

    expect(cartaoDaContratacao(container, LUZ_DO_NORTE).textContent).toBe(
      'Instituto Luz do NortePropostaCNPJ 22.740.115/0001-08R$ 2.400,00' +
        'EventoApresentação de abertura · 30/11/2026' +
        'OndeSede do Instituto · Atibaia' +
        'Forma de pagamentoFaturado · A receber depois do trabalho, na data combinada.' +
        'Previsto para15/12/2026' +
        'Entra · o contratante paga a MunayR$ 2.400,00receitaCachê de contrataçãoAinda não virou lançamento — receita só existe depois do recebimento.' +
        'Sai · a Munay paga os músicosR$ 900,00despesaCachê a músico0 cachês pagos de 2' +
        'Sérgio Bittencourtviolão e vozR$ 500,00Helena DuartepercussãoR$ 400,00' +
        'Outros custos do eventoDeslocamento · vanR$ 280,00Apurados por evento, como em qualquer trabalho da casa.' +
        'Resultado do eventoR$ 2.400,00 − R$ 900,00 de cachês − R$ 280,00 de custosR$ 1.220,00' +
        'Proposta enviada em 02/09. Eles pediram para faturar em 15 dias após o evento.' +
        'Confirmar a propostaConfirmar não move dinheiro. Proposta não é receita.',
    );
  });

  it('confirmada antecipada sem recebimento — mostra Registrar recebimento e o resultado de R$ 1.250,00', async () => {
    const { container } = await montar(<ContratacoesPage />);

    const cartao = cartaoDaContratacao(container, ESTRELA_GUIA);

    expect(cartao.textContent).toContain('Resultado do eventoR$ 3.200,00 − R$ 1.400,00 de cachês − R$ 550,00 de custosR$ 1.250,00');
    expect(cartao.textContent).toContain('Forma de pagamentoAntecipado · Combinado para antes do trabalho.Previsto para10/10/2026');
    expect(todos<HTMLButtonElement>(cartao, 'button').map((botao) => botao.textContent)).toEqual(['Registrar recebimento']);
  });

  it('realizada e recebida — mostra o recebimento com o lançamento, o resultado de R$ 900,00 e o selo Recebido e lançado', async () => {
    const { container } = await montar(<ContratacoesPage />);

    const cartao = cartaoDaContratacao(container, JACI);

    expect(cartao.textContent).toContain('Recebido em 16/08/2026 · lanc-8760');
    expect(cartao.textContent).toContain('3 cachês pagos de 3');
    expect(cartao.textContent).toContain('Resultado do eventoR$ 2.800,00 − R$ 1.400,00 de cachês − R$ 500,00 de custosR$ 900,00');
    expect(cartao.textContent?.endsWith('Pago em espécie no dia, depositado no Cora no dia seguinte.Recebido e lançado')).toBe(true);
    expect(todos(cartao, 'button')).toHaveLength(0);
  });

  it('realizada sem data prevista — não mostra a linha Previsto para', async () => {
    const { container } = await montar(<ContratacoesPage />);

    expect(cartaoDaContratacao(container, JACI).textContent).not.toContain('Previsto para');
  });

  it('cancelada com valor recebido — não mostra os lados nem o resultado, e avisa a devolução devida na fila da tesouraria', async () => {
    const { container } = await montar(<ContratacoesPage />);

    expect(cartaoDaContratacao(container, SEMENTE_VIVA).textContent).toBe(
      'Instituto Semente VivaCanceladaCNPJ 41.118.209/0001-45R$ 1.800,00' +
        'EventoCerimônia contratada · 30/08/2026' +
        'OndeSede do Instituto · Sorocaba' +
        'Forma de pagamentoAntecipado · Combinado para antes do trabalho.' +
        'Previsto para10/08/2026' +
        'Cancelada com R$ 1.800,00 já recebidosCancelar uma contratação que já foi paga gera devolução devida ao contratante, e quem paga é a Tesouraria — esta tela não devolve dinheiro. Na fila da tesouraria, em Devoluções a pagar.' +
        'Cancelada pelo contratante em 28/08, com dois dias de antecedência. Nenhum cachê foi pago.',
    );
  });

  it('cartão cancelado — fica com opacidade 0,9 e os outros com 1', async () => {
    const { container } = await montar(<ContratacoesPage />);

    expect([
      cartaoDaContratacao(container, SEMENTE_VIVA).style.opacity,
      cartaoDaContratacao(container, JACI).style.opacity,
    ]).toEqual(['0.9', '1']);
  });

  it.each([
    { contratante: LUZ_DO_NORTE, rotulo: 'Proposta', cor: 'var(--color-suggest)' },
    { contratante: ESTRELA_GUIA, rotulo: 'Confirmada', cor: 'var(--color-royal-ink)' },
    { contratante: JACI, rotulo: 'Realizada', cor: 'var(--color-confirmed)' },
    { contratante: SEMENTE_VIVA, rotulo: 'Cancelada', cor: 'var(--color-neutral)' },
  ])('$contratante — o selo diz $rotulo no tom $cor', async ({ contratante, rotulo, cor }) => {
    const { container } = await montar(<ContratacoesPage />);

    const selo = folhaComTextoExato(cartaoDaContratacao(container, contratante), rotulo)!;

    expect(selo.style.color).toBe(cor);
  });

  it('cachês — pagos levam o ícone de check e os que faltam pagar o de alerta, no lado de saída', async () => {
    const { container } = await montar(<ContratacoesPage />);

    const ladoDaSaida = (contratante: string) =>
      folhaComTextoExato(cartaoDaContratacao(container, contratante), 'Sai · a Munay paga os músicos')!.parentElement!;
    const cachesPagos = classesDosIcones(ladoDaSaida(JACI)).filter((classe) => classe.includes('lucide-circle-check'));
    const cachesPendentes = classesDosIcones(ladoDaSaida(ESTRELA_GUIA)).filter((classe) => classe.includes('lucide-circle-alert'));

    expect([cachesPagos.length, cachesPendentes.length]).toEqual([3, 3]);
  });
});

describe('ContratacoesPage: resultado do evento', () => {
  it('valor acordado igual aos cachês e custos — o resultado é R$ 0,00 e fica na cor de confirmado', async () => {
    cenario.primeira = { valorAcordado: 118000 as ContratacaoNaTela['valorAcordado'] };

    const { container } = await montar(<ContratacoesPage />);

    const resultado = folhaComTextoExato(cartaoDaContratacao(container, LUZ_DO_NORTE), 'R$ 0,00')!;
    expect(resultado.style.color).toBe('var(--color-confirmed)');
  });

  it('valor acordado menor que cachês e custos — o resultado fica negativo e passa para a cor de atenção', async () => {
    cenario.primeira = { valorAcordado: 100000 as ContratacaoNaTela['valorAcordado'] };

    const { container } = await montar(<ContratacoesPage />);

    const resultado = folhaComTextoExato(cartaoDaContratacao(container, LUZ_DO_NORTE), 'R$ -180,00')!;
    expect(resultado.style.color).toBe('var(--color-attention)');
  });

  it('contratação sem cachê combinado — o lado de saída diz que nenhum cachê foi combinado e não lista ninguém', async () => {
    cenario.primeira = { caches: [] };

    const { container } = await montar(<ContratacoesPage />);

    const cartao = cartaoDaContratacao(container, LUZ_DO_NORTE);
    expect(cartao.textContent).toContain('Sai · a Munay paga os músicosR$ 0,00despesaCachê a músicoNenhum cachê combinado ainda.');
    expect(cartao.textContent).toContain('R$ 2.400,00 − R$ 0,00 de cachês − R$ 280,00 de custos');
  });

  it('contratante sem documento — o cartão não mostra a linha de CNPJ', async () => {
    cenario.primeira = { documento: null };

    const { container } = await montar(<ContratacoesPage />);

    expect(cartaoDaContratacao(container, LUZ_DO_NORTE).textContent).not.toContain('CNPJ');
    expect(cartaoDaContratacao(container, ESTRELA_GUIA).textContent).toContain('CNPJ 19.550.802/0001-71');
  });

  it('contratação sem outros custos — o bloco Outros custos do evento não aparece', async () => {
    cenario.primeira = { custos: [] };

    const { container } = await montar(<ContratacoesPage />);

    expect(cartaoDaContratacao(container, LUZ_DO_NORTE).textContent).not.toContain('Outros custos do evento');
  });
});

describe('ContratacoesPage: registrar recebimento', () => {
  it('só a confirmada que ainda não recebeu tem Registrar recebimento', async () => {
    const { container } = await montar(<ContratacoesPage />);

    const botoes = todos<HTMLButtonElement>(container, 'button').map((botao) => botao.textContent);

    expect(botoes).toEqual(['Confirmar a proposta', 'Registrar recebimento']);
  });

  it('Registrar recebimento — abre o painel com conta Cora PJ, data de hoje e a frase do que vai gerar', async () => {
    const { container } = await montar(<ContratacoesPage />);

    await registrarRecebimento(container, ESTRELA_GUIA);

    const cartao = cartaoDaContratacao(container, ESTRELA_GUIA);
    expect(painelDeRecebimento(cartao)).toBeDefined();
    expect(campoDoRotulo<HTMLSelectElement>(cartao, 'Conta').value).toBe('cora');
    expect(campoDoRotulo(cartao, 'Data do recebimento').value).toBe('11/09/2026');
    expect(cartao.textContent).toContain('A data de caixa.');
    expect(cartao.textContent).toContain(
      'Vai gerar receita de R$ 3.200,00 com categoria Cachê de contratação, unidade Munay, vinculada a este evento. A categoria e a unidade não se escolhem aqui: vêm da contratação.',
    );
  });

  it('conta — oferece as quatro contas ativas, na ordem', async () => {
    const { container } = await montar(<ContratacoesPage />);
    await registrarRecebimento(container, ESTRELA_GUIA);

    const opcoes = todos<HTMLOptionElement>(campoDoRotulo(cartaoDaContratacao(container, ESTRELA_GUIA), 'Conta'), 'option');

    expect(opcoes.map((opcao) => opcao.textContent)).toEqual(['Cora PJ', 'Espécie', 'Nubank Paty', 'Itaú Munay']);
  });

  it('painel aberto — troca o botão Registrar recebimento por Confirmar o recebimento e Cancelar', async () => {
    const { container } = await montar(<ContratacoesPage />);

    await registrarRecebimento(container, ESTRELA_GUIA);

    const botoes = todos<HTMLButtonElement>(cartaoDaContratacao(container, ESTRELA_GUIA), 'button').map((botao) => botao.textContent);
    expect(botoes).toEqual(['Confirmar o recebimento', 'Cancelar']);
  });

  it('Cancelar no painel — fecha sem registrar nada', async () => {
    const { container } = await montar(<ContratacoesPage />);
    await registrarRecebimento(container, ESTRELA_GUIA);

    await clicar(botaoComTexto(cartaoDaContratacao(container, ESTRELA_GUIA), 'Cancelar'));

    expect(painelDeRecebimento(cartaoDaContratacao(container, ESTRELA_GUIA))).toBeUndefined();
    expect(numero(container, 'A receber')).toBe('A receberR$ 3.200,001 contratação confirmada');
    expect(recadoDaTela(container)).toBeNull();
  });

  it('Confirmar o recebimento — registra a data e o lançamento no cartão e o marca como recebido e lançado', async () => {
    const { container } = await montar(<ContratacoesPage />);
    await registrarRecebimento(container, ESTRELA_GUIA);

    await confirmarRecebimento(container, ESTRELA_GUIA);

    const cartao = cartaoDaContratacao(container, ESTRELA_GUIA);
    expect(cartao.textContent).toContain('Recebido em 11/09/2026 · lanc-0731');
    expect(cartao.textContent?.endsWith('Recebido e lançado')).toBe(true);
    expect(todos(cartao, 'button')).toHaveLength(0);
  });

  it('Confirmar o recebimento — o a receber zera e o status segue Confirmada', async () => {
    const { container } = await montar(<ContratacoesPage />);
    await registrarRecebimento(container, ESTRELA_GUIA);

    await confirmarRecebimento(container, ESTRELA_GUIA);

    expect(numero(container, 'A receber')).toBe('A receberR$ 0,000 contratações confirmadas');
    expect(folhaComTextoExato(cartaoDaContratacao(container, ESTRELA_GUIA), 'Confirmada')).toBeDefined();
  });

  it('Confirmar o recebimento — avisa o valor, quem pagou, a conta, a categoria e a unidade', async () => {
    const { container } = await montar(<ContratacoesPage />);
    await registrarRecebimento(container, ESTRELA_GUIA);

    await confirmarRecebimento(container, ESTRELA_GUIA);

    expect(recadoDaTela(container)).toBe(
      'R$ 3.200,00 de Centro Estrela Guia entraram por Cora PJ. Virou receita com categoria Cachê de contratação, na unidade Munay, vinculada ao evento — e os cachês dos músicos ficam no mesmo evento, do outro lado.',
    );
  });

  it('conta Itaú Munay e data digitada — o cartão e o aviso usam o que foi escolhido', async () => {
    const { container } = await montar(<ContratacoesPage />);
    await registrarRecebimento(container, ESTRELA_GUIA);
    await escolherOpcao(campoDoRotulo<HTMLSelectElement>(cartaoDaContratacao(container, ESTRELA_GUIA), 'Conta'), 'itau');
    await digitar(campoDoRotulo(cartaoDaContratacao(container, ESTRELA_GUIA), 'Data do recebimento'), '15/09/2026');

    await confirmarRecebimento(container, ESTRELA_GUIA);

    expect(cartaoDaContratacao(container, ESTRELA_GUIA).textContent).toContain('Recebido em 15/09/2026 · lanc-0731');
    expect(recadoDaTela(container)).toContain('entraram por Itaú Munay.');
  });

  it('data do recebimento apagada — avisa que o recebimento foi registrado, mas o cartão segue como não recebido', async () => {
    const { container } = await montar(<ContratacoesPage />);
    await registrarRecebimento(container, ESTRELA_GUIA);
    await digitar(campoDoRotulo(cartaoDaContratacao(container, ESTRELA_GUIA), 'Data do recebimento'), '');

    await confirmarRecebimento(container, ESTRELA_GUIA);

    const cartao = cartaoDaContratacao(container, ESTRELA_GUIA);
    expect(recadoDaTela(container)).toContain('R$ 3.200,00 de Centro Estrela Guia entraram por Cora PJ.');
    expect(cartao.textContent).toContain('Ainda não virou lançamento — receita só existe depois do recebimento.');
    expect(todos<HTMLButtonElement>(cartao, 'button').map((botao) => botao.textContent)).toEqual(['Registrar recebimento']);
    expect(numero(container, 'A receber')).toBe('A receberR$ 3.200,001 contratação confirmada');
  });

  it('data editada e painel cancelado — ao abrir de novo a data volta a ser a de hoje', async () => {
    const { container } = await montar(<ContratacoesPage />);
    await registrarRecebimento(container, ESTRELA_GUIA);
    await digitar(campoDoRotulo(cartaoDaContratacao(container, ESTRELA_GUIA), 'Data do recebimento'), '01/01/2026');
    await clicar(botaoComTexto(cartaoDaContratacao(container, ESTRELA_GUIA), 'Cancelar'));

    await registrarRecebimento(container, ESTRELA_GUIA);

    expect(campoDoRotulo(cartaoDaContratacao(container, ESTRELA_GUIA), 'Data do recebimento').value).toBe('11/09/2026');
  });

  it('x do recado — dispensa o aviso do recebimento', async () => {
    const { container } = await montar(<ContratacoesPage />);
    await registrarRecebimento(container, ESTRELA_GUIA);
    await confirmarRecebimento(container, ESTRELA_GUIA);

    await clicar(botaoDoRecado(container)!);

    expect(recadoDaTela(container)).toBeNull();
  });

  it('proposta confirmada — passa a ter Registrar recebimento e dá para receber em seguida', async () => {
    const { container } = await montar(<ContratacoesPage />);
    await confirmarProposta(container, LUZ_DO_NORTE);

    await registrarRecebimento(container, LUZ_DO_NORTE);
    await confirmarRecebimento(container, LUZ_DO_NORTE);

    expect(cartaoDaContratacao(container, LUZ_DO_NORTE).textContent).toContain('Recebido em 11/09/2026 · lanc-0731');
    expect(numero(container, 'A receber')).toBe('A receberR$ 3.200,001 contratação confirmada');
  });
});

describe('ContratacoesPage: confirmar a proposta', () => {
  it('Confirmar a proposta — muda o selo para Confirmada, troca o botão por Registrar recebimento e conta no a receber', async () => {
    const { container } = await montar(<ContratacoesPage />);

    await confirmarProposta(container, LUZ_DO_NORTE);

    const cartao = cartaoDaContratacao(container, LUZ_DO_NORTE);
    expect(folhaComTextoExato(cartao, 'Confirmada')).toBeDefined();
    expect(folhaComTextoExato(cartao, 'Proposta')).toBeUndefined();
    expect(todos<HTMLButtonElement>(cartao, 'button').map((botao) => botao.textContent)).toEqual(['Registrar recebimento']);
    expect(numero(container, 'A receber')).toBe('A receberR$ 5.600,002 contratações confirmadas');
    expect(numero(container, 'Em proposta')).toBe('Em proposta0ainda não é dinheiro');
  });

  it('Confirmar a proposta — mexe só naquela contratação: as outras mantêm o selo que tinham', async () => {
    const { container } = await montar(<ContratacoesPage />);

    await confirmarProposta(container, LUZ_DO_NORTE);

    expect(folhaComTextoExato(cartaoDaContratacao(container, JACI), 'Realizada')).toBeDefined();
    expect(folhaComTextoExato(cartaoDaContratacao(container, SEMENTE_VIVA), 'Cancelada')).toBeDefined();
    expect(folhaComTextoExato(cartaoDaContratacao(container, ESTRELA_GUIA), 'Confirmada')).toBeDefined();
  });

  it('Confirmar a proposta — avisa que nada de dinheiro se move até o recebimento ser registrado', async () => {
    const { container } = await montar(<ContratacoesPage />);

    await confirmarProposta(container, LUZ_DO_NORTE);

    expect(recadoDaTela(container)).toBe(
      'Proposta de Instituto Luz do Norte confirmada. Nada de dinheiro se move até o recebimento ser registrado.',
    );
  });

  it('abrir o painel de recebimento — apaga o aviso da confirmação', async () => {
    const { container } = await montar(<ContratacoesPage />);
    await confirmarProposta(container, LUZ_DO_NORTE);

    await registrarRecebimento(container, ESTRELA_GUIA);

    expect(recadoDaTela(container)).toBeNull();
  });

  it('abrir o painel de outro cartão — fecha o que estava aberto', async () => {
    const { container } = await montar(<ContratacoesPage />);
    await confirmarProposta(container, LUZ_DO_NORTE);
    await registrarRecebimento(container, ESTRELA_GUIA);

    await registrarRecebimento(container, LUZ_DO_NORTE);

    expect(painelDeRecebimento(cartaoDaContratacao(container, ESTRELA_GUIA))).toBeUndefined();
    expect(painelDeRecebimento(cartaoDaContratacao(container, LUZ_DO_NORTE))).toBeDefined();
  });

  it('conta escolhida e painel cancelado — o painel de outro cartão abre com a mesma conta', async () => {
    const { container } = await montar(<ContratacoesPage />);
    await confirmarProposta(container, LUZ_DO_NORTE);
    await registrarRecebimento(container, ESTRELA_GUIA);
    await escolherOpcao(campoDoRotulo<HTMLSelectElement>(cartaoDaContratacao(container, ESTRELA_GUIA), 'Conta'), 'nubank');
    await clicar(botaoComTexto(cartaoDaContratacao(container, ESTRELA_GUIA), 'Cancelar'));

    await registrarRecebimento(container, LUZ_DO_NORTE);

    expect(campoDoRotulo<HTMLSelectElement>(cartaoDaContratacao(container, LUZ_DO_NORTE), 'Conta').value).toBe('nubank');
  });
});

describe('ContratacoesPage: densidade', () => {
  it.each([
    { densidade: 'office' as const, colunasDosNumeros: 'repeat(3, minmax(0,1fr))', colunasDosLados: '1fr 1fr', colunasDoPainel: '1fr 1fr', respiro: '18px 20px', alvo: 'var(--target-office)' },
    { densidade: 'field' as const, colunasDosNumeros: 'repeat(2, minmax(0,1fr))', colunasDosLados: '1fr', colunasDoPainel: '1fr', respiro: '15px 16px', alvo: 'var(--target-field)' },
  ])('densidade $densidade — números em $colunasDosNumeros, lados em $colunasDosLados, painel em $colunasDoPainel, cartão $respiro e botões $alvo', async ({ densidade, colunasDosNumeros, colunasDosLados, colunasDoPainel, respiro, alvo }) => {
    fixarDensidade(densidade);
    const { container } = await montar(<ContratacoesPage />);
    await registrarRecebimento(container, ESTRELA_GUIA);

    const cartao = cartaoDaContratacao(container, ESTRELA_GUIA);
    const grades = todos<HTMLElement>(cartao, 'div[style*="grid-template-columns"]').map((grade) => grade.style.gridTemplateColumns);
    const numeros = folhaComTextoExato(container, 'A receber')!.parentElement!.parentElement!;
    expect(numeros.style.gridTemplateColumns).toBe(colunasDosNumeros);
    expect(grades).toEqual([colunasDosLados, colunasDoPainel]);
    expect([cartao.style.padding, botaoComTexto(cartao, 'Confirmar o recebimento').style.minHeight]).toEqual([respiro, alvo]);
  });

  it.each([
    { densidade: 'office' as const, padding: '18px 24px 30px', larguraMaxima: '1020px' },
    { densidade: 'field' as const, padding: '14px 16px 26px', larguraMaxima: '' },
  ])('densidade $densidade — o corpo da tela usa padding $padding e largura máxima "$larguraMaxima"', async ({ densidade, padding, larguraMaxima }) => {
    fixarDensidade(densidade);

    const { container } = await montar(<ContratacoesPage />);

    const corpo = elemento(container, 'header').nextElementSibling as HTMLElement;
    expect([corpo.style.padding, corpo.style.maxWidth]).toEqual([padding, larguraMaxima]);
  });
});
