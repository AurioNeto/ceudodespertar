import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  botaoComTexto,
  clicar,
  desmontarTudo,
  digitar,
  elemento,
  escolherOpcao,
  montar,
  todos,
} from '@/testes/montagem';
import { ContasEFundoPage } from './ContasEFundoPage';
import { ancestralComTexto, campoRotulado, fixarDensidade, glifoDe, textosDasFolhas } from './apoioDeTeste';

const HOJE_DA_DEMONSTRACAO = '2026-09-02T12:00:00Z';
const UM_SEGUNDO_DEPOIS = '2026-09-02T12:00:01Z';

beforeEach(() => {
  fixarDensidade(false);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(HOJE_DA_DEMONSTRACAO));
});

afterEach(async () => {
  await desmontarTudo();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const folhasComTexto = (container: HTMLElement, texto: string, seletor = '*') =>
  todos(container, seletor).filter((elemento) => elemento.childElementCount === 0 && elemento.textContent === texto);

const blocoDoRotulo = (container: HTMLElement, rotulo: string, posicao = 0): string[] => {
  const rotuloAchado = folhasComTexto(container, rotulo)[posicao];
  if (!rotuloAchado?.parentElement) throw new Error(`rótulo não encontrado: ${rotulo}`);
  return textosDasFolhas(rotuloAchado.parentElement);
};

const cartaoDaConta = (container: HTMLElement, nome: string): HTMLElement => {
  const folhaDoNome = folhasComTexto(container, nome)[0];
  if (!folhaDoNome) throw new Error(`conta não encontrada: ${nome}`);
  return ancestralComTexto(folhaDoNome, 'responsável:');
};

const FOLHAS_DE_UM_CARTAO = 6;

const cartaoDoResponsavel = (responsavel: HTMLElement): HTMLElement => {
  let atual = responsavel.parentElement;
  while (atual && textosDasFolhas(atual).length < FOLHAS_DE_UM_CARTAO) atual = atual.parentElement;
  if (!atual) throw new Error('cartão não encontrado');
  return atual;
};

const nomesDosCartoes = (container: HTMLElement) =>
  todos(container, '*')
    .filter((elemento) => elemento.childElementCount === 0 && elemento.textContent?.startsWith('responsável:'))
    .map((responsavel) => textosDasFolhas(cartaoDoResponsavel(responsavel)).at(0));

const linhasDaReserva = (container: HTMLElement): string[][] =>
  todos(container, '*')
    .filter((elemento) => elemento.childElementCount === 0 && /^-?\d+%$/.test(elemento.textContent ?? ''))
    .flatMap((porcentagem) => (porcentagem.parentElement ? [textosDasFolhas(porcentagem.parentElement)] : []));

const segmentoDaBarra = (container: HTMLElement, nome: string) => elemento<HTMLDivElement>(container, `div[title="${nome}"]`);

const linhaGerenciavel = (container: HTMLElement, nome: string) => {
  const editar = elemento<HTMLButtonElement>(container, `button[aria-label="editar ${nome}"]`);
  if (!editar.parentElement) throw new Error(`linha não encontrada: ${nome}`);
  return editar.parentElement;
};

const abrirGerenciador = (container: HTMLElement) => clicar(botaoComTexto(container, 'Gerenciar contas e fundos'));
const fecharGerenciador = (container: HTMLElement) => clicar(elemento(container, 'button[aria-label="fechar"]'));

async function criarConta(container: HTMLElement, nome: string, categoria?: string) {
  await clicar(botaoComTexto(container, '+ Nova conta'));
  await digitar(campoRotulado(container, 'Nome da conta'), nome);
  if (categoria) await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Categoria'), categoria);
  await clicar(botaoComTexto(container, 'Salvar conta'));
}

async function criarFundo(container: HTMLElement, nome: string, valor: string) {
  await clicar(botaoComTexto(container, '+ Novo fundo'));
  await digitar(campoRotulado(container, 'Nome do fundo'), nome);
  await digitar(campoRotulado(container, 'Valor alocado (R$)'), valor);
  await clicar(botaoComTexto(container, 'Salvar fundo'));
}

describe('ContasEFundoPage em escritório: cabeçalho e resumo da unidade', () => {
  it('cabeçalho — mostra o código com o nome da tela, o título e o subtítulo', async () => {
    const { container } = await montar(<ContasEFundoPage />);

    expect(textosDasFolhas(elemento(container, 'header'))).toEqual([
      'F-04 · Contas e fundo',
      'Contas e fundo',
      'Saldo por conta e destino do fundo próprio · CDD',
    ]);
  });

  it('saldo consolidado — soma o que está em banco com o que está em espécie e conta as contas ativas', async () => {
    const { container } = await montar(<ContasEFundoPage />);

    expect(blocoDoRotulo(container, 'Saldo consolidado da unidade')).toEqual([
      'Saldo consolidado da unidade',
      '84.317,90',
      'posição de hoje, 09:12 · 4 contas ativas',
    ]);
  });

  it('em banco — soma toda conta que não é caixa, a pessoal de terceiro inclusive, e diz quantas são', async () => {
    const { container } = await montar(<ContasEFundoPage />);

    expect(blocoDoRotulo(container, 'Em banco')).toEqual(['Em banco', '81.137,50', '3 contas']);
  });

  it('em espécie — mostra o saldo do caixa com a nota fixa da chácara', async () => {
    const { container } = await montar(<ContasEFundoPage />);

    expect(blocoDoRotulo(container, 'Em espécie')).toEqual(['Em espécie', '3.180,40', 'caixa da chácara']);
  });

  it('fundo próprio — mostra o valor do fundo e diz que é parte do saldo', async () => {
    const { container } = await montar(<ContasEFundoPage />);

    expect(blocoDoRotulo(container, 'Fundo próprio', 0)).toEqual([
      'Fundo próprio',
      '39.235,40',
      'parte do saldo, já com destino',
    ]);
  });

  it('contas esperando conferência — conta as ativas com conciliação pendente', async () => {
    const { container } = await montar(<ContasEFundoPage />);

    expect(folhasComTexto(container, '2 contas esperando conferência')).toHaveLength(1);
  });

  it('seção de contas — traz o rótulo Contas e os dois botões de ação', async () => {
    const { container } = await montar(<ContasEFundoPage />);

    expect(folhasComTexto(container, 'Contas', 'span')).toHaveLength(1);
    expect(todos(container, 'button').map((botao) => botao.textContent)).toEqual([
      'Gerenciar contas e fundos',
      'Transferir entre contas',
    ]);
  });

  it('Transferir entre contas — clicar não muda nada na tela', async () => {
    const { container } = await montar(<ContasEFundoPage />);
    const antes = container.innerHTML;

    await clicar(botaoComTexto(container, 'Transferir entre contas'));

    expect(container.innerHTML).toBe(antes);
  });

  it('escritório — mostra contas e fundo juntos, sem abas', async () => {
    const { container } = await montar(<ContasEFundoPage />);

    expect(todos(container, 'button[aria-pressed]')).toHaveLength(0);
    expect(nomesDosCartoes(container)).toEqual(['Cora PJ', 'Espécie', 'Nubank Paty', 'Itaú Munay']);
    expect(folhasComTexto(container, 'Total do fundo')).toHaveLength(1);
  });
});

describe('ContasEFundoPage: cartão de cada conta', () => {
  it.each([
    {
      nome: 'Cora PJ',
      folhas: [
        'Cora PJ',
        'conta principal da casa · CNPJ do CDD',
        'Conciliada ontem',
        '41.902,10',
        'movimento em 02/09',
        'responsável: Aurio Neto',
      ],
    },
    {
      nome: 'Espécie',
      folhas: [
        'Espécie',
        'caixa da chácara · cofre da secretaria',
        'Contagem pendente',
        '3.180,40',
        'movimento em 19/08',
        'responsável: Chico Aguiar',
      ],
    },
    {
      nome: 'Nubank Paty',
      folhas: [
        'Nubank Paty',
        'conta pessoal usada em nome da casa',
        'A conferir',
        '1.240,55',
        'movimento em 23/08',
        'responsável: Paty Munay',
      ],
    },
    {
      nome: 'Itaú Munay',
      folhas: [
        'Itaú Munay',
        'unidade comercial · lojinha',
        'Conciliada ontem',
        '37.994,85',
        'movimento em 22/08',
        'responsável: Paty Munay',
      ],
    },
  ])('cartão $nome — mostra descrição, selo, saldo, último movimento e responsável, nessa ordem', async ({ nome, folhas }) => {
    const { container } = await montar(<ContasEFundoPage />);

    expect(textosDasFolhas(cartaoDaConta(container, nome))).toEqual(folhas);
  });

  it.each([
    { nome: 'Cora PJ', glifo: 'landmark' },
    { nome: 'Espécie', glifo: 'wallet' },
    { nome: 'Nubank Paty', glifo: 'credit-card' },
    { nome: 'Itaú Munay', glifo: 'landmark' },
  ])('ícone da conta $nome — é $glifo: caixa é carteira, conta pessoal de terceiro é cartão, o resto é banco', async ({ nome, glifo }) => {
    const { container } = await montar(<ContasEFundoPage />);

    expect(glifoDe(elemento(cartaoDaConta(container, nome), 'svg'))).toBe(glifo);
  });

  it.each([
    { nome: 'Cora PJ', alertas: [] },
    { nome: 'Espécie', alertas: ['Última contagem física foi em 31/07. O combinado é contar todo dia 15.'] },
    { nome: 'Nubank Paty', alertas: ['Conta pessoal: o combinado é zerar para o Cora até o fim de cada mês.'] },
    { nome: 'Itaú Munay', alertas: [] },
  ])('alerta da conta $nome — só a conta que tem alerta leva o aviso, no atributo title', async ({ nome, alertas }) => {
    const { container } = await montar(<ContasEFundoPage />);

    const avisos = todos<HTMLSpanElement>(cartaoDaConta(container, nome), 'span[title]').map((aviso) => aviso.title);

    expect(avisos).toEqual(alertas);
  });

  it.each([
    { nome: 'Cora PJ', borda: '3px solid var(--color-confirmed)' },
    { nome: 'Espécie', borda: '3px solid var(--color-pending)' },
    { nome: 'Nubank Paty', borda: '3px solid var(--color-pending)' },
    { nome: 'Itaú Munay', borda: '3px solid var(--color-confirmed)' },
  ])('borda do cartão $nome — segue a conciliação: pendente no tom pending, conciliada no confirmed', async ({ nome, borda }) => {
    const { container } = await montar(<ContasEFundoPage />);

    expect(cartaoDaConta(container, nome).style.borderLeft).toBe(borda);
  });

  it.each([
    { nome: 'Cora PJ', selo: 'Conciliada ontem', cor: 'var(--color-confirmed)' },
    { nome: 'Espécie', selo: 'Contagem pendente', cor: 'var(--color-pending)' },
    { nome: 'Nubank Paty', selo: 'A conferir', cor: 'var(--color-pending)' },
  ])('selo da conta $nome — diz $selo no tom $cor', async ({ nome, selo, cor }) => {
    const { container } = await montar(<ContasEFundoPage />);

    const folha = folhasComTexto(cartaoDaConta(container, nome), selo)[0] as HTMLElement;

    expect(folha.style.color).toBe(cor);
  });

  it('Itaú Munay — o selo diz Conciliada ontem mesmo com o último movimento em 22/08', async () => {
    const { container } = await montar(<ContasEFundoPage />);

    const folhas = textosDasFolhas(cartaoDaConta(container, 'Itaú Munay'));

    expect(folhas).toContain('Conciliada ontem');
    expect(folhas).toContain('movimento em 22/08');
  });
});

describe('ContasEFundoPage: fundo próprio', () => {
  it('totais do fundo — mostram o total, o que já tem destino e o que está livre', async () => {
    const { container } = await montar(<ContasEFundoPage />);

    expect(blocoDoRotulo(container, 'Total do fundo')).toEqual(['Total do fundo', '39.235,40']);
    expect(blocoDoRotulo(container, 'Já com destino')).toEqual(['Já com destino', '33.600,00']);
    expect(blocoDoRotulo(container, 'Livre', 0)).toEqual(['Livre', '5.635,40']);
  });

  it('reservas — listam cada fundo ativo e o Livre, com nota, valor e porcentagem arredondada', async () => {
    const { container } = await montar(<ContasEFundoPage />);

    expect(linhasDaReserva(container)).toEqual([
      ['Obra do dormitório', 'meta 24.000,00 · previsão de conclusão em novembro', '18.400,00', '47%'],
      ['Feitio de dezembro', 'insumos, garrafas e deslocamento', '9.200,00', '23%'],
      ['Emergência e saúde', 'intocável fora de emergência, decisão da direção', '6.000,00', '15%'],
      ['Livre', 'sem destino combinado', '5.635,40', '14%'],
    ]);
  });

  it('barra do fundo — dá a cada reserva a largura da sua fatia do fundo próprio, e ao Livre o resto', async () => {
    const { container } = await montar(<ContasEFundoPage />);

    const larguras = ['Obra do dormitório', 'Feitio de dezembro', 'Emergência e saúde', 'Livre'].map((nome) =>
      parseFloat(segmentoDaBarra(container, nome).style.width),
    );

    expect(larguras[0]).toBeCloseTo(46.8964, 3);
    expect(larguras[1]).toBeCloseTo(23.4482, 3);
    expect(larguras[2]).toBeCloseTo(15.2923, 3);
    expect(larguras[3]).toBeCloseTo(14.363, 3);
  });

  it.each([
    { nome: 'Obra do dormitório', cor: 'var(--color-royal)' },
    { nome: 'Feitio de dezembro', cor: 'var(--color-confirmed)' },
    { nome: 'Emergência e saúde', cor: 'var(--color-pending)' },
    { nome: 'Livre', cor: 'var(--color-line-strong)' },
  ])('cor da reserva $nome — é $cor', async ({ nome, cor }) => {
    const { container } = await montar(<ContasEFundoPage />);

    expect(segmentoDaBarra(container, nome).style.background).toBe(cor);
  });

  it('seção do fundo — traz o rótulo, a frase de que não é conta separada e a explicação do fundo', async () => {
    const { container } = await montar(<ContasEFundoPage />);

    expect(blocoDoRotulo(container, 'Fundo próprio', 1)).toEqual([
      'Fundo próprio',
      'reservado dentro do saldo, não é uma conta separada',
    ]);
    expect(container.textContent).toContain(
      'O fundo não é uma conta: é uma parte do saldo que já tem destino combinado. Gastar de uma reserva não muda o saldo das contas, muda o que ainda está livre.',
    );
  });
});

describe('ContasEFundoPage em campo', () => {
  beforeEach(() => {
    fixarDensidade(true);
  });

  it('cabeçalho — mostra só o código F-04 e o título, sem subtítulo', async () => {
    const { container } = await montar(<ContasEFundoPage />);

    expect(textosDasFolhas(elemento(container, 'header'))).toEqual(['F-04', 'Contas e fundo']);
  });

  it('resumo — mostra os mesmos valores do escritório', async () => {
    const { container } = await montar(<ContasEFundoPage />);

    expect(blocoDoRotulo(container, 'Saldo consolidado da unidade')[1]).toBe('84.317,90');
    expect(blocoDoRotulo(container, 'Em banco')).toEqual(['Em banco', '81.137,50', '3 contas']);
    expect(blocoDoRotulo(container, 'Em espécie')).toEqual(['Em espécie', '3.180,40', 'caixa da chácara']);
  });

  it('abas — abre em Contas, com Contas marcada, e o fundo fica escondido', async () => {
    const { container } = await montar(<ContasEFundoPage />);

    expect(botaoComTexto(container, 'Contas').getAttribute('aria-pressed')).toBe('true');
    expect(botaoComTexto(container, 'Fundo').getAttribute('aria-pressed')).toBe('false');
    expect(nomesDosCartoes(container)).toHaveLength(4);
    expect(container.textContent).not.toContain('Total do fundo');
  });

  it('seção de contas — não mostra o rótulo Contas nem o botão Transferir entre contas', async () => {
    const { container } = await montar(<ContasEFundoPage />);

    expect(folhasComTexto(container, 'Contas', 'span')).toHaveLength(0);
    expect(todos(container, 'button').map((botao) => botao.textContent)).not.toContain('Transferir entre contas');
    expect(todos(container, 'button').map((botao) => botao.textContent)).toContain('Gerenciar contas e fundos');
  });

  it('aba Fundo — mostra o fundo, esconde as contas e some o botão de gerenciar', async () => {
    const { container } = await montar(<ContasEFundoPage />);

    await clicar(botaoComTexto(container, 'Fundo'));

    expect(botaoComTexto(container, 'Fundo').getAttribute('aria-pressed')).toBe('true');
    expect(blocoDoRotulo(container, 'Total do fundo')).toEqual(['Total do fundo', '39.235,40']);
    expect(nomesDosCartoes(container)).toHaveLength(0);
    expect(todos(container, 'button').map((botao) => botao.textContent)).not.toContain('Gerenciar contas e fundos');
  });

  it('aba Fundo — não repete o rótulo Fundo próprio da seção', async () => {
    const { container } = await montar(<ContasEFundoPage />);

    await clicar(botaoComTexto(container, 'Fundo'));

    expect(folhasComTexto(container, 'Fundo próprio', 'span')).toHaveLength(1);
    expect(folhasComTexto(container, 'reservado dentro do saldo, não é uma conta separada')).toHaveLength(1);
  });

  it('voltar para a aba Contas — mostra as contas de novo e esconde o fundo', async () => {
    const { container } = await montar(<ContasEFundoPage />);
    await clicar(botaoComTexto(container, 'Fundo'));

    await clicar(botaoComTexto(container, 'Contas'));

    expect(nomesDosCartoes(container)).toHaveLength(4);
    expect(container.textContent).not.toContain('Total do fundo');
  });

  it('gerenciar — abre o painel também em campo', async () => {
    const { container } = await montar(<ContasEFundoPage />);

    await abrirGerenciador(container);

    expect(elemento(container, 'button[aria-label="editar Cora PJ"]')).toBeTruthy();
  });
});

describe('ContasEFundoPage: gerenciar contas e fundos', () => {
  it('abrir — o botão abre o painel, e fechar o dispensa sem mudar a tela', async () => {
    const { container } = await montar(<ContasEFundoPage />);
    const antes = container.innerHTML;

    await abrirGerenciador(container);
    expect(todos(container, 'button[aria-label="fechar"]')).toHaveLength(1);
    await fecharGerenciador(container);

    expect(todos(container, 'button[aria-label="fechar"]')).toHaveLength(0);
    expect(container.innerHTML).toBe(antes);
  });

  it('excluir uma conta — tira o saldo dos totais, o cartão da tela e o selo da contagem, e a conta segue no painel', async () => {
    const { container } = await montar(<ContasEFundoPage />);
    await abrirGerenciador(container);

    await clicar(botaoComTexto(linhaGerenciavel(container, 'Espécie'), 'Excluir'));

    expect(textosDasFolhas(linhaGerenciavel(container, 'Espécie'))).toContain('Inativa');
    expect(botaoComTexto(linhaGerenciavel(container, 'Espécie'), 'Reativar')).toBeTruthy();
    await fecharGerenciador(container);
    expect(nomesDosCartoes(container)).toEqual(['Cora PJ', 'Nubank Paty', 'Itaú Munay']);
    expect(blocoDoRotulo(container, 'Saldo consolidado da unidade')).toEqual([
      'Saldo consolidado da unidade',
      '81.137,50',
      'posição de hoje, 09:12 · 3 contas ativas',
    ]);
    expect(blocoDoRotulo(container, 'Em espécie')).toEqual(['Em espécie', '0,00', 'caixa da chácara']);
    expect(folhasComTexto(container, '1 conta esperando conferência')).toHaveLength(1);
  });

  it('excluir uma conta de banco — tira o saldo de Em banco, baixa a nota para 2 contas e o consolidado', async () => {
    const { container } = await montar(<ContasEFundoPage />);
    await abrirGerenciador(container);

    await clicar(botaoComTexto(linhaGerenciavel(container, 'Nubank Paty'), 'Excluir'));

    await fecharGerenciador(container);
    expect(blocoDoRotulo(container, 'Em banco')).toEqual(['Em banco', '79.896,95', '2 contas']);
    expect(blocoDoRotulo(container, 'Em espécie')).toEqual(['Em espécie', '3.180,40', 'caixa da chácara']);
    expect(blocoDoRotulo(container, 'Saldo consolidado da unidade')).toEqual([
      'Saldo consolidado da unidade',
      '83.077,35',
      'posição de hoje, 09:12 · 3 contas ativas',
    ]);
  });

  it('reativar uma conta — devolve o saldo aos totais e o cartão à tela', async () => {
    const { container } = await montar(<ContasEFundoPage />);
    await abrirGerenciador(container);
    await clicar(botaoComTexto(linhaGerenciavel(container, 'Espécie'), 'Excluir'));

    await clicar(botaoComTexto(linhaGerenciavel(container, 'Espécie'), 'Reativar'));

    await fecharGerenciador(container);
    expect(nomesDosCartoes(container)).toEqual(['Cora PJ', 'Espécie', 'Nubank Paty', 'Itaú Munay']);
    expect(blocoDoRotulo(container, 'Saldo consolidado da unidade')[1]).toBe('84.317,90');
  });

  it('excluir um fundo — devolve o valor ao Livre e tira a reserva da lista, sem mexer no total do fundo', async () => {
    const { container } = await montar(<ContasEFundoPage />);
    await abrirGerenciador(container);
    await clicar(botaoComTexto(container, 'Fundos'));

    await clicar(botaoComTexto(linhaGerenciavel(container, 'Obra do dormitório'), 'Excluir'));

    await fecharGerenciador(container);
    expect(blocoDoRotulo(container, 'Total do fundo')).toEqual(['Total do fundo', '39.235,40']);
    expect(blocoDoRotulo(container, 'Já com destino')).toEqual(['Já com destino', '15.200,00']);
    expect(blocoDoRotulo(container, 'Livre', 0)).toEqual(['Livre', '24.035,40']);
    expect(linhasDaReserva(container).map((linha) => linha[0])).toEqual([
      'Feitio de dezembro',
      'Emergência e saúde',
      'Livre',
    ]);
  });

  it('reativar um fundo — devolve a reserva à lista e o valor ao Já com destino, e o Livre volta ao que era', async () => {
    const { container } = await montar(<ContasEFundoPage />);
    await abrirGerenciador(container);
    await clicar(botaoComTexto(container, 'Fundos'));
    await clicar(botaoComTexto(linhaGerenciavel(container, 'Obra do dormitório'), 'Excluir'));

    await clicar(botaoComTexto(linhaGerenciavel(container, 'Obra do dormitório'), 'Reativar'));

    await fecharGerenciador(container);
    expect(blocoDoRotulo(container, 'Total do fundo')).toEqual(['Total do fundo', '39.235,40']);
    expect(blocoDoRotulo(container, 'Já com destino')).toEqual(['Já com destino', '33.600,00']);
    expect(blocoDoRotulo(container, 'Livre', 0)).toEqual(['Livre', '5.635,40']);
    expect(linhasDaReserva(container).map((linha) => linha[0])).toEqual([
      'Obra do dormitório',
      'Feitio de dezembro',
      'Emergência e saúde',
      'Livre',
    ]);
  });

  it('nova conta — com nome, vira cartão sem movimentos e entra nas contagens, sem mexer nos saldos', async () => {
    const { container } = await montar(<ContasEFundoPage />);
    await abrirGerenciador(container);

    await criarConta(container, 'Reserva da obra');

    await fecharGerenciador(container);
    expect(textosDasFolhas(cartaoDaConta(container, 'Reserva da obra'))).toEqual([
      'Reserva da obra',
      'Nova conta',
      '0,00',
      'sem movimentos ainda',
      'responsável: ',
    ]);
    expect(blocoDoRotulo(container, 'Saldo consolidado da unidade')).toEqual([
      'Saldo consolidado da unidade',
      '84.317,90',
      'posição de hoje, 09:12 · 5 contas ativas',
    ]);
    expect(blocoDoRotulo(container, 'Em banco')).toEqual(['Em banco', '81.137,50', '4 contas']);
    expect(folhasComTexto(container, '3 contas esperando conferência')).toHaveLength(1);
  });

  it('nova conta de espécie — aparece com o ícone de carteira e não entra na contagem de contas em banco', async () => {
    const { container } = await montar(<ContasEFundoPage />);
    await abrirGerenciador(container);

    await criarConta(container, 'Cofre da lojinha', 'DINHEIRO');

    await fecharGerenciador(container);
    expect(glifoDe(elemento(cartaoDaConta(container, 'Cofre da lojinha'), 'svg'))).toBe('wallet');
    expect(blocoDoRotulo(container, 'Em banco')).toEqual(['Em banco', '81.137,50', '3 contas']);
  });

  it('editar uma conta — trocar a categoria para espécie leva o saldo de banco para espécie e o ícone para carteira', async () => {
    const { container } = await montar(<ContasEFundoPage />);
    await abrirGerenciador(container);

    await clicar(elemento(container, 'button[aria-label="editar Cora PJ"]'));
    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Categoria'), 'DINHEIRO');
    await clicar(botaoComTexto(container, 'Salvar conta'));

    await fecharGerenciador(container);
    expect(blocoDoRotulo(container, 'Em banco')).toEqual(['Em banco', '39.235,40', '2 contas']);
    expect(blocoDoRotulo(container, 'Em espécie')).toEqual(['Em espécie', '45.082,50', 'caixa da chácara']);
    expect(blocoDoRotulo(container, 'Saldo consolidado da unidade')[1]).toBe('84.317,90');
    expect(glifoDe(elemento(cartaoDaConta(container, 'Cora PJ'), 'svg'))).toBe('wallet');
  });

  it('editar uma conta — trocar o nome e o responsável preserva o saldo e o último movimento', async () => {
    const { container } = await montar(<ContasEFundoPage />);
    await abrirGerenciador(container);

    await clicar(elemento(container, 'button[aria-label="editar Itaú Munay"]'));
    await digitar(campoRotulado(container, 'Nome da conta'), 'Itaú Lojinha');
    await digitar(campoRotulado(container, 'Responsável'), 'Marília Prado');
    await clicar(botaoComTexto(container, 'Salvar conta'));

    await fecharGerenciador(container);
    expect(textosDasFolhas(cartaoDaConta(container, 'Itaú Lojinha'))).toEqual([
      'Itaú Lojinha',
      'unidade comercial · lojinha',
      'Conciliada ontem',
      '37.994,85',
      'movimento em 22/08',
      'responsável: Marília Prado',
    ]);
    expect(nomesDosCartoes(container)).toHaveLength(4);
  });

  it('salvar conta com nome vazio — não muda a tela nem avisa nada, e o formulário continua aberto', async () => {
    const { container } = await montar(<ContasEFundoPage />);
    await abrirGerenciador(container);
    await clicar(botaoComTexto(container, '+ Nova conta'));
    await digitar(campoRotulado(container, 'Descrição'), 'sem nome ainda');

    await clicar(botaoComTexto(container, 'Salvar conta'));

    expect(botaoComTexto(container, 'Salvar conta')).toBeTruthy();
    expect(campoRotulado(container, 'Descrição').value).toBe('sem nome ainda');
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(blocoDoRotulo(container, 'Saldo consolidado da unidade')[2]).toBe('posição de hoje, 09:12 · 4 contas ativas');
  });

  it('editar um fundo — trocar o valor reajusta o que já tem destino e o Livre, e a reserva continua no mesmo lugar', async () => {
    const { container } = await montar(<ContasEFundoPage />);
    await abrirGerenciador(container);
    await clicar(botaoComTexto(container, 'Fundos'));

    await clicar(elemento(container, 'button[aria-label="editar Feitio de dezembro"]'));
    await digitar(campoRotulado(container, 'Valor alocado (R$)'), '10.000,00');
    await clicar(botaoComTexto(container, 'Salvar fundo'));

    await fecharGerenciador(container);
    expect(blocoDoRotulo(container, 'Já com destino')).toEqual(['Já com destino', '34.400,00']);
    expect(blocoDoRotulo(container, 'Livre', 0)).toEqual(['Livre', '4.835,40']);
    expect(linhasDaReserva(container).map((linha) => linha[0])).toEqual([
      'Obra do dormitório',
      'Feitio de dezembro',
      'Emergência e saúde',
      'Livre',
    ]);
    expect(linhasDaReserva(container)[1]).toEqual([
      'Feitio de dezembro',
      'insumos, garrafas e deslocamento',
      '10.000,00',
      '25%',
    ]);
  });

  it('novo fundo — com valor lido como 1.500,00, vira reserva de 1.500,00 e tira do Livre', async () => {
    const { container } = await montar(<ContasEFundoPage />);
    await abrirGerenciador(container);
    await clicar(botaoComTexto(container, 'Fundos'));

    await criarFundo(container, 'Reforma da cozinha', '1.500,00');

    await fecharGerenciador(container);
    expect(blocoDoRotulo(container, 'Já com destino')).toEqual(['Já com destino', '35.100,00']);
    expect(blocoDoRotulo(container, 'Livre', 0)).toEqual(['Livre', '4.135,40']);
    expect(linhasDaReserva(container).at(-2)).toEqual(['Reforma da cozinha', '1.500,00', '4%']);
  });

  it('fundo acima do que está livre — deixa o Livre negativo, com a barra em 0%, sem aviso nem bloqueio', async () => {
    const { container } = await montar(<ContasEFundoPage />);
    await abrirGerenciador(container);
    await clicar(botaoComTexto(container, 'Fundos'));

    await criarFundo(container, 'Compra do terreno', '10.000,00');

    await fecharGerenciador(container);
    expect(blocoDoRotulo(container, 'Já com destino')).toEqual(['Já com destino', '43.600,00']);
    expect(blocoDoRotulo(container, 'Livre', 0)).toEqual(['Livre', '-4.364,60']);
    expect(linhasDaReserva(container).at(-1)).toEqual(['Livre', 'sem destino combinado', '-4.364,60', '-11%']);
    expect(segmentoDaBarra(container, 'Livre').style.width).toBe('0%');
  });

  it('cores das reservas — seguem a ordem royal, confirmed, pending, attention e voltam ao royal no quinto fundo', async () => {
    const { container } = await montar(<ContasEFundoPage />);
    await abrirGerenciador(container);
    await clicar(botaoComTexto(container, 'Fundos'));
    await criarFundo(container, 'Quarto', '1');
    vi.setSystemTime(new Date(UM_SEGUNDO_DEPOIS));
    await criarFundo(container, 'Quinto', '1');

    await fecharGerenciador(container);

    expect(segmentoDaBarra(container, 'Quarto').style.background).toBe('var(--color-attention)');
    expect(segmentoDaBarra(container, 'Quinto').style.background).toBe('var(--color-royal)');
  });

  it('fundo inativado — a cor do fundo seguinte é contada entre os ativos na tela e entre todos no painel', async () => {
    const { container } = await montar(<ContasEFundoPage />);
    await abrirGerenciador(container);
    await clicar(botaoComTexto(container, 'Fundos'));

    await clicar(botaoComTexto(linhaGerenciavel(container, 'Obra do dormitório'), 'Excluir'));

    const marcadorNoPainel = linhaGerenciavel(container, 'Feitio de dezembro').firstElementChild as HTMLElement;
    expect(marcadorNoPainel.style.background).toBe('var(--color-confirmed)');
    expect(segmentoDaBarra(container, 'Feitio de dezembro').style.background).toBe('var(--color-royal)');
  });
});
