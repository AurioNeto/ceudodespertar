import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Emprestimo } from '@cdd/contracts';
import { botaoComTexto, clicar, desmontarTudo, digitar, elemento, escolherOpcao, montar, todos } from '@/testes/montagem';
import { EmprestimosPage } from './EmprestimosPage';

const cenario = vi.hoisted(() => ({ emprestimos: undefined as readonly Emprestimo[] | undefined }));

vi.mock('@/mocks/emprestimos', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('@/mocks/emprestimos')>();
  return {
    ...original,
    get emprestimos() {
      return cenario.emprestimos ?? original.emprestimos;
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
  cenario.emprestimos = undefined;
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

const mensagemDoCampo = (campo: HTMLElement) => {
  const alvo = campo.getAttribute('aria-describedby');
  return alvo ? (campo.ownerDocument.getElementById(alvo)?.textContent ?? null) : null;
};

const linhasDaLista = (container: HTMLElement) =>
  todos<HTMLButtonElement>(container, 'button').filter((botao) => botao.querySelector('[role="img"]'));

const textosDasLinhas = (container: HTMLElement) => linhasDaLista(container).map(textosDasFolhas);

const linhaAtiva = (container: HTMLElement) =>
  linhasDaLista(container)
    .filter((linha) => linha.getAttribute('aria-current') === 'true')
    .map((linha) => textosDasFolhas(linha)[0]);

const abrirEmprestimo = (container: HTMLElement, contraparte: string) => {
  const linha = linhasDaLista(container).find((candidata) => textosDasFolhas(candidata)[0] === contraparte);
  if (!linha) throw new Error(`empréstimo não encontrado: ${contraparte}`);
  return clicar(linha);
};

const escolherFiltro = (container: HTMLElement, rotulo: string) => clicar(botaoComTexto(container, rotulo));

const filtrosMarcados = (container: HTMLElement) =>
  ['Todos', 'Concedidos', 'Recebidos', 'Quitados'].filter(
    (rotulo) => botaoComTexto(container, rotulo).getAttribute('aria-pressed') === 'true',
  );

const recadoMostrado = (container: HTMLElement) => {
  const faixa = container.querySelector('[role="status"]');
  return faixa ? (textosDasFolhas(faixa)[0] ?? null) : null;
};

const textosDosBotoes = (container: HTMLElement) => todos(container, 'button').map((botao) => botao.textContent?.trim());

const numerosDoDetalhe = (container: HTMLElement) => {
  const principal = folhasComTexto(container, 'Principal')[0];
  const grade = principal?.parentElement?.parentElement;
  if (!grade) throw new Error('detalhe não encontrado');
  return textosDasFolhas(grade);
};

const elementosDoCartaoDoDetalhe = (container: HTMLElement) => {
  const principal = folhasComTexto(container, 'Principal')[0];
  const cartao = principal?.parentElement?.parentElement?.parentElement;
  if (!cartao) throw new Error('detalhe não encontrado');
  return Array.from(cartao.children);
};

const linhasDeDevolucoes = (container: HTMLElement) =>
  todos<HTMLTableRowElement>(container, 'tbody tr').map(textosDasFolhas);

const tituloDoDetalhe = (container: HTMLElement) => {
  const principal = folhasComTexto(container, 'Principal')[0];
  const cartao = principal?.parentElement?.parentElement?.parentElement;
  return cartao ? textosDasFolhas(cartao)[0] : undefined;
};

const abrirFormularioDeDevolucao = (container: HTMLElement) => clicar(botaoComTexto(container, 'Registrar devolução'));

async function devolver(container: HTMLElement, valor: string) {
  await abrirFormularioDeDevolucao(container);
  await digitar(campoPeloRotulo(container, 'Valor'), valor);
  await clicar(botaoComTexto(container, 'Registrar devolução'));
}

async function abrirNovoEmprestimo(container: HTMLElement) {
  await clicar(botaoComTexto(container, 'Novo empréstimo'));
}

async function registrarNovoEmprestimo(container: HTMLElement, valor: string, motivo: string) {
  await abrirNovoEmprestimo(container);
  await digitar(campoPeloRotulo(container, 'Valor'), valor);
  await digitar(campoPeloRotulo(container, 'Motivo'), motivo);
  await clicar(botaoComTexto(container, 'Registrar empréstimo'));
}

describe('EmprestimosPage em escritório: cabeçalho e resumo', () => {
  it('cabeçalho — mostra o código com o nome da tela, o título e o subtítulo', async () => {
    const { container } = await montar(<EmprestimosPage />);

    expect(textosDasFolhas(elemento(container, 'header'))).toEqual([
      'F-10 · Empréstimos',
      'Empréstimos',
      'Movimentação patrimonial: não é receita nem despesa · CDD',
    ]);
    expect(textosDosBotoes(container)).toContain('Novo empréstimo');
  });

  it('a receber — soma o saldo dos empréstimos concedidos que ainda não voltaram por inteiro', async () => {
    const { container } = await montar(<EmprestimosPage />);

    expect(blocoDoRotulo(container, 'A receber')).toEqual([
      'A receber',
      '5.437,60',
      'emprestado e ainda não devolvido',
    ]);
  });

  it('a devolver — soma o saldo dos empréstimos que a casa tomou e ainda deve', async () => {
    const { container } = await montar(<EmprestimosPage />);

    expect(blocoDoRotulo(container, 'A devolver')).toEqual(['A devolver', '1.500,00', 'a casa tomou e ainda deve']);
  });

  it('quitados — conta os empréstimos quitados e nomeia as contrapartes', async () => {
    const { container } = await montar(<EmprestimosPage />);

    expect(blocoDoRotulo(container, 'Quitados')).toEqual(['Quitados', '1', 'Zé Ferreira']);
  });

  it('filtros — mostram Todos, Concedidos, Recebidos e Quitados, com Todos marcado de início', async () => {
    const { container } = await montar(<EmprestimosPage />);

    expect(filtrosMarcados(container)).toEqual(['Todos']);
  });
});

describe('EmprestimosPage em escritório: lista e detalhe', () => {
  it('lista — mostra cada empréstimo com contraparte, o que falta voltar e o rótulo da direção', async () => {
    const { container } = await montar(<EmprestimosPage />);

    expect(textosDasLinhas(container)).toEqual([
      ['Érico Santana', '5.437,60', 'a receber'],
      ['Marta Neto', '1.500,00', 'a devolver'],
      ['Zé Ferreira', 'Quitado', '4.800,00', 'devolvido por inteiro'],
    ]);
  });

  it.each([
    { contraparte: 'Érico Santana', porcentagem: '9% do total' },
    { contraparte: 'Marta Neto', porcentagem: '50% do total' },
    { contraparte: 'Zé Ferreira', porcentagem: '100% do total' },
  ])('barra de $contraparte — diz $porcentagem do principal já voltou', async ({ contraparte, porcentagem }) => {
    const { container } = await montar(<EmprestimosPage />);

    const linha = linhasDaLista(container).find((candidata) => textosDasFolhas(candidata)[0] === contraparte);

    expect(elemento(linha as HTMLElement, '[role="img"]').getAttribute('aria-label')).toBe(porcentagem);
  });

  it.each([
    { contraparte: 'Érico Santana', glifo: 'arrow-up-right', cor: 'var(--color-royal)' },
    { contraparte: 'Marta Neto', glifo: 'arrow-down-left', cor: 'var(--color-pending)' },
  ])('ícone de $contraparte — é $glifo na cor $cor', async ({ contraparte, glifo, cor }) => {
    const { container } = await montar(<EmprestimosPage />);

    const linha = linhasDaLista(container).find((candidata) => textosDasFolhas(candidata)[0] === contraparte);
    const icone = elemento(linha as HTMLElement, 'svg');

    expect(icone.classList.contains(`lucide-${glifo}`)).toBe(true);
    expect(icone.getAttribute('stroke')).toBe(cor);
  });

  it('abre no primeiro empréstimo da lista, marcado como atual', async () => {
    const { container } = await montar(<EmprestimosPage />);

    expect(linhaAtiva(container)).toEqual(['Érico Santana']);
    expect(tituloDoDetalhe(container)).toBe('Érico Santana');
  });

  it('detalhe de um empréstimo concedido — mostra o selo, a frase, os números e a observação', async () => {
    const { container } = await montar(<EmprestimosPage />);

    expect(folhasComTexto(container, 'Concedido')).toHaveLength(1);
    expect(
      folhasComTexto(container, 'A casa emprestou em 04/05/2026 · apoio em despesa médica da família'),
    ).toHaveLength(1);
    expect(numerosDoDetalhe(container)).toEqual([
      'Principal',
      '6.000,00',
      'Já devolvido',
      '562,40',
      'A receber',
      '5.437,60',
      'Conta de origem',
      'Cora PJ',
    ]);
    expect(
      folhasComTexto(container, 'Devolução combinada sem prazo fechado, conforme a condição dele.'),
    ).toHaveLength(1);
  });

  it.each([
    { contraparte: 'Érico Santana', rotulo: 'Concedido', cor: 'var(--color-royal-ink)' },
    { contraparte: 'Marta Neto', rotulo: 'Recebido', cor: 'var(--color-pending)' },
  ])('selo de $contraparte no detalhe — diz $rotulo no tom $cor', async ({ contraparte, rotulo, cor }) => {
    const { container } = await montar(<EmprestimosPage />);
    await abrirEmprestimo(container, contraparte);

    expect((folhasComTexto(container, rotulo)[0] as HTMLElement).style.color).toBe(cor);
  });

  it('detalhe sem observação — não reserva um espaço vazio para ela no cartão', async () => {
    const { container } = await montar(<EmprestimosPage />);
    const filhosComObservacao = elementosDoCartaoDoDetalhe(container).length;

    await abrirEmprestimo(container, 'Zé Ferreira');

    expect(elementosDoCartaoDoDetalhe(container)).toHaveLength(filhosComObservacao - 1);
  });

  it('detalhe de um empréstimo recebido — troca o selo, o verbo e o rótulo do saldo', async () => {
    const { container } = await montar(<EmprestimosPage />);

    await abrirEmprestimo(container, 'Marta Neto');

    expect(folhasComTexto(container, 'Recebido')).toHaveLength(1);
    expect(
      folhasComTexto(container, 'A casa tomou em 22/06/2026 · cobrir o material da obra do dormitório'),
    ).toHaveLength(1);
    expect(numerosDoDetalhe(container)).toEqual([
      'Principal',
      '3.000,00',
      'Já devolvido',
      '1.500,00',
      'A devolver',
      '1.500,00',
      'Conta de origem',
      'Cora PJ',
    ]);
  });

  it('detalhe de um empréstimo quitado — saldo zerado, sem observação e com o aviso de quitado no lugar da ação', async () => {
    const { container } = await montar(<EmprestimosPage />);

    await abrirEmprestimo(container, 'Zé Ferreira');

    expect(numerosDoDetalhe(container).slice(0, 6)).toEqual([
      'Principal',
      '4.800,00',
      'Já devolvido',
      '4.800,00',
      'A receber',
      '0,00',
    ]);
    expect(container.textContent).toContain('Quitado. A soma das devoluções fechou com o principal.');
    expect(textosDosBotoes(container)).not.toContain('Registrar devolução');
  });

  it('explicação — diz que emprestar e devolver não mexem no resultado do mês', async () => {
    const { container } = await montar(<EmprestimosPage />);

    expect(folhasComTexto(container, 'Emprestar e devolver não mexem no resultado do mês')).toHaveLength(1);
  });

  it('devoluções — a tabela mostra data, conta, quem registrou e valor, com a contagem embaixo', async () => {
    const { container } = await montar(<EmprestimosPage />);

    expect(todos(container, 'th').map((cabecalho) => cabecalho.textContent)).toEqual([
      'Data',
      'Conta',
      'Quem registrou',
      'Valor',
    ]);
    expect(linhasDeDevolucoes(container)).toEqual([['18/08/2026', 'Cora PJ', 'Aurio Neto', '562,40']]);
    expect(folhasComTexto(container, '1 devolução · a soma nunca passa do principal.')).toHaveLength(1);
  });

  it('devoluções de um empréstimo com duas parcelas — lista as duas, na ordem, e conta no plural', async () => {
    const { container } = await montar(<EmprestimosPage />);

    await abrirEmprestimo(container, 'Zé Ferreira');

    expect(linhasDeDevolucoes(container)).toEqual([
      ['15/05/2026', 'Cora PJ', 'Aurio Neto', '2.400,00'],
      ['20/07/2026', 'Espécie', 'Chico Aguiar', '2.400,00'],
    ]);
    expect(folhasComTexto(container, '2 devoluções · a soma nunca passa do principal.')).toHaveLength(1);
  });

  it('ação — oferece Registrar devolução com o saldo e a explicação de que grava uma transferência', async () => {
    const { container } = await montar(<EmprestimosPage />);

    expect(textosDosBotoes(container)).toContain('Registrar devolução');
    expect(folhasComTexto(container, 'Saldo de 5.437,60 · grava uma transferência.')).toHaveLength(1);
  });

  it('escolher outro empréstimo — marca a linha e troca o detalhe', async () => {
    const { container } = await montar(<EmprestimosPage />);

    await abrirEmprestimo(container, 'Marta Neto');

    expect(linhaAtiva(container)).toEqual(['Marta Neto']);
    expect(tituloDoDetalhe(container)).toBe('Marta Neto');
  });
});

describe('EmprestimosPage: filtros', () => {
  it.each([
    { filtro: 'Concedidos', contrapartes: ['Érico Santana'] },
    { filtro: 'Recebidos', contrapartes: ['Marta Neto'] },
    { filtro: 'Quitados', contrapartes: ['Zé Ferreira'] },
    { filtro: 'Todos', contrapartes: ['Érico Santana', 'Marta Neto', 'Zé Ferreira'] },
  ])('filtro $filtro — mostra $contrapartes', async ({ filtro, contrapartes }) => {
    const { container } = await montar(<EmprestimosPage />);
    await escolherFiltro(container, 'Quitados');

    await escolherFiltro(container, filtro);

    expect(linhasDaLista(container).map((linha) => textosDasFolhas(linha)[0])).toEqual(contrapartes);
    expect(filtrosMarcados(container)).toEqual([filtro]);
  });

  it('filtro cujo recorte não traz o empréstimo aberto — abre o primeiro do recorte', async () => {
    const { container } = await montar(<EmprestimosPage />);

    await escolherFiltro(container, 'Recebidos');

    expect(linhaAtiva(container)).toEqual(['Marta Neto']);
    expect(tituloDoDetalhe(container)).toBe('Marta Neto');
  });

  it('empréstimo concedido quitado — some do filtro Concedidos e fica só em Todos e Quitados', async () => {
    const { container } = await montar(<EmprestimosPage />);

    await escolherFiltro(container, 'Concedidos');

    expect(textosDasLinhas(container).map((linha) => linha[0])).not.toContain('Zé Ferreira');
  });

  it('trocar de filtro com o formulário de devolução aberto — fecha o formulário', async () => {
    const { container } = await montar(<EmprestimosPage />);
    await abrirFormularioDeDevolucao(container);

    await escolherFiltro(container, 'Concedidos');

    expect(textosDosBotoes(container)).not.toContain('Cancelar');
    expect(folhasComTexto(container, 'Registrar o que voltou')).toHaveLength(0);
  });
});

describe('EmprestimosPage: registrar devolução', () => {
  it('formulário de um empréstimo concedido — pergunta o que voltou, com saldo na dica e conta de entrada', async () => {
    const { container } = await montar(<EmprestimosPage />);

    await abrirFormularioDeDevolucao(container);

    expect(folhasComTexto(container, 'Registrar o que voltou')).toHaveLength(1);
    expect(campoPeloRotulo(container, 'Valor').placeholder).toBe('0,00');
    expect(mensagemDoCampo(campoPeloRotulo(container, 'Valor'))).toBe('saldo de 5.437,60');
    expect(campoPeloRotulo(container, 'Data').value).toBe('2026-09-02');
    expect(campoPeloRotulo<HTMLSelectElement>(container, 'Conta de entrada').value).toBe('cora');
    expect(textosDosBotoes(container)).toEqual(expect.arrayContaining(['Registrar devolução', 'Cancelar']));
  });

  it('formulário de um empréstimo recebido — pergunta o que a casa devolveu, com conta de saída', async () => {
    const { container } = await montar(<EmprestimosPage />);
    await abrirEmprestimo(container, 'Marta Neto');

    await abrirFormularioDeDevolucao(container);

    expect(folhasComTexto(container, 'Registrar o que a casa devolveu')).toHaveLength(1);
    expect(campoPeloRotulo<HTMLSelectElement>(container, 'Conta de saída').value).toBe('cora');
    expect(mensagemDoCampo(campoPeloRotulo(container, 'Valor'))).toBe('saldo de 1.500,00');
  });

  it('botão sem valor — fica bloqueado, sem motivo escrito', async () => {
    const { container } = await montar(<EmprestimosPage />);

    await abrirFormularioDeDevolucao(container);

    const botao = botaoComTexto(container, 'Registrar devolução');
    expect(botao.disabled).toBe(true);
    expect(botao.title).toBe('');
  });

  it('valor que passa do saldo — mostra o erro no campo e bloqueia o botão com o motivo', async () => {
    const { container } = await montar(<EmprestimosPage />);
    await abrirFormularioDeDevolucao(container);

    await digitar(campoPeloRotulo(container, 'Valor'), '5437,61');

    const campo = campoPeloRotulo(container, 'Valor');
    expect(campo.getAttribute('aria-invalid')).toBe('true');
    expect(mensagemDoCampo(campo)).toBe('Passa do saldo de 5.437,60.');
    expect(botaoComTexto(container, 'Registrar devolução').disabled).toBe(true);
    expect(folhasComTexto(container, 'A soma das devoluções não pode passar do principal emprestado.')).toHaveLength(1);
  });

  it('valor igual ao saldo — é aceito, sem erro', async () => {
    const { container } = await montar(<EmprestimosPage />);
    await abrirFormularioDeDevolucao(container);

    await digitar(campoPeloRotulo(container, 'Valor'), '5437,60');

    expect(campoPeloRotulo(container, 'Valor').getAttribute('aria-invalid')).toBeNull();
    expect(botaoComTexto(container, 'Registrar devolução').disabled).toBe(false);
  });

  it.each([
    { digitado: '0', motivo: 'Informe um valor maior que zero.' },
    { digitado: '-5', motivo: 'Informe um valor maior que zero.' },
    { digitado: 'abc', motivo: 'Informe um valor maior que zero.' },
    { digitado: '1.500,00', motivo: 'Informe um valor maior que zero.' },
  ])('valor digitado "$digitado" — o botão fica bloqueado e diz: $motivo', async ({ digitado, motivo }) => {
    const { container } = await montar(<EmprestimosPage />);
    await abrirFormularioDeDevolucao(container);

    await digitar(campoPeloRotulo(container, 'Valor'), digitado);

    expect(botaoComTexto(container, 'Registrar devolução').disabled).toBe(true);
    expect(folhasComTexto(container, motivo)).toHaveLength(1);
    expect(mensagemDoCampo(campoPeloRotulo(container, 'Valor'))).toBe('saldo de 5.437,60');
  });

  it.each([
    { digitado: '100', restam: '5.337,60' },
    { digitado: '100,5', restam: '5.337,10' },
    { digitado: '100.5', restam: '5.337,10' },
    { digitado: '1.500', restam: '5.436,10' },
    { digitado: '1e3', restam: '4.437,60' },
  ])('valor digitado "$digitado" — a devolução é aceita e restam $restam', async ({ digitado, restam }) => {
    const { container } = await montar(<EmprestimosPage />);

    await devolver(container, digitado);

    expect(recadoMostrado(container)).toBe(`Devolução registrada como transferência. Restam ${restam}.`);
  });

  it('devolução parcial — soma a linha na tabela, atualiza o saldo e o resumo e fecha o formulário', async () => {
    const { container } = await montar(<EmprestimosPage />);

    await devolver(container, '1000');

    expect(recadoMostrado(container)).toBe('Devolução registrada como transferência. Restam 4.437,60.');
    expect(linhasDeDevolucoes(container)).toEqual([
      ['18/08/2026', 'Cora PJ', 'Aurio Neto', '562,40'],
      ['02/09/2026', 'Cora PJ', 'Aurio Neto', '1.000,00'],
    ]);
    expect(numerosDoDetalhe(container).slice(2, 6)).toEqual(['Já devolvido', '1.562,40', 'A receber', '4.437,60']);
    expect(blocoDoRotulo(container, 'A receber')[1]).toBe('4.437,60');
    expect(textosDasLinhas(container)[0]).toEqual(['Érico Santana', '4.437,60', 'a receber']);
    expect(folhasComTexto(container, '2 devoluções · a soma nunca passa do principal.')).toHaveLength(1);
    expect(folhasComTexto(container, 'Registrar o que voltou')).toHaveLength(0);
  });

  it('devolução de todo o saldo — quita o empréstimo, com o recado de quitado e sem ação', async () => {
    const { container } = await montar(<EmprestimosPage />);

    await devolver(container, '5437,60');

    expect(recadoMostrado(container)).toBe(
      'Devolução registrada e empréstimo quitado. A transferência entrou; nenhum lançamento de receita foi criado.',
    );
    expect(container.textContent).toContain('Quitado. A soma das devoluções fechou com o principal.');
    expect(textosDosBotoes(container)).not.toContain('Registrar devolução');
    expect(textosDasLinhas(container)[0]).toEqual(['Érico Santana', 'Quitado', '6.000,00', 'devolvido por inteiro']);
    expect(blocoDoRotulo(container, 'Quitados')).toEqual(['Quitados', '2', 'Érico Santana · Zé Ferreira']);
    expect(blocoDoRotulo(container, 'A receber')[1]).toBe('0,00');
  });

  it('devolução com outra conta e outra data — a linha da tabela traz a conta e a data escolhidas', async () => {
    const { container } = await montar(<EmprestimosPage />);
    await abrirFormularioDeDevolucao(container);
    await digitar(campoPeloRotulo(container, 'Valor'), '200');
    await digitar(campoPeloRotulo(container, 'Data'), '2026-09-15');
    await escolherOpcao(campoPeloRotulo<HTMLSelectElement>(container, 'Conta de entrada'), 'especie');

    await clicar(botaoComTexto(container, 'Registrar devolução'));

    expect(linhasDeDevolucoes(container).at(-1)).toEqual(['15/09/2026', 'Espécie', 'Aurio Neto', '200,00']);
  });

  it('devolução com a data apagada — é aceita e a tabela mostra 01/01/1900', async () => {
    const { container } = await montar(<EmprestimosPage />);
    await abrirFormularioDeDevolucao(container);
    await digitar(campoPeloRotulo(container, 'Valor'), '200');
    await digitar(campoPeloRotulo(container, 'Data'), '');

    await clicar(botaoComTexto(container, 'Registrar devolução'));

    expect(linhasDeDevolucoes(container).at(-1)?.[0]).toBe('01/01/1900');
  });

  it('devolução de um empréstimo recebido — atualiza o A devolver e o saldo da linha', async () => {
    const { container } = await montar(<EmprestimosPage />);
    await abrirEmprestimo(container, 'Marta Neto');

    await devolver(container, '500');

    expect(blocoDoRotulo(container, 'A devolver')[1]).toBe('1.000,00');
    expect(textosDasLinhas(container)[1]).toEqual(['Marta Neto', '1.000,00', 'a devolver']);
  });

  it('Cancelar — fecha o formulário e esquece o valor digitado', async () => {
    const { container } = await montar(<EmprestimosPage />);
    await abrirFormularioDeDevolucao(container);
    await digitar(campoPeloRotulo(container, 'Valor'), '300');

    await clicar(botaoComTexto(container, 'Cancelar'));
    await abrirFormularioDeDevolucao(container);

    expect(campoPeloRotulo(container, 'Valor').value).toBe('');
    expect(linhasDeDevolucoes(container)).toHaveLength(1);
  });

  it('valor digitado e empréstimo trocado — o formulário fecha, mas o valor vaza para o empréstimo seguinte', async () => {
    const { container } = await montar(<EmprestimosPage />);
    await abrirFormularioDeDevolucao(container);
    await digitar(campoPeloRotulo(container, 'Valor'), '2000');

    await abrirEmprestimo(container, 'Marta Neto');
    await abrirFormularioDeDevolucao(container);

    expect(campoPeloRotulo(container, 'Valor').value).toBe('2000');
    expect(mensagemDoCampo(campoPeloRotulo(container, 'Valor'))).toBe('Passa do saldo de 1.500,00.');
  });

  it('escolher outro empréstimo — fecha o formulário e limpa o recado', async () => {
    const { container } = await montar(<EmprestimosPage />);
    await devolver(container, '100');
    expect(recadoMostrado(container)).not.toBeNull();

    await abrirEmprestimo(container, 'Marta Neto');

    expect(recadoMostrado(container)).toBeNull();
  });

  it('recado — o botão de fechar tira o recado da tela', async () => {
    const { container } = await montar(<EmprestimosPage />);
    await devolver(container, '100');

    await clicar(elemento(container, 'button[aria-label="fechar recado"]'));

    expect(recadoMostrado(container)).toBeNull();
  });

  it('quitar o último empréstimo de uma direção — o filtro dessa direção fica vazio, e o quitado só aparece em Quitados', async () => {
    const { container } = await montar(<EmprestimosPage />);
    await abrirEmprestimo(container, 'Marta Neto');
    await devolver(container, '1500');

    await escolherFiltro(container, 'Recebidos');

    expect(folhasComTexto(container, 'Nenhum empréstimo neste recorte')).toHaveLength(1);
    expect(folhasComTexto(container, 'Troque o filtro acima, ou registre o primeiro empréstimo desta direção.')).toHaveLength(1);
    expect(linhasDaLista(container)).toHaveLength(0);
    expect(todos(container, 'table')).toHaveLength(0);
  });
});

describe('EmprestimosPage: novo empréstimo', () => {
  it('Novo empréstimo — abre o formulário de concedido, com os rótulos, as dicas e o botão bloqueado', async () => {
    const { container } = await montar(<EmprestimosPage />);

    await abrirNovoEmprestimo(container);

    expect(botaoComTexto(container, 'A casa empresta').getAttribute('aria-pressed')).toBe('true');
    expect(botaoComTexto(container, 'A casa toma emprestado').getAttribute('aria-pressed')).toBe('false');
    expect(campoPeloRotulo<HTMLSelectElement>(container, 'Para quem').value).toBe('p-erico');
    expect(campoPeloRotulo<HTMLSelectElement>(container, 'Conta de saída').value).toBe('cora');
    expect(campoPeloRotulo(container, 'Data').value).toBe('2026-09-02');
    expect(campoPeloRotulo(container, 'Motivo').placeholder).toBe('por que a casa emprestou, em uma linha');
    expect(folhasComTexto(container, 'quem não estiver na lista precisa de cadastro em Pessoas')).toHaveLength(1);
    expect(folhasComTexto(container, 'Grava uma transferência de saída. Não entra como despesa no mês.')).toHaveLength(1);
    expect(botaoComTexto(container, 'Registrar empréstimo').disabled).toBe(true);
    expect(folhasComTexto(container, 'Informe um valor maior que zero e o motivo.')).toHaveLength(1);
  });

  it('contrapartes — oferece as cinco pessoas cadastradas, na ordem', async () => {
    const { container } = await montar(<EmprestimosPage />);
    await abrirNovoEmprestimo(container);

    const opcoes = todos<HTMLOptionElement>(campoPeloRotulo<HTMLSelectElement>(container, 'Para quem'), 'option');

    expect(opcoes.map((opcao) => opcao.textContent)).toEqual([
      'Érico Santana',
      'Marta Neto',
      'Zé Ferreira',
      'Lucia Prado',
      'Chico Aguiar',
    ]);
  });

  it('A casa toma emprestado — troca os rótulos e a explicação, sem mexer na contraparte escolhida', async () => {
    const { container } = await montar(<EmprestimosPage />);
    await abrirNovoEmprestimo(container);
    await escolherOpcao(campoPeloRotulo<HTMLSelectElement>(container, 'Para quem'), 'p-lucia');

    await clicar(botaoComTexto(container, 'A casa toma emprestado'));

    expect(campoPeloRotulo<HTMLSelectElement>(container, 'De quem').value).toBe('p-lucia');
    expect(campoPeloRotulo<HTMLSelectElement>(container, 'Conta de entrada').value).toBe('cora');
    expect(folhasComTexto(container, 'Grava uma transferência de entrada. Não entra como receita no mês.')).toHaveLength(1);
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
  ])('valor "$digitado" com motivo preenchido — o botão habilitado é $habilitado', async ({ digitado, habilitado }) => {
    const { container } = await montar(<EmprestimosPage />);
    await abrirNovoEmprestimo(container);
    await digitar(campoPeloRotulo(container, 'Motivo'), 'compra de material');

    await digitar(campoPeloRotulo(container, 'Valor'), digitado);

    expect(botaoComTexto(container, 'Registrar empréstimo').disabled).toBe(!habilitado);
  });

  it('motivo só de espaços — o botão continua bloqueado mesmo com valor', async () => {
    const { container } = await montar(<EmprestimosPage />);
    await abrirNovoEmprestimo(container);
    await digitar(campoPeloRotulo(container, 'Valor'), '100');

    await digitar(campoPeloRotulo(container, 'Motivo'), '    ');

    expect(botaoComTexto(container, 'Registrar empréstimo').disabled).toBe(true);
  });

  it('registrar um empréstimo concedido — entra no topo da lista, abre no detalhe e atualiza o A receber', async () => {
    const { container } = await montar(<EmprestimosPage />);
    await abrirNovoEmprestimo(container);
    await escolherOpcao(campoPeloRotulo<HTMLSelectElement>(container, 'Para quem'), 'p-lucia');
    await escolherOpcao(campoPeloRotulo<HTMLSelectElement>(container, 'Conta de saída'), 'especie');
    await digitar(campoPeloRotulo(container, 'Valor'), '2000');
    await digitar(campoPeloRotulo(container, 'Data'), '2026-09-10');
    await digitar(campoPeloRotulo(container, 'Motivo'), '  compra de material  ');

    await clicar(botaoComTexto(container, 'Registrar empréstimo'));

    expect(textosDasLinhas(container)[0]).toEqual(['Lucia Prado', '2.000,00', 'a receber']);
    expect(linhaAtiva(container)).toEqual(['Lucia Prado']);
    expect(folhasComTexto(container, 'A casa emprestou em 10/09/2026 · compra de material')).toHaveLength(1);
    expect(numerosDoDetalhe(container)).toEqual([
      'Principal',
      '2.000,00',
      'Já devolvido',
      '0,00',
      'A receber',
      '2.000,00',
      'Conta de origem',
      'Espécie',
    ]);
    expect(blocoDoRotulo(container, 'A receber')[1]).toBe('7.437,60');
    expect(recadoMostrado(container)).toBe(
      'Empréstimo registrado. A saída de 2.000,00 é transferência para Lucia Prado, não despesa.',
    );
  });

  it('registrar um empréstimo recebido — soma no A devolver e o recado fala de entrada, não de receita', async () => {
    const { container } = await montar(<EmprestimosPage />);
    await abrirNovoEmprestimo(container);
    await clicar(botaoComTexto(container, 'A casa toma emprestado'));
    await escolherOpcao(campoPeloRotulo<HTMLSelectElement>(container, 'De quem'), 'p-chico');
    await digitar(campoPeloRotulo(container, 'Valor'), '750,25');
    await digitar(campoPeloRotulo(container, 'Motivo'), 'cobrir o gás');

    await clicar(botaoComTexto(container, 'Registrar empréstimo'));

    expect(textosDasLinhas(container)[0]).toEqual(['Chico Aguiar', '750,25', 'a devolver']);
    expect(folhasComTexto(container, 'Recebido')).toHaveLength(1);
    expect(blocoDoRotulo(container, 'A devolver')[1]).toBe('2.250,25');
    expect(recadoMostrado(container)).toBe(
      'Empréstimo registrado. A entrada de 750,25 é transferência de Chico Aguiar, não receita.',
    );
  });

  it('empréstimo novo — não tem devolução: mostra o estado vazio da tabela e a contagem zerada', async () => {
    const { container } = await montar(<EmprestimosPage />);

    await registrarNovoEmprestimo(container, '300', 'adiantar a feira');

    expect(folhasComTexto(container, 'Nenhuma devolução ainda')).toHaveLength(1);
    expect(folhasComTexto(container, 'Cada devolução entra aqui com a transferência que a acompanha.')).toHaveLength(1);
    expect(todos(container, 'table')).toHaveLength(0);
    expect(folhasComTexto(container, '0 devoluções · a soma nunca passa do principal.')).toHaveLength(1);
    expect(folhasComTexto(container, 'Saldo de 300,00 · grava uma transferência.')).toHaveLength(1);
  });

  it('registrar com um filtro ativo — volta o filtro para Todos e fecha o formulário', async () => {
    const { container } = await montar(<EmprestimosPage />);
    await escolherFiltro(container, 'Quitados');

    await registrarNovoEmprestimo(container, '300', 'adiantar a feira');

    expect(filtrosMarcados(container)).toEqual(['Todos']);
    expect(folhasComTexto(container, 'Novo empréstimo')).toHaveLength(0);
  });

  it('depois de registrar — valor e motivo voltam vazios, e direção, pessoa, conta e data ficam como estavam', async () => {
    const { container } = await montar(<EmprestimosPage />);
    await abrirNovoEmprestimo(container);
    await clicar(botaoComTexto(container, 'A casa toma emprestado'));
    await escolherOpcao(campoPeloRotulo<HTMLSelectElement>(container, 'De quem'), 'p-chico');
    await digitar(campoPeloRotulo(container, 'Data'), '2026-09-20');
    await digitar(campoPeloRotulo(container, 'Valor'), '100');
    await digitar(campoPeloRotulo(container, 'Motivo'), 'gás');
    await clicar(botaoComTexto(container, 'Registrar empréstimo'));

    await abrirNovoEmprestimo(container);

    expect(campoPeloRotulo(container, 'Valor').value).toBe('');
    expect(campoPeloRotulo(container, 'Motivo').value).toBe('');
    expect(botaoComTexto(container, 'A casa toma emprestado').getAttribute('aria-pressed')).toBe('true');
    expect(campoPeloRotulo<HTMLSelectElement>(container, 'De quem').value).toBe('p-chico');
    expect(campoPeloRotulo(container, 'Data').value).toBe('2026-09-20');
  });

  it('Cancelar — fecha o formulário sem registrar e guarda o que foi digitado', async () => {
    const { container } = await montar(<EmprestimosPage />);
    await abrirNovoEmprestimo(container);
    await digitar(campoPeloRotulo(container, 'Valor'), '300');
    await digitar(campoPeloRotulo(container, 'Motivo'), 'feira');

    await clicar(botaoComTexto(container, 'Cancelar'));
    await abrirNovoEmprestimo(container);

    expect(linhasDaLista(container)).toHaveLength(3);
    expect(campoPeloRotulo(container, 'Valor').value).toBe('300');
    expect(campoPeloRotulo(container, 'Motivo').value).toBe('feira');
  });

  it('clicar em Novo empréstimo de novo — fecha o formulário', async () => {
    const { container } = await montar(<EmprestimosPage />);
    await abrirNovoEmprestimo(container);

    await abrirNovoEmprestimo(container);

    expect(todos(container, 'label').map((rotulo) => rotulo.textContent)).not.toContain('Motivo');
  });

  it('abrir o formulário — fecha o de devolução e limpa o recado', async () => {
    const { container } = await montar(<EmprestimosPage />);
    await devolver(container, '100');
    await abrirFormularioDeDevolucao(container);
    expect(folhasComTexto(container, 'Registrar o que voltou')).toHaveLength(1);

    await abrirNovoEmprestimo(container);

    expect(folhasComTexto(container, 'Registrar o que voltou')).toHaveLength(0);
    expect(recadoMostrado(container)).toBeNull();
  });

  it('abrir a devolução com o formulário de novo empréstimo aberto — os dois formulários ficam abertos', async () => {
    const { container } = await montar(<EmprestimosPage />);
    await abrirNovoEmprestimo(container);

    await abrirFormularioDeDevolucao(container);

    expect(folhasComTexto(container, 'Registrar o que voltou')).toHaveLength(1);
    expect(todos(container, 'label').map((rotulo) => rotulo.textContent)).toContain('Motivo');
  });
});

describe('EmprestimosPage em campo', () => {
  beforeEach(() => {
    fixarDensidade(true);
  });

  it('cabeçalho — mostra só o código F-10 e o título, sem subtítulo, e mantém o botão Novo empréstimo', async () => {
    const { container } = await montar(<EmprestimosPage />);

    expect(textosDasFolhas(elemento(container, 'header'))).toEqual(['F-10', 'Empréstimos']);
    expect(textosDosBotoes(container)).toContain('Novo empréstimo');
  });

  it('resumo e lista — trazem os mesmos valores do escritório', async () => {
    const { container } = await montar(<EmprestimosPage />);

    expect(blocoDoRotulo(container, 'A receber')[1]).toBe('5.437,60');
    expect(blocoDoRotulo(container, 'A devolver')[1]).toBe('1.500,00');
    expect(textosDasLinhas(container)[0]).toEqual(['Érico Santana', '5.437,60', 'a receber']);
  });

  it('tabela de devoluções — esconde a coluna Quem registrou', async () => {
    const { container } = await montar(<EmprestimosPage />);

    expect(todos(container, 'th').map((cabecalho) => cabecalho.textContent)).toEqual(['Data', 'Conta', 'Valor']);
    expect(linhasDeDevolucoes(container)).toEqual([['18/08/2026', 'Cora PJ', '562,40']]);
  });

  it('devolução — registra do mesmo jeito que no escritório', async () => {
    const { container } = await montar(<EmprestimosPage />);

    await devolver(container, '1000');

    expect(recadoMostrado(container)).toBe('Devolução registrada como transferência. Restam 4.437,60.');
  });

  it('novo empréstimo — registra do mesmo jeito que no escritório', async () => {
    const { container } = await montar(<EmprestimosPage />);

    await registrarNovoEmprestimo(container, '2000', 'compra de material');

    expect(textosDasLinhas(container)[0]).toEqual(['Érico Santana', '2.000,00', 'a receber']);
    expect(blocoDoRotulo(container, 'A receber')[1]).toBe('7.437,60');
  });
});

describe('EmprestimosPage: variações que a demonstração não alcança', () => {
  it('sem nenhum quitado — o resumo diz 0 e nenhum ainda, e o filtro Quitados cai no estado vazio', async () => {
    const demonstracao = (await vi.importActual<typeof import('@/mocks/emprestimos')>('@/mocks/emprestimos'))
      .emprestimos;
    cenario.emprestimos = demonstracao.map((emprestimo) =>
      emprestimo.id === 'e-ze' ? Object.assign({}, emprestimo, { devolucoes: emprestimo.devolucoes.slice(0, 1) }) : emprestimo,
    );
    const { container } = await montar(<EmprestimosPage />);

    expect(blocoDoRotulo(container, 'Quitados')).toEqual(['Quitados', '0', 'nenhum ainda']);

    await escolherFiltro(container, 'Quitados');

    expect(folhasComTexto(container, 'Nenhum empréstimo neste recorte')).toHaveLength(1);
    expect(linhasDaLista(container)).toHaveLength(0);
  });
});
