import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Conta, ContaId, Fundo, FundoId } from '@cdd/contracts';
import { dataLocal, reais } from '@cdd/contracts';
import { botaoComTexto, clicar, desmontarTudo, digitar, elemento, escolherOpcao, montar, todos } from '@/testes/montagem';
import { GerenciarContasModal, type GerenciarContasModalProps } from './GerenciarContasModal';
import { campoRotulado, glifoDe, textosDasFolhas } from './apoioDeTeste';

const HOJE_DA_DEMONSTRACAO = '2026-09-02T12:00:00Z';
const CARIMBO_DE_HOJE = Date.parse(HOJE_DA_DEMONSTRACAO);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(HOJE_DA_DEMONSTRACAO));
});

afterEach(async () => {
  await desmontarTudo();
  vi.useRealTimers();
});

const contaDoBanco: Conta = {
  id: 'c-banco' as ContaId,
  nome: 'Banco da Casa',
  descricao: 'conta principal',
  tipo: 'CONTA_CORRENTE',
  titularidade: 'INSTITUCIONAL',
  pessoaTitularId: null,
  responsavel: 'Ana Souza',
  saldo: reais(1000),
  ultimoMovimento: dataLocal('2026-09-02'),
  conciliacao: 'CONCILIADA',
  alerta: null,
  ativa: true,
};

const contaDoCaixa: Conta = {
  ...contaDoBanco,
  id: 'c-caixa' as ContaId,
  nome: 'Caixa da Chácara',
  descricao: 'dinheiro em espécie',
  tipo: 'DINHEIRO',
  responsavel: 'Bia Lima',
  saldo: reais(300),
  conciliacao: 'PENDENTE',
  alerta: 'Contagem atrasada.',
};

const contaDeTerceiro: Conta = {
  ...contaDoBanco,
  id: 'c-terceiro' as ContaId,
  nome: 'Conta da Carla',
  descricao: 'conta pessoal usada pela casa',
  titularidade: 'PESSOAL_DE_TERCEIRO',
  responsavel: 'Carla Dias',
};

const contaInativa: Conta = {
  ...contaDoBanco,
  id: 'c-velha' as ContaId,
  nome: 'Conta Antiga',
  descricao: 'encerrada',
  ativa: false,
};

const fundoDaObra: Fundo = {
  id: 'f-obra' as FundoId,
  codigoSistema: 'FUNDO_OBRA',
  nome: 'Obra do dormitório',
  nota: 'meta 24.000,00',
  contaVinculadaId: 'c-banco' as ContaId,
  valorReservado: reais(18400),
  meta: reais(24000),
  ativo: true,
};

const fundoDoFeitio: Fundo = {
  ...fundoDaObra,
  id: 'f-feitio' as FundoId,
  codigoSistema: 'FUNDO_FEITIO',
  nome: 'Feitio de dezembro',
  nota: 'insumos e garrafas',
  valorReservado: reais(9200.5),
  meta: null,
  ativo: false,
};

async function montarModal(sobrescritas: Partial<GerenciarContasModalProps> = {}) {
  const props: GerenciarContasModalProps = {
    contas: [contaDoBanco, contaDoCaixa, contaDeTerceiro, contaInativa],
    fundos: [fundoDaObra, fundoDoFeitio],
    onFechar: vi.fn(),
    onSalvarConta: vi.fn(),
    onSalvarFundo: vi.fn(),
    onAlternarConta: vi.fn(),
    onAlternarFundo: vi.fn(),
    ...sobrescritas,
  };
  const montado = await montar(<GerenciarContasModal {...props} />);
  return { ...montado, props };
}

const linhaGerenciavel = (container: HTMLElement, nome: string) => {
  const editar = elemento<HTMLButtonElement>(container, `button[aria-label="editar ${nome}"]`);
  if (!editar.parentElement) throw new Error(`linha não encontrada: ${nome}`);
  return editar.parentElement;
};

const seloDaLinha = (linha: HTMLElement, texto: string) => {
  const achado = todos<HTMLSpanElement>(linha, 'span').find((no) => no.childElementCount === 0 && no.textContent === texto);
  if (!achado) throw new Error(`selo não encontrado: ${texto}`);
  return achado;
};

const abrirAbaDeFundos = (container: HTMLElement) => clicar(botaoComTexto(container, 'Fundos'));
const titulosDoFormulario = (container: HTMLElement) =>
  textosDasFolhas(container).filter((texto) => /^(Nova conta|Novo fundo|Editar )/.test(texto));
const tituloDoFormulario = (container: HTMLElement) => titulosDoFormulario(container).at(0);

describe('GerenciarContasModal: estrutura e fechamento', () => {
  it('cabeçalho — mostra o título do painel e o botão de fechar', async () => {
    const { container } = await montarModal();

    expect(textosDasFolhas(container)).toContain('Gerenciar contas e fundos');
    expect(elemento(container, 'button[aria-label="fechar"]').textContent).toBe('');
  });

  it('abas — abre em Contas, com Contas marcada e Fundos desmarcada', async () => {
    const { container } = await montarModal();

    expect(botaoComTexto(container, 'Contas').getAttribute('aria-pressed')).toBe('true');
    expect(botaoComTexto(container, 'Fundos').getAttribute('aria-pressed')).toBe('false');
  });

  it('fechar pelo botão — chama onFechar uma vez', async () => {
    const { container, props } = await montarModal();

    await clicar(elemento(container, 'button[aria-label="fechar"]'));

    expect(props.onFechar).toHaveBeenCalledTimes(1);
  });

  it('clicar no fundo escurecido — chama onFechar uma vez', async () => {
    const { container, props } = await montarModal();

    await clicar(elemento(container, ':scope > div'));

    expect(props.onFechar).toHaveBeenCalledTimes(1);
  });

  it('clicar dentro do painel — não fecha', async () => {
    const { container, props } = await montarModal();

    await clicar(botaoComTexto(container, 'Fundos'));
    await clicar(botaoComTexto(container, '+ Novo fundo'));

    expect(props.onFechar).not.toHaveBeenCalled();
  });
});

describe('GerenciarContasModal: aba de contas', () => {
  it('lista — mostra todas as contas na ordem recebida, a inativa inclusive', async () => {
    const { container } = await montarModal();

    expect(todos(container, 'button[aria-label^="editar "]').map((botao) => botao.getAttribute('aria-label'))).toEqual([
      'editar Banco da Casa',
      'editar Caixa da Chácara',
      'editar Conta da Carla',
      'editar Conta Antiga',
    ]);
  });

  it('linha da conta ativa — mostra nome, descrição, selo Ativa e o botão Excluir', async () => {
    const { container } = await montarModal();

    expect(textosDasFolhas(linhaGerenciavel(container, 'Banco da Casa'))).toEqual([
      'Banco da Casa',
      'conta principal',
      'Ativa',
      'Excluir',
    ]);
  });

  it('linha da conta inativa — mostra o selo Inativa e o botão Reativar', async () => {
    const { container } = await montarModal();

    expect(textosDasFolhas(linhaGerenciavel(container, 'Conta Antiga'))).toEqual([
      'Conta Antiga',
      'encerrada',
      'Inativa',
      'Reativar',
    ]);
  });

  it.each([
    { nome: 'Banco da Casa', selo: 'Ativa', cor: 'var(--color-confirmed)', fundo: 'var(--color-confirmed-soft)' },
    { nome: 'Conta Antiga', selo: 'Inativa', cor: 'var(--color-neutral)', fundo: 'var(--color-neutral-soft)' },
  ])('selo da conta $nome — diz $selo no tom $cor', async ({ nome, selo, cor, fundo }) => {
    const { container } = await montarModal();

    const folha = seloDaLinha(linhaGerenciavel(container, nome), selo);

    expect([folha.style.color, folha.style.background]).toEqual([cor, fundo]);
  });

  it.each([
    { nome: 'Banco da Casa', glifo: 'landmark' },
    { nome: 'Caixa da Chácara', glifo: 'wallet' },
    { nome: 'Conta da Carla', glifo: 'landmark' },
  ])('ícone da conta $nome — é $glifo: o painel só distingue caixa de banco, a conta pessoal de terceiro fica como banco', async ({ nome, glifo }) => {
    const { container } = await montarModal();

    expect(glifoDe(elemento(linhaGerenciavel(container, nome), 'svg'))).toBe(glifo);
  });

  it('Excluir — chama onAlternarConta com o id da conta, uma vez', async () => {
    const { container, props } = await montarModal();

    await clicar(botaoComTexto(linhaGerenciavel(container, 'Caixa da Chácara'), 'Excluir'));

    expect(props.onAlternarConta).toHaveBeenCalledExactlyOnceWith('c-caixa');
  });

  it('Reativar — chama onAlternarConta com o id da conta inativa, uma vez', async () => {
    const { container, props } = await montarModal();

    await clicar(botaoComTexto(linhaGerenciavel(container, 'Conta Antiga'), 'Reativar'));

    expect(props.onAlternarConta).toHaveBeenCalledExactlyOnceWith('c-velha');
  });

  it('sem contas — mostra só o botão de nova conta', async () => {
    const { container } = await montarModal({ contas: [] });

    expect(todos(container, 'button[aria-label^="editar "]')).toHaveLength(0);
    expect(botaoComTexto(container, '+ Nova conta')).toBeTruthy();
  });
});

describe('GerenciarContasModal: aba de fundos', () => {
  it('trocar de aba — esconde as contas, mostra os fundos e marca Fundos', async () => {
    const { container } = await montarModal();

    await abrirAbaDeFundos(container);

    expect(botaoComTexto(container, 'Fundos').getAttribute('aria-pressed')).toBe('true');
    expect(botaoComTexto(container, 'Contas').getAttribute('aria-pressed')).toBe('false');
    expect(todos(container, 'button[aria-label^="editar "]').map((botao) => botao.getAttribute('aria-label'))).toEqual([
      'editar Obra do dormitório',
      'editar Feitio de dezembro',
    ]);
  });

  it('linha do fundo ativo — mostra nome, nota, valor reservado, selo Ativo e Excluir', async () => {
    const { container } = await montarModal();
    await abrirAbaDeFundos(container);

    expect(textosDasFolhas(linhaGerenciavel(container, 'Obra do dormitório'))).toEqual([
      'Obra do dormitório',
      'meta 24.000,00',
      '18.400,00',
      'Ativo',
      'Excluir',
    ]);
  });

  it('linha do fundo inativo — mostra o selo Inativo e Reativar, e o valor continua à vista', async () => {
    const { container } = await montarModal();
    await abrirAbaDeFundos(container);

    expect(textosDasFolhas(linhaGerenciavel(container, 'Feitio de dezembro'))).toEqual([
      'Feitio de dezembro',
      'insumos e garrafas',
      '9.200,50',
      'Inativo',
      'Reativar',
    ]);
  });

  it.each([
    { nome: 'Obra do dormitório', selo: 'Ativo', cor: 'var(--color-confirmed)', fundo: 'var(--color-confirmed-soft)' },
    { nome: 'Feitio de dezembro', selo: 'Inativo', cor: 'var(--color-neutral)', fundo: 'var(--color-neutral-soft)' },
  ])('selo do fundo $nome — diz $selo no tom $cor', async ({ nome, selo, cor, fundo }) => {
    const { container } = await montarModal();
    await abrirAbaDeFundos(container);

    const folha = seloDaLinha(linhaGerenciavel(container, nome), selo);

    expect([folha.style.color, folha.style.background]).toEqual([cor, fundo]);
  });

  it('marcador de cor — segue a posição do fundo na lista inteira, ativo ou não', async () => {
    const { container } = await montarModal();
    await abrirAbaDeFundos(container);

    const marcadores = ['Obra do dormitório', 'Feitio de dezembro'].map(
      (nome) => (linhaGerenciavel(container, nome).firstElementChild as HTMLElement).style.background,
    );

    expect(marcadores).toEqual(['var(--color-royal)', 'var(--color-confirmed)']);
  });

  it('nota da aba — diz que inativar devolve o valor ao Livre e que editar realoca do fundo próprio', async () => {
    const { container } = await montarModal();
    await abrirAbaDeFundos(container);

    expect(container.textContent).toContain(
      'Inativar um fundo devolve o valor para "Livre"; criar ou editar realoca a partir do mesmo fundo próprio.',
    );
  });

  it('Excluir — chama onAlternarFundo com o id do fundo, uma vez', async () => {
    const { container, props } = await montarModal();
    await abrirAbaDeFundos(container);

    await clicar(botaoComTexto(linhaGerenciavel(container, 'Obra do dormitório'), 'Excluir'));

    expect(props.onAlternarFundo).toHaveBeenCalledExactlyOnceWith('f-obra');
    expect(props.onAlternarConta).not.toHaveBeenCalled();
  });

  it('Reativar — chama onAlternarFundo com o id do fundo inativo, uma vez', async () => {
    const { container, props } = await montarModal();
    await abrirAbaDeFundos(container);

    await clicar(botaoComTexto(linhaGerenciavel(container, 'Feitio de dezembro'), 'Reativar'));

    expect(props.onAlternarFundo).toHaveBeenCalledExactlyOnceWith('f-feitio');
  });

  it('voltar para a aba Contas — mostra as contas de novo', async () => {
    const { container } = await montarModal();
    await abrirAbaDeFundos(container);

    await clicar(botaoComTexto(container, 'Contas'));

    expect(elemento(container, 'button[aria-label="editar Banco da Casa"]')).toBeTruthy();
  });
});

describe('GerenciarContasModal: formulário de conta', () => {
  it('nova conta — abre o formulário vazio no lugar da lista e das abas', async () => {
    const { container } = await montarModal();

    await clicar(botaoComTexto(container, '+ Nova conta'));

    expect(titulosDoFormulario(container)).toEqual(['Nova conta']);
    expect(campoRotulado(container, 'Nome da conta').value).toBe('');
    expect(campoRotulado(container, 'Nome da conta').placeholder).toBe('Cora PJ');
    expect(campoRotulado(container, 'Descrição').placeholder).toBe('conta principal da casa');
    expect(campoRotulado(container, 'Responsável').placeholder).toBe('quem cuida desta conta');
    expect(campoRotulado<HTMLSelectElement>(container, 'Categoria').value).toBe('CONTA_CORRENTE');
    expect(todos(container, 'button[aria-pressed]')).toHaveLength(0);
    expect(todos(container, 'button[aria-label^="editar "]')).toHaveLength(0);
  });

  it('categorias — oferece Banco e Espécie (caixa), nessa ordem', async () => {
    const { container } = await montarModal();
    await clicar(botaoComTexto(container, '+ Nova conta'));

    const opcoes = todos<HTMLOptionElement>(campoRotulado<HTMLSelectElement>(container, 'Categoria'), 'option');

    expect(opcoes.map((opcao) => [opcao.value, opcao.textContent])).toEqual([
      ['CONTA_CORRENTE', 'Banco'],
      ['DINHEIRO', 'Espécie (caixa)'],
    ]);
  });

  it('cancelar — volta para a lista com as abas, sem salvar nada', async () => {
    const { container, props } = await montarModal();
    await clicar(botaoComTexto(container, '+ Nova conta'));
    await digitar(campoRotulado(container, 'Nome da conta'), 'Esquecida');

    await clicar(botaoComTexto(container, 'Cancelar'));

    expect(props.onSalvarConta).not.toHaveBeenCalled();
    expect(botaoComTexto(container, 'Contas').getAttribute('aria-pressed')).toBe('true');
    expect(todos(container, 'button[aria-label^="editar "]')).toHaveLength(4);
  });

  it('salvar conta nova — entrega a conta com os padrões de uma conta recém-criada e volta para a lista', async () => {
    const { container, props } = await montarModal();
    await clicar(botaoComTexto(container, '+ Nova conta'));
    await digitar(campoRotulado(container, 'Nome da conta'), 'Reserva da obra');
    await digitar(campoRotulado(container, 'Descrição'), 'dinheiro da obra');
    await digitar(campoRotulado(container, 'Responsável'), 'Davi Lima');
    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Categoria'), 'DINHEIRO');

    await clicar(botaoComTexto(container, 'Salvar conta'));

    expect(props.onSalvarConta).toHaveBeenCalledExactlyOnceWith({
      id: `c-${CARIMBO_DE_HOJE}`,
      nome: 'Reserva da obra',
      descricao: 'dinheiro da obra',
      tipo: 'DINHEIRO',
      titularidade: 'INSTITUCIONAL',
      pessoaTitularId: null,
      responsavel: 'Davi Lima',
      saldo: 0,
      ultimoMovimento: null,
      conciliacao: 'PENDENTE',
      alerta: null,
      ativa: true,
    });
    expect(titulosDoFormulario(container)).toEqual([]);
    expect(botaoComTexto(container, '+ Nova conta')).toBeTruthy();
  });

  it('salvar conta com nome vazio — não entrega nada, não avisa e o formulário continua aberto', async () => {
    const { container, props } = await montarModal();
    await clicar(botaoComTexto(container, '+ Nova conta'));
    await digitar(campoRotulado(container, 'Descrição'), 'sem nome');

    await clicar(botaoComTexto(container, 'Salvar conta'));

    expect(props.onSalvarConta).not.toHaveBeenCalled();
    expect(titulosDoFormulario(container)).toEqual(['Nova conta']);
    expect(campoRotulado(container, 'Descrição').value).toBe('sem nome');
    expect(container.querySelector('[role="alert"], [role="status"]')).toBeNull();
  });

  it('salvar conta com nome só de espaços — também é ignorado em silêncio', async () => {
    const { container, props } = await montarModal();
    await clicar(botaoComTexto(container, '+ Nova conta'));
    await digitar(campoRotulado(container, 'Nome da conta'), '    ');

    await clicar(botaoComTexto(container, 'Salvar conta'));

    expect(props.onSalvarConta).not.toHaveBeenCalled();
    expect(botaoComTexto(container, 'Salvar conta')).toBeTruthy();
  });

  it('conta nova com o nome só de espaços — o título passa a dizer Editar, seguido dos espaços', async () => {
    const { container } = await montarModal();
    await clicar(botaoComTexto(container, '+ Nova conta'));

    await digitar(campoRotulado(container, 'Nome da conta'), '    ');

    expect(tituloDoFormulario(container)).toBe('Editar     ');
  });

  it('salvar conta com espaços nas pontas do nome — entrega o nome sem aparar', async () => {
    const { container, props } = await montarModal();
    await clicar(botaoComTexto(container, '+ Nova conta'));
    await digitar(campoRotulado(container, 'Nome da conta'), '  Cofre  ');

    await clicar(botaoComTexto(container, 'Salvar conta'));

    expect(props.onSalvarConta).toHaveBeenCalledWith(expect.objectContaining({ nome: '  Cofre  ' }));
  });

  it('editar conta — abre o formulário preenchido com o título Editar e o nome da conta', async () => {
    const { container } = await montarModal();

    await clicar(elemento(container, 'button[aria-label="editar Caixa da Chácara"]'));

    expect(titulosDoFormulario(container)).toEqual(['Editar Caixa da Chácara']);
    expect(campoRotulado(container, 'Nome da conta').value).toBe('Caixa da Chácara');
    expect(campoRotulado(container, 'Descrição').value).toBe('dinheiro em espécie');
    expect(campoRotulado(container, 'Responsável').value).toBe('Bia Lima');
    expect(campoRotulado<HTMLSelectElement>(container, 'Categoria').value).toBe('DINHEIRO');
  });

  it('editar conta — salvar entrega a conta com o mesmo id e o que o formulário não mostra preservado', async () => {
    const { container, props } = await montarModal();
    await clicar(elemento(container, 'button[aria-label="editar Conta da Carla"]'));
    await digitar(campoRotulado(container, 'Responsável'), 'Carla Nunes');

    await clicar(botaoComTexto(container, 'Salvar conta'));

    expect(props.onSalvarConta).toHaveBeenCalledExactlyOnceWith({ ...contaDeTerceiro, responsavel: 'Carla Nunes' });
  });

  it('editar conta — apagar o nome faz o título voltar a dizer Nova conta enquanto se edita', async () => {
    const { container } = await montarModal();
    await clicar(elemento(container, 'button[aria-label="editar Banco da Casa"]'));

    await digitar(campoRotulado(container, 'Nome da conta'), '');

    expect(tituloDoFormulario(container)).toBe('Nova conta');
  });

  it('editar conta — digitar um nome novo muda o título para Editar com o nome que está sendo digitado', async () => {
    const { container } = await montarModal();
    await clicar(elemento(container, 'button[aria-label="editar Banco da Casa"]'));

    await digitar(campoRotulado(container, 'Nome da conta'), 'Banco Novo');

    expect(tituloDoFormulario(container)).toBe('Editar Banco Novo');
  });

  it('editar conta com o nome apagado — salvar é ignorado em silêncio e a conta não muda', async () => {
    const { container, props } = await montarModal();
    await clicar(elemento(container, 'button[aria-label="editar Banco da Casa"]'));
    await digitar(campoRotulado(container, 'Nome da conta'), '');

    await clicar(botaoComTexto(container, 'Salvar conta'));

    expect(props.onSalvarConta).not.toHaveBeenCalled();
  });
});

describe('GerenciarContasModal: formulário de fundo', () => {
  async function abrirNovoFundo(container: HTMLElement) {
    await abrirAbaDeFundos(container);
    await clicar(botaoComTexto(container, '+ Novo fundo'));
  }

  it('novo fundo — abre o formulário vazio com os rótulos e as dicas de preenchimento', async () => {
    const { container } = await montarModal();

    await abrirNovoFundo(container);

    expect(titulosDoFormulario(container)).toEqual(['Novo fundo']);
    expect(campoRotulado(container, 'Nome do fundo').placeholder).toBe('Obra do dormitório');
    expect(campoRotulado(container, 'Nota').placeholder).toBe('meta, prazo ou destino combinado');
    expect(campoRotulado(container, 'Valor alocado (R$)').placeholder).toBe('0,00');
    expect(campoRotulado(container, 'Valor alocado (R$)').value).toBe('');
    expect(todos(container, 'button[aria-pressed]')).toHaveLength(0);
  });

  it('salvar fundo novo — entrega o fundo com os padrões de um fundo recém-criado e volta para a lista', async () => {
    const { container, props } = await montarModal();
    await abrirNovoFundo(container);
    await digitar(campoRotulado(container, 'Nome do fundo'), 'Reforma da cozinha');
    await digitar(campoRotulado(container, 'Nota'), 'até dezembro');
    await digitar(campoRotulado(container, 'Valor alocado (R$)'), '1.500,00');

    await clicar(botaoComTexto(container, 'Salvar fundo'));

    expect(props.onSalvarFundo).toHaveBeenCalledExactlyOnceWith({
      id: `f-${CARIMBO_DE_HOJE}`,
      codigoSistema: '',
      nome: 'Reforma da cozinha',
      nota: 'até dezembro',
      contaVinculadaId: 'cora',
      valorReservado: 150000,
      meta: null,
      ativo: true,
    });
    expect(titulosDoFormulario(container)).toEqual([]);
    expect(botaoComTexto(container, 'Fundos').getAttribute('aria-pressed')).toBe('true');
  });

  it.each([
    { digitado: '1.500,00', centavos: 150000 },
    { digitado: '1500', centavos: 150000 },
    { digitado: '1500,5', centavos: 150050 },
    { digitado: '0,99', centavos: 99 },
    { digitado: '1.234.567,89', centavos: 123456789 },
    { digitado: '', centavos: 0 },
    { digitado: 'abc', centavos: 0 },
    { digitado: 'R$ 10', centavos: 0 },
    { digitado: '12abc', centavos: 1200 },
    { digitado: '1.5', centavos: 1500 },
    { digitado: '1,5,5', centavos: 150 },
    { digitado: '-5', centavos: -500 },
  ])('valor digitado "$digitado" — o fundo é salvo com $centavos centavos', async ({ digitado, centavos }) => {
    const { container, props } = await montarModal();
    await abrirNovoFundo(container);
    await digitar(campoRotulado(container, 'Nome do fundo'), 'Qualquer');
    await digitar(campoRotulado(container, 'Valor alocado (R$)'), digitado);

    await clicar(botaoComTexto(container, 'Salvar fundo'));

    expect(props.onSalvarFundo).toHaveBeenCalledWith(expect.objectContaining({ valorReservado: centavos }));
  });

  it('salvar fundo com nome vazio — não entrega nada, não avisa e o formulário continua aberto', async () => {
    const { container, props } = await montarModal();
    await abrirNovoFundo(container);
    await digitar(campoRotulado(container, 'Valor alocado (R$)'), '100,00');

    await clicar(botaoComTexto(container, 'Salvar fundo'));

    expect(props.onSalvarFundo).not.toHaveBeenCalled();
    expect(titulosDoFormulario(container)).toEqual(['Novo fundo']);
    expect(campoRotulado(container, 'Valor alocado (R$)').value).toBe('100,00');
  });

  it('salvar fundo com nome só de espaços — também é ignorado em silêncio', async () => {
    const { container, props } = await montarModal();
    await abrirNovoFundo(container);
    await digitar(campoRotulado(container, 'Nome do fundo'), '   ');

    await clicar(botaoComTexto(container, 'Salvar fundo'));

    expect(props.onSalvarFundo).not.toHaveBeenCalled();
  });

  it('cancelar — volta para a lista de fundos sem salvar nada', async () => {
    const { container, props } = await montarModal();
    await abrirNovoFundo(container);
    await digitar(campoRotulado(container, 'Nome do fundo'), 'Esquecido');

    await clicar(botaoComTexto(container, 'Cancelar'));

    expect(props.onSalvarFundo).not.toHaveBeenCalled();
    expect(todos(container, 'button[aria-label^="editar "]')).toHaveLength(2);
  });

  it('editar fundo — abre preenchido, com o valor reservado já formatado como texto', async () => {
    const { container } = await montarModal();
    await abrirAbaDeFundos(container);

    await clicar(elemento(container, 'button[aria-label="editar Obra do dormitório"]'));

    expect(titulosDoFormulario(container)).toEqual(['Editar Obra do dormitório']);
    expect(campoRotulado(container, 'Nome do fundo').value).toBe('Obra do dormitório');
    expect(campoRotulado(container, 'Nota').value).toBe('meta 24.000,00');
    expect(campoRotulado(container, 'Valor alocado (R$)').value).toBe('18.400,00');
  });

  it('editar fundo e salvar sem mexer — devolve o mesmo fundo, com o valor lido de volta igual', async () => {
    const { container, props } = await montarModal();
    await abrirAbaDeFundos(container);
    await clicar(elemento(container, 'button[aria-label="editar Obra do dormitório"]'));

    await clicar(botaoComTexto(container, 'Salvar fundo'));

    expect(props.onSalvarFundo).toHaveBeenCalledExactlyOnceWith(fundoDaObra);
  });

  it('editar fundo — mudar só o nome mantém o valor, a meta, o código e a conta vinculada', async () => {
    const { container, props } = await montarModal();
    await abrirAbaDeFundos(container);
    await clicar(elemento(container, 'button[aria-label="editar Feitio de dezembro"]'));
    await digitar(campoRotulado(container, 'Nome do fundo'), 'Feitio de janeiro');

    await clicar(botaoComTexto(container, 'Salvar fundo'));

    expect(props.onSalvarFundo).toHaveBeenCalledExactlyOnceWith({ ...fundoDoFeitio, nome: 'Feitio de janeiro' });
  });

  it('editar fundo — apagar o nome faz o título voltar a dizer Novo fundo enquanto se edita', async () => {
    const { container } = await montarModal();
    await abrirAbaDeFundos(container);
    await clicar(elemento(container, 'button[aria-label="editar Obra do dormitório"]'));

    await digitar(campoRotulado(container, 'Nome do fundo'), '');

    expect(tituloDoFormulario(container)).toBe('Novo fundo');
  });

  it('valor alocado — o campo aceita qualquer texto e mostra exatamente o que foi digitado', async () => {
    const { container } = await montarModal();
    await abrirNovoFundo(container);

    await digitar(campoRotulado(container, 'Valor alocado (R$)'), 'abc 1.5');

    expect(campoRotulado(container, 'Valor alocado (R$)').value).toBe('abc 1.5');
  });
});
