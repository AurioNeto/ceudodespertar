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
import { RegistrarLancamentoPage } from './RegistrarLancamentoPage';

const sessao = vi.hoisted(() => ({ permissoes: new Set<string>() }));
vi.mock('../../app/sessao', () => ({ useSessao: () => ({ pode: (permissao: string) => sessao.permissoes.has(permissao) }) }));

const PERMISSAO_DE_CONSOLIDAR = 'financeiro.lancamento.confirmar';
const TEXTO_DA_CAPTURA = 'Anexar comprovanteUm toque, direto da câmera. Nunca obrigatório.';
const SELETOR_DE_REMOVER_ANEXO = 'button[title="Remover comprovante"]';
const REGISTRAR = 'Registrar e abrir outro';
const HORA_FIXA = new Date('2026-09-02T15:07:00Z');
const valorDeSaida = (valor: string) => `R$\u2212\u00a0${valor}`;
const valorDeEntrada = (valor: string) => `R$+\u00a0${valor}`;
const ROTULO_DO_BLOCO_PADRAO = 'Preenchido por padrão — toque para trocar';

type Densidade = 'office' | 'field';

function usarDensidade(densidade: Densidade) {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    media: consulta,
    matches: densidade === 'field',
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

beforeEach(() => {
  sessao.permissoes.clear();
  usarDensidade('office');
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(HORA_FIXA);
});

afterEach(async () => {
  await desmontarTudo();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const comoTesouraria = () => sessao.permissoes.add(PERMISSAO_DE_CONSOLIDAR);

const campoDoValor = (container: HTMLElement) => elemento<HTMLInputElement>(container, 'input[inputmode="decimal"]');
const botoesDeRemoverAnexo = (container: HTMLElement) =>
  todos<HTMLButtonElement>(container, SELETOR_DE_REMOVER_ANEXO);

const campoRotulado = <T extends HTMLElement>(container: HTMLElement, rotulo: string): T => {
  const etiqueta = todos<HTMLLabelElement>(container, 'label').find((candidata) => candidata.textContent === rotulo);
  if (!etiqueta) throw new Error(`rótulo não encontrado: ${rotulo}`);
  const campo = container.ownerDocument.getElementById(etiqueta.htmlFor);
  if (!campo) throw new Error(`campo do rótulo não encontrado: ${rotulo}`);
  return campo as T;
};

const rotulosDeCampo = (container: HTMLElement) => todos(container, 'label').map((etiqueta) => etiqueta.textContent);

const botaoDoCampoPadrao = (container: HTMLElement, rotulo: string): HTMLButtonElement => {
  const achado = todos<HTMLButtonElement>(container, 'button').find(
    (botao) => botao.firstElementChild?.firstElementChild?.textContent === rotulo,
  );
  if (!achado) throw new Error(`campo padrão não encontrado: ${rotulo}`);
  return achado;
};

const lerCampoPadrao = (botao: HTMLButtonElement) => {
  const [rotulo, valor] = todos(botao, 'span > span').map((trecho) => trecho.textContent);
  return [rotulo, valor, botao.children[1]?.textContent];
};

const camposPadrao = (container: HTMLElement) => {
  const rotuloDoBloco = folhaComTexto<HTMLElement>(container, 'div', ROTULO_DO_BLOCO_PADRAO);
  const irmaos = Array.from(rotuloDoBloco.parentElement?.children ?? []);
  return irmaos
    .slice(irmaos.indexOf(rotuloDoBloco) + 1)
    .filter((irmao): irmao is HTMLButtonElement => irmao.tagName === 'BUTTON')
    .map(lerCampoPadrao);
};

const folhaAberta = (container: HTMLElement, titulo: string): HTMLElement | null =>
  todos(container, 'div').find((candidato) => candidato.childElementCount === 0 && candidato.textContent === titulo)
    ?.parentElement ?? null;

const opcoesDaFolha = (folha: HTMLElement) =>
  todos<HTMLButtonElement>(folha, 'button').map((botao) => ({
    texto: botao.querySelector('span > span')?.textContent,
    marcada: botao.querySelector('svg') !== null,
  }));

const opcaoDaFolha = (folha: HTMLElement, texto: string): HTMLButtonElement => {
  const achada = todos<HTMLButtonElement>(folha, 'button').find(
    (botao) => botao.querySelector('span > span')?.textContent === texto,
  );
  if (!achada) throw new Error(`opção não encontrada: ${texto}`);
  return achada;
};

const lerRecibo = (container: HTMLElement) => {
  const lista = elemento(container, 'dl');
  const cartao = lista.parentElement as HTMLElement;
  return {
    titulo: cartao.children[1]?.textContent,
    valor: cartao.querySelector('[data-numeric]')?.textContent ?? null,
    linhas: todos(lista, ':scope > div').map((linha) => [linha.children[0]?.textContent, linha.children[1]?.textContent]),
    rodape: lista.nextElementSibling?.textContent ?? null,
  };
};

const temRecibo = (container: HTMLElement) => container.querySelector('dl') !== null;
const escolherTipo = (container: HTMLElement, rotulo: string) => clicar(botaoComTexto(container, rotulo));
const registrar = (container: HTMLElement) => clicar(botaoComTexto(container, REGISTRAR));
const botaoDeRegistrar = (container: HTMLElement) => botaoComTexto(container, REGISTRAR);
const escolherCategoriaExistente = (container: HTMLElement, categoria: string) =>
  clicar(botaoComTexto(container, `+ ${categoria}`));
const anexarComprovante = (container: HTMLElement) => clicar(botaoComTexto(container, TEXTO_DA_CAPTURA));
const abrirCampoPadrao = (container: HTMLElement, rotulo: string) => clicar(botaoDoCampoPadrao(container, rotulo));
const botoesDeSugestao = (container: HTMLElement, acao: 'Aceitar sugestão' | 'Descartar sugestão') =>
  todos<HTMLButtonElement>(container, `button[title="${acao}"]`);
const textosDeSugestao = (container: HTMLElement) =>
  todos(container, 'button[title="Aceitar sugestão"]').map((aceitar) => aceitar.previousElementSibling?.textContent);
const tiposMarcados = (container: HTMLElement) =>
  ['Saída', 'Entrada', 'Transferência'].map((rotulo) => [rotulo, botaoComTexto(container, rotulo).ariaPressed]);

describe('RegistrarLancamentoPage: textos que o ds recebe por prop', () => {
  it('sem anexo — a captura mostra o rótulo e a dica de um toque, nunca obrigatório', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    const captura = botaoComTexto(container, TEXTO_DA_CAPTURA);
    expect(captura.type).toBe('button');
    expect(botoesDeRemoverAnexo(container)).toHaveLength(0);
  });

  it('com anexo — o botão de remover se chama Remover comprovante e a oferta de captura some', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    await clicar(botaoComTexto(container, TEXTO_DA_CAPTURA));

    expect(botoesDeRemoverAnexo(container)).toHaveLength(1);
    expect(container.textContent).toContain('IMG_2481.jpg');
    expect(container.textContent).not.toContain('Um toque, direto da câmera');
  });

  it('com anexo — o nome acessível do botão de remover é Remover comprovante, vindo só do title', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    await clicar(botaoComTexto(container, TEXTO_DA_CAPTURA));

    const remover = elemento<HTMLButtonElement>(container, SELETOR_DE_REMOVER_ANEXO);
    expect(remover.title).toBe('Remover comprovante');
    expect(remover.hasAttribute('aria-label')).toBe(false);
    expect(remover.hasAttribute('aria-labelledby')).toBe(false);
    expect(remover.textContent).toBe('');
    expect(elemento(remover, 'svg').getAttribute('aria-hidden')).toBe('true');
  });

  it('valor somado — a soma reconhecida avisa que o valor composto vira pendência na conferência', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    await digitar(campoDoValor(container), '65+70');

    expect(container.textContent).toContain('Soma reconhecida: 135,00 — o valor composto vira pendência na conferência.');
  });

  it('valor simples — não mostra a soma reconhecida e mantém a dica da página', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    await digitar(campoDoValor(container), '65');

    expect(container.textContent).not.toContain('Soma reconhecida');
    expect(container.textContent).toContain('Escreva como você fala. Soma vale: 65+70.');
  });
});

describe('RegistrarLancamentoPage: cabeçalho e estado de entrada nas duas densidades', () => {
  it('escritório sem permissão de consolidar — o cabeçalho diz que grava a conferir, com competência e unidade', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    expect(elemento(container, 'h1').textContent).toBe('Registrar lançamento');
    expect(container.textContent).toContain('F-01 · Lançamento');
    expect(container.textContent).toContain('Grava como a conferir · competência 08/2026 · CDD');
  });

  it('escritório com permissão de consolidar — o cabeçalho diz que a tesouraria lança já consolidado', async () => {
    comoTesouraria();
    const { container } = await montar(<RegistrarLancamentoPage />);

    expect(container.textContent).toContain('Tesouraria lança já consolidado · competência 08/2026 · CDD');
    expect(container.textContent).not.toContain('Grava como a conferir · competência');
  });

  it('campo — o cabeçalho traz só o código F-01, sem subtítulo nem nota do tipo', async () => {
    usarDensidade('field');
    const { container } = await montar(<RegistrarLancamentoPage />);

    expect(elemento(container, 'header').textContent).toBe('F-01Registrar lançamento');
    expect(container.textContent).not.toContain('Dinheiro que saiu para fora da casa.');
  });

  it('escritório — o tipo começa em Saída e a nota explica o tipo escolhido', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    expect(tiposMarcados(container)).toEqual([
      ['Saída', 'true'],
      ['Entrada', 'false'],
      ['Transferência', 'false'],
    ]);
    expect(container.textContent).toContain('Tipo de lançamento');
    expect(container.textContent).toContain('Dinheiro que saiu para fora da casa.');
  });

  it('sem permissão de consolidar — o guarda de dois eixos explica por que o botão de consolidar não está ali', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    expect(container.textContent).toContain('Você tem acesso a esta tela, mas não a esta operação');
    expect(container.textContent).toContain('Você grava este lançamento como A conferir.');
    expect(container.textContent).toContain('Precisa da permissão financeiro.lancamento.confirmar.');
  });

  it('sem permissão e com categoria — a barra avisa que a tesouraria confere antes de consolidar', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    await escolherCategoriaExistente(container, 'Manutenção');

    expect(container.textContent).toContain('Grava como a conferir: a tesouraria confere antes de consolidar.');
  });

  it('com permissão e com categoria — a barra avisa que consolidado só se desfaz por estorno', async () => {
    comoTesouraria();
    const { container } = await montar(<RegistrarLancamentoPage />);

    await escolherCategoriaExistente(container, 'Manutenção');

    expect(container.textContent).toContain('Consolidado é definitivo: depois de gravado, só estorno.');
  });

  it.each([
    { nome: 'sem permissão', consolida: false },
    { nome: 'com permissão', consolida: true },
  ])('$nome e sem categoria — a barra diz que nada bloqueia, igual para os dois modos', async ({ consolida }) => {
    if (consolida) comoTesouraria();
    const { container } = await montar(<RegistrarLancamentoPage />);

    expect(container.textContent).toContain('Nada bloqueia o registro. Sem categoria, grava e marca como não classificado.');
  });

  it('com permissão de consolidar — o guarda de dois eixos não aparece', async () => {
    comoTesouraria();
    const { container } = await montar(<RegistrarLancamentoPage />);

    expect(container.textContent).not.toContain('Você tem acesso a esta tela, mas não a esta operação');
  });

  it.each([
    { nome: 'sem permissão', consolida: false, selo: 'Grava a conferir' },
    { nome: 'com permissão', consolida: true, selo: 'Grava consolidado' },
  ])('campo $nome de consolidar — o selo de modo é $selo', async ({ consolida, selo }) => {
    usarDensidade('field');
    if (consolida) comoTesouraria();
    const { container } = await montar(<RegistrarLancamentoPage />);

    expect(container.textContent).toContain(selo);
  });

  it('escritório — o botão principal é Registrar e abrir outro e Limpar campos existe; em campo, só o principal', async () => {
    const escritorio = await montar(<RegistrarLancamentoPage />);
    const limparNoEscritorio = todos(escritorio.container, 'button').filter(
      (botao) => botao.textContent === 'Limpar campos',
    );
    await escritorio.desmontar();
    usarDensidade('field');
    const campo = await montar(<RegistrarLancamentoPage />);

    expect(limparNoEscritorio).toHaveLength(1);
    expect(todos(campo.container, 'button').filter((botao) => botao.textContent === 'Limpar campos')).toHaveLength(0);
    expect(botaoDeRegistrar(campo.container).style.width).toBe('100%');
  });
});

describe('RegistrarLancamentoPage: composição do formulário por tipo no escritório', () => {
  const ROTULOS_DA_SAIDA = [
    'O que foi',
    'Data do gasto',
    'Fornecedor',
    'Grupo',
    'Conta de saída',
    'Categoria — pode ter mais de uma',
    'Forma de pagamento',
    'Cerimônia vinculada',
    'Competência',
    'Unidade',
  ];
  const ROTULOS_DA_ENTRADA = [
    'De onde veio',
    'Data da entrada',
    'De quem veio',
    'Grupo',
    'Conta de entrada',
    'Categoria — pode ter mais de uma',
    'Forma de recebimento',
    'Cerimônia vinculada',
    'Competência',
    'Unidade',
  ];
  const ROTULOS_DA_TRANSFERENCIA = [
    'Motivo da transferência',
    'Data da transferência',
    'Conta de origem',
    'Conta de destino',
    'Forma da transferência',
    'Competência',
    'Unidade',
  ];

  it.each([
    { tipo: 'Saída', rotulos: ROTULOS_DA_SAIDA, valor: 'Quanto foi', nota: 'Dinheiro que saiu para fora da casa.' },
    {
      tipo: 'Entrada',
      rotulos: ROTULOS_DA_ENTRADA,
      valor: 'Quanto entrou',
      nota: 'Dinheiro que entrou: doação, venda da lojinha, contribuição de cerimônia.',
    },
    {
      tipo: 'Transferência',
      rotulos: ROTULOS_DA_TRANSFERENCIA,
      valor: 'Quanto transferir',
      nota: 'Dinheiro que sai de uma conta da casa e entra em outra. Não é despesa nem receita: o total não muda, só o lugar onde o dinheiro está.',
    },
  ])('tipo $tipo — os rótulos, o rótulo do valor e a nota do tipo são os do tipo', async ({ tipo, rotulos, valor, nota }) => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    await escolherTipo(container, tipo);

    expect(rotulosDeCampo(container)).toEqual(rotulos);
    expect(campoDoValor(container).getAttribute('aria-label')).toBe(valor);
    expect(container.textContent).toContain(nota);
    expect(botaoComTexto(container, tipo).ariaPressed).toBe('true');
  });

  it.each([
    { tipo: 'Saída', placeholder: 'mercado cerimônia mãe divina', fornecedor: 'quem recebeu o dinheiro' },
    { tipo: 'Entrada', placeholder: 'contribuições da cerimônia de agosto', fornecedor: 'quem entregou o dinheiro' },
  ])('tipo $tipo — os exemplos dos campos de texto são os do tipo', async ({ tipo, placeholder, fornecedor }) => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    await escolherTipo(container, tipo);

    const rotuloDaDescricao = tipo === 'Saída' ? 'O que foi' : 'De onde veio';
    const rotuloDoFornecedor = tipo === 'Saída' ? 'Fornecedor' : 'De quem veio';
    expect(campoRotulado<HTMLInputElement>(container, rotuloDaDescricao).placeholder).toBe(placeholder);
    expect(campoRotulado<HTMLInputElement>(container, rotuloDoFornecedor).placeholder).toBe(fornecedor);
  });

  it('transferência — o exemplo do motivo é o repasse do caixa da lojinha', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    await escolherTipo(container, 'Transferência');

    expect(campoRotulado<HTMLInputElement>(container, 'Motivo da transferência').placeholder).toBe(
      'repasse do caixa da lojinha para o Cora',
    );
  });

  it('entrada — a nota do grupo diz de onde veio a entrada; na saída, onde o gasto aconteceu', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    const notaDaSaida = container.textContent?.includes('Onde o gasto aconteceu. Um por lançamento.');

    await escolherTipo(container, 'Entrada');

    expect(notaDaSaida).toBe(true);
    expect(container.textContent).toContain('De onde veio a entrada. Um por lançamento.');
    expect(container.textContent).not.toContain('Onde o gasto aconteceu');
  });

  it('transferência — o aviso de escolher categoria e o seletor de categorias não existem', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    await escolherTipo(container, 'Transferência');

    expect(container.textContent).not.toContain('Categoria — pode ter mais de uma');
    expect(container.textContent).not.toContain('não classificado');
  });

  it('saída — o seletor de categorias mostra nenhuma escolhida e as seis existentes', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    const existentes = todos(container, 'button')
      .map((botao) => botao.textContent)
      .filter((texto) => texto?.startsWith('+ '));
    expect(container.textContent).toContain('nenhuma escolhida');
    expect(existentes).toEqual([
      '+ Alimentação de cerimônia',
      '+ Manutenção',
      '+ Transporte',
      '+ Animais',
      '+ Insumos de feitio',
      '+ Administrativo',
    ]);
  });
});

describe('RegistrarLancamentoPage: troca de tipo', () => {
  it('saída com reembolso ligado — ir para entrada desliga o reembolso e voltar para saída o mantém desligado', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await clicar(elemento(container, '[role="switch"]'));
    const ligadoNaSaida = elemento(container, '[role="switch"]').getAttribute('aria-checked');

    await escolherTipo(container, 'Entrada');
    await escolherTipo(container, 'Saída');

    expect(ligadoNaSaida).toBe('true');
    expect(elemento(container, '[role="switch"]').getAttribute('aria-checked')).toBe('false');
  });

  it.each([{ tipo: 'Entrada' }, { tipo: 'Transferência' }])(
    'tipo $tipo — a chave de reembolso não existe',
    async ({ tipo }) => {
      const { container } = await montar(<RegistrarLancamentoPage />);

      await escolherTipo(container, tipo);

      expect(container.querySelector('[role="switch"]')).toBeNull();
      expect(container.textContent).not.toContain('Reembolso a uma pessoa');
    },
  );

  it.each([{ tipo: 'Entrada' }, { tipo: 'Transferência' }])(
    'forma de pagamento Boleto — ir para $tipo volta a forma para Pix',
    async ({ tipo }) => {
      const { container } = await montar(<RegistrarLancamentoPage />);
      await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Forma de pagamento'), 'Boleto');

      await escolherTipo(container, tipo);

      const rotuloDaForma = tipo === 'Entrada' ? 'Forma de recebimento' : 'Forma da transferência';
      expect(campoRotulado<HTMLSelectElement>(container, rotuloDaForma).value).toBe('Pix');
    },
  );

  it('forma de pagamento Boleto — voltar para saída não a restaura: fica em Pix', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Forma de pagamento'), 'Boleto');
    await escolherTipo(container, 'Entrada');

    await escolherTipo(container, 'Saída');

    expect(campoRotulado<HTMLSelectElement>(container, 'Forma de pagamento').value).toBe('Pix');
  });

  it('entrada com cerimônia escolhida — a cerimônia continua; indo para transferência volta para Nenhuma', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Cerimônia vinculada'), '05/09 · Mãe Divina');
    await escolherTipo(container, 'Entrada');
    const naEntrada = campoRotulado<HTMLSelectElement>(container, 'Cerimônia vinculada').value;

    await escolherTipo(container, 'Transferência');
    await escolherTipo(container, 'Saída');

    expect(naEntrada).toBe('05/09 · Mãe Divina');
    expect(campoRotulado<HTMLSelectElement>(container, 'Cerimônia vinculada').value).toBe('Nenhuma — gasto da casa');
  });

  it('conta de saída igual à de destino — ir para transferência troca o destino para a outra conta, sem aviso', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Conta de saída'), 'nubank');

    await escolherTipo(container, 'Transferência');

    expect(campoRotulado<HTMLSelectElement>(container, 'Conta de destino').value).toBe('cora');
    expect(container.textContent).not.toContain('Origem e destino são a mesma conta');
  });

  it('conta de saída Cora e destino Nubank — ir para transferência mantém o destino', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    await escolherTipo(container, 'Transferência');

    expect(campoRotulado<HTMLSelectElement>(container, 'Conta de origem').value).toBe('cora');
    expect(campoRotulado<HTMLSelectElement>(container, 'Conta de destino').value).toBe('nubank');
  });

  it('transferência com destino escolhido igual à origem — avisa e bloqueia o registro com o motivo', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await escolherTipo(container, 'Transferência');

    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Conta de destino'), 'cora');

    expect(container.textContent).toContain('Origem e destino são a mesma conta — a transferência não muda saldo nenhum.');
    expect(container.textContent).toContain('Escolha uma conta diferente da origem.');
    expect(botaoDeRegistrar(container).disabled).toBe(true);
    expect(botaoDeRegistrar(container).title).toBe('Origem e destino precisam ser contas diferentes.');
    expect(container.textContent).toContain('Enquanto isso não se resolve, dá para salvar como rascunho — nada se perde.');
  });

  it('categorias escolhidas na saída — ir para transferência e voltar não as perde', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await escolherCategoriaExistente(container, 'Transporte');

    await escolherTipo(container, 'Transferência');
    await escolherTipo(container, 'Saída');

    expect(container.textContent).toContain('Transporte');
    expect(container.textContent).not.toContain('nenhuma escolhida');
  });
});

describe('RegistrarLancamentoPage: valor, soma e leitura do que o usuário escreve', () => {
  it('soma com ponto de milhar — o campo mostra 51,20 e o registro grava 1.250,00 (Doc 8 §14, linha da soma do AmountInput)', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    await digitar(campoDoValor(container), '1.200+50');
    const mostradoNoCampo = container.textContent?.includes('Soma reconhecida: 51,20');
    await registrar(container);

    expect(mostradoNoCampo).toBe(true);
    expect(lerRecibo(container).valor).toBe(valorDeSaida('1.250,00'));
  });

  it.each([
    { entrada: '65', total: valorDeSaida('65,00') },
    { entrada: '12,50', total: valorDeSaida('12,50') },
    { entrada: '1.000,50', total: valorDeSaida('1.000,50') },
    { entrada: '40+25,50', total: valorDeSaida('65,50') },
    { entrada: '1.000,50+0,50', total: valorDeSaida('1.001,00') },
    { entrada: '10+abc+5', total: valorDeSaida('15,00') },
    { entrada: 'abc', total: valorDeSaida('0,00') },
    { entrada: '', total: valorDeSaida('0,00') },
  ])('valor "$entrada" — o recibo mostra o total $total', async ({ entrada, total }) => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await digitar(campoDoValor(container), entrada);

    await registrar(container);

    expect(lerRecibo(container).valor).toBe(total);
  });

  it('valor com ponto como decimal — "1.5" é lido como milhar e vira 15,00', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await digitar(campoDoValor(container), '1.5');

    await registrar(container);

    expect(lerRecibo(container).valor).toBe(valorDeSaida('15,00'));
  });

  it('valor com o símbolo da moeda — "R$ 40" não é lido e o registro grava 0,00', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await digitar(campoDoValor(container), 'R$ 40');

    await registrar(container);

    expect(lerRecibo(container).valor).toBe(valorDeSaida('0,00'));
  });

  it('valor negativo — o registro é aceito e o recibo mostra o sinal de saída diante do hífen (Doc 4, F-01: nunca aceita valor negativo)', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await digitar(campoDoValor(container), '-50');

    await registrar(container);

    expect(lerRecibo(container).valor).toBe(valorDeSaida('-50,00'));
  });

  it('valor vazio — o registro é aceito e grava um recibo de 0,00 com o motivo em traço', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    await registrar(container);

    const recibo = lerRecibo(container);
    expect(recibo.valor).toBe(valorDeSaida('0,00'));
    expect(recibo.linhas[0]).toEqual(['O que foi', '—']);
  });

  it('sem permissão, valor composto — o registro segue liberado e a barra diz que vira pendência', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    await digitar(campoDoValor(container), '65+70');

    expect(botaoDeRegistrar(container).disabled).toBe(false);
    expect(container.textContent).toContain('Grava como a conferir: o valor composto vira pendência na conferência.');
    expect(container.textContent).not.toContain('Um lançamento consolidado tem um valor só');
  });

  it('com permissão, valor composto — o erro de domínio aparece e o registro fica bloqueado com o motivo', async () => {
    comoTesouraria();
    const { container } = await montar(<RegistrarLancamentoPage />);

    await digitar(campoDoValor(container), '65+70');

    expect(container.textContent).toContain('Um lançamento consolidado tem um valor só');
    expect(container.textContent).toContain('Separe em dois lançamentos, ou grave o total com a explicação na descrição e classifique como manutenção.');
    expect(botaoDeRegistrar(container).disabled).toBe(true);
    expect(botaoDeRegistrar(container).title).toBe(
      'O valor composto precisa virar um número só antes de gravar consolidado.',
    );
  });

  it('campo com permissão, valor composto — o erro de domínio vem sem o caminho que o escritório mostra', async () => {
    usarDensidade('field');
    comoTesouraria();
    const { container } = await montar(<RegistrarLancamentoPage />);

    await digitar(campoDoValor(container), '65+70');

    expect(container.textContent).toContain('Uma soma no valor são duas compras no mesmo cupom. Separe em dois lançamentos ou grave o total explicando na descrição.');
    expect(container.textContent).not.toContain('classifique como manutenção');
  });

  it('com permissão, valor composto trocado por número simples — o bloqueio some e o registro volta', async () => {
    comoTesouraria();
    const { container } = await montar(<RegistrarLancamentoPage />);
    await digitar(campoDoValor(container), '65+70');

    await digitar(campoDoValor(container), '135');

    expect(botaoDeRegistrar(container).disabled).toBe(false);
    expect(container.textContent).not.toContain('Um lançamento consolidado tem um valor só');
  });
});

describe('RegistrarLancamentoPage: competência fechada', () => {
  it('escritório — escolher 07/2026 mostra o período fechado, o erro na data e bloqueia o registro', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Competência'), '07/2026');

    expect(container.textContent).toContain('Período 07/2026 · CDD está fechado');
    expect(container.textContent).toContain('julho foi fechado em 05/08 por Marcia Zubek');
    expect(container.textContent).toContain('Reabrir exige um administrador, e o motivo fica registrado de forma permanente.');
    expect(container.textContent).toContain('Cai em julho, período fechado.');
    expect(container.textContent).toContain('Veio da data do gasto — julho está fechado.');
    expect(container.textContent).toContain('Grava como a conferir · competência 07/2026 · CDD');
    expect(botaoDeRegistrar(container).disabled).toBe(true);
    expect(botaoDeRegistrar(container).title).toBe('Julho está fechado. Um administrador pode reabrir, e o motivo fica registrado.');
  });

  it('escritório — a mensagem diz que a data cai em julho enquanto o campo de data segue em 28/08/2026', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Competência'), '07/2026');

    expect(campoRotulado<HTMLInputElement>(container, 'Data do gasto').value).toBe('28/08/2026');
    expect(container.textContent).toContain('A data do gasto cai em julho');
  });

  it('escritório — escrever uma data de julho na data não muda a competência nem libera ou bloqueia nada', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    await digitar(campoRotulado<HTMLInputElement>(container, 'Data do gasto'), '15/07/2026');

    expect(campoRotulado<HTMLSelectElement>(container, 'Competência').value).toBe('08/2026');
    expect(container.textContent).not.toContain('está fechado');
    expect(botaoDeRegistrar(container).disabled).toBe(false);
  });

  it('escritório — voltar para 08/2026 desfaz o bloqueio e a nota volta a dizer mês corrente', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Competência'), '07/2026');

    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Competência'), '08/2026');

    expect(container.textContent).not.toContain('está fechado');
    expect(container.textContent).toContain('Mês corrente.');
    expect(botaoDeRegistrar(container).disabled).toBe(false);
  });

  it('com permissão e valor composto — o motivo do bloqueio é o do período fechado, que vem antes do composto', async () => {
    comoTesouraria();
    const { container } = await montar(<RegistrarLancamentoPage />);
    await digitar(campoDoValor(container), '65+70');

    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Competência'), '07/2026');

    expect(botaoDeRegistrar(container).title).toBe('Julho está fechado. Um administrador pode reabrir, e o motivo fica registrado.');
  });

  it('campo — o período fechado aparece com o texto curto e a barra manda guardar como rascunho', async () => {
    usarDensidade('field');
    const { container } = await montar(<RegistrarLancamentoPage />);
    await abrirCampoPadrao(container, 'Competência');

    await clicar(opcaoDaFolha(folhaAberta(container, 'Competência') as HTMLElement, '07/2026'));

    expect(container.textContent).toContain('Período 07/2026 está fechado');
    expect(container.textContent).toContain('Guarde como rascunho ou lance em 08/2026 explicando na descrição.');
    expect(camposPadrao(container)[0]).toEqual(['Competência', '07/2026', 'da data do gasto']);
    expect(botaoDeRegistrar(container).disabled).toBe(true);
  });

  it('período fechado — nenhum botão de guardar rascunho existe, apesar de a barra e o aviso o oferecerem', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Competência'), '07/2026');

    const rotulosDosBotoes = todos(container, 'button').map((botao) => botao.textContent);
    expect(rotulosDosBotoes.some((texto) => texto?.toLowerCase().includes('rascunho'))).toBe(false);
    expect(container.textContent).toContain('dá para salvar como rascunho');
  });

  it('período fechado e tentativa de registrar — o clique no botão bloqueado não registra nada', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Competência'), '07/2026');

    await registrar(container);

    expect(temRecibo(container)).toBe(false);
  });
});

describe('RegistrarLancamentoPage: reembolso a uma pessoa', () => {
  it('saída — a chave começa desligada com a pergunta e não mostra o campo da pessoa', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    expect(elemento(container, '[role="switch"]').getAttribute('aria-label')).toBe('Reembolso a uma pessoa');
    expect(elemento(container, '[role="switch"]').getAttribute('aria-checked')).toBe('false');
    expect(container.textContent).toContain('Alguém do corpo adiantou do próprio bolso?');
    expect(container.textContent).not.toContain('Quem adiantou o dinheiro');
  });

  it('saída — ligar a chave diz que vira conta a pagar para a pessoa padrão e mostra o campo dela', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    await clicar(elemento(container, '[role="switch"]'));

    expect(container.textContent).toContain('Vira conta a pagar para Lucia Prado — sai do saldo só quando for paga.');
    expect(lerCampoPadrao(botaoDoCampoPadrao(container, 'Quem adiantou o dinheiro'))).toEqual([
      'Quem adiantou o dinheiro',
      'Lucia Prado',
      'vira conta a pagar',
    ]);
  });

  it('saída com reembolso — trocar a pessoa pela folha atualiza o texto e a folha fecha', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await clicar(elemento(container, '[role="switch"]'));
    await abrirCampoPadrao(container, 'Quem adiantou o dinheiro');
    const folha = folhaAberta(container, 'Quem adiantou o dinheiro') as HTMLElement;
    const pessoas = opcoesDaFolha(folha);

    await clicar(opcaoDaFolha(folha, 'Marcia Zubek'));

    expect(pessoas).toEqual([
      { texto: 'Lucia Prado', marcada: true },
      { texto: 'Marcia Zubek', marcada: false },
      { texto: 'Aurio Neto', marcada: false },
      { texto: 'Wilson Prado', marcada: false },
    ]);
    expect(container.textContent).toContain('Vira conta a pagar para Marcia Zubek');
    expect(folhaAberta(container, 'Quem adiantou o dinheiro')).toBeNull();
  });

  it('saída com reembolso ligado — o recibo não traz linha de reembolso e a chave volta desligada', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await clicar(elemento(container, '[role="switch"]'));

    await registrar(container);

    expect(lerRecibo(container).linhas.map(([rotulo]) => rotulo)).toEqual([
      'O que foi',
      'Data',
      'Grupo',
      'Categoria',
      'Conta',
      'Cerimônia',
    ]);
    expect(elemento(container, '[role="switch"]').getAttribute('aria-checked')).toBe('false');
  });

  it('campo — não existe a chave de reembolso, então o campo da pessoa nunca aparece', async () => {
    usarDensidade('field');
    const { container } = await montar(<RegistrarLancamentoPage />);

    expect(container.querySelector('[role="switch"]')).toBeNull();
    expect(camposPadrao(container).map(([rotulo]) => rotulo)).not.toContain('Reembolso a');
  });
});

describe('RegistrarLancamentoPage: categorias no escritório', () => {
  it('sem categoria — o aviso de não classificado e a nota da barra aparecem', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    expect(container.textContent).toContain(
      'Sem categoria o gasto entra em Relatórios como “não classificado”. Dá para gravar assim — vira pendência sua, não da conferência.',
    );
    expect(container.textContent).toContain('Nada bloqueia o registro. Sem categoria, grava e marca como não classificado.');
  });

  it('escolher uma existente — ela vira etiqueta com botão de remover e sai da lista de existentes', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    await escolherCategoriaExistente(container, 'Transporte');

    expect(todos(container, 'button[aria-label="remover categoria Transporte"]')).toHaveLength(1);
    expect(todos(container, 'button').some((botao) => botao.textContent === '+ Transporte')).toBe(false);
    expect(container.textContent).not.toContain('nenhuma escolhida');
    expect(container.textContent).not.toContain('Sem categoria o gasto entra em Relatórios');
  });

  it('remover a etiqueta — a categoria volta para as existentes e o aviso de sem categoria volta', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await escolherCategoriaExistente(container, 'Transporte');

    await clicar(elemento(container, 'button[aria-label="remover categoria Transporte"]'));

    expect(todos(container, 'button').some((botao) => botao.textContent === '+ Transporte')).toBe(true);
    expect(container.textContent).toContain('nenhuma escolhida');
  });

  it('com categoria e sem soma — a nota da barra volta a grava como a conferir', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    await escolherCategoriaExistente(container, 'Manutenção');

    expect(container.textContent).toContain('Grava como a conferir: a tesouraria confere antes de consolidar.');
    expect(container.textContent).not.toContain('Sem categoria, grava e marca como não classificado.');
  });

  it('duas categorias — o recibo junta as duas por vírgula, na ordem em que foram escolhidas', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await escolherCategoriaExistente(container, 'Transporte');
    await escolherCategoriaExistente(container, 'Manutenção');

    await registrar(container);

    expect(lerRecibo(container).linhas).toContainEqual(['Categoria', 'Transporte, Manutenção']);
  });

  it('sem categoria — o recibo diz não classificado', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    await registrar(container);

    expect(lerRecibo(container).linhas).toContainEqual(['Categoria', 'não classificado']);
  });
});

describe('RegistrarLancamentoPage: campos padrão e folhas de escolha em campo', () => {
  it.each([
    {
      tipo: 'Saída',
      campos: [
        ['Competência', '08/2026', 'mês corrente'],
        ['Conta de saída', 'Cora PJ', 'mais usada'],
        ['Grupo', 'Chácara (Infraestrutura)', 'último lançamento'],
        ['Categoria', '— escolher —', 'em branco'],
        ['Forma de pagamento', 'Pix', 'padrão da conta'],
        ['Cerimônia vinculada', 'Nenhuma — gasto da casa', 'sem vínculo'],
      ],
    },
    {
      tipo: 'Entrada',
      campos: [
        ['Competência', '08/2026', 'mês corrente'],
        ['Conta de entrada', 'Cora PJ', 'mais usada'],
        ['Grupo', 'Chácara (Infraestrutura)', 'último lançamento'],
        ['Categoria', '— escolher —', 'em branco'],
        ['Forma de recebimento', 'Pix', 'padrão da conta'],
        ['Cerimônia vinculada', 'Nenhuma — gasto da casa', 'sem vínculo'],
      ],
    },
    {
      tipo: 'Transferência',
      campos: [
        ['Competência', '08/2026', 'mês corrente'],
        ['Conta de origem', 'Cora PJ', 'mais usada'],
        ['Conta de destino', 'Nubank Paty', 'para onde vai'],
        ['Forma da transferência', 'Pix', 'padrão da conta'],
      ],
    },
  ])('campo, tipo $tipo — os campos padrão são exatamente $campos', async ({ tipo, campos }) => {
    usarDensidade('field');
    const { container } = await montar(<RegistrarLancamentoPage />);

    await escolherTipo(container, tipo);

    expect(camposPadrao(container)).toEqual(campos);
    expect(container.textContent).toContain(ROTULO_DO_BLOCO_PADRAO);
  });

  it('campo — só a descrição tem rótulo de campo: não há data, fornecedor, unidade nem selects (Doc 4, F-01: padrões todos editáveis)', async () => {
    usarDensidade('field');
    const { container } = await montar(<RegistrarLancamentoPage />);

    expect(rotulosDeCampo(container)).toEqual(['O que foi']);
    expect(container.querySelector('select')).toBeNull();
  });

  it('campo — nenhuma folha começa aberta', async () => {
    usarDensidade('field');
    const { container } = await montar(<RegistrarLancamentoPage />);

    expect(folhaAberta(container, 'Competência')).toBeNull();
    expect(folhaAberta(container, 'Conta')).toBeNull();
  });

  it.each([
    {
      campo: 'Competência',
      titulo: 'Competência',
      opcoes: [
        { texto: '08/2026', marcada: true },
        { texto: '07/2026', marcada: false },
        { texto: '09/2026', marcada: false },
      ],
      escolha: '09/2026',
      depois: ['Competência', '09/2026', 'mês corrente'],
    },
    {
      campo: 'Conta de saída',
      titulo: 'Conta',
      opcoes: [
        { texto: 'Cora PJ', marcada: true },
        { texto: 'Nubank Paty', marcada: false },
        { texto: 'Espécie', marcada: false },
        { texto: 'Itaú Munay', marcada: false },
      ],
      escolha: 'Espécie',
      depois: ['Conta de saída', 'Espécie', 'mais usada'],
    },
    {
      campo: 'Grupo',
      titulo: 'Grupo',
      opcoes: [
        { texto: 'Lojinha', marcada: false },
        { texto: 'Dormitório', marcada: false },
        { texto: 'Chácara (Infraestrutura)', marcada: true },
        { texto: 'CDD', marcada: false },
        { texto: 'Cozinha', marcada: false },
        { texto: 'Secretaria', marcada: false },
      ],
      escolha: 'Cozinha',
      depois: ['Grupo', 'Cozinha', 'último lançamento'],
    },
    {
      campo: 'Forma de pagamento',
      titulo: 'Forma',
      opcoes: [
        { texto: 'Pix', marcada: true },
        { texto: 'Débito', marcada: false },
        { texto: 'Crédito', marcada: false },
        { texto: 'Espécie', marcada: false },
        { texto: 'Boleto', marcada: false },
        { texto: 'Transferência bancária', marcada: false },
      ],
      escolha: 'Boleto',
      depois: ['Forma de pagamento', 'Boleto', 'padrão da conta'],
    },
    {
      campo: 'Cerimônia vinculada',
      titulo: 'Cerimônia vinculada',
      opcoes: [
        { texto: '05/09 · Mãe Divina', marcada: false },
        { texto: '19/09 · Trabalho de cura', marcada: false },
        { texto: '22/08 · Mãe Divina', marcada: false },
        { texto: 'Nenhuma — gasto da casa', marcada: true },
      ],
      escolha: '19/09 · Trabalho de cura',
      depois: ['Cerimônia vinculada', '19/09 · Trabalho de cura', 'você escolheu'],
    },
  ])('campo — a folha de $campo lista as opções, marca a atual e, ao escolher, fecha e atualiza o campo', async ({ campo, titulo, opcoes, escolha, depois }) => {
    usarDensidade('field');
    const { container } = await montar(<RegistrarLancamentoPage />);

    await abrirCampoPadrao(container, campo);
    const folha = folhaAberta(container, titulo) as HTMLElement;
    const listadas = opcoesDaFolha(folha);
    await clicar(opcaoDaFolha(folha, escolha));

    expect(listadas).toEqual(opcoes);
    expect(folhaAberta(container, titulo)).toBeNull();
    expect(lerCampoPadrao(botaoDoCampoPadrao(container, campo))).toEqual(depois);
  });

  it('campo — a folha de conta mostra a meta de cada conta ao lado do nome', async () => {
    usarDensidade('field');
    const { container } = await montar(<RegistrarLancamentoPage />);

    await abrirCampoPadrao(container, 'Conta de saída');

    const folha = folhaAberta(container, 'Conta') as HTMLElement;
    expect(todos(folha, 'button').map((botao) => botao.textContent)).toEqual([
      'Cora PJmais usada por você',
      'Nubank Patyconta pessoal',
      'Espéciecaixa da chácara',
      'Itaú Munayunidade comercial',
    ]);
  });

  it('campo — tocar fora da folha fecha sem mudar nada, e tocar dentro dela não fecha', async () => {
    usarDensidade('field');
    const { container } = await montar(<RegistrarLancamentoPage />);
    await abrirCampoPadrao(container, 'Grupo');
    const folha = folhaAberta(container, 'Grupo') as HTMLElement;

    await clicar(folha);
    const abertaAposTocarDentro = folhaAberta(container, 'Grupo') !== null;
    await clicar(folha.parentElement as HTMLElement);

    expect(abertaAposTocarDentro).toBe(true);
    expect(folhaAberta(container, 'Grupo')).toBeNull();
    expect(lerCampoPadrao(botaoDoCampoPadrao(container, 'Grupo'))[1]).toBe('Chácara (Infraestrutura)');
  });

  it('campo — escolher outro tipo com a folha aberta a fecha', async () => {
    usarDensidade('field');
    const { container } = await montar(<RegistrarLancamentoPage />);
    await abrirCampoPadrao(container, 'Grupo');

    await escolherTipo(container, 'Entrada');

    expect(folhaAberta(container, 'Grupo')).toBeNull();
  });

  it('campo, transferência — a folha de conta de destino marca Nubank e traz a meta da lista de destinos', async () => {
    usarDensidade('field');
    const { container } = await montar(<RegistrarLancamentoPage />);
    await escolherTipo(container, 'Transferência');

    await abrirCampoPadrao(container, 'Conta de destino');

    const folha = folhaAberta(container, 'Conta de destino') as HTMLElement;
    expect(opcoesDaFolha(folha)[1]).toEqual({ texto: 'Nubank Paty', marcada: true });
    expect(todos(folha, 'button')[0]?.textContent).toBe('Cora PJconta principal da casa');
  });

  it('campo, transferência — escolher a mesma conta da origem bloqueia o registro e a barra explica', async () => {
    usarDensidade('field');
    const { container } = await montar(<RegistrarLancamentoPage />);
    await escolherTipo(container, 'Transferência');
    await abrirCampoPadrao(container, 'Conta de destino');

    await clicar(opcaoDaFolha(folhaAberta(container, 'Conta de destino') as HTMLElement, 'Cora PJ'));

    expect(botaoDeRegistrar(container).disabled).toBe(true);
    expect(botaoDeRegistrar(container).title).toBe('Origem e destino precisam ser contas diferentes.');
    expect(container.textContent).not.toContain('Origem e destino são a mesma conta — a transferência não muda saldo nenhum.');
  });
});

describe('RegistrarLancamentoPage: folha de categoria em campo', () => {
  const abrirFolhaDeCategoria = async (container: HTMLElement) => {
    await abrirCampoPadrao(container, 'Categoria');
    return folhaAberta(container, 'Categoria — pode marcar mais de uma') as HTMLElement;
  };

  it('sem categoria — a folha lista as seis opções, nenhuma marcada, com o título que promete mais de uma', async () => {
    usarDensidade('field');
    const { container } = await montar(<RegistrarLancamentoPage />);

    const folha = await abrirFolhaDeCategoria(container);

    expect(opcoesDaFolha(folha)).toEqual([
      { texto: 'Alimentação de cerimônia', marcada: false },
      { texto: 'Manutenção', marcada: false },
      { texto: 'Transporte', marcada: false },
      { texto: 'Animais', marcada: false },
      { texto: 'Insumos de feitio', marcada: false },
      { texto: 'Administrativo', marcada: false },
    ]);
  });

  it('escolher uma categoria — a folha continua aberta e o campo passa a mostrar a escolha', async () => {
    usarDensidade('field');
    const { container } = await montar(<RegistrarLancamentoPage />);
    const folha = await abrirFolhaDeCategoria(container);

    await clicar(opcaoDaFolha(folha, 'Transporte'));

    expect(folhaAberta(container, 'Categoria — pode marcar mais de uma')).not.toBeNull();
    expect(lerCampoPadrao(botaoDoCampoPadrao(container, 'Categoria'))).toEqual(['Categoria', 'Transporte', 'você escolheu']);
  });

  it('duas categorias — o campo lista as duas, mas a folha marca só a última (Doc 8 §14, folha de categoria em campo)', async () => {
    usarDensidade('field');
    const { container } = await montar(<RegistrarLancamentoPage />);
    const folha = await abrirFolhaDeCategoria(container);

    await clicar(opcaoDaFolha(folha, 'Transporte'));
    await clicar(opcaoDaFolha(folha, 'Manutenção'));

    expect(lerCampoPadrao(botaoDoCampoPadrao(container, 'Categoria'))[1]).toBe('Transporte, Manutenção');
    expect(opcoesDaFolha(folha).filter((opcao) => opcao.marcada)).toEqual([{ texto: 'Manutenção', marcada: true }]);
  });

  it('duas categorias — tocar na que aparece desmarcada a remove da lista (Doc 8 §14, folha de categoria em campo)', async () => {
    usarDensidade('field');
    const { container } = await montar(<RegistrarLancamentoPage />);
    const folha = await abrirFolhaDeCategoria(container);
    await clicar(opcaoDaFolha(folha, 'Transporte'));
    await clicar(opcaoDaFolha(folha, 'Manutenção'));

    await clicar(opcaoDaFolha(folha, 'Transporte'));

    expect(lerCampoPadrao(botaoDoCampoPadrao(container, 'Categoria'))[1]).toBe('Manutenção');
  });

  it('uma categoria — tocar nela de novo a remove e o campo volta a escolher, em branco', async () => {
    usarDensidade('field');
    const { container } = await montar(<RegistrarLancamentoPage />);
    const folha = await abrirFolhaDeCategoria(container);
    await clicar(opcaoDaFolha(folha, 'Transporte'));

    await clicar(opcaoDaFolha(folha, 'Transporte'));

    expect(lerCampoPadrao(botaoDoCampoPadrao(container, 'Categoria'))).toEqual(['Categoria', '— escolher —', 'em branco']);
  });

  it('fechar a folha depois de escolher — a categoria fica no campo e o recibo a registra', async () => {
    usarDensidade('field');
    const { container } = await montar(<RegistrarLancamentoPage />);
    const folha = await abrirFolhaDeCategoria(container);
    await clicar(opcaoDaFolha(folha, 'Animais'));
    await clicar(folha.parentElement as HTMLElement);

    await registrar(container);

    expect(lerRecibo(container).linhas).toContainEqual(['Categoria', 'Animais']);
  });
});

describe('RegistrarLancamentoPage: comprovante e sugestões da leitura do cupom', () => {
  const TEXTOS_DAS_QUATRO_SUGESTOES = [
    'Valor 187,40',
    'Descrição: mercado cerimônia mãe divina',
    'Fornecedor: Assaí Atacadista',
    'Categoria: alimentação de cerimônia',
  ];

  it('sem anexo — não há sugestão nenhuma, nem a moldura do cupom', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    expect(botoesDeSugestao(container, 'Aceitar sugestão')).toHaveLength(0);
    expect(container.textContent).not.toContain('A IA leu o cupom');
    expect(container.textContent).not.toContain('foto do cupom');
  });

  it('escritório com anexo — mostra a foto do cupom, a moldura da IA e as quatro sugestões em ordem', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    await anexarComprovante(container);

    expect(container.textContent).toContain('foto do cupom');
    expect(container.textContent).toContain('A IA leu o cupom');
    expect(container.textContent).toContain('Nada foi preenchido sozinho.');
    expect(textosDeSugestao(container)).toEqual(TEXTOS_DAS_QUATRO_SUGESTOES);
    expect(botaoComTexto(container, 'Aceitar as 4')).toBeDefined();
  });

  it('campo com anexo — só os chips: sem foto, sem moldura da IA e sem o botão de aceitar todas', async () => {
    usarDensidade('field');
    const { container } = await montar(<RegistrarLancamentoPage />);

    await anexarComprovante(container);

    expect(textosDeSugestao(container)).toEqual(TEXTOS_DAS_QUATRO_SUGESTOES);
    expect(container.textContent).not.toContain('foto do cupom');
    expect(container.textContent).not.toContain('A IA leu o cupom');
    expect(todos(container, 'button').some((botao) => botao.textContent?.startsWith('Aceitar as'))).toBe(false);
  });

  it('aceitar a sugestão de valor — o campo recebe 187,40, o chip some e o botão passa a Aceitar as 3', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await anexarComprovante(container);

    await clicar(botoesDeSugestao(container, 'Aceitar sugestão')[0] as HTMLButtonElement);

    expect(campoDoValor(container).value).toBe('187,40');
    expect(textosDeSugestao(container)).toEqual(TEXTOS_DAS_QUATRO_SUGESTOES.slice(1));
    expect(botaoComTexto(container, 'Aceitar as 3')).toBeDefined();
  });

  it('aceitar descrição e fornecedor — os campos de texto recebem as sugestões', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await anexarComprovante(container);

    await clicar(botoesDeSugestao(container, 'Aceitar sugestão')[1] as HTMLButtonElement);
    await clicar(botoesDeSugestao(container, 'Aceitar sugestão')[1] as HTMLButtonElement);

    expect(campoRotulado<HTMLInputElement>(container, 'O que foi').value).toBe('mercado cerimônia mãe divina');
    expect(campoRotulado<HTMLInputElement>(container, 'Fornecedor').value).toBe('Assaí Atacadista');
  });

  it('aceitar a sugestão de categoria — a categoria vira etiqueta no seletor', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await anexarComprovante(container);

    await clicar(botoesDeSugestao(container, 'Aceitar sugestão')[3] as HTMLButtonElement);

    expect(todos(container, 'button[aria-label="remover categoria Alimentação de cerimônia"]')).toHaveLength(1);
  });

  it('categoria já escolhida à mão — aceitar a sugestão da mesma categoria a remove, em vez de manter', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await escolherCategoriaExistente(container, 'Alimentação de cerimônia');
    await anexarComprovante(container);

    await clicar(botoesDeSugestao(container, 'Aceitar sugestão')[3] as HTMLButtonElement);

    expect(container.querySelector('button[aria-label="remover categoria Alimentação de cerimônia"]')).toBeNull();
    expect(container.textContent).toContain('nenhuma escolhida');
  });

  it('categoria já escolhida à mão — Aceitar as 4 a mantém, ao contrário do aceite individual', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await escolherCategoriaExistente(container, 'Alimentação de cerimônia');
    await anexarComprovante(container);

    await clicar(botaoComTexto(container, 'Aceitar as 4'));

    expect(todos(container, 'button[aria-label="remover categoria Alimentação de cerimônia"]')).toHaveLength(1);
  });

  it('descartar uma sugestão — o chip some, nada é preenchido e o botão passa a Aceitar as 3', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await anexarComprovante(container);

    await clicar(botoesDeSugestao(container, 'Descartar sugestão')[0] as HTMLButtonElement);

    expect(textosDeSugestao(container)).toEqual(TEXTOS_DAS_QUATRO_SUGESTOES.slice(1));
    expect(campoDoValor(container).value).toBe('');
    expect(botaoComTexto(container, 'Aceitar as 3')).toBeDefined();
  });

  it('uma sugestão restante — o botão diz Aceitar as restantes', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await anexarComprovante(container);
    await clicar(botoesDeSugestao(container, 'Descartar sugestão')[0] as HTMLButtonElement);
    await clicar(botoesDeSugestao(container, 'Descartar sugestão')[0] as HTMLButtonElement);
    await clicar(botoesDeSugestao(container, 'Descartar sugestão')[0] as HTMLButtonElement);

    expect(botaoComTexto(container, 'Aceitar as restantes')).toBeDefined();
    expect(textosDeSugestao(container)).toEqual(['Categoria: alimentação de cerimônia']);
  });

  it('Aceitar as 4 — preenche valor, descrição, fornecedor e categoria e a moldura das sugestões some', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await anexarComprovante(container);

    await clicar(botaoComTexto(container, 'Aceitar as 4'));

    expect(campoDoValor(container).value).toBe('187,40');
    expect(campoRotulado<HTMLInputElement>(container, 'O que foi').value).toBe('mercado cerimônia mãe divina');
    expect(campoRotulado<HTMLInputElement>(container, 'Fornecedor').value).toBe('Assaí Atacadista');
    expect(todos(container, 'button[aria-label="remover categoria Alimentação de cerimônia"]')).toHaveLength(1);
    expect(container.textContent).not.toContain('A IA leu o cupom');
  });

  it('remover o anexo — as sugestões somem, mas o que já foi aceito continua preenchido', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await anexarComprovante(container);
    await clicar(botoesDeSugestao(container, 'Aceitar sugestão')[0] as HTMLButtonElement);

    await clicar(elemento(container, SELETOR_DE_REMOVER_ANEXO));

    expect(botoesDeSugestao(container, 'Aceitar sugestão')).toHaveLength(0);
    expect(campoDoValor(container).value).toBe('187,40');
  });

  it('anexar de novo depois de aceitar uma sugestão — a já resolvida não volta', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await anexarComprovante(container);
    await clicar(botoesDeSugestao(container, 'Aceitar sugestão')[0] as HTMLButtonElement);
    await clicar(elemento(container, SELETOR_DE_REMOVER_ANEXO));

    await anexarComprovante(container);

    expect(textosDeSugestao(container)).toEqual(TEXTOS_DAS_QUATRO_SUGESTOES.slice(1));
  });

  it.each([{ tipo: 'Entrada' }, { tipo: 'Transferência' }])(
    'tipo $tipo com anexo — as quatro sugestões do cupom de compra aparecem do mesmo jeito',
    async ({ tipo }) => {
      const { container } = await montar(<RegistrarLancamentoPage />);
      await escolherTipo(container, tipo);

      await anexarComprovante(container);

      expect(textosDeSugestao(container)).toEqual(TEXTOS_DAS_QUATRO_SUGESTOES);
    },
  );

  it('transferência — aceitar a categoria grava em campo escondido: ao voltar para saída ela está marcada', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await escolherTipo(container, 'Transferência');
    await anexarComprovante(container);
    await clicar(botoesDeSugestao(container, 'Aceitar sugestão')[3] as HTMLButtonElement);

    await escolherTipo(container, 'Saída');

    expect(todos(container, 'button[aria-label="remover categoria Alimentação de cerimônia"]')).toHaveLength(1);
  });
});

describe('RegistrarLancamentoPage: registrar e recibo', () => {
  it('saída completa — o recibo traz hora, valor com sinal de saída e as linhas da saída, e o formulário esvazia', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await digitar(campoDoValor(container), '187,40');
    await digitar(campoRotulado<HTMLInputElement>(container, 'O que foi'), 'mercado cerimônia mãe divina');
    await escolherCategoriaExistente(container, 'Alimentação de cerimônia');

    await registrar(container);

    expect(lerRecibo(container)).toEqual({
      titulo: 'Registrado às 15:07',
      valor: valorDeSaida('187,40'),
      linhas: [
        ['O que foi', 'mercado cerimônia mãe divina'],
        ['Data', '28/08/2026'],
        ['Grupo', 'Chácara (Infraestrutura)'],
        ['Categoria', 'Alimentação de cerimônia'],
        ['Conta', 'Cora PJ · Pix'],
        ['Cerimônia', 'Nenhuma — gasto da casa'],
      ],
      rodape: 'Gravado como a conferir, com seu nome no histórico. A tesouraria confere antes de consolidar.',
    });
    expect(campoDoValor(container).value).toBe('');
    expect(campoRotulado<HTMLInputElement>(container, 'O que foi').value).toBe('');
    expect(todos(container, 'button[aria-label^="remover categoria"]')).toHaveLength(0);
  });

  it('saída com tudo escolhido — o recibo leva grupo, conta, forma e cerimônia que o usuário trocou', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Grupo'), 'Cozinha');
    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Conta de saída'), 'especie');
    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Forma de pagamento'), 'Débito');
    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Cerimônia vinculada'), '05/09 · Mãe Divina');
    await digitar(campoRotulado<HTMLInputElement>(container, 'Data do gasto'), '27/08/2026');

    await registrar(container);

    expect(lerRecibo(container).linhas).toEqual([
      ['O que foi', '—'],
      ['Data', '27/08/2026'],
      ['Grupo', 'Cozinha'],
      ['Categoria', 'não classificado'],
      ['Conta', 'Espécie · Débito'],
      ['Cerimônia', '05/09 · Mãe Divina'],
    ]);
  });

  it('saída com anexo — o recibo acrescenta o comprovante no fim', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await anexarComprovante(container);

    await registrar(container);

    expect(lerRecibo(container).linhas.at(-1)).toEqual(['Comprovante', 'IMG_2481.jpg']);
  });

  it('entrada — o recibo é de entrada, com sinal de mais, e traz tipo, origem, grupo, conta de entrada e cerimônia', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await escolherTipo(container, 'Entrada');
    await digitar(campoDoValor(container), '940');
    await digitar(campoRotulado<HTMLInputElement>(container, 'De onde veio'), 'contribuições da cerimônia de agosto');
    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Forma de recebimento'), 'Espécie');

    await registrar(container);

    const recibo = lerRecibo(container);
    expect(recibo.valor).toBe(valorDeEntrada('940,00'));
    expect(recibo.linhas).toEqual([
      ['Tipo', 'Entrada'],
      ['De onde veio', 'contribuições da cerimônia de agosto'],
      ['Data', '28/08/2026'],
      ['Grupo', 'Chácara (Infraestrutura)'],
      ['Conta de entrada', 'Cora PJ · Espécie'],
      ['Cerimônia', 'Nenhuma — gasto da casa'],
    ]);
  });

  it('entrada com anexo e categoria — o recibo não leva comprovante nem categoria, apesar de a tela aceitar os dois', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await escolherTipo(container, 'Entrada');
    await anexarComprovante(container);
    await escolherCategoriaExistente(container, 'Manutenção');

    await registrar(container);

    const rotulos = lerRecibo(container).linhas.map(([rotulo]) => rotulo);
    expect(rotulos).not.toContain('Comprovante');
    expect(rotulos).not.toContain('Categoria');
  });

  it('transferência — o recibo não tem sinal e traz motivo, data, saiu de e entrou em, com o comprovante no fim', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await escolherTipo(container, 'Transferência');
    await digitar(campoDoValor(container), '1.500');
    await digitar(campoRotulado<HTMLInputElement>(container, 'Motivo da transferência'), 'repasse do caixa');
    await anexarComprovante(container);

    await registrar(container);

    const recibo = lerRecibo(container);
    expect(recibo.valor).toBe('R$1.500,00');
    expect(recibo.linhas).toEqual([
      ['Tipo', 'Transferência entre contas'],
      ['Motivo', 'repasse do caixa'],
      ['Data', '28/08/2026'],
      ['Saiu de', 'Cora PJ'],
      ['Entrou em', 'Nubank Paty'],
      ['Comprovante', 'IMG_2481.jpg'],
    ]);
  });

  it('registrar — o tipo escolhido continua o mesmo para o próximo lançamento', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await escolherTipo(container, 'Entrada');

    await registrar(container);

    expect(botaoComTexto(container, 'Entrada').ariaPressed).toBe('true');
  });

  it('registrar — a forma de pagamento e a unidade escolhidas voltam ao padrão', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Forma de pagamento'), 'Boleto');
    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Unidade'), 'Munay');

    await registrar(container);

    expect(campoRotulado<HTMLSelectElement>(container, 'Forma de pagamento').value).toBe('Pix');
    expect(campoRotulado<HTMLSelectElement>(container, 'Unidade').value).toBe('CDD');
  });

  it('registrar com anexo e sugestões — o anexo sai e as sugestões descartadas voltam ao anexar de novo', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await anexarComprovante(container);
    await clicar(botoesDeSugestao(container, 'Descartar sugestão')[0] as HTMLButtonElement);

    await registrar(container);
    await anexarComprovante(container);

    expect(botoesDeRemoverAnexo(container)).toHaveLength(1);
    expect(textosDeSugestao(container)).toHaveLength(4);
  });

  it('registrar duas vezes — só o último recibo fica na tela', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await digitar(campoDoValor(container), '10');
    await registrar(container);
    await digitar(campoDoValor(container), '20');

    await registrar(container);

    expect(todos(container, 'dl')).toHaveLength(1);
    expect(lerRecibo(container).valor).toBe(valorDeSaida('20,00'));
  });

  it('escritório sem permissão — o recibo traz Desfazer e Ver lançamento, e o guarda de dois eixos sai da tela', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);

    await registrar(container);

    expect(botaoComTexto(container, 'Desfazer')).toBeDefined();
    expect(botaoComTexto(container, 'Ver lançamento')).toBeDefined();
    expect(container.textContent).not.toContain('Você tem acesso a esta tela, mas não a esta operação');
  });

  it('escritório com permissão — o recibo diz gravado consolidado e que o desfazer vale só por 2 minutos', async () => {
    comoTesouraria();
    const { container } = await montar(<RegistrarLancamentoPage />);

    await registrar(container);

    expect(lerRecibo(container).rodape).toBe(
      'Gravado consolidado, com seu nome no histórico. Desfazer só nos próximos 2 minutos; depois disso, estorno.',
    );
  });

  it('campo — o recibo promete Desfazer nos próximos 2 minutos, mas não há botão de desfazer nem de ver lançamento', async () => {
    usarDensidade('field');
    const { container } = await montar(<RegistrarLancamentoPage />);

    await registrar(container);

    expect(lerRecibo(container).rodape).toBe('Campos limpos, pronto para o próximo. Desfazer nos próximos 2 minutos.');
    expect(todos(container, 'button').some((botao) => botao.textContent === 'Desfazer')).toBe(false);
    expect(todos(container, 'button').some((botao) => botao.textContent === 'Ver lançamento')).toBe(false);
  });

  it('Desfazer — esvazia o recibo e o formulário, sem desfazer o registro nem esperar prazo algum', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await digitar(campoDoValor(container), '10');
    await registrar(container);
    await digitar(campoDoValor(container), '77');
    vi.setSystemTime(new Date(HORA_FIXA.getTime() + 60 * 60 * 1000));

    await clicar(botaoComTexto(container, 'Desfazer'));

    expect(temRecibo(container)).toBe(false);
    expect(campoDoValor(container).value).toBe('');
    expect(container.textContent).toContain('Você tem acesso a esta tela, mas não a esta operação');
  });

  it('Ver lançamento — o clique não faz nada: o recibo continua na tela', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await registrar(container);

    await clicar(botaoComTexto(container, 'Ver lançamento'));

    expect(temRecibo(container)).toBe(true);
  });

  it('Limpar campos — esvazia valor, descrição, categorias e anexo, mas mantém o tipo', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await escolherTipo(container, 'Entrada');
    await digitar(campoDoValor(container), '55');
    await digitar(campoRotulado<HTMLInputElement>(container, 'De onde veio'), 'doação');
    await escolherCategoriaExistente(container, 'Transporte');
    await anexarComprovante(container);

    await clicar(botaoComTexto(container, 'Limpar campos'));

    expect(campoDoValor(container).value).toBe('');
    expect(campoRotulado<HTMLInputElement>(container, 'De onde veio').value).toBe('');
    expect(todos(container, 'button[aria-label^="remover categoria"]')).toHaveLength(0);
    expect(botoesDeRemoverAnexo(container)).toHaveLength(0);
    expect(botaoComTexto(container, 'Entrada').ariaPressed).toBe('true');
  });

  it('Limpar campos depois de registrar — também esvazia o recibo', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await registrar(container);

    await clicar(botaoComTexto(container, 'Limpar campos'));

    expect(temRecibo(container)).toBe(false);
  });

  it('transferência com a mesma conta forçada pela troca — o registro grava a transferência com origem e destino diferentes', async () => {
    const { container } = await montar(<RegistrarLancamentoPage />);
    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Conta de saída'), 'nubank');
    await escolherTipo(container, 'Transferência');

    await registrar(container);

    expect(lerRecibo(container).linhas.slice(3, 5)).toEqual([
      ['Saiu de', 'Nubank Paty'],
      ['Entrou em', 'Cora PJ'],
    ]);
  });
});
