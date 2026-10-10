import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { TEXTO_DA_FAIXA_DE_DEMONSTRACAO } from '../../ds';
import '../../app/apoioDeTeste';
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
import { InscricaoPublicaPage } from './InscricaoPublicaPage';

describe('InscricaoPublicaPage', () => {
  it('mostra a faixa de demonstração', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const raiz = createRoot(container);
    await act(async () => {
      raiz.render(
        <MemoryRouter>
          <InscricaoPublicaPage />
        </MemoryRouter>,
      );
    });

    const faixa = container.querySelector('[role="note"]');
    expect(faixa?.textContent).toBe(TEXTO_DA_FAIXA_DE_DEMONSTRACAO);

    await act(async () => {
      raiz.unmount();
    });
    container.remove();
  });
});

function definirDensidade(campo: boolean) {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    media: consulta,
    matches: campo,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

beforeEach(() => {
  definirDensidade(false);
});

afterEach(async () => {
  await desmontarTudo();
  vi.unstubAllGlobals();
});

const CPF_DE_CLARICE = '529.187.340-11';
const CPF_DE_EDUARDO = '812.445.290-07';
const CPF_DE_HELENA = '330.918.775-42';
const CPF_SEM_CADASTRO = '000.000.000-00';

const MEDICACAO = 'Você faz uso de medicação contínua?';
const PSIQUIATRICO = 'Você tem ou já teve diagnóstico psiquiátrico?';
const CONDICAO = 'Você tem alguma destas condições?';
const GESTACAO = 'Você está gestante ou amamentando?';
const SUBSTANCIAS = 'Você fez uso de álcool ou outras substâncias nos últimos 3 dias?';
const EXPERIENCIA = 'Você já participou de trabalho com ayahuasca antes?';
const PLACEHOLDER_DO_CONTATO = 'Nome e telefone de quem a casa liga';
const COR_DO_SEGMENTO_ATINGIDO = 'var(--color-ink-brand)';
const FRASE_DE_ENVIO_BLOQUEADO = 'Falta preencher: ';

const textoDe = (container: HTMLElement) => container.textContent ?? '';
const marcado = (botao: HTMLElement) => botao.getAttribute('aria-pressed') === 'true';
const tituloDoPasso = (container: HTMLElement) => elemento(container, 'h1').textContent;
const botaoContinuar = (container: HTMLElement) => botaoComTexto(container, 'Continuar');

const contarFolhas = (container: HTMLElement, seletor: string, texto: string) =>
  todos(container, seletor).filter((folha) => folha.childElementCount === 0 && folha.textContent === texto).length;

const segmentosAtingidos = (container: HTMLElement) =>
  todos<HTMLSpanElement>(container, 'header span[aria-hidden]').filter(
    (segmento) => segmento.style.background === COR_DO_SEGMENTO_ATINGIDO,
  ).length;

async function abrir() {
  const { container } = await montar(<InscricaoPublicaPage />);
  return container;
}

function campoRotulado<T extends HTMLElement>(container: HTMLElement, rotulo: string) {
  const etiqueta = todos<HTMLLabelElement>(container, 'label').find((candidata) => candidata.textContent === rotulo);
  if (!etiqueta) throw new Error(`campo sem rótulo: ${rotulo}`);
  return elemento<T>(container, `[id="${etiqueta.htmlFor}"]`);
}

const campoPorPlaceholder = (container: HTMLElement, placeholder: string) =>
  elemento<HTMLInputElement>(container, `input[placeholder="${placeholder}"]`);

const temIcone = (origem: ParentNode | null, nome: string) => origem?.querySelector(`svg.lucide-${nome}`) != null;
const linhaDoRodape = (container: HTMLElement, frase: string) => folhaComTexto(container, 'span', frase).parentElement;

async function digitarEmCaixa(caixa: HTMLTextAreaElement, valor: string) {
  const definirValor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  await act(async () => {
    definirValor?.call(caixa, valor);
    caixa.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function teclar(campo: HTMLElement, tecla: string) {
  await act(async () => {
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: tecla, bubbles: true }));
  });
}

const opcaoDaPergunta = (container: HTMLElement, rotulo: string, pergunta: string) =>
  elemento<HTMLButtonElement>(container, `button[aria-label="${rotulo} — ${pergunta}"]`);

const responder = (container: HTMLElement, pergunta: string, rotulo: string) =>
  clicar(opcaoDaPergunta(container, rotulo, pergunta));

async function identificar(container: HTMLElement, cpf: string) {
  await digitar(campoRotulado<HTMLInputElement>(container, 'CPF'), cpf);
  await clicar(botaoContinuar(container));
}

async function preencherCadastro(container: HTMLElement, nome: string) {
  await digitar(campoRotulado<HTMLInputElement>(container, 'Nome completo'), nome);
  await digitar(campoRotulado<HTMLInputElement>(container, 'Data de nascimento'), '01/02/1990');
  await digitar(campoRotulado<HTMLInputElement>(container, 'Telefone com WhatsApp'), '(11) 90000-0000');
  await clicar(botaoContinuar(container));
}

async function responderOQueMudou(container: HTMLElement) {
  await responder(container, PSIQUIATRICO, 'Não');
  await responder(container, CONDICAO, 'Nenhuma delas');
  await responder(container, GESTACAO, 'Não');
  await responder(container, SUBSTANCIAS, 'Não');
  await responder(container, EXPERIENCIA, 'Sim');
}

async function responderFormularioInteiro(container: HTMLElement) {
  await responder(container, MEDICACAO, 'Não');
  await responderOQueMudou(container);
  await digitar(campoPorPlaceholder(container, PLACEHOLDER_DO_CONTATO), 'Paulo · (11) 98888-7777');
}

const declarar = async (container: HTMLElement) => {
  await clicar(elemento<HTMLButtonElement>(container, 'button[role="checkbox"]'));
  await clicar(botaoContinuar(container));
};

async function chegarEmParticipacaoComoHelena() {
  const container = await abrir();
  await identificar(container, CPF_DE_HELENA);
  await declarar(container);
  return container;
}

async function chegarEmParticipacaoComoClarice() {
  const container = await abrir();
  await identificar(container, CPF_DE_CLARICE);
  await responderOQueMudou(container);
  await clicar(botaoContinuar(container));
  await declarar(container);
  return container;
}

async function chegarEmParticipacaoComoNovo(nome: string) {
  const container = await abrir();
  await identificar(container, CPF_SEM_CADASTRO);
  await preencherCadastro(container, nome);
  await responderFormularioInteiro(container);
  await clicar(botaoContinuar(container));
  await declarar(container);
  return container;
}

const campoDaContribuicao = (container: HTMLElement) =>
  campoRotulado<HTMLInputElement>(container, 'Quanto você vai contribuir');
const botaoDoNivel = (container: HTMLElement, nivel: string) => {
  const botao = folhaComTexto(container, 'span', nivel).closest('button');
  if (!botao) throw new Error(`nível sem botão: ${nivel}`);
  return botao;
};
const clicarNoNivel = (container: HTMLElement, nivel: string) => clicar(botaoDoNivel(container, nivel));
const escolherHospedagem = (container: HTMLElement, rotulo: string) =>
  clicar(elemento<HTMLButtonElement>(container, `button[aria-label="${rotulo}"]`));
const botaoDeEnviar = (container: HTMLElement) => botaoComTexto(container, 'Enviar minha inscrição');

describe('InscricaoPublicaPage: moldura', () => {
  it('em qualquer passo — o cabeçalho traz a casa, o trabalho com a data e o local', async () => {
    const container = await abrir();

    const cabecalho = elemento(container, 'header');

    expect(cabecalho.textContent).toContain('Céu do Despertar');
    expect(cabecalho.textContent).toContain('Trabalho de Lua Cheia — 12/09/2026');
    expect(cabecalho.textContent).toContain('Chácara · Ibiúna · inscrição');
  });

  it('escritório — o cabeçalho leva a flor decorativa', async () => {
    const container = await abrir();

    expect(todos(elemento(container, 'header'), 'svg')).toHaveLength(1);
  });

  it('campo — o cabeçalho não leva a flor decorativa', async () => {
    definirDensidade(true);

    const container = await abrir();

    expect(todos(elemento(container, 'header'), 'svg')).toHaveLength(0);
  });

  it('percurso de quem não tem cadastro — o botão de seguir leva a seta para a direita em cada passo e o de enviar o check duplo', async () => {
    const container = await abrir();
    const setas = [temIcone(botaoContinuar(container), 'arrow-right')];
    await identificar(container, CPF_SEM_CADASTRO);
    setas.push(temIcone(botaoContinuar(container), 'arrow-right'));
    await preencherCadastro(container, 'Maria Silva');
    setas.push(temIcone(botaoContinuar(container), 'arrow-right'));
    await responderFormularioInteiro(container);
    await clicar(botaoContinuar(container));
    setas.push(temIcone(botaoContinuar(container), 'arrow-right'));
    await declarar(container);

    expect(setas).toEqual([true, true, true, true]);
    expect(temIcone(botaoDeEnviar(container), 'check-check')).toBe(true);
  });

  it('percurso de quem não tem cadastro — a barra de progresso avança um segmento por passo, de 1 a 5', async () => {
    const container = await abrir();
    const atingidos = [segmentosAtingidos(container)];
    await identificar(container, CPF_SEM_CADASTRO);
    atingidos.push(segmentosAtingidos(container));
    await preencherCadastro(container, 'Maria Silva');
    atingidos.push(segmentosAtingidos(container));
    await responderFormularioInteiro(container);
    await clicar(botaoContinuar(container));
    atingidos.push(segmentosAtingidos(container));
    await declarar(container);
    atingidos.push(segmentosAtingidos(container));
    await clicar(botaoDeEnviar(container));
    atingidos.push(segmentosAtingidos(container));

    expect(atingidos).toEqual([1, 2, 3, 4, 5, 5]);
    expect(todos(container, 'header span[aria-hidden]')).toHaveLength(5);
  });
});

describe('InscricaoPublicaPage: identificação pelo CPF', () => {
  it('abertura — pede o CPF, explica o reconhecimento e mostra o link da cerimônia', async () => {
    const container = await abrir();

    expect(tituloDoPasso(container)).toBe('Vamos começar pelo seu CPF');
    expect(textoDe(container)).toContain(
      'Se você já veio aqui antes, a casa te reconhece e pergunta bem menos. Se é a primeira vez, o cadastro é rápido e serve para sempre.',
    );
    expect(folhaComTexto(container, 'code', 'ceudodespertar.org/i/lua-cheia-1209-7k3f')).toBeDefined();
    expect(campoRotulado<HTMLInputElement>(container, 'CPF').inputMode).toBe('numeric');
  });

  it('abertura — lista os quatro CPFs de exemplo do protótipo com a descrição de cada caso', async () => {
    const container = await abrir();

    const exemplos = todos<HTMLButtonElement>(container, 'button').filter((botao) => botao.querySelector('code'));

    expect(exemplos.map((exemplo) => exemplo.textContent)).toEqual([
      '529.187.340-11já cadastrada, responde só o que mudou',
      '330.918.775-42já cadastrada, anamnese em dia',
      '812.445.290-07já cadastrado, resposta vencida',
      '000.000.000-00ninguém — cai no cadastro novo',
    ]);
  });

  it('clicar num CPF de exemplo — preenche o campo sem seguir para o próximo passo', async () => {
    const container = await abrir();

    await clicar(botaoComTexto(container, '330.918.775-42já cadastrada, anamnese em dia'));

    expect(campoRotulado<HTMLInputElement>(container, 'CPF').value).toBe('330.918.775-42');
    expect(tituloDoPasso(container)).toBe('Vamos começar pelo seu CPF');
  });

  it.each([
    { digitado: '', mostrado: '' },
    { digitado: 'abc529def', mostrado: '529' },
    { digitado: '5291', mostrado: '529.1' },
    { digitado: '529187', mostrado: '529.187' },
    { digitado: '5291873', mostrado: '529.187.3' },
    { digitado: '529187340', mostrado: '529.187.340' },
    { digitado: '5291873401', mostrado: '529.187.340-1' },
    { digitado: '52918734011', mostrado: '529.187.340-11' },
    { digitado: '529.187.340-11', mostrado: '529.187.340-11' },
    { digitado: '5291873401199999', mostrado: '529.187.340-11' },
  ])('digitar "$digitado" — a máscara mostra "$mostrado"', async ({ digitado, mostrado }) => {
    const container = await abrir();

    await digitar(campoRotulado<HTMLInputElement>(container, 'CPF'), digitado);

    expect(campoRotulado<HTMLInputElement>(container, 'CPF').value).toBe(mostrado);
  });

  it.each([{ cpf: '' }, { cpf: '529.187.340-1' }])(
    'Continuar com o CPF "$cpf" — recusa com O CPF tem 11 números e fica no passo',
    async ({ cpf }) => {
      const container = await abrir();
      await digitar(campoRotulado<HTMLInputElement>(container, 'CPF'), cpf);

      await clicar(botaoContinuar(container));

      expect(textoDe(container)).toContain('O CPF tem 11 números.');
      expect(campoRotulado<HTMLInputElement>(container, 'CPF').getAttribute('aria-invalid')).toBe('true');
      expect(tituloDoPasso(container)).toBe('Vamos começar pelo seu CPF');
    },
  );

  it('digitar depois do erro — a mensagem some', async () => {
    const container = await abrir();
    await clicar(botaoContinuar(container));

    await digitar(campoRotulado<HTMLInputElement>(container, 'CPF'), '5');

    expect(textoDe(container)).not.toContain('O CPF tem 11 números.');
  });

  it('Enter no campo do CPF — faz o mesmo que Continuar, com erro quando incompleto', async () => {
    const container = await abrir();
    await digitar(campoRotulado<HTMLInputElement>(container, 'CPF'), '529');

    await teclar(campoRotulado<HTMLInputElement>(container, 'CPF'), 'Enter');

    expect(textoDe(container)).toContain('O CPF tem 11 números.');
  });

  it('Enter no campo do CPF completo — segue para o passo do cadastro achado', async () => {
    const container = await abrir();
    await digitar(campoRotulado<HTMLInputElement>(container, 'CPF'), CPF_DE_HELENA);

    await teclar(campoRotulado<HTMLInputElement>(container, 'CPF'), 'Enter');

    expect(tituloDoPasso(container)).toBe('Olá, Helena');
  });

  it('outra tecla no campo do CPF — não segue', async () => {
    const container = await abrir();
    await digitar(campoRotulado<HTMLInputElement>(container, 'CPF'), CPF_DE_HELENA);

    await teclar(campoRotulado<HTMLInputElement>(container, 'CPF'), 'Tab');

    expect(tituloDoPasso(container)).toBe('Vamos começar pelo seu CPF');
  });

  it('CPF com onze dígitos e dígitos verificadores inválidos — é aceito e cai no cadastro novo', async () => {
    const container = await abrir();

    await identificar(container, '111.111.111-11');

    expect(tituloDoPasso(container)).toBe('Seu cadastro');
  });

  it.each([
    { cpf: CPF_DE_HELENA, titulo: 'Olá, Helena' },
    { cpf: CPF_DE_CLARICE, titulo: 'Olá, Clarice' },
    { cpf: CPF_DE_EDUARDO, titulo: 'Olá, Eduardo' },
    { cpf: CPF_SEM_CADASTRO, titulo: 'Seu cadastro' },
  ])('CPF $cpf — leva ao passo "$titulo"', async ({ cpf, titulo }) => {
    const container = await abrir();

    await identificar(container, cpf);

    expect(tituloDoPasso(container)).toBe(titulo);
  });

  it('CPF digitado só com números — acha o mesmo cadastro que o CPF com máscara', async () => {
    const container = await abrir();

    await identificar(container, '33091877542');

    expect(tituloDoPasso(container)).toBe('Olá, Helena');
  });
});

describe('InscricaoPublicaPage: cadastro de quem a casa não conhece', () => {
  it('abertura do cadastro — repete o CPF digitado, anuncia cinco campos e mostra os rótulos', async () => {
    const container = await abrir();

    await identificar(container, CPF_SEM_CADASTRO);

    expect(textoDe(container)).toContain(
      'O CPF 000.000.000-00 ainda não está na casa. São cinco campos, uma vez só — na próxima cerimônia a casa já vai te reconhecer.',
    );
    expect(todos<HTMLLabelElement>(container, 'label').map((etiqueta) => etiqueta.textContent)).toEqual([
      'Nome completo',
      'Data de nascimento',
      'Telefone com WhatsApp',
      'Cidade',
      'E-mail',
    ]);
    expect(textoDe(container)).toContain('Pode ficar em branco. A casa fala com você pelo WhatsApp.');
  });

  it.each([
    { caso: 'tudo em branco', nome: '', nascimento: '', telefone: '', falta: 'Falta nome completo, data de nascimento, telefone.' },
    { caso: 'só o nome', nome: 'Maria', nascimento: '', telefone: '', falta: 'Falta data de nascimento, telefone.' },
    { caso: 'nome e nascimento', nome: 'Maria', nascimento: '01/02/1990', telefone: '', falta: 'Falta telefone.' },
    { caso: 'nome só com espaços', nome: '   ', nascimento: '01/02/1990', telefone: '1', falta: 'Falta nome completo.' },
    { caso: 'nascimento só com espaços', nome: 'Maria', nascimento: '   ', telefone: '1', falta: 'Falta data de nascimento.' },
    { caso: 'telefone só com espaços', nome: 'Maria', nascimento: '01/02/1990', telefone: '   ', falta: 'Falta telefone.' },
  ])('$caso — bloqueia o Continuar e diz o que falta', async ({ nome, nascimento, telefone, falta }) => {
    const container = await abrir();
    await identificar(container, CPF_SEM_CADASTRO);

    await digitar(campoRotulado<HTMLInputElement>(container, 'Nome completo'), nome);
    await digitar(campoRotulado<HTMLInputElement>(container, 'Data de nascimento'), nascimento);
    await digitar(campoRotulado<HTMLInputElement>(container, 'Telefone com WhatsApp'), telefone);

    expect(botaoContinuar(container).disabled).toBe(true);
    expect(botaoContinuar(container).title).toBe(falta);
    expect(textoDe(container)).toContain(falta);
  });

  it('cidade e e-mail — aceitam texto e não entram na lista do que falta', async () => {
    const container = await abrir();
    await identificar(container, CPF_SEM_CADASTRO);

    await digitar(campoRotulado<HTMLInputElement>(container, 'Cidade'), 'Campinas');
    await digitar(campoRotulado<HTMLInputElement>(container, 'E-mail'), 'maria@exemplo.org');

    expect(campoRotulado<HTMLInputElement>(container, 'Cidade').value).toBe('Campinas');
    expect(campoRotulado<HTMLInputElement>(container, 'E-mail').value).toBe('maria@exemplo.org');
    expect(botaoContinuar(container).title).toBe('Falta nome completo, data de nascimento, telefone.');
  });

  it('nome, nascimento e telefone preenchidos — libera Continuar com cidade e e-mail em branco', async () => {
    const container = await abrir();
    await identificar(container, CPF_SEM_CADASTRO);

    await digitar(campoRotulado<HTMLInputElement>(container, 'Nome completo'), 'Maria Silva');
    await digitar(campoRotulado<HTMLInputElement>(container, 'Data de nascimento'), 'qualquer coisa');
    await digitar(campoRotulado<HTMLInputElement>(container, 'Telefone com WhatsApp'), 'x');

    expect(botaoContinuar(container).disabled).toBe(false);
    expect(textoDe(container)).not.toContain('Falta ');
  });

  it('Continuar — leva à anamnese inteira, como primeira vez', async () => {
    const container = await abrir();
    await identificar(container, CPF_SEM_CADASTRO);

    await preencherCadastro(container, 'Maria Silva');

    expect(tituloDoPasso(container)).toBe('Sobre a sua saúde');
    expect(folhaComTexto(container, 'span', 'Primeira vez por aqui')).toBeDefined();
    expect(folhaComTexto(container, 'span', '9 perguntas · leva uns 5 minutos')).toBeDefined();
    expect(textoDe(container)).toContain(
      'A casa pergunta isso para cuidar de você durante o trabalho. Nada aqui impede a sua participação — o que existe é gente lendo com atenção.',
    );
  });
});

describe('InscricaoPublicaPage: anamnese', () => {
  it('quem não tem cadastro — recebe as nove perguntas numeradas, todas com o motivo de primeira vez', async () => {
    const container = await abrir();
    await identificar(container, CPF_SEM_CADASTRO);
    await preencherCadastro(container, 'Maria Silva');

    const numeracao = todos(container, '[data-numeric]')
      .map((marca) => marca.textContent ?? '')
      .filter((texto) => /^\d+\/\d+$/.test(texto));

    expect(numeracao).toEqual(['1/9', '2/9', '3/9', '4/9', '5/9', '6/9', '7/9', '8/9', '9/9']);
    expect(contarFolhas(container, 'span', 'primeira vez')).toBe(9);
    expect(textoDe(container)).not.toContain('respostas suas que a casa já tem');
  });

  it('antes de responder — bloqueia Continuar com as sete obrigatórias contadas no plural', async () => {
    const container = await abrir();
    await identificar(container, CPF_SEM_CADASTRO);
    await preencherCadastro(container, 'Maria Silva');

    expect(botaoContinuar(container).disabled).toBe(true);
    expect(botaoContinuar(container).title).toBe('Faltam 7 perguntas obrigatórias acima.');
  });

  it('com uma obrigatória por responder — o aviso fala no singular', async () => {
    const container = await abrir();
    await identificar(container, CPF_SEM_CADASTRO);
    await preencherCadastro(container, 'Maria Silva');
    await responder(container, MEDICACAO, 'Não');
    await responderOQueMudou(container);

    expect(botaoContinuar(container).title).toBe('Falta 1 pergunta obrigatória acima.');
  });

  it('contato de emergência só com espaços — não conta como respondido', async () => {
    const container = await abrir();
    await identificar(container, CPF_SEM_CADASTRO);
    await preencherCadastro(container, 'Maria Silva');
    await responder(container, MEDICACAO, 'Não');
    await responderOQueMudou(container);

    await digitar(campoPorPlaceholder(container, PLACEHOLDER_DO_CONTATO), '   ');

    expect(botaoContinuar(container).disabled).toBe(true);
  });

  it('todas as obrigatórias respondidas, as opcionais em branco — libera Continuar e segue para a declaração', async () => {
    const container = await abrir();
    await identificar(container, CPF_SEM_CADASTRO);
    await preencherCadastro(container, 'Maria Silva');

    await responderFormularioInteiro(container);

    expect(botaoContinuar(container).disabled).toBe(false);
    await clicar(botaoContinuar(container));
    expect(tituloDoPasso(container)).toBe('Uma última confirmação');
  });

  it('opção marcada — troca de resposta numa pergunta de escolha única e mantém uma só marcada', async () => {
    const container = await abrir();
    await identificar(container, CPF_SEM_CADASTRO);
    await preencherCadastro(container, 'Maria Silva');

    await responder(container, GESTACAO, 'Gestante');
    await responder(container, GESTACAO, 'Não');

    expect(marcado(opcaoDaPergunta(container, 'Gestante', GESTACAO))).toBe(false);
    expect(marcado(opcaoDaPergunta(container, 'Não', GESTACAO))).toBe(true);
  });

  it('Clarice — mostra o delta: sete perguntas, o motivo de cada uma e a frase de só o que mudou', async () => {
    const container = await abrir();

    await identificar(container, CPF_DE_CLARICE);

    expect(tituloDoPasso(container)).toBe('Olá, Clarice');
    expect(textoDe(container)).toContain(
      'Você já respondeu antes e continua no prazo. A casa só pergunta o que mudou desde então.',
    );
    expect(folhaComTexto(container, 'span', 'Só o que mudou')).toBeDefined();
    expect(folhaComTexto(container, 'span', '7 perguntas · leva uns 4 minutos')).toBeDefined();
    expect(contarFolhas(container, 'span', 'nova na v3')).toBe(4);
    expect(textoDe(container)).toContain('substituiu “Tem diagnóstico psiquiátrico?”');
    expect(textoDe(container)).toContain('substituiu “Tem condição cardíaca?”');
    expect(textoDe(container)).toContain('substituiu “Está gestante?”');
    expect(contarFolhas(container, 'span', 'pode ficar em branco')).toBe(2);
    expect(botaoContinuar(container).title).toBe('Faltam 5 perguntas obrigatórias acima.');
  });

  it('Clarice — guarda as duas respostas herdadas fechadas e abre e fecha ao clicar', async () => {
    const container = await abrir();
    await identificar(container, CPF_DE_CLARICE);
    const textoHerdado = 'Bento Fontes · (11) 99420-7781';
    const fechada = textoDe(container).includes(textoHerdado);

    await clicar(botaoComTexto(container, '2 respostas suas que a casa já tem'));
    const aberta = textoDe(container).includes(textoHerdado);
    await clicar(botaoComTexto(container, '2 respostas suas que a casa já tem'));

    expect(fechada).toBe(false);
    expect(aberta).toBe(true);
    expect(textoDe(container).includes(textoHerdado)).toBe(false);
  });

  it('Clarice — a seta do botão das herdadas aponta para a direita fechada e para baixo aberta', async () => {
    const container = await abrir();
    await identificar(container, CPF_DE_CLARICE);
    const setas = () =>
      ['chevron-right', 'chevron-down'].map((nome) => temIcone(botaoComTexto(container, '2 respostas suas que a casa já tem'), nome));
    const fechada = setas();

    await clicar(botaoComTexto(container, '2 respostas suas que a casa já tem'));

    expect(fechada).toEqual([true, false]);
    expect(setas()).toEqual([false, true]);
  });

  it('Clarice com as herdadas abertas — mostra o texto da pergunta e a resposta de cada uma', async () => {
    const container = await abrir();
    await identificar(container, CPF_DE_CLARICE);

    await clicar(botaoComTexto(container, '2 respostas suas que a casa já tem'));

    const herdadas = todos(container, 'span').filter(
      (folha) =>
        folha.childElementCount === 0 &&
        ['Sim', 'Bento Fontes · (11) 99420-7781', 'Contato de emergência (nome e telefone)'].includes(folha.textContent ?? ''),
    );
    expect(herdadas.map((folha) => folha.textContent)).toEqual([
      'Sim',
      'Contato de emergência (nome e telefone)',
      'Bento Fontes · (11) 99420-7781',
    ]);
    expect(textoDe(container)).toContain('Estas perguntas só mudaram de redação desde que você respondeu.');
  });

  it('Clarice — as cinco obrigatórias respondidas, com as duas opcionais em branco, liberam Continuar, e a pergunta herdada da medicação não é refeita', async () => {
    const container = await abrir();
    await identificar(container, CPF_DE_CLARICE);

    await responderOQueMudou(container);

    expect(botaoContinuar(container).disabled).toBe(false);
    expect(todos<HTMLTextAreaElement>(container, 'textarea').map((caixa) => caixa.value)).toEqual(['', '']);
    expect(todos(container, 'button').some((botao) => botao.getAttribute('aria-label') === `Sim — ${MEDICACAO}`)).toBe(false);
  });

  it('Eduardo com a resposta vencida — recebe o formulário inteiro, com o motivo de revalidação', async () => {
    const container = await abrir();

    await identificar(container, CPF_DE_EDUARDO);

    expect(tituloDoPasso(container)).toBe('Olá, Eduardo');
    expect(textoDe(container)).toContain(
      'Sua última resposta venceu. Saúde muda com o tempo, então o formulário volta inteiro — nada do que você respondeu em 2024 é reaproveitado.',
    );
    expect(folhaComTexto(container, 'span', 'Resposta vencida')).toBeDefined();
    expect(folhaComTexto(container, 'span', '9 perguntas · leva uns 5 minutos')).toBeDefined();
    expect(contarFolhas(container, 'span', 'revalidação')).toBe(9);
    expect(textoDe(container)).not.toContain('respostas suas que a casa já tem');
  });

  it('sem resposta alguma — o rodapé diz que o que for respondido fica guardado neste aparelho, com o ícone de celular', async () => {
    const container = await abrir();
    await identificar(container, CPF_DE_EDUARDO);

    const linha = linhaDoRodape(container, 'Pode fechar e voltar depois. O que você responder fica guardado neste aparelho.');

    expect([temIcone(linha, 'smartphone'), temIcone(linha, 'circle-check')]).toEqual([true, false]);
  });

  it.each([
    { respondidas: 1, frase: '1 resposta guardada. Pode fechar e voltar depois — nada se perde.' },
    { respondidas: 2, frase: '2 respostas guardadas. Pode fechar e voltar depois — nada se perde.' },
  ])('$respondidas respondida(s) — o rodapé conta as respostas guardadas e troca o celular pelo check', async ({ respondidas, frase }) => {
    const container = await abrir();
    await identificar(container, CPF_DE_EDUARDO);

    await responder(container, MEDICACAO, 'Não');
    if (respondidas === 2) await responder(container, GESTACAO, 'Não');

    expect(textoDe(container)).toContain(frase);
    expect([temIcone(linhaDoRodape(container, frase), 'circle-check'), temIcone(linhaDoRodape(container, frase), 'smartphone')]).toEqual([
      true,
      false,
    ]);
  });

  it('resposta de texto só com espaços — não entra na contagem das guardadas', async () => {
    const container = await abrir();
    await identificar(container, CPF_DE_EDUARDO);

    await digitar(campoPorPlaceholder(container, PLACEHOLDER_DO_CONTATO), '   ');

    expect(textoDe(container)).toContain('Pode fechar e voltar depois. O que você responder fica guardado neste aparelho.');
    expect(textoDe(container)).not.toContain('guardada');
  });

  it('fechar a tela com respostas dadas e abrir de novo — recomeça no CPF sem nada guardado, ao contrário do que o rodapé promete', async () => {
    const primeira = await montar(<InscricaoPublicaPage />);
    await identificar(primeira.container, CPF_DE_EDUARDO);
    await responder(primeira.container, MEDICACAO, 'Não');
    await primeira.desmontar();

    const segunda = await montar(<InscricaoPublicaPage />);

    expect(tituloDoPasso(segunda.container)).toBe('Vamos começar pelo seu CPF');
    expect(campoRotulado<HTMLInputElement>(segunda.container, 'CPF').value).toBe('');
  });
});

describe('InscricaoPublicaPage: declaração por cerimônia', () => {
  it('Helena com a anamnese em dia — pula a anamnese e mostra a versão, a data e a validade', async () => {
    const container = await abrir();

    await identificar(container, CPF_DE_HELENA);

    expect(tituloDoPasso(container)).toBe('Olá, Helena');
    expect(textoDe(container)).toContain(
      'Sua anamnese está em dia na versão atual. Não há nada novo a responder — só confirmar que continua valendo para este trabalho.',
    );
    expect(folhaComTexto(container, 'span', 'Anamnese v3 respondida em 28/07/2026')).toBeDefined();
    expect(folhaComTexto(container, 'span', 'Vale até 28/07/2027.')).toBeDefined();
  });

  it('declaração desmarcada — Continuar fica bloqueado com o motivo', async () => {
    const container = await abrir();
    await identificar(container, CPF_DE_HELENA);

    const declaracao = elemento<HTMLButtonElement>(container, 'button[role="checkbox"]');

    expect(declaracao.getAttribute('aria-checked')).toBe('false');
    expect(declaracao.textContent).toBe(
      'Declaro que as informações da minha anamnese seguem verdadeiras para este trabalho e que avisarei a casa se algo mudar até a data.',
    );
    expect(botaoContinuar(container).disabled).toBe(true);
    expect(botaoContinuar(container).title).toBe('Marque a declaração acima para seguir.');
  });

  it('a saída de quem mudou de condição — o cartão e o botão levam o ícone de girar', async () => {
    const container = await abrir();
    await identificar(container, CPF_DE_HELENA);

    expect(temIcone(botaoComTexto(container, 'Quero responder de novo'), 'rotate-ccw')).toBe(true);
    expect(todos(container, 'svg.lucide-rotate-ccw')).toHaveLength(2);
  });

  it('declaração — o marcador leva o ícone de check só enquanto está marcada', async () => {
    const container = await abrir();
    await identificar(container, CPF_DE_HELENA);
    const declaracao = elemento<HTMLButtonElement>(container, 'button[role="checkbox"]');
    const antes = temIcone(declaracao, 'check');

    await clicar(declaracao);
    const marcada = temIcone(declaracao, 'check');
    await clicar(declaracao);

    expect([antes, marcada, temIcone(declaracao, 'check')]).toEqual([false, true, false]);
  });

  it('declaração marcada — libera Continuar, e desmarcar de novo bloqueia', async () => {
    const container = await abrir();
    await identificar(container, CPF_DE_HELENA);
    const declaracao = elemento<HTMLButtonElement>(container, 'button[role="checkbox"]');

    await clicar(declaracao);
    const liberouAoMarcar = !botaoContinuar(container).disabled;
    await clicar(declaracao);

    expect(liberouAoMarcar).toBe(true);
    expect(declaracao.getAttribute('aria-checked')).toBe('false');
    expect(botaoContinuar(container).disabled).toBe(true);
  });

  it('Continuar com a declaração marcada — leva à participação', async () => {
    const container = await abrir();
    await identificar(container, CPF_DE_HELENA);

    await declarar(container);

    expect(tituloDoPasso(container)).toBe('Sua participação');
  });

  it('Clarice depois de responder o delta — pede a última confirmação e mostra a v2 que a casa tem, atualizada para a v3', async () => {
    const container = await abrir();
    await identificar(container, CPF_DE_CLARICE);
    await responderOQueMudou(container);

    await clicar(botaoContinuar(container));

    expect(tituloDoPasso(container)).toBe('Uma última confirmação');
    expect(textoDe(container)).toContain('Anamnese respondida. Falta só você confirmar que vale para este trabalho.');
    expect(folhaComTexto(container, 'span', 'Anamnese v2 respondida em 20/11/2025')).toBeDefined();
    expect(folhaComTexto(container, 'span', 'Atualizada agora para a v3.')).toBeDefined();
  });

  it('quem não tinha cadastro — a declaração não mostra o cartão do que a casa tem', async () => {
    const container = await abrir();
    await identificar(container, CPF_SEM_CADASTRO);
    await preencherCadastro(container, 'Maria Silva');
    await responderFormularioInteiro(container);

    await clicar(botaoContinuar(container));

    expect(tituloDoPasso(container)).toBe('Uma última confirmação');
    expect(textoDe(container)).not.toContain('O que a casa tem de você');
  });

  it('a saída de quem mudou de condição — fica ao lado da declaração, com o convite a responder de novo', async () => {
    const container = await abrir();
    await identificar(container, CPF_DE_HELENA);

    expect(textoDe(container)).toContain('Mudou alguma coisa na sua saúde?');
    expect(botaoComTexto(container, 'Quero responder de novo').type).toBe('button');
  });

  it('Quero responder de novo — volta à anamnese inteira, a seu pedido, e some a lista de herdadas', async () => {
    const container = await abrir();
    await identificar(container, CPF_DE_HELENA);

    await clicar(botaoComTexto(container, 'Quero responder de novo'));

    expect(tituloDoPasso(container)).toBe('Vamos do começo');
    expect(textoDe(container)).toContain(
      'Você pediu para responder de novo, então o formulário vem inteiro. O que você escrever agora substitui o que a casa tinha.',
    );
    expect(folhaComTexto(container, 'span', 'A seu pedido')).toBeDefined();
    expect(folhaComTexto(container, 'span', '9 perguntas · leva uns 5 minutos')).toBeDefined();
    expect(contarFolhas(container, 'span', 'a seu pedido')).toBe(9);
  });

  it('refazer a anamnese de quem tinha herdadas — esconde as herdadas e pede o formulário inteiro', async () => {
    const container = await abrir();
    await identificar(container, CPF_DE_CLARICE);
    await responderOQueMudou(container);
    await clicar(botaoContinuar(container));

    await clicar(botaoComTexto(container, 'Quero responder de novo'));

    expect(textoDe(container)).not.toContain('respostas suas que a casa já tem');
    expect(botaoContinuar(container).title).toBe('Faltam 7 perguntas obrigatórias acima.');
  });

  it('refazer a anamnese — zera as respostas dadas e desmarca a declaração', async () => {
    const container = await abrir();
    await identificar(container, CPF_DE_CLARICE);
    await responderOQueMudou(container);
    await clicar(botaoContinuar(container));
    await clicar(elemento<HTMLButtonElement>(container, 'button[role="checkbox"]'));

    await clicar(botaoComTexto(container, 'Quero responder de novo'));

    expect(textoDe(container)).toContain('Pode fechar e voltar depois. O que você responder fica guardado neste aparelho.');
    await responderFormularioInteiro(container);
    await clicar(botaoContinuar(container));
    expect(elemento<HTMLButtonElement>(container, 'button[role="checkbox"]').getAttribute('aria-checked')).toBe('false');
  });

  it('declaração depois de refazer — diz que a v3 foi respondida agora, mostra o que ela substitui e não oferece refazer', async () => {
    const container = await abrir();
    await identificar(container, CPF_DE_HELENA);
    await clicar(botaoComTexto(container, 'Quero responder de novo'));
    await responderFormularioInteiro(container);

    await clicar(botaoContinuar(container));

    expect(tituloDoPasso(container)).toBe('Uma última confirmação');
    expect(folhaComTexto(container, 'span', 'Anamnese v3 respondida agora, por você')).toBeDefined();
    expect(
      folhaComTexto(
        container,
        'span',
        'Substitui a resposta de 28/07/2026. A anterior fica no histórico da casa, sem valer mais.',
      ),
    ).toBeDefined();
    expect(textoDe(container)).not.toContain('Quero responder de novo');
  });
});

describe('InscricaoPublicaPage: participação, valor e total', () => {
  it('abertura da participação — oferece os três níveis sugeridos, nenhum marcado, e o campo vazio', async () => {
    const container = await chegarEmParticipacaoComoHelena();

    expect(tituloDoPasso(container)).toBe('Sua participação');
    expect(['Social', 'Sustentável', 'Próspero'].map((nivel) => botaoDoNivel(container, nivel).textContent)).toEqual([
      'SocialR$ 80,00Para quem está com a condição apertada. Ninguém precisa explicar por que escolheu este.',
      'SustentávelR$ 160,00O que cobre o custo do trabalho por pessoa. É a referência da casa.',
      'PrósperoR$ 240,00Para quem pode sustentar a própria participação e um pouco da de outra pessoa.',
    ]);
    expect(['Social', 'Sustentável', 'Próspero'].map((nivel) => marcado(botaoDoNivel(container, nivel)))).toEqual([
      false,
      false,
      false,
    ]);
    expect(campoDaContribuicao(container).value).toBe('');
    expect(campoDaContribuicao(container).inputMode).toBe('decimal');
  });

  it.each([
    { nivel: 'Social', valor: '80,00' },
    { nivel: 'Sustentável', valor: '160,00' },
    { nivel: 'Próspero', valor: '240,00' },
  ])('escolher o nível $nivel — marca o botão e preenche o campo com $valor', async ({ nivel, valor }) => {
    const container = await chegarEmParticipacaoComoHelena();

    await clicarNoNivel(container, nivel);

    expect(marcado(botaoDoNivel(container, nivel))).toBe(true);
    expect(campoDaContribuicao(container).value).toBe(valor);
  });

  it('digitar depois de escolher um nível — desmarca o nível', async () => {
    const container = await chegarEmParticipacaoComoHelena();
    await clicarNoNivel(container, 'Sustentável');

    await digitar(campoDaContribuicao(container), '170');

    expect(marcado(botaoDoNivel(container, 'Sustentável'))).toBe(false);
  });

  it.each([
    { valor: '79,99', abaixo: true, acima: false },
    { valor: '80', abaixo: false, acima: false },
    { valor: '240', abaixo: false, acima: false },
    { valor: '240,01', abaixo: false, acima: true },
    { valor: '1.000.000,00', abaixo: false, acima: true },
    { valor: '0', abaixo: false, acima: false },
  ])('valor $valor — avisa abaixo do social: $abaixo, acima do próspero: $acima', async ({ valor, abaixo, acima }) => {
    const container = await chegarEmParticipacaoComoHelena();

    await digitar(campoDaContribuicao(container), valor);

    expect(textoDe(container).includes('Abaixo do valor social, e tudo bem. Se quiser conversar sobre isso, a recepção está no WhatsApp.')).toBe(abaixo);
    expect(textoDe(container).includes('Obrigado — isso é contribuição voluntária acima do sugerido.')).toBe(acima);
  });

  it('hospedagem — lista as quatro opções com o custo por dia, a primeira marcada', async () => {
    const container = await chegarEmParticipacaoComoHelena();

    const opcoes = ['Não vai dormir na casa', 'Colchonete próprio na igreja', 'Beliche no dormitório', 'Quarto'].map(
      (rotulo) => elemento<HTMLButtonElement>(container, `button[aria-label="${rotulo}"]`),
    );

    expect(opcoes.map((opcao) => elemento(opcao, '[data-numeric]').textContent)).toEqual([
      'sem custo',
      'sem custo',
      'R$ 50,00 / dia',
      'R$ 90,00 / dia',
    ]);
    expect(opcoes.map(marcado)).toEqual([true, false, false, false]);
    expect(opcoes.map((opcao) => opcao.textContent)).toEqual([
      'Não vai dormir na casaVai embora depois do trabalho.sem custo',
      'Colchonete próprio na igrejaGrátis. Não entra na contribuição nem gera lançamento — a casa só precisa saber quem fica.sem custo',
      'Beliche no dormitórioPago à parte por quem usa a acomodação.R$ 50,00 / dia',
      'QuartoPago à parte por quem usa a acomodação.R$ 90,00 / dia',
    ]);
  });

  it('hospedagem — só a opção marcada leva o ícone de check no marcador, e o marcador é redondo', async () => {
    const container = await chegarEmParticipacaoComoHelena();
    const rotulos = ['Não vai dormir na casa', 'Colchonete próprio na igreja', 'Beliche no dormitório', 'Quarto'];
    const opcao = (rotulo: string) => elemento<HTMLButtonElement>(container, `button[aria-label="${rotulo}"]`);
    const icones = () => rotulos.map((rotulo) => temIcone(opcao(rotulo), 'check'));
    const antes = icones();

    await escolherHospedagem(container, 'Quarto');

    expect(antes).toEqual([true, false, false, false]);
    expect(icones()).toEqual([false, false, false, true]);
    expect(rotulos.map((rotulo) => elemento<HTMLSpanElement>(opcao(rotulo), 'span[aria-hidden]').style.borderRadius)).toEqual([
      '50%',
      '50%',
      '50%',
      '50%',
    ]);
  });

  it('hospedagem sem custo — não mostra a linha de acomodação', async () => {
    const container = await chegarEmParticipacaoComoHelena();

    await escolherHospedagem(container, 'Colchonete próprio na igreja');

    expect(textoDe(container)).not.toContain('de acomodação');
  });

  it.each([
    { hospedagem: 'Beliche no dormitório', custo: 'R$ 50,00' },
    { hospedagem: 'Quarto', custo: 'R$ 90,00' },
  ])('$hospedagem — a acomodação é sempre uma diária de $custo, sem controle para mudar os dias', async ({ hospedagem, custo }) => {
    const container = await chegarEmParticipacaoComoHelena();

    await escolherHospedagem(container, hospedagem);

    expect(textoDe(container)).toContain(`1 diária · ${custo} de acomodação, à parte da contribuição.`);
    expect(todos(container, 'select')).toHaveLength(0);
    expect(textoDe(container)).not.toContain('Quantas diárias');
  });

  it('o evento da Lua Cheia — a participação não oferece alimentação nem refeição alguma', async () => {
    const container = await chegarEmParticipacaoComoHelena();

    expect(textoDe(container)).not.toContain('Alimentação');
    expect(textoDe(container)).not.toContain('Ceia');
    expect(textoDe(container)).not.toContain('Almoço');
  });

  it('sem valor digitado — o total fica A combinar e não mostra o resumo', async () => {
    const container = await chegarEmParticipacaoComoHelena();

    expect(folhaComTexto(container, 'span', 'A combinar')).toBeDefined();
    expect(textoDe(container)).not.toContain('de contribuição');
    expect(textoDe(container)).toContain('Você não paga por aqui. O pagamento é combinado com a recepção.');
  });

  it('valor digitado — o total mostra a contribuição sozinha quando não há hospedagem', async () => {
    const container = await chegarEmParticipacaoComoHelena();

    await digitar(campoDaContribuicao(container), '120');

    expect(folhaComTexto(container, 'span', 'R$ 120,00')).toBeDefined();
    expect(folhaComTexto(container, 'span', 'R$ 120,00 de contribuição')).toBeDefined();
  });

  it('nível sustentável com beliche — o total soma a contribuição e uma diária, com o resumo dos dois', async () => {
    const container = await chegarEmParticipacaoComoHelena();
    await clicarNoNivel(container, 'Sustentável');

    await escolherHospedagem(container, 'Beliche no dormitório');

    expect(folhaComTexto(container, 'span', 'R$ 210,00')).toBeDefined();
    expect(folhaComTexto(container, 'span', 'R$ 160,00 de contribuição · R$ 50,00 de acomodação')).toBeDefined();
  });

  it('nível próspero com quarto — o total soma R$ 240,00 e R$ 90,00', async () => {
    const container = await chegarEmParticipacaoComoHelena();
    await clicarNoNivel(container, 'Próspero');

    await escolherHospedagem(container, 'Quarto');

    expect(folhaComTexto(container, 'span', 'R$ 330,00')).toBeDefined();
  });

  it('hospedagem trocada por outra sem custo — o total volta a ser só a contribuição', async () => {
    const container = await chegarEmParticipacaoComoHelena();
    await clicarNoNivel(container, 'Sustentável');
    await escolherHospedagem(container, 'Quarto');

    await escolherHospedagem(container, 'Colchonete próprio na igreja');

    expect(folhaComTexto(container, 'span', 'R$ 160,00')).toBeDefined();
    expect(textoDe(container)).not.toContain('de acomodação');
  });

  it.each([
    { digitado: '1.500,50', total: 'R$ 1.500,50' },
    { digitado: '1.500.000,00', total: 'R$ 1.500.000,00' },
    { digitado: '160,5', total: 'R$ 160,50' },
    { digitado: '0', total: 'R$ 0,00' },
    { digitado: '1.5', total: 'R$ 15,00' },
    { digitado: 'abc', total: 'R$ 0,00' },
    { digitado: '-50', total: 'R$ -50,00' },
  ])('valor "$digitado" — o total sai $total, sem voltar a A combinar', async ({ digitado, total }) => {
    const container = await chegarEmParticipacaoComoHelena();

    await digitar(campoDaContribuicao(container), digitado);

    expect(folhaComTexto(container, 'span', total)).toBeDefined();
    expect(textoDe(container)).not.toContain('A combinar');
  });

  it('valor só com espaços — continua A combinar', async () => {
    const container = await chegarEmParticipacaoComoHelena();

    await digitar(campoDaContribuicao(container), '   ');

    expect(folhaComTexto(container, 'span', 'A combinar')).toBeDefined();
  });

  it('hospedagem paga com o campo de valor em branco — o total fica A combinar e a acomodação só aparece na linha da hospedagem', async () => {
    const container = await chegarEmParticipacaoComoHelena();

    await escolherHospedagem(container, 'Quarto');

    expect(folhaComTexto(container, 'span', 'A combinar')).toBeDefined();
    expect(textoDe(container)).toContain('1 diária · R$ 90,00 de acomodação, à parte da contribuição.');
    expect(textoDe(container)).not.toContain('de contribuição');
  });
});

describe('InscricaoPublicaPage: contato de emergência e restrições na participação', () => {
  it('Helena com os dois dados no cadastro — chegam preenchidos e liberam o envio', async () => {
    const container = await chegarEmParticipacaoComoHelena();

    expect(campoRotulado<HTMLInputElement>(container, 'Contato de emergência').value).toBe('Paulo Duarte · (11) 99000-8877');
    expect(campoRotulado<HTMLInputElement>(container, 'Restrições alimentares').value).toBe('Não come carne vermelha');
    expect(botaoDeEnviar(container).disabled).toBe(false);
    expect(textoDe(container)).not.toContain(FRASE_DE_ENVIO_BLOQUEADO);
    expect(todos(container, 'button').some((botao) => botao.textContent === 'Não tenho nenhuma')).toBe(false);
  });

  it('Clarice sem restrição no cadastro — o contato chega preenchido e o envio fica bloqueado pelas restrições', async () => {
    const container = await chegarEmParticipacaoComoClarice();

    expect(campoRotulado<HTMLInputElement>(container, 'Contato de emergência').value).toBe('Bento Fontes · (11) 99420-7781');
    expect(botaoDeEnviar(container).disabled).toBe(true);
    expect(botaoDeEnviar(container).title).toBe('Falta preencher: restrições alimentares.');
  });

  it('quem não tinha cadastro — chega com os dois campos vazios e o envio bloqueado pelos dois', async () => {
    const container = await chegarEmParticipacaoComoNovo('Maria Silva');

    expect(campoRotulado<HTMLInputElement>(container, 'Contato de emergência').value).toBe('');
    expect(botaoDeEnviar(container).title).toBe('Falta preencher: contato de emergência e restrições alimentares.');
  });

  it('contato dado na anamnese — não preenche o campo de contato da participação, que pede de novo', async () => {
    const container = await abrir();
    await identificar(container, CPF_SEM_CADASTRO);
    await preencherCadastro(container, 'Maria Silva');
    await responderFormularioInteiro(container);
    const contatoNaAnamnese = campoPorPlaceholder(container, PLACEHOLDER_DO_CONTATO).value;
    await clicar(botaoContinuar(container));
    await declarar(container);

    expect(contatoNaAnamnese).toBe('Paulo · (11) 98888-7777');
    expect(campoRotulado<HTMLInputElement>(container, 'Contato de emergência').value).toBe('');
  });

  it('Não tenho nenhuma — preenche Nenhuma e o botão some', async () => {
    const container = await chegarEmParticipacaoComoClarice();

    await clicar(botaoComTexto(container, 'Não tenho nenhuma'));

    expect(campoRotulado<HTMLInputElement>(container, 'Restrições alimentares').value).toBe('Nenhuma');
    expect(todos(container, 'button').some((botao) => botao.textContent === 'Não tenho nenhuma')).toBe(false);
    expect(botaoDeEnviar(container).disabled).toBe(false);
  });

  it('contato de emergência só com espaços — conta como faltando', async () => {
    const container = await chegarEmParticipacaoComoHelena();

    await digitar(campoRotulado<HTMLInputElement>(container, 'Contato de emergência'), '   ');

    expect(botaoDeEnviar(container).title).toBe('Falta preencher: contato de emergência.');
  });

  it('restrições só com espaços — contam como faltando e o botão de nenhuma continua', async () => {
    const container = await chegarEmParticipacaoComoHelena();

    await digitar(campoRotulado<HTMLInputElement>(container, 'Restrições alimentares'), '   ');

    expect(botaoDeEnviar(container).title).toBe('Falta preencher: restrições alimentares.');
    expect(botaoComTexto(container, 'Não tenho nenhuma').type).toBe('button');
  });
});

describe('InscricaoPublicaPage: inscrição enviada', () => {
  it('tela final — o cartão do evento leva o ícone de círculo com check', async () => {
    const container = await chegarEmParticipacaoComoHelena();

    await clicar(botaoDeEnviar(container));

    expect(temIcone(container, 'circle-check')).toBe(true);
  });

  it('Helena com valor — a tela final traz o nome, o evento, o total e o aviso de privacidade', async () => {
    const container = await chegarEmParticipacaoComoHelena();
    await clicarNoNivel(container, 'Sustentável');

    await clicar(botaoDeEnviar(container));

    expect(tituloDoPasso(container)).toBe('Inscrição enviada');
    expect(textoDe(container)).toContain('Está tudo com a casa, Helena. A recepção confirma a sua vaga pelo WhatsApp.');
    expect(textoDe(container)).toContain('Trabalho de Lua Cheia — 12/09/2026');
    expect(folhaComTexto(container, 'span', 'R$ 160,00 combinados.')).toBeDefined();
    expect(textoDe(container)).toContain('Suas respostas de saúde ficam guardadas com a casa e só o acolhimento consegue abrir');
  });

  it('enviar sem valor — o resumo diz que o valor fica a combinar com a recepção', async () => {
    const container = await chegarEmParticipacaoComoHelena();

    await clicar(botaoDeEnviar(container));

    expect(folhaComTexto(container, 'span', 'Valor a combinar com a recepção.')).toBeDefined();
    expect(textoDe(container)).not.toContain('combinados.');
  });

  it('enviar com beliche — o total do resumo inclui a diária', async () => {
    const container = await chegarEmParticipacaoComoHelena();
    await clicarNoNivel(container, 'Sustentável');
    await escolherHospedagem(container, 'Beliche no dormitório');

    await clicar(botaoDeEnviar(container));

    expect(folhaComTexto(container, 'span', 'R$ 210,00 combinados.')).toBeDefined();
  });

  it('enviar com hospedagem paga e sem valor digitado — o resumo diz a combinar e não cita a acomodação', async () => {
    const container = await chegarEmParticipacaoComoHelena();
    await escolherHospedagem(container, 'Quarto');

    await clicar(botaoDeEnviar(container));

    expect(folhaComTexto(container, 'span', 'Valor a combinar com a recepção.')).toBeDefined();
    expect(textoDe(container)).not.toContain('R$ 90,00');
  });

  it('quem já participou — não recebe o aviso da conversa de primeira vez', async () => {
    const container = await chegarEmParticipacaoComoHelena();

    await clicar(botaoDeEnviar(container));

    expect(textoDe(container)).not.toContain('Antes do trabalho');
  });

  it('quem se cadastrou agora — usa o primeiro nome sem espaços sobrando e recebe o aviso da conversa de primeira vez', async () => {
    const container = await chegarEmParticipacaoComoNovo('  Maria   Silva ');
    await clicar(botaoComTexto(container, 'Não tenho nenhuma'));
    await digitar(campoRotulado<HTMLInputElement>(container, 'Contato de emergência'), 'Ana · 1');

    await clicar(botaoDeEnviar(container));

    expect(textoDe(container)).toContain('Está tudo com a casa, Maria. A recepção confirma a sua vaga pelo WhatsApp.');
    expect(textoDe(container)).toContain('Antes do trabalho');
    expect(textoDe(container)).toContain('Como é a sua primeira vez, alguém da casa vai te chamar para uma conversa.');
  });

  it('respostas sem alerta — não mostra o cartão do que a casa vai ler com atenção', async () => {
    const container = await chegarEmParticipacaoComoNovo('Maria Silva');
    await clicar(botaoComTexto(container, 'Não tenho nenhuma'));
    await digitar(campoRotulado<HTMLInputElement>(container, 'Contato de emergência'), 'Ana · 1');

    await clicar(botaoDeEnviar(container));

    expect(textoDe(container)).not.toContain('O que você declarou e a casa vai ler com atenção');
  });

  it('respostas com alerta — lista as mensagens dos pontos de atenção na ordem das perguntas', async () => {
    const container = await abrir();
    await identificar(container, CPF_SEM_CADASTRO);
    await preencherCadastro(container, 'Maria Silva');
    await responder(container, MEDICACAO, 'Sim');
    await responder(container, PSIQUIATRICO, 'Sim, em acompanhamento');
    await responder(container, CONDICAO, 'Hipertensão');
    await responder(container, GESTACAO, 'Gestante');
    await responder(container, SUBSTANCIAS, 'Sim');
    await responder(container, EXPERIENCIA, 'Não');
    await digitar(campoPorPlaceholder(container, PLACEHOLDER_DO_CONTATO), 'Paulo · 1');
    await digitarEmCaixa(todos<HTMLTextAreaElement>(container, 'textarea')[0]!, 'Fluoxetina 20mg');
    await clicar(botaoContinuar(container));
    await declarar(container);
    await clicar(botaoComTexto(container, 'Não tenho nenhuma'));
    await digitar(campoRotulado<HTMLInputElement>(container, 'Contato de emergência'), 'Ana · 1');

    await clicar(botaoDeEnviar(container));

    expect(textoDe(container)).toContain('O que você declarou e a casa vai ler com atenção');
    expect(textoDe(container)).toContain(
      'Uso de medicação contínua declarado · Medicação declarada — conferir interação · Diagnóstico psiquiátrico declarado · Condição clínica declarada · Gestante — participação fora do salão · Uso recente declarado.',
    );
    expect(textoDe(container)).toContain('Nada disso impede a sua participação.');
  });

  it('Clarice com medicação contínua herdada como Sim — o ponto de atenção da resposta herdada não chega à tela final', async () => {
    const container = await chegarEmParticipacaoComoClarice();
    await clicar(botaoComTexto(container, 'Não tenho nenhuma'));

    await clicar(botaoDeEnviar(container));

    expect(textoDe(container)).not.toContain('O que você declarou e a casa vai ler com atenção');
    expect(textoDe(container)).not.toContain('Uso de medicação contínua declarado');
  });

  it('Clarice — o resumo final usa o primeiro nome do cadastro e não oferece a conversa de primeira vez', async () => {
    const container = await chegarEmParticipacaoComoClarice();
    await clicar(botaoComTexto(container, 'Não tenho nenhuma'));

    await clicar(botaoDeEnviar(container));

    expect(textoDe(container)).toContain('Está tudo com a casa, Clarice.');
    expect(textoDe(container)).not.toContain('Antes do trabalho');
  });
});

describe('InscricaoPublicaPage: densidade', () => {
  it.each([
    { campo: false, colunas: 'repeat(3,minmax(0,1fr))', minimo: 'var(--target-office)' },
    { campo: true, colunas: '1fr', minimo: 'var(--target-field)' },
  ])('campo=$campo — níveis em $colunas e botão de enviar com alvo $minimo', async ({ campo, colunas, minimo }) => {
    definirDensidade(campo);
    const container = await chegarEmParticipacaoComoHelena();

    expect(botaoDoNivel(container, 'Social').parentElement?.style.gridTemplateColumns.replace(/ /g, '')).toBe(colunas);
    expect(botaoDeEnviar(container).style.minHeight).toBe(minimo);
  });

  it.each([
    { campo: false, minimo: 'var(--target-office)' },
    { campo: true, minimo: 'var(--target-field)' },
  ])('campo=$campo — o cadastro usa campos e botão com alvo $minimo', async ({ campo, minimo }) => {
    definirDensidade(campo);
    const container = await abrir();
    await identificar(container, CPF_SEM_CADASTRO);

    const alvos = [...todos<HTMLInputElement>(container, 'input'), botaoContinuar(container)].map(
      (alvo) => alvo.style.minHeight,
    );

    expect(alvos).toEqual([minimo, minimo, minimo, minimo, minimo, minimo]);
  });

  it.each([
    { campo: false, minimo: 'var(--target-office)' },
    { campo: true, minimo: 'var(--target-field)' },
  ])('campo=$campo — o botão Continuar da anamnese usa o alvo $minimo', async ({ campo, minimo }) => {
    definirDensidade(campo);
    const container = await abrir();
    await identificar(container, CPF_DE_EDUARDO);

    expect(botaoContinuar(container).style.minHeight).toBe(minimo);
  });

  it('campo — o percurso de quem já tem cadastro chega ao mesmo total e à mesma tela final', async () => {
    definirDensidade(true);
    const container = await chegarEmParticipacaoComoHelena();
    await clicarNoNivel(container, 'Sustentável');
    await escolherHospedagem(container, 'Beliche no dormitório');

    await clicar(botaoDeEnviar(container));

    expect(folhaComTexto(container, 'span', 'R$ 210,00 combinados.')).toBeDefined();
  });

  it.each([
    { campo: false, minimo: '' },
    { campo: true, minimo: 'var(--target-field)' },
  ])('campo=$campo — níveis e hospedagens só ganham alvo mínimo em campo', async ({ campo, minimo }) => {
    definirDensidade(campo);
    const container = await chegarEmParticipacaoComoHelena();
    const botoes = [
      ...['Social', 'Sustentável', 'Próspero'].map((nivel) => botaoDoNivel(container, nivel)),
      ...['Não vai dormir na casa', 'Colchonete próprio na igreja', 'Beliche no dormitório', 'Quarto'].map((rotulo) =>
        elemento<HTMLButtonElement>(container, `button[aria-label="${rotulo}"]`),
      ),
    ];

    expect(botoes.map((botao) => botao.style.minHeight)).toEqual(Array(7).fill(minimo));
  });

  it.each([
    { campo: false, minimo: 'var(--target-office)' },
    { campo: true, minimo: 'var(--target-field)' },
  ])('campo=$campo — contribuição, contato de emergência e restrições usam o alvo $minimo', async ({ campo, minimo }) => {
    definirDensidade(campo);
    const container = await chegarEmParticipacaoComoHelena();

    const alvos = ['Quanto você vai contribuir', 'Contato de emergência', 'Restrições alimentares'].map(
      (rotulo) => campoRotulado<HTMLInputElement>(container, rotulo).style.minHeight,
    );

    expect(alvos).toEqual([minimo, minimo, minimo]);
  });

  it.each([{ campo: false }, { campo: true }])(
    'campo=$campo — Não tenho nenhuma fica no alvo de escritório, sem acompanhar a densidade',
    async ({ campo }) => {
      definirDensidade(campo);
      const container = await chegarEmParticipacaoComoClarice();

      expect(botaoComTexto(container, 'Não tenho nenhuma').style.minHeight).toBe('var(--target-office)');
    },
  );
});
