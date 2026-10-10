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
import { InscricaoPage } from './InscricaoPage';

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

const LUA_CHEIA = 'Lua Cheia · 12/09';
const JORNADA = 'Jornada · 24–26/10';
const PESSOAS_DO_DIRETORIO = [
  'Helena Duarte',
  'Marina Tavares',
  'Eduardo Pires',
  'Sérgio Bittencourt',
  'Antônio Duarte',
  'Bruna Camargo',
];

const textoDe = (container: HTMLElement) => container.textContent ?? '';
const marcado = (botao: HTMLElement) => botao.getAttribute('aria-pressed') === 'true';

async function abrir() {
  const { container } = await montar(<InscricaoPage />);
  return container;
}

function botaoDaPessoa(container: HTMLElement, nome: string) {
  const botao = folhaComTexto(container, 'span', nome).closest('button');
  if (!botao) throw new Error(`pessoa sem botão: ${nome}`);
  return botao;
}

async function abrirComPessoa(nome: string) {
  const container = await abrir();
  await clicar(botaoDaPessoa(container, nome));
  return container;
}

function campoRotulado<T extends HTMLElement>(container: HTMLElement, rotulo: string) {
  const etiqueta = todos<HTMLLabelElement>(container, 'label').find((candidata) => candidata.textContent === rotulo);
  if (!etiqueta) throw new Error(`campo sem rótulo: ${rotulo}`);
  return elemento<T>(container, `[id="${etiqueta.htmlFor}"]`);
}

const existeCampoRotulado = (container: HTMLElement, rotulo: string) =>
  todos<HTMLLabelElement>(container, 'label').some((candidata) => candidata.textContent === rotulo);

const interruptor = (container: HTMLElement, rotulo: string) =>
  elemento<HTMLButtonElement>(container, `button[role="switch"][aria-label="${rotulo}"]`);

const opcaoEmLinha = (container: HTMLElement, rotulo: string) =>
  elemento<HTMLButtonElement>(container, `button[aria-label="${rotulo}"]`);

function botaoDoNivel(container: HTMLElement, nivel: string) {
  const botao = folhaComTexto(container, 'span', nivel).closest('button');
  if (!botao) throw new Error(`nível sem botão: ${nivel}`);
  return botao;
}

const pendenciasMostradas = (container: HTMLElement) =>
  todos(container, 'code')
    .filter((codigo) => /^IN\d+$/.test(codigo.textContent ?? ''))
    .map((codigo) => [codigo.previousElementSibling?.textContent, codigo.textContent]);

const botaoDeConfirmar = (container: HTMLElement) => {
  const achado = todos<HTMLButtonElement>(container, 'button').find((botao) =>
    botao.textContent?.startsWith('Confirmar a inscrição de'),
  );
  if (!achado) throw new Error('botão de confirmar não encontrado');
  return achado;
};

const recadoMostrado = (container: HTMLElement) => elemento(container, '[role="status"] > span').textContent;
const existeRecado = (container: HTMLElement) => container.querySelector('[role="status"]') !== null;

const trocarEvento = (container: HTMLElement, abreviacao: string) => clicar(botaoComTexto(container, abreviacao));
const trocarTipo = (container: HTMLElement, tipo: string) => clicar(botaoComTexto(container, tipo));
const campoDoValor = (container: HTMLElement) => campoRotulado<HTMLInputElement>(container, 'Valor combinado');
const clicarNoNivel = (container: HTMLElement, nivel: string) => clicar(botaoDoNivel(container, nivel));
const escolherHospedagem = (container: HTMLElement, rotulo: string) => clicar(opcaoEmLinha(container, rotulo));
const seletorDeDiarias = (container: HTMLElement) => campoRotulado<HTMLSelectElement>(container, 'Quantas diárias');
const escolherDiarias = (container: HTMLElement, diarias: string) => escolherOpcao(seletorDeDiarias(container), diarias);
const seletorDeResponsavel = (container: HTMLElement) =>
  campoRotulado<HTMLSelectElement>(container, 'Responsável neste trabalho');
const escolherResponsavel = (container: HTMLElement, nome: string) => escolherOpcao(seletorDeResponsavel(container), nome);
const temIcone = (origem: ParentNode, nome: string) => origem.querySelector(`svg.lucide-${nome}`) !== null;
const marcadorDaOpcao = (opcao: HTMLElement) => elemento<HTMLSpanElement>(opcao, 'span[aria-hidden]');
const corDoSelo = (container: HTMLElement, selo: string) => folhaComTexto<HTMLSpanElement>(container, 'span', selo).style.color;
const linkEstaCopiado = (container: HTMLElement) =>
  todos<HTMLButtonElement>(container, 'button').some((botao) => botao.textContent === 'Copiado');

const SEM_PENDENCIA: string[][] = [];
const PENDENCIA_DE_EMERGENCIA = ['Contato de emergência e restrição alimentar', 'IN4'];

describe('InscricaoPage: abertura e escolha do evento', () => {
  it('escritório — mostra o código com o nome da tela, o título e o subtítulo', async () => {
    const container = await abrir();

    expect(folhaComTexto(container, 'div', 'E-06 · Inscrição')).toBeDefined();
    expect(elemento(container, 'h1').textContent).toBe('Inscrição');
    expect(folhaComTexto(container, 'p', 'Inscrever alguém num trabalho · CDD')).toBeDefined();
  });

  it('campo — mostra só o código E-06, sem o nome da tela e sem subtítulo', async () => {
    definirDensidade(true);

    const container = await abrir();

    expect(folhaComTexto(container, 'div', 'E-06')).toBeDefined();
    expect(textoDe(container)).not.toContain('E-06 · Inscrição');
    expect(container.querySelector('header p')).toBeNull();
  });

  it('abertura — o primeiro evento vem marcado, com nome, data, local e ocupação', async () => {
    const container = await abrir();

    expect(marcado(botaoComTexto(container, LUA_CHEIA))).toBe(true);
    expect(marcado(botaoComTexto(container, JORNADA))).toBe(false);
    expect(textoDe(container)).toContain('Trabalho de Lua Cheia — 12/09/2026');
    expect(textoDe(container)).toContain('Chácara · Ibiúna');
    expect(folhaComTexto(container, 'span', '34 de 60 · 6 leitos livres')).toBeDefined();
  });

  it('trocar para a Jornada — troca nome, data e ocupação e marca o botão escolhido', async () => {
    const container = await abrir();

    await trocarEvento(container, JORNADA);

    expect(marcado(botaoComTexto(container, JORNADA))).toBe(true);
    expect(marcado(botaoComTexto(container, LUA_CHEIA))).toBe(false);
    expect(textoDe(container)).toContain('Jornada de três dias — 24 a 26/10/2026');
    expect(folhaComTexto(container, 'span', '18 de 40 · 11 leitos livres')).toBeDefined();
  });

  it('abertura — o cartão do link da cerimônia leva o ícone de link', async () => {
    const container = await abrir();

    expect(temIcone(container, 'link')).toBe(true);
  });

  it('abertura — lista o link da cerimônia com as aberturas e as inscrições pelo link', async () => {
    const container = await abrir();

    expect(folhaComTexto(container, 'span', '96 aberturas · 34 inscrições')).toBeDefined();
    expect(folhaComTexto(container, 'code', 'ceudodespertar.org/i/lua-cheia-1209-7k3f')).toBeDefined();
  });

  it('link da cerimônia — copiar troca o botão para Copiado e não volta', async () => {
    const container = await abrir();

    await clicar(botaoComTexto(container, 'Copiar'));

    expect(botaoComTexto(container, 'Copiado').type).toBe('button');
    await clicar(botaoComTexto(container, 'Copiado'));
    expect(botaoComTexto(container, 'Copiado').type).toBe('button');
  });

  it('link da cerimônia copiado e evento trocado — o link continua Copiado', async () => {
    const container = await abrir();
    await clicar(botaoComTexto(container, 'Copiar'));

    await trocarEvento(container, JORNADA);

    expect(linkEstaCopiado(container)).toBe(true);
  });

  it('evento trocado para a Jornada — o cartão do link continua com o endereço e os números da Lua Cheia', async () => {
    const container = await abrir();

    await trocarEvento(container, JORNADA);

    expect(folhaComTexto(container, 'code', 'ceudodespertar.org/i/lua-cheia-1209-7k3f')).toBeDefined();
    expect(folhaComTexto(container, 'span', '96 aberturas · 34 inscrições')).toBeDefined();
    expect(folhaComTexto(container, 'span', '18 de 40 · 11 leitos livres')).toBeDefined();
  });

  it('link da cerimônia — copiar troca o ícone de copiar pelo de check e o botão de contorno pelo discreto', async () => {
    const container = await abrir();
    const antes = botaoComTexto(container, 'Copiar');
    const antesDoClique = [temIcone(antes, 'copy'), temIcone(antes, 'check'), antes.style.color];

    await clicar(antes);

    const copiado = botaoComTexto(container, 'Copiado');
    expect(antesDoClique).toEqual([true, false, 'var(--color-royal)']);
    expect([temIcone(copiado, 'copy'), temIcone(copiado, 'check'), copiado.style.color]).toEqual([
      false,
      true,
      'var(--text-primary)',
    ]);
  });
});

describe('InscricaoPage: busca no diretório', () => {
  it('sem termo — lista as seis pessoas do diretório na ordem do mock, com o estado da anamnese', async () => {
    const container = await abrir();

    const linhas = todos<HTMLButtonElement>(container, 'button').filter((botao) =>
      PESSOAS_DO_DIRETORIO.some((nome) => botao.textContent?.startsWith(nome)),
    );

    expect(linhas.map((linha) => linha.textContent)).toEqual([
      'Helena DuarteFrequentadora desde 2019 · São Roque · SPEm dia',
      'Marina TavaresVisitante · Rio de Janeiro · RJPendente',
      'Eduardo PiresFrequentador desde 2022 · São Paulo · SPVencida',
      'Sérgio BittencourtFardado desde 2011 · guardião · Vargem Grande · SPEm dia',
      'Antônio DuarteCriança · filho de Helena Duarte · São Roque · SPPendente',
      'Bruna CamargoVisitante · Campinas · SPEm dia',
    ]);
  });

  it('sem termo — cada pessoa do diretório leva a seta para a direita', async () => {
    const container = await abrir();

    const setas = PESSOAS_DO_DIRETORIO.map((nome) => temIcone(botaoDaPessoa(container, nome), 'chevron-right'));

    expect(setas).toEqual([true, true, true, true, true, true]);
  });

  it.each([
    { termo: 'helena', achados: ['Helena Duarte'] },
    { termo: '  HELENA  ', achados: ['Helena Duarte'] },
    { termo: 'campinas', achados: ['Bruna Camargo'] },
    { termo: 'são', achados: ['Helena Duarte', 'Eduardo Pires', 'Antônio Duarte'] },
    { termo: 'duarte', achados: ['Helena Duarte', 'Antônio Duarte'] },
  ])('termo "$termo" — filtra por nome ou cidade sem diferenciar maiúsculas nem espaços das pontas', async ({ termo, achados }) => {
    const container = await abrir();

    await digitar(campoRotulado<HTMLInputElement>(container, 'Buscar no diretório'), termo);

    const mostradas = PESSOAS_DO_DIRETORIO.filter((nome) => textoDe(container).includes(nome));
    expect(mostradas).toEqual(achados);
  });

  it('termo que só existe no vínculo — a busca não olha o vínculo e mostra o aviso de ninguém encontrado', async () => {
    const container = await abrir();

    await digitar(campoRotulado<HTMLInputElement>(container, 'Buscar no diretório'), 'visitante');

    expect(PESSOAS_DO_DIRETORIO.filter((nome) => textoDe(container).includes(nome))).toEqual([]);
    expect(textoDe(container)).toContain(
      'Ninguém com esse nome. Quem chega pela primeira vez entra pelo cadastro rápido, e o cadastro é sempre humano — não há autoinscrição.',
    );
  });

  it('termo vazio de novo — apagar a busca devolve a lista inteira e some o aviso', async () => {
    const container = await abrir();
    const busca = campoRotulado<HTMLInputElement>(container, 'Buscar no diretório');
    await digitar(busca, 'zzz');

    await digitar(busca, '');

    expect(PESSOAS_DO_DIRETORIO.filter((nome) => textoDe(container).includes(nome))).toEqual(PESSOAS_DO_DIRETORIO);
    expect(textoDe(container)).not.toContain('Ninguém com esse nome');
  });

  it('termo digitado e evento trocado — o termo continua no campo e a lista continua filtrada', async () => {
    const container = await abrir();
    await digitar(campoRotulado<HTMLInputElement>(container, 'Buscar no diretório'), 'helena');

    await trocarEvento(container, JORNADA);

    expect(campoRotulado<HTMLInputElement>(container, 'Buscar no diretório').value).toBe('helena');
    expect(PESSOAS_DO_DIRETORIO.filter((nome) => textoDe(container).includes(nome))).toEqual(['Helena Duarte']);
  });
});

describe('InscricaoPage: ficha da pessoa escolhida', () => {
  it('escolher Helena — mostra nome, vínculo, cidade e nascimento, e a busca some', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    expect(textoDe(container)).toContain('Frequentadora desde 2019 · São Roque · SP · nasceu em 22/02/1996');
    expect(existeCampoRotulado(container, 'Buscar no diretório')).toBe(false);
    expect(textoDe(container)).not.toContain('Menor de idade');
  });

  it('escolher Helena — a ficha leva o ícone de pessoa e o botão Trocar leva a seta para a esquerda', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    expect(temIcone(container, 'user-round')).toBe(true);
    expect(temIcone(botaoComTexto(container, 'Trocar'), 'arrow-left')).toBe(true);
  });

  it('escolher Antônio — a ficha traz o selo de menor de idade', async () => {
    const container = await abrirComPessoa('Antônio Duarte');

    expect(folhaComTexto(container, 'span', 'Menor de idade')).toBeDefined();
  });

  it('Trocar — volta à busca sem gravar nada e sem recado', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    await clicar(botaoComTexto(container, 'Trocar'));

    expect(existeCampoRotulado(container, 'Buscar no diretório')).toBe(true);
    expect(existeRecado(container)).toBe(false);
  });

  it('link da cerimônia copiado, pessoa escolhida, trocada e outra escolhida — o link continua Copiado', async () => {
    const container = await abrir();
    await clicar(botaoComTexto(container, 'Copiar'));
    await clicar(botaoDaPessoa(container, 'Helena Duarte'));
    await clicar(botaoComTexto(container, 'Trocar'));

    await clicar(botaoDaPessoa(container, 'Marina Tavares'));

    expect(linkEstaCopiado(container)).toBe(true);
  });

  it.each([
    { pessoa: 'Helena Duarte', pendencias: SEM_PENDENCIA },
    {
      pessoa: 'Marina Tavares',
      pendencias: [
        ['Anamnese pendente', 'IN5'],
        ['Conversa de primeira vez não registrada', 'IN6'],
        PENDENCIA_DE_EMERGENCIA,
      ],
    },
    { pessoa: 'Eduardo Pires', pendencias: [['Anamnese vencida', 'IN5'], PENDENCIA_DE_EMERGENCIA] },
    { pessoa: 'Sérgio Bittencourt', pendencias: SEM_PENDENCIA },
    { pessoa: 'Antônio Duarte', pendencias: [['Falta o responsável', 'IN2']] },
    { pessoa: 'Bruna Camargo', pendencias: SEM_PENDENCIA },
  ])('$pessoa — as pendências na entrada saem na ordem das invariantes', async ({ pessoa, pendencias }) => {
    const container = await abrirComPessoa(pessoa);

    expect(pendenciasMostradas(container)).toEqual(pendencias);
  });

  it.each([
    { pessoa: 'Helena Duarte', tipo: 'Participante', consagra: 'true', primeiraVez: 'false' },
    { pessoa: 'Marina Tavares', tipo: 'Participante', consagra: 'true', primeiraVez: 'true' },
    { pessoa: 'Bruna Camargo', tipo: 'Participante', consagra: 'true', primeiraVez: 'true' },
    { pessoa: 'Antônio Duarte', tipo: 'Criança estelar', consagra: 'false', primeiraVez: 'false' },
  ])('$pessoa — entra como $tipo, consagra=$consagra e primeira vez=$primeiraVez', async ({ pessoa, tipo, consagra, primeiraVez }) => {
    const container = await abrirComPessoa(pessoa);

    expect(marcado(botaoComTexto(container, tipo))).toBe(true);
    expect(interruptor(container, 'Consagra neste trabalho').getAttribute('aria-checked')).toBe(consagra);
    expect(interruptor(container, 'Primeira vez na casa').getAttribute('aria-checked')).toBe(primeiraVez);
  });

  it('Marina — entra com o contato preenchido, a restrição vazia e o botão de nenhuma restrição', async () => {
    const container = await abrirComPessoa('Marina Tavares');

    expect(campoRotulado<HTMLInputElement>(container, 'Contato de emergência').value).toBe('Luiz Tavares · (21) 98800-4411');
    expect(campoRotulado<HTMLInputElement>(container, 'Restrições alimentares').value).toBe('');
    expect(botaoComTexto(container, 'Não tem nenhuma').type).toBe('button');
  });

  it('Helena — entra com contato e restrição vindos do diretório e sem o botão de nenhuma restrição', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    expect(campoRotulado<HTMLInputElement>(container, 'Contato de emergência').value).toBe('Paulo Duarte · (11) 99000-8877');
    expect(campoRotulado<HTMLInputElement>(container, 'Restrições alimentares').value).toBe('Não come carne vermelha');
    expect(todos(container, 'button').some((botao) => botao.textContent === 'Não tem nenhuma')).toBe(false);
  });

  it('escolher outra pessoa depois de mexer em nível, hospedagem e tipo — o nível, o valor, a hospedagem e o tipo recomeçam do padrão', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await clicarNoNivel(container, 'Sustentável');
    await escolherHospedagem(container, 'Quarto');
    await trocarTipo(container, 'Convidado');
    await clicar(botaoComTexto(container, 'Trocar'));

    await clicar(botaoDaPessoa(container, 'Marina Tavares'));

    expect(marcado(botaoDoNivel(container, 'Sustentável'))).toBe(false);
    expect(campoDoValor(container).value).toBe('');
    expect(marcado(opcaoEmLinha(container, 'Não vai dormir na casa'))).toBe(true);
    expect(marcado(botaoComTexto(container, 'Participante'))).toBe(true);
  });

  it('buscar, escolher e trocar — a busca volta vazia e mostra o diretório inteiro', async () => {
    const container = await abrir();
    await digitar(campoRotulado<HTMLInputElement>(container, 'Buscar no diretório'), 'helena');
    await clicar(botaoDaPessoa(container, 'Helena Duarte'));

    await clicar(botaoComTexto(container, 'Trocar'));

    expect(campoRotulado<HTMLInputElement>(container, 'Buscar no diretório').value).toBe('');
    expect(PESSOAS_DO_DIRETORIO.filter((nome) => textoDe(container).includes(nome))).toEqual(PESSOAS_DO_DIRETORIO);
  });

  it('criança com responsável e modalidade escolhidos, depois trocada e escolhida de novo — volta sem responsável e sob supervisão', async () => {
    const container = await abrirComPessoa('Antônio Duarte');
    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Responsável neste trabalho'), 'Helena Duarte');
    await clicar(botaoComTexto(container, 'Participa do ritual'));
    await clicar(botaoComTexto(container, 'Trocar'));

    await clicar(botaoDaPessoa(container, 'Antônio Duarte'));

    expect(campoRotulado<HTMLSelectElement>(container, 'Responsável neste trabalho').value).toBe('');
    expect(marcado(botaoComTexto(container, 'Permanece sob supervisão'))).toBe(true);
    expect(pendenciasMostradas(container)).toEqual([['Falta o responsável', 'IN2']]);
  });

  it('refeição marcada, pessoa trocada e escolhida de novo na Jornada — volta sem refeição marcada', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await trocarEvento(container, JORNADA);
    await clicar(opcaoEmLinha(container, 'Ceia'));
    await clicar(botaoComTexto(container, 'Trocar'));

    await clicar(botaoDaPessoa(container, 'Helena Duarte'));

    expect(marcado(opcaoEmLinha(container, 'Ceia'))).toBe(false);
  });

  it('escolher pessoa — mantém o evento escolhido antes', async () => {
    const container = await abrir();
    await trocarEvento(container, JORNADA);

    await clicar(botaoDaPessoa(container, 'Helena Duarte'));

    expect(marcado(botaoComTexto(container, JORNADA))).toBe(true);
    expect(textoDe(container)).toContain('Jornada de três dias — 24 a 26/10/2026');
  });
});

describe('InscricaoPage: tipo de participação e consagração', () => {
  it.each([
    { tipo: 'Participante', explicacao: 'Quem vem participar do trabalho. Contribui e faz anamnese.' },
    { tipo: 'Convidado', explicacao: 'Convidado da casa ou de alguém da casa. Contribui e faz anamnese.' },
    { tipo: 'Equipe', explicacao: 'Guardião, cuidadora, músico, cozinha. Não contribui — é isento, e isento não é zero.' },
    {
      tipo: 'Criança estelar',
      explicacao: 'Criança. Exige responsável, modalidade e autorização vigente para este trabalho.',
    },
  ])('escolher $tipo — marca o botão e mostra a explicação do tipo', async ({ tipo, explicacao }) => {
    const container = await abrirComPessoa('Helena Duarte');

    await trocarTipo(container, tipo);

    expect(marcado(botaoComTexto(container, tipo))).toBe(true);
    expect(folhaComTexto(container, 'span', explicacao)).toBeDefined();
  });

  it.each([
    { tipo: 'Participante', consagra: 'true' },
    { tipo: 'Convidado', consagra: 'true' },
    { tipo: 'Equipe', consagra: 'true' },
    { tipo: 'Criança estelar', consagra: 'false' },
  ])('escolher $tipo — a consagração vai para $consagra, o padrão do tipo', async ({ tipo, consagra }) => {
    const container = await abrirComPessoa('Helena Duarte');
    await clicar(interruptor(container, 'Consagra neste trabalho'));

    await trocarTipo(container, tipo);

    expect(interruptor(container, 'Consagra neste trabalho').getAttribute('aria-checked')).toBe(consagra);
  });

  it('consagra ligado fora da equipe — a nota diz que entra na estimativa e exige anamnese em dia', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    expect(textoDe(container)).toContain('Entra na estimativa de consumo de daime e, fora da equipe, exige anamnese em dia.');
  });

  it('desligar a consagração — a nota diz que a anamnese deixa de se aplicar', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    await clicar(interruptor(container, 'Consagra neste trabalho'));

    expect(interruptor(container, 'Consagra neste trabalho').getAttribute('aria-checked')).toBe('false');
    expect(textoDe(container)).toContain(
      'Presente sem consagrar. A anamnese deixa de se aplicar, e a estimativa de consumo não conta esta pessoa.',
    );
  });

  it('equipe que consagra — a nota registra a questão aberta da coordenação', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    await trocarTipo(container, 'Equipe');

    expect(textoDe(container)).toContain(
      'A equipe consagra e, por prática da casa, não responde anamnese. Está registrado como questão aberta para a coordenação — é diferente de ser acidental.',
    );
  });

  it('equipe que não consagra — volta a nota de presente sem consagrar', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await trocarTipo(container, 'Equipe');

    await clicar(interruptor(container, 'Consagra neste trabalho'));

    expect(textoDe(container)).not.toContain('A equipe consagra e, por prática da casa');
    expect(textoDe(container)).toContain('Presente sem consagrar.');
  });

  it('primeira vez desligada — a nota diz que já esteve aqui antes', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    expect(textoDe(container)).toContain('Já esteve aqui antes.');
  });

  it('ligar primeira vez sem conversa — a nota pede a conversa e a pendência IN6 aparece', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    await clicar(interruptor(container, 'Primeira vez na casa'));

    expect(textoDe(container)).toContain('Vai precisar da conversa de acolhimento antes de confirmar.');
    expect(pendenciasMostradas(container)).toEqual([['Conversa de primeira vez não registrada', 'IN6']]);
  });

  it('Registrar a conversa — tira a pendência IN6 e a nota passa a dizer que a conversa está registrada', async () => {
    const container = await abrirComPessoa('Marina Tavares');

    await clicar(botaoComTexto(container, 'Registrar a conversa'));

    expect(pendenciasMostradas(container)).toEqual([['Anamnese pendente', 'IN5'], PENDENCIA_DE_EMERGENCIA]);
    expect(textoDe(container)).toContain('Conversa de acolhimento registrada.');
  });

  it('Bruna de primeira vez com acolhimento realizado — a nota já diz que a conversa está registrada', async () => {
    const container = await abrirComPessoa('Bruna Camargo');

    expect(textoDe(container)).toContain('Conversa de acolhimento registrada.');
  });

  it('desligar e ligar a primeira vez de novo depois de registrar a conversa — a conversa continua registrada', async () => {
    const container = await abrirComPessoa('Marina Tavares');
    await clicar(botaoComTexto(container, 'Registrar a conversa'));

    await clicar(interruptor(container, 'Primeira vez na casa'));
    const notaDepoisDoPrimeiroClique = textoDe(container).includes('Já esteve aqui antes.');
    await clicar(interruptor(container, 'Primeira vez na casa'));

    expect(notaDepoisDoPrimeiroClique).toBe(true);
    expect(textoDe(container)).toContain('Conversa de acolhimento registrada.');
  });

  it('Marina — desligar a primeira vez tira a pendência IN6 e a nota diz que já esteve aqui antes', async () => {
    const container = await abrirComPessoa('Marina Tavares');

    await clicar(interruptor(container, 'Primeira vez na casa'));

    expect(interruptor(container, 'Primeira vez na casa').getAttribute('aria-checked')).toBe('false');
    expect(textoDe(container)).toContain('Já esteve aqui antes.');
    expect(pendenciasMostradas(container)).toEqual([['Anamnese pendente', 'IN5'], PENDENCIA_DE_EMERGENCIA]);
  });

  it('Marina — desligar e religar a consagração devolve a pendência IN5 de anamnese', async () => {
    const container = await abrirComPessoa('Marina Tavares');
    await clicar(interruptor(container, 'Consagra neste trabalho'));
    const semAnamneseDepoisDeDesligar = pendenciasMostradas(container).some(([titulo]) => titulo === 'Anamnese pendente');

    await clicar(interruptor(container, 'Consagra neste trabalho'));

    expect(semAnamneseDepoisDeDesligar).toBe(false);
    expect(interruptor(container, 'Consagra neste trabalho').getAttribute('aria-checked')).toBe('true');
    expect(pendenciasMostradas(container)).toEqual([
      ['Anamnese pendente', 'IN5'],
      ['Conversa de primeira vez não registrada', 'IN6'],
      PENDENCIA_DE_EMERGENCIA,
    ]);
  });

  it('Marina como Convidado e com a conversa registrada, evento trocado — o tipo e a conversa ficam', async () => {
    const container = await abrirComPessoa('Marina Tavares');
    await trocarTipo(container, 'Convidado');
    await clicar(botaoComTexto(container, 'Registrar a conversa'));

    await trocarEvento(container, JORNADA);

    expect(marcado(botaoComTexto(container, 'Convidado'))).toBe(true);
    expect(textoDe(container)).toContain('Conversa de acolhimento registrada.');
  });
});

describe('InscricaoPage: estado da anamnese', () => {
  it.each([
    {
      pessoa: 'Helena Duarte',
      selo: 'Em dia',
      tom: 'confirmed',
      frase: 'Em dia.',
      nota: 'Respondida em 28/07/2026 · v3 · vale até 28/07/2027',
    },
    {
      pessoa: 'Marina Tavares',
      selo: 'Pendente',
      tom: 'attention',
      frase: 'Enquanto não estiver em dia, a inscrição pode ser salva, mas não confirmada.',
      nota: 'Nunca respondeu',
    },
    {
      pessoa: 'Eduardo Pires',
      selo: 'Vencida',
      tom: 'attention',
      frase: 'Enquanto não estiver em dia, a inscrição pode ser salva, mas não confirmada.',
      nota: 'Respondida em 11/03/2024 · v2 · venceu em 11/03/2025',
    },
  ])('$pessoa que consagra — mostra o selo $selo, a nota da anamnese e a frase do estado', async ({ pessoa, selo, tom, frase, nota }) => {
    const container = await abrirComPessoa(pessoa);

    expect(folhaComTexto(container, 'span', selo)).toBeDefined();
    expect(corDoSelo(container, selo)).toBe(`var(--color-${tom})`);
    expect(folhaComTexto(container, 'span', nota)).toBeDefined();
    expect(textoDe(container)).toContain(frase);
  });

  it.each([
    { pessoa: 'Marina Tavares', estado: 'pendente' },
    { pessoa: 'Eduardo Pires', estado: 'vencida' },
  ])('$pessoa com a anamnese $estado e sem consagrar — o selo Não se aplica fica neutro, não no tom do estado', async ({ pessoa }) => {
    const container = await abrirComPessoa(pessoa);

    await clicar(interruptor(container, 'Consagra neste trabalho'));

    expect(corDoSelo(container, 'Não se aplica')).toBe('var(--color-neutral)');
  });

  it('quem não consagra — o selo vira Não se aplica e a frase diz que o estado antigo continua guardado', async () => {
    const container = await abrirComPessoa('Marina Tavares');

    await clicar(interruptor(container, 'Consagra neste trabalho'));

    expect(folhaComTexto(container, 'span', 'Não se aplica')).toBeDefined();
    expect(textoDe(container)).toContain(
      'Quem não consagra não precisa responder. O estado antigo continua guardado, apenas não se aplica a este trabalho.',
    );
  });

  it('quem não consagra — a pendência de anamnese some, mas a nota do estado antigo continua na tela', async () => {
    const container = await abrirComPessoa('Marina Tavares');

    await clicar(interruptor(container, 'Consagra neste trabalho'));

    expect(pendenciasMostradas(container)).toEqual([
      ['Conversa de primeira vez não registrada', 'IN6'],
      PENDENCIA_DE_EMERGENCIA,
    ]);
    expect(folhaComTexto(container, 'span', 'Nunca respondeu')).toBeDefined();
  });

  it('equipe com anamnese pendente — não exige anamnese e o selo vira Não se aplica', async () => {
    const container = await abrirComPessoa('Marina Tavares');

    await trocarTipo(container, 'Equipe');

    expect(pendenciasMostradas(container)).toEqual([
      ['Conversa de primeira vez não registrada', 'IN6'],
      PENDENCIA_DE_EMERGENCIA,
    ]);
    expect(folhaComTexto(container, 'span', 'Não se aplica')).toBeDefined();
  });

  it('Copiar o link para mandar no WhatsApp — o link da cerimônia fica Copiado e a pendência de anamnese continua', async () => {
    const container = await abrirComPessoa('Marina Tavares');

    await clicar(botaoComTexto(container, 'Copiar o link para mandar no WhatsApp'));

    expect(botaoComTexto(container, 'Copiado').type).toBe('button');
    expect(pendenciasMostradas(container)[0]).toEqual(['Anamnese pendente', 'IN5']);
  });

  it('Marina com beliche — o botão de cada ação de pendência leva o ícone de check', async () => {
    const container = await abrirComPessoa('Marina Tavares');
    await escolherHospedagem(container, 'Beliche no dormitório');

    const acoes = ['Copiar o link para mandar no WhatsApp', 'Registrar a conversa', 'Alocar um leito'].map((rotulo) =>
      botaoComTexto(container, rotulo),
    );

    expect(acoes.map((acao) => temIcone(acao, 'check'))).toEqual([true, true, true]);
  });
});

describe('InscricaoPage: criança estelar', () => {
  it('Antônio — o seletor de responsável lista só os adultos do diretório, depois do convite a escolher', async () => {
    const container = await abrirComPessoa('Antônio Duarte');

    const opcoes = todos<HTMLOptionElement>(
      campoRotulado<HTMLSelectElement>(container, 'Responsável neste trabalho'),
      'option',
    );

    expect(opcoes.map((opcao) => opcao.textContent)).toEqual([
      'Escolha quem responde por ela',
      'Helena Duarte',
      'Marina Tavares',
      'Eduardo Pires',
      'Sérgio Bittencourt',
      'Bruna Camargo',
    ]);
  });

  it('Antônio sem responsável — a pendência IN2 diz que criança não se inscreve sozinha', async () => {
    const container = await abrirComPessoa('Antônio Duarte');

    expect(textoDe(container)).toContain('Criança estelar não se inscreve sozinha: alguém responde por ela neste trabalho.');
  });

  it('responsável com autorização vigente — Helena resolve a pendência de responsável e não abre a de autorização', async () => {
    const container = await abrirComPessoa('Antônio Duarte');

    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Responsável neste trabalho'), 'Helena Duarte');

    expect(pendenciasMostradas(container)).toEqual(SEM_PENDENCIA);
  });

  it.each([{ responsavel: 'Marina Tavares' }, { responsavel: 'Sérgio Bittencourt' }])(
    'responsável $responsavel sem autorização vigente — abre a pendência de autorização por evento',
    async ({ responsavel }) => {
      const container = await abrirComPessoa('Antônio Duarte');

      await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Responsável neste trabalho'), responsavel);

      expect(pendenciasMostradas(container)).toEqual([['Sem autorização vigente para este trabalho', 'IN2']]);
      expect(textoDe(container)).toContain(
        'A autorização é por evento — não existe autorizar para o ano. É colhida na chegada, com o responsável presente.',
      );
    },
  );

  it('autorização do responsável na Jornada — vale igual à da Lua Cheia: a pendência de autorização não olha o evento', async () => {
    const container = await abrirComPessoa('Antônio Duarte');
    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Responsável neste trabalho'), 'Helena Duarte');

    await trocarEvento(container, JORNADA);

    expect(pendenciasMostradas(container)).toEqual(SEM_PENDENCIA);
  });

  it('voltar ao convite de escolher o responsável — a pendência volta a ser a de falta de responsável', async () => {
    const container = await abrirComPessoa('Antônio Duarte');
    const seletor = campoRotulado<HTMLSelectElement>(container, 'Responsável neste trabalho');
    await escolherOpcao(seletor, 'Helena Duarte');

    await escolherOpcao(seletor, '');

    expect(pendenciasMostradas(container)).toEqual([['Falta o responsável', 'IN2']]);
  });

  it('modalidade Participa do ritual — liga a consagração e a anamnese pendente do menino passa a barrar', async () => {
    const container = await abrirComPessoa('Antônio Duarte');
    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Responsável neste trabalho'), 'Helena Duarte');

    await clicar(botaoComTexto(container, 'Participa do ritual'));

    expect(marcado(botaoComTexto(container, 'Participa do ritual'))).toBe(true);
    expect(interruptor(container, 'Consagra neste trabalho').getAttribute('aria-checked')).toBe('true');
    expect(pendenciasMostradas(container)).toEqual([['Anamnese pendente', 'IN5']]);
  });

  it('modalidade Permanece sob supervisão — desliga a consagração e a anamnese não se aplica', async () => {
    const container = await abrirComPessoa('Antônio Duarte');
    await clicar(botaoComTexto(container, 'Participa do ritual'));

    await clicar(botaoComTexto(container, 'Permanece sob supervisão'));

    expect(interruptor(container, 'Consagra neste trabalho').getAttribute('aria-checked')).toBe('false');
    expect(folhaComTexto(container, 'span', 'Não se aplica')).toBeDefined();
  });

  it('modalidade Participa do ritual e evento trocado — a modalidade e a consagração ficam', async () => {
    const container = await abrirComPessoa('Antônio Duarte');
    await clicar(botaoComTexto(container, 'Participa do ritual'));

    await trocarEvento(container, JORNADA);

    expect(marcado(botaoComTexto(container, 'Participa do ritual'))).toBe(true);
    expect(interruptor(container, 'Consagra neste trabalho').getAttribute('aria-checked')).toBe('true');
  });

  it('voltar a Criança estelar com a modalidade Participa do ritual — a consagração volta ligada', async () => {
    const container = await abrirComPessoa('Antônio Duarte');
    await clicar(botaoComTexto(container, 'Participa do ritual'));
    await trocarTipo(container, 'Participante');

    await trocarTipo(container, 'Criança estelar');

    expect(interruptor(container, 'Consagra neste trabalho').getAttribute('aria-checked')).toBe('true');
  });

  it('criança estelar — a explicação da modalidade diz que ela decide a consagração', async () => {
    const container = await abrirComPessoa('Antônio Duarte');

    expect(textoDe(container)).toContain(
      'A modalidade não é detalhe: ela decide se a criança consagra, e com isso se a anamnese se aplica.',
    );
  });

  it('Antônio como participante — o seletor de responsável e a modalidade somem, mas a consagração liga', async () => {
    const container = await abrirComPessoa('Antônio Duarte');

    await trocarTipo(container, 'Participante');

    expect(existeCampoRotulado(container, 'Responsável neste trabalho')).toBe(false);
    expect(todos(container, 'button').some((botao) => botao.textContent === 'Participa do ritual')).toBe(false);
    expect(interruptor(container, 'Consagra neste trabalho').getAttribute('aria-checked')).toBe('true');
  });

  it('Antônio como participante — sem a pendência de responsável, mas com a de anamnese pendente', async () => {
    const container = await abrirComPessoa('Antônio Duarte');

    await trocarTipo(container, 'Participante');

    expect(pendenciasMostradas(container)).toEqual([['Anamnese pendente', 'IN5']]);
  });

  it('adulta com autorização marcada como Criança estelar, sem responsável — a pendência IN2 pede o responsável, como para o menino', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    await trocarTipo(container, 'Criança estelar');

    expect(pendenciasMostradas(container)).toEqual([['Falta o responsável', 'IN2']]);
  });

  it('adulta com autorização marcada como Criança estelar e responsável sem autorização — nenhuma pendência: vale a autorização da própria pessoa', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await trocarTipo(container, 'Criança estelar');

    await escolherResponsavel(container, 'Marina Tavares');

    expect(pendenciasMostradas(container)).toEqual(SEM_PENDENCIA);
  });

  it('Sérgio sem autorização marcado como Criança estelar — ele mesmo aparece entre os responsáveis e, escolhido, pede a autorização que lhe falta', async () => {
    const container = await abrirComPessoa('Sérgio Bittencourt');
    await trocarTipo(container, 'Criança estelar');
    const opcoes = todos<HTMLOptionElement>(seletorDeResponsavel(container), 'option').map((opcao) => opcao.textContent);

    await escolherResponsavel(container, 'Sérgio Bittencourt');

    expect(opcoes).toContain('Sérgio Bittencourt');
    expect(seletorDeResponsavel(container).value).toBe('Sérgio Bittencourt');
    expect(pendenciasMostradas(container)).toEqual([['Sem autorização vigente para este trabalho', 'IN2']]);
  });

  it('Sérgio sem autorização marcado como Criança estelar e Helena como responsável — a autorização da Helena basta', async () => {
    const container = await abrirComPessoa('Sérgio Bittencourt');
    await trocarTipo(container, 'Criança estelar');

    await escolherResponsavel(container, 'Helena Duarte');

    expect(pendenciasMostradas(container)).toEqual(SEM_PENDENCIA);
  });
});

describe('InscricaoPage: contribuição', () => {
  it('Lua Cheia — oferece os três níveis sugeridos com valor e explicação, nenhum marcado', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    const niveis = ['Social', 'Sustentável', 'Próspero'].map((nivel) => botaoDoNivel(container, nivel));

    expect(niveis.map((botao) => botao.textContent)).toEqual([
      'SocialR$ 80,00Para quem está com a condição apertada. Ninguém precisa explicar por que escolheu este.',
      'SustentávelR$ 160,00O que cobre o custo do trabalho por pessoa. É a referência da casa.',
      'PrósperoR$ 240,00Para quem pode sustentar a própria participação e um pouco da de outra pessoa.',
    ]);
    expect(niveis.map(marcado)).toEqual([false, false, false]);
  });

  it('Jornada — os níveis passam a R$ 180, R$ 360 e R$ 540', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    await trocarEvento(container, JORNADA);

    const valores = ['Social', 'Sustentável', 'Próspero'].map(
      (nivel) => elemento(botaoDoNivel(container, nivel), '[data-numeric]').textContent,
    );
    expect(valores).toEqual(['R$ 180,00', 'R$ 360,00', 'R$ 540,00']);
  });

  it('o campo de valor — nasce vazio, com o 0,00 de exemplo e a dica de que é sempre editável', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    const campo = campoDoValor(container);

    expect(campo.value).toBe('');
    expect(campo.placeholder).toBe('0,00');
    expect(textoDe(container)).toContain('Sempre editável. Escolher um nível preenche este campo; o que vale é o que está aqui.');
  });

  it.each([
    { nivel: 'Social', valor: '80,00' },
    { nivel: 'Sustentável', valor: '160,00' },
    { nivel: 'Próspero', valor: '240,00' },
  ])('escolher o nível $nivel — marca o botão e preenche o campo com $valor', async ({ nivel, valor }) => {
    const container = await abrirComPessoa('Helena Duarte');

    await clicarNoNivel(container, nivel);

    expect(marcado(botaoDoNivel(container, nivel))).toBe(true);
    expect(campoDoValor(container).value).toBe(valor);
  });

  it('nível escolhido com o valor intacto — mostra a frase No nível em minúsculas', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    await clicarNoNivel(container, 'Sustentável');

    expect(folhaComTexto(container, 'span', 'No nível sustentável.')).toBeDefined();
  });

  it('digitar depois de escolher um nível — desmarca o nível e some a frase No nível', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await clicarNoNivel(container, 'Social');

    await digitar(campoDoValor(container), '85');

    expect(marcado(botaoDoNivel(container, 'Social'))).toBe(false);
    expect(textoDe(container)).not.toContain('No nível social.');
  });

  it('digitar o mesmo valor de um nível — não marca o nível nem mostra a frase No nível', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    await digitar(campoDoValor(container), '160,00');

    expect(marcado(botaoDoNivel(container, 'Sustentável'))).toBe(false);
    expect(textoDe(container)).not.toContain('No nível');
  });

  it('escolher outro nível — troca a marca e o valor', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await clicarNoNivel(container, 'Social');

    await clicarNoNivel(container, 'Próspero');

    expect(marcado(botaoDoNivel(container, 'Social'))).toBe(false);
    expect(marcado(botaoDoNivel(container, 'Próspero'))).toBe(true);
    expect(campoDoValor(container).value).toBe('240,00');
  });

  it.each([
    { evento: LUA_CHEIA, valor: '79,99', abaixo: true, acima: false },
    { evento: LUA_CHEIA, valor: '80', abaixo: false, acima: false },
    { evento: LUA_CHEIA, valor: '240', abaixo: false, acima: false },
    { evento: LUA_CHEIA, valor: '240,01', abaixo: false, acima: true },
    { evento: LUA_CHEIA, valor: '1.000.000,00', abaixo: false, acima: true },
    { evento: LUA_CHEIA, valor: '0', abaixo: false, acima: false },
    { evento: JORNADA, valor: '179,99', abaixo: true, acima: false },
    { evento: JORNADA, valor: '80', abaixo: true, acima: false },
    { evento: JORNADA, valor: '540', abaixo: false, acima: false },
    { evento: JORNADA, valor: '541', abaixo: false, acima: true },
  ])('$evento com valor $valor — avisa abaixo do social: $abaixo, acima do próspero: $acima', async ({ evento, valor, abaixo, acima }) => {
    const container = await abrirComPessoa('Helena Duarte');
    await trocarEvento(container, evento);

    await digitar(campoDoValor(container), valor);

    expect(textoDe(container).includes('Abaixo do nível social — combinado com a pessoa.')).toBe(abaixo);
    expect(textoDe(container).includes('Acima do próspero — contribuição voluntária além do sugerido.')).toBe(acima);
  });

  it('equipe — a contribuição vira o cartão de isento, sem campo de valor nem níveis', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    await trocarTipo(container, 'Equipe');

    expect(textoDe(container)).toContain('Equipe não contribui financeiramente.');
    expect(folhaComTexto(container, 'span', 'Isento')).toBeDefined();
    expect(existeCampoRotulado(container, 'Valor combinado')).toBe(false);
    expect(textoDe(container)).not.toContain('Contribuição sugerida');
  });

  it('voltar de equipe para participante — o valor digitado antes reaparece no campo', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await digitar(campoDoValor(container), '160');
    await trocarTipo(container, 'Equipe');

    await trocarTipo(container, 'Participante');

    expect(campoDoValor(container).value).toBe('160');
  });

  it('trocar de evento com um nível marcado — o nível e o texto do campo ficam, e o valor do nível muda', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await clicarNoNivel(container, 'Sustentável');

    await trocarEvento(container, JORNADA);

    expect(marcado(botaoDoNivel(container, 'Sustentável'))).toBe(true);
    expect(campoDoValor(container).value).toBe('160,00');
    expect(elemento(botaoDoNivel(container, 'Sustentável'), '[data-numeric]').textContent).toBe('R$ 360,00');
    expect(textoDe(container)).not.toContain('No nível sustentável.');
  });
});

describe('InscricaoPage: hospedagem e leito', () => {
  it('Lua Cheia — lista as quatro hospedagens com o custo por dia e começa em Não vai dormir', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    const opcoes = [
      'Não vai dormir na casa',
      'Colchonete próprio na igreja',
      'Beliche no dormitório',
      'Quarto',
    ].map((rotulo) => opcaoEmLinha(container, rotulo));

    expect(opcoes.map((opcao) => elemento(opcao, '[data-numeric]').textContent)).toEqual([
      'sem custo',
      'sem custo',
      'R$ 50,00 por dia',
      'R$ 90,00 por dia',
    ]);
    expect(opcoes.map(marcado)).toEqual([true, false, false, false]);
    expect(opcoes.map((opcao) => opcao.textContent)).toEqual([
      'Não vai dormir na casaVai embora depois do trabalho.sem custo',
      'Colchonete próprio na igrejaGrátis. Não entra na contribuição nem gera lançamento — a casa só precisa saber quem fica.sem custo',
      'Beliche no dormitórioPago à parte por quem usa a acomodação.R$ 50,00 por dia',
      'QuartoPago à parte por quem usa a acomodação.R$ 90,00 por dia',
    ]);
  });

  it('hospedagem — só a opção marcada leva o ícone de check no marcador, e o marcador é redondo', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    const rotulos = ['Não vai dormir na casa', 'Colchonete próprio na igreja', 'Beliche no dormitório', 'Quarto'];
    const iconesAntes = rotulos.map((rotulo) => temIcone(opcaoEmLinha(container, rotulo), 'check'));

    await escolherHospedagem(container, 'Beliche no dormitório');

    expect(iconesAntes).toEqual([true, false, false, false]);
    expect(rotulos.map((rotulo) => temIcone(opcaoEmLinha(container, rotulo), 'check'))).toEqual([false, false, true, false]);
    expect(rotulos.map((rotulo) => marcadorDaOpcao(opcaoEmLinha(container, rotulo)).style.borderRadius)).toEqual([
      '50%',
      '50%',
      '50%',
      '50%',
    ]);
  });

  it('hospedagem sem custo — não oferece diárias nem pendência de leito', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    await escolherHospedagem(container, 'Colchonete próprio na igreja');

    expect(existeCampoRotulado(container, 'Quantas diárias')).toBe(false);
    expect(pendenciasMostradas(container)).toEqual(SEM_PENDENCIA);
  });

  it('Beliche — oferece de 1 a 4 diárias, começa em 1 e mostra R$ 50,00 de acomodação à parte', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    await escolherHospedagem(container, 'Beliche no dormitório');

    const diarias = campoRotulado<HTMLSelectElement>(container, 'Quantas diárias');
    expect(todos<HTMLOptionElement>(diarias, 'option').map((opcao) => opcao.textContent)).toEqual([
      '1 diária',
      '2 diárias',
      '3 diárias',
      '4 diárias',
    ]);
    expect(diarias.value).toBe('1');
    expect(textoDe(container)).toContain('R$ 50,00 de acomodação, à parte da contribuição.');
  });

  it.each([
    { hospedagem: 'Beliche no dormitório', diarias: '3', custo: 'R$ 150,00' },
    { hospedagem: 'Quarto', diarias: '2', custo: 'R$ 180,00' },
    { hospedagem: 'Quarto', diarias: '4', custo: 'R$ 360,00' },
  ])('$hospedagem com $diarias diárias — a acomodação custa $custo', async ({ hospedagem, diarias, custo }) => {
    const container = await abrirComPessoa('Helena Duarte');
    await escolherHospedagem(container, hospedagem);

    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Quantas diárias'), diarias);

    expect(textoDe(container)).toContain(`${custo} de acomodação, à parte da contribuição.`);
  });

  it('diárias escolhidas e hospedagem trocada por uma sem custo — as diárias voltam como estavam ao escolher o quarto', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await escolherHospedagem(container, 'Beliche no dormitório');
    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Quantas diárias'), '3');
    await escolherHospedagem(container, 'Não vai dormir na casa');

    await escolherHospedagem(container, 'Quarto');

    expect(campoRotulado<HTMLSelectElement>(container, 'Quantas diárias').value).toBe('3');
    expect(textoDe(container)).toContain('R$ 270,00 de acomodação, à parte da contribuição.');
  });

  it('diárias escolhidas para uma pessoa e outra pessoa escolhida em seguida — a segunda abre o beliche com as diárias da primeira', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await escolherHospedagem(container, 'Beliche no dormitório');
    await escolherDiarias(container, '3');
    await clicar(botaoComTexto(container, 'Trocar'));
    await clicar(botaoDaPessoa(container, 'Marina Tavares'));

    await escolherHospedagem(container, 'Beliche no dormitório');

    expect(seletorDeDiarias(container).value).toBe('3');
    expect(textoDe(container)).toContain('R$ 150,00 de acomodação, à parte da contribuição.');
  });

  it('diárias escolhidas e evento trocado — a Jornada mantém as diárias e o custo da acomodação', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await escolherHospedagem(container, 'Beliche no dormitório');
    await escolherDiarias(container, '3');

    await trocarEvento(container, JORNADA);

    expect(seletorDeDiarias(container).value).toBe('3');
    expect(textoDe(container)).toContain('R$ 150,00 de acomodação, à parte da contribuição.');
  });

  it('Beliche — abre a pendência IN9 com o rótulo em minúsculas e os leitos livres do evento', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    await escolherHospedagem(container, 'Beliche no dormitório');

    expect(pendenciasMostradas(container)).toEqual([['Leito não alocado', 'IN9']]);
    expect(textoDe(container)).toContain(
      'Quem dorme em beliche no dormitório ocupa vaga, e a vaga se escolhe no mapa de leitos. Há 6 leitos livres.',
    );
  });

  it('Quarto na Jornada — a pendência IN9 usa os 11 leitos livres da Jornada', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await trocarEvento(container, JORNADA);

    await escolherHospedagem(container, 'Quarto');

    expect(textoDe(container)).toContain('Quem dorme em quarto ocupa vaga, e a vaga se escolhe no mapa de leitos. Há 11 leitos livres.');
  });

  it('Alocar um leito — resolve a pendência IN9', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await escolherHospedagem(container, 'Beliche no dormitório');

    await clicar(botaoComTexto(container, 'Alocar um leito'));

    expect(pendenciasMostradas(container)).toEqual(SEM_PENDENCIA);
    expect(botaoDeConfirmar(container).disabled).toBe(false);
  });

  it('leito alocado e hospedagem trocada por outra que ocupa leito — a pendência IN9 volta', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await escolherHospedagem(container, 'Beliche no dormitório');
    await clicar(botaoComTexto(container, 'Alocar um leito'));

    await escolherHospedagem(container, 'Quarto');

    expect(pendenciasMostradas(container)).toEqual([['Leito não alocado', 'IN9']]);
  });

  it('leito alocado e evento trocado — a pendência IN9 volta e a hospedagem escolhida fica', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await escolherHospedagem(container, 'Beliche no dormitório');
    await clicar(botaoComTexto(container, 'Alocar um leito'));

    await trocarEvento(container, JORNADA);

    expect(pendenciasMostradas(container)).toEqual([['Leito não alocado', 'IN9']]);
    expect(marcado(opcaoEmLinha(container, 'Beliche no dormitório'))).toBe(true);
  });
});

describe('InscricaoPage: alimentação', () => {
  it('Lua Cheia — não tem bloco de alimentação e diz que o campo não existe', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    expect(textoDe(container)).toContain('Sem bloco de alimentação: este é um trabalho de uma noite');
    expect(todos(container, 'span').some((rotulo) => rotulo.textContent === 'Alimentação')).toBe(false);
  });

  it('Jornada — mostra a nota do evento e as quatro refeições com o valor, nenhuma marcada', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    await trocarEvento(container, JORNADA);

    const refeicoes = ['Ceia', 'Café da manhã', 'Almoço', 'Jantar'].map((rotulo) => opcaoEmLinha(container, rotulo));
    expect(refeicoes.map((refeicao) => elemento(refeicao, '[data-numeric]').textContent)).toEqual([
      'R$ 20,00',
      'R$ 18,00',
      'R$ 35,00',
      'R$ 30,00',
    ]);
    expect(refeicoes.map(marcado)).toEqual([false, false, false, false]);
    expect(textoDe(container)).toContain('Ocasião especial: três dias com a casa servindo as refeições, e por isso elas são cobradas.');
    expect(textoDe(container)).not.toContain('Sem bloco de alimentação');
  });

  it('clicar numa refeição — marca, e clicar de novo desmarca', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await trocarEvento(container, JORNADA);

    await clicar(opcaoEmLinha(container, 'Almoço'));
    const marcadaDepoisDoPrimeiroClique = marcado(opcaoEmLinha(container, 'Almoço'));
    await clicar(opcaoEmLinha(container, 'Almoço'));

    expect(marcadaDepoisDoPrimeiroClique).toBe(true);
    expect(marcado(opcaoEmLinha(container, 'Almoço'))).toBe(false);
  });

  it('refeição — o marcador é quadrado, leva o ícone de check só enquanto marcada e o perde ao desmarcar', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await trocarEvento(container, JORNADA);
    const ceia = () => opcaoEmLinha(container, 'Ceia');
    const antesDoClique = [temIcone(ceia(), 'check'), marcadorDaOpcao(ceia()).style.borderRadius];

    await clicar(ceia());
    const iconeMarcada = temIcone(ceia(), 'check');
    await clicar(ceia());

    expect(antesDoClique).toEqual([false, '5px']);
    expect(iconeMarcada).toBe(true);
    expect(temIcone(ceia(), 'check')).toBe(false);
  });

  it('refeições marcadas e evento trocado — voltar à Jornada encontra todas desmarcadas', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await trocarEvento(container, JORNADA);
    await clicar(opcaoEmLinha(container, 'Ceia'));
    await trocarEvento(container, LUA_CHEIA);

    await trocarEvento(container, JORNADA);

    expect(marcado(opcaoEmLinha(container, 'Ceia'))).toBe(false);
  });
});

describe('InscricaoPage: contato de emergência e restrições', () => {
  it('Marina sem restrição — Não tem nenhuma preenche Nenhuma, o botão some e a pendência IN4 sai', async () => {
    const container = await abrirComPessoa('Marina Tavares');

    await clicar(botaoComTexto(container, 'Não tem nenhuma'));

    expect(campoRotulado<HTMLInputElement>(container, 'Restrições alimentares').value).toBe('Nenhuma');
    expect(todos(container, 'button').some((botao) => botao.textContent === 'Não tem nenhuma')).toBe(false);
    expect(pendenciasMostradas(container)).toEqual([
      ['Anamnese pendente', 'IN5'],
      ['Conversa de primeira vez não registrada', 'IN6'],
    ]);
  });

  it('restrição só com espaços — conta como vazia: a pendência IN4 fica e o botão de nenhuma continua', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    await digitar(campoRotulado<HTMLInputElement>(container, 'Restrições alimentares'), '   ');

    expect(pendenciasMostradas(container)).toEqual([PENDENCIA_DE_EMERGENCIA]);
    expect(botaoComTexto(container, 'Não tem nenhuma').type).toBe('button');
  });

  it('contato de emergência apagado — abre a pendência IN4 com a frase de obrigatório para todo mundo', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    await digitar(campoRotulado<HTMLInputElement>(container, 'Contato de emergência'), '');

    expect(pendenciasMostradas(container)).toEqual([PENDENCIA_DE_EMERGENCIA]);
    expect(textoDe(container)).toContain(
      'Obrigatórios para todo mundo, inclusive para quem não consagra. É a única exigência dura da inscrição.',
    );
  });

  it('contato preenchido de volta — a pendência IN4 sai', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    const contato = campoRotulado<HTMLInputElement>(container, 'Contato de emergência');
    await digitar(contato, '');

    await digitar(contato, 'Paulo · 11 99999-0000');

    expect(pendenciasMostradas(container)).toEqual(SEM_PENDENCIA);
  });

  it('equipe sem contato de emergência — a obrigatoriedade vale também para a equipe', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await trocarTipo(container, 'Equipe');

    await digitar(campoRotulado<HTMLInputElement>(container, 'Contato de emergência'), '');

    expect(pendenciasMostradas(container)).toEqual([PENDENCIA_DE_EMERGENCIA]);
  });
});

describe('InscricaoPage: valor devido na tela', () => {
  it('sem valor digitado — mostra A combinar e a frase de que isso é mais honesto que R$ 0,00', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    expect(folhaComTexto(container, 'span', 'A combinar')).toBeDefined();
    expect(textoDe(container)).toContain('“a combinar” é mais honesto do que R$ 0,00');
    expect(todos(container, 'span').some((total) => total.textContent === 'devidos')).toBe(false);
  });

  it('valor só com espaços — continua A combinar', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    await digitar(campoDoValor(container), '   ');

    expect(folhaComTexto(container, 'span', 'A combinar')).toBeDefined();
  });

  it('valor digitado sem hospedagem nem refeição — o total é só a contribuição e a linha traz só ela', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    await digitar(campoDoValor(container), '120');

    expect(folhaComTexto(container, 'span', 'R$ 120,00')).toBeDefined();
    expect(folhaComTexto(container, 'span', 'devidos')).toBeDefined();
    expect(folhaComTexto(container, 'span', 'R$ 120,00 de contribuição')).toBeDefined();
  });

  it('Lua Cheia com nível sustentável e três diárias de beliche — soma R$ 310,00 e detalha a acomodação', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await clicarNoNivel(container, 'Sustentável');
    await escolherHospedagem(container, 'Beliche no dormitório');
    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Quantas diárias'), '3');

    expect(folhaComTexto(container, 'span', 'R$ 310,00')).toBeDefined();
    expect(folhaComTexto(container, 'span', 'R$ 160,00 de contribuição · R$ 150,00 de acomodação')).toBeDefined();
  });

  it('Jornada com sustentável, quarto por duas diárias, ceia e almoço — soma R$ 595,00 e detalha os três custos', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await trocarEvento(container, JORNADA);
    await clicarNoNivel(container, 'Sustentável');
    await escolherHospedagem(container, 'Quarto');
    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Quantas diárias'), '2');
    await clicar(opcaoEmLinha(container, 'Ceia'));
    await clicar(opcaoEmLinha(container, 'Almoço'));

    expect(folhaComTexto(container, 'span', 'R$ 595,00')).toBeDefined();
    expect(
      folhaComTexto(container, 'span', 'R$ 360,00 de contribuição · R$ 180,00 de acomodação · R$ 55,00 de alimentação'),
    ).toBeDefined();
  });

  it('refeição desmarcada de novo — sai da soma', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await trocarEvento(container, JORNADA);
    await digitar(campoDoValor(container), '100');
    await clicar(opcaoEmLinha(container, 'Jantar'));
    await clicar(opcaoEmLinha(container, 'Café da manhã'));

    await clicar(opcaoEmLinha(container, 'Jantar'));

    expect(folhaComTexto(container, 'span', 'R$ 118,00')).toBeDefined();
    expect(folhaComTexto(container, 'span', 'R$ 100,00 de contribuição · R$ 18,00 de alimentação')).toBeDefined();
  });

  it('refeição marcada em segundo lugar e desmarcada — a marcada em primeiro lugar continua na soma', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await trocarEvento(container, JORNADA);
    await digitar(campoDoValor(container), '100');
    await clicar(opcaoEmLinha(container, 'Jantar'));
    await clicar(opcaoEmLinha(container, 'Café da manhã'));

    await clicar(opcaoEmLinha(container, 'Café da manhã'));

    expect(marcado(opcaoEmLinha(container, 'Jantar'))).toBe(true);
    expect(marcado(opcaoEmLinha(container, 'Café da manhã'))).toBe(false);
    expect(folhaComTexto(container, 'span', 'R$ 130,00')).toBeDefined();
    expect(folhaComTexto(container, 'span', 'R$ 100,00 de contribuição · R$ 30,00 de alimentação')).toBeDefined();
  });

  it.each([
    { digitado: '1.500,50', total: 'R$ 1.500,50' },
    { digitado: '1.500.000,00', total: 'R$ 1.500.000,00' },
    { digitado: '160,5', total: 'R$ 160,50' },
    { digitado: '0', total: 'R$ 0,00' },
    { digitado: '1.5', total: 'R$ 15,00' },
  ])('valor "$digitado" — o ponto é tirado como milhar e a vírgula é o decimal: $total', async ({ digitado, total }) => {
    const container = await abrirComPessoa('Helena Duarte');

    await digitar(campoDoValor(container), digitado);

    expect(folhaComTexto(container, 'span', total)).toBeDefined();
  });

  it('valor que não é número — vira R$ 0,00 devidos em vez de A combinar, ao contrário do campo em branco', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    await digitar(campoDoValor(container), 'abc');

    expect(folhaComTexto(container, 'span', 'R$ 0,00')).toBeDefined();
    expect(folhaComTexto(container, 'span', 'devidos')).toBeDefined();
    expect(textoDe(container)).not.toContain('A combinar');
  });

  it('valor negativo — é aceito e o total sai negativo', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    await digitar(campoDoValor(container), '-50');

    expect(folhaComTexto(container, 'span', 'R$ -50,00')).toBeDefined();
  });

  it('hospedagem paga com o campo de valor em branco — o total fica A combinar e a acomodação não entra no resumo', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    await escolherHospedagem(container, 'Quarto');

    expect(folhaComTexto(container, 'span', 'A combinar')).toBeDefined();
    expect(textoDe(container)).toContain('R$ 90,00 de acomodação, à parte da contribuição.');
    expect(todos(container, 'span').some((resumo) => resumo.textContent?.includes('de contribuição'))).toBe(false);
  });

  it('refeição marcada com o campo de valor em branco — o total fica A combinar e a alimentação não entra no resumo', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await trocarEvento(container, JORNADA);

    await clicar(opcaoEmLinha(container, 'Almoço'));

    expect(folhaComTexto(container, 'span', 'A combinar')).toBeDefined();
    expect(textoDe(container)).not.toContain('de alimentação');
  });

  it('equipe — o fechamento mostra Isento e não há valor devido, mesmo com valor digitado antes', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await digitar(campoDoValor(container), '160');

    await trocarTipo(container, 'Equipe');

    expect(folhaComTexto(container, 'span', 'não há valor devido')).toBeDefined();
    expect(textoDe(container)).not.toContain('R$ 160,00');
    expect(textoDe(container)).not.toContain('devidos');
    expect(textoDe(container)).not.toContain('A combinar');
  });

  it('equipe com quarto pago — o fechamento continua Isento e o custo da acomodação só aparece no bloco de hospedagem', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await trocarTipo(container, 'Equipe');

    await escolherHospedagem(container, 'Quarto');

    expect(folhaComTexto(container, 'span', 'não há valor devido')).toBeDefined();
    expect(textoDe(container)).toContain('R$ 90,00 de acomodação, à parte da contribuição.');
    expect(textoDe(container)).not.toContain('devidos');
  });
});

describe('InscricaoPage: confirmar e salvar como pendente', () => {
  it('sem pendências — o botão de confirmar usa só o primeiro nome e fica habilitado, sem motivo de bloqueio', async () => {
    const container = await abrirComPessoa('Sérgio Bittencourt');

    const confirmar = botaoDeConfirmar(container);

    expect(confirmar.textContent).toBe('Confirmar a inscrição de Sérgio');
    expect(confirmar.disabled).toBe(false);
    expect(confirmar.title).toBe('');
    expect(textoDe(container)).not.toContain('acima impede');
  });

  it('uma pendência — o botão fica bloqueado e o motivo fala no singular', async () => {
    const container = await abrirComPessoa('Antônio Duarte');

    const confirmar = botaoDeConfirmar(container);

    expect(confirmar.disabled).toBe(true);
    expect(confirmar.title).toBe('1 pendência acima impede confirmar. Salvar como pendente sempre pode.');
    expect(folhaComTexto(container, 'span', '1 pendência para confirmar')).toBeDefined();
  });

  it('várias pendências — o motivo fala no plural e a lista conta quantas são', async () => {
    const container = await abrirComPessoa('Marina Tavares');

    const confirmar = botaoDeConfirmar(container);

    expect(confirmar.disabled).toBe(true);
    expect(confirmar.title).toBe('3 pendências acima impedem confirmar. Salvar como pendente sempre pode.');
    expect(folhaComTexto(container, 'span', '3 pendências para confirmar')).toBeDefined();
  });

  it('com pendências — o cartão leva o ícone de alerta triangular', async () => {
    const container = await abrirComPessoa('Marina Tavares');

    expect(temIcone(container, 'triangle-alert')).toBe(true);
  });

  it('o botão de confirmar leva o ícone de check duplo', async () => {
    const container = await abrirComPessoa('Sérgio Bittencourt');

    expect(temIcone(botaoDeConfirmar(container), 'check-check')).toBe(true);
  });

  it('sem pendências — o cartão de pendências não aparece', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    expect(textoDe(container)).not.toContain('para confirmar');
  });

  it('confirmar sem valor — o recado diz que o valor fica a combinar e a tela volta à busca', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    await clicar(botaoDeConfirmar(container));

    expect(recadoMostrado(container)).toBe(
      'Helena Duarte está confirmada no Trabalho de Lua Cheia de 12/09/2026. Valor a combinar. O pagamento se marca na recepção, no dia.',
    );
    expect(existeCampoRotulado(container, 'Buscar no diretório')).toBe(true);
  });

  it('confirmar com contribuição, beliche por duas diárias — o recado traz o total devido com a hospedagem', async () => {
    const container = await abrirComPessoa('Sérgio Bittencourt');
    await digitar(campoDoValor(container), '160');
    await escolherHospedagem(container, 'Beliche no dormitório');
    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Quantas diárias'), '2');
    await clicar(botaoComTexto(container, 'Alocar um leito'));

    await clicar(botaoDeConfirmar(container));

    expect(recadoMostrado(container)).toBe(
      'Sérgio Bittencourt está confirmada no Trabalho de Lua Cheia de 12/09/2026. Devido: R$ 260,00. O pagamento se marca na recepção, no dia.',
    );
  });

  it('confirmar na Jornada — o recado usa o nome e a data da Jornada', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await trocarEvento(container, JORNADA);
    await digitar(campoDoValor(container), '360');

    await clicar(botaoDeConfirmar(container));

    expect(recadoMostrado(container)).toBe(
      'Helena Duarte está confirmada no Jornada de três dias de 24 a 26/10/2026. Devido: R$ 360,00. O pagamento se marca na recepção, no dia.',
    );
  });

  it('confirmar equipe — o recado diz isenta de contribuição e não cita valor, mesmo com acomodação paga', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await trocarTipo(container, 'Equipe');
    await escolherHospedagem(container, 'Quarto');
    await clicar(botaoComTexto(container, 'Alocar um leito'));

    await clicar(botaoDeConfirmar(container));

    expect(recadoMostrado(container)).toBe(
      'Helena Duarte está confirmada no Trabalho de Lua Cheia de 12/09/2026. Isenta de contribuição. O pagamento se marca na recepção, no dia.',
    );
  });

  it('confirmar com valor zerado — o recado diz Devido: R$ 0,00 e não Valor a combinar', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await digitar(campoDoValor(container), '0');

    await clicar(botaoDeConfirmar(container));

    expect(recadoMostrado(container)).toContain('Devido: R$ 0,00.');
  });

  it('confirmar — o recado some ao clicar em fechar, e a lista de pessoas continua', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await clicar(botaoDeConfirmar(container));

    await clicar(elemento<HTMLButtonElement>(container, 'button[aria-label="fechar recado"]'));

    expect(existeRecado(container)).toBe(false);
    expect(textoDe(container)).toContain('Marina Tavares');
  });

  it('escolher a próxima pessoa depois de confirmar — o recado anterior some', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await clicar(botaoDeConfirmar(container));

    await clicar(botaoDaPessoa(container, 'Marina Tavares'));

    expect(existeRecado(container)).toBe(false);
  });

  it('Salvar como pendente com três pendências — o recado conta três no plural', async () => {
    const container = await abrirComPessoa('Marina Tavares');

    await clicar(botaoComTexto(container, 'Salvar como pendente'));

    expect(recadoMostrado(container)).toBe(
      'Inscrição de Marina Tavares salva como pendente. Ela aparece na lista do trabalho com 3 pendências — e nada se perde por salvar assim.',
    );
    expect(existeCampoRotulado(container, 'Buscar no diretório')).toBe(true);
  });

  it('Salvar como pendente com uma pendência — o recado conta uma no singular', async () => {
    const container = await abrirComPessoa('Antônio Duarte');

    await clicar(botaoComTexto(container, 'Salvar como pendente'));

    expect(recadoMostrado(container)).toContain('com 1 pendência — e nada se perde');
  });

  it('Salvar como pendente sem pendência alguma — o recado diz 0 pendências', async () => {
    const container = await abrirComPessoa('Helena Duarte');

    await clicar(botaoComTexto(container, 'Salvar como pendente'));

    expect(recadoMostrado(container)).toContain('com 0 pendências — e nada se perde');
  });

  it('confirmar e trocar o evento em seguida — o recado da confirmação continua na tela', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await clicar(botaoDeConfirmar(container));

    await trocarEvento(container, JORNADA);

    expect(recadoMostrado(container)).toContain('Helena Duarte está confirmada no Trabalho de Lua Cheia de 12/09/2026.');
  });

  it('link copiado e inscrição salva como pendente — o link continua Copiado', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await clicar(botaoComTexto(container, 'Copiar'));

    await clicar(botaoComTexto(container, 'Salvar como pendente'));

    expect(linkEstaCopiado(container)).toBe(true);
  });

  it('Jornada, beliche e três diárias, inscrição salva como pendente — a Jornada fica marcada e a próxima pessoa abre o beliche em três diárias', async () => {
    const container = await abrirComPessoa('Helena Duarte');
    await trocarEvento(container, JORNADA);
    await escolherHospedagem(container, 'Beliche no dormitório');
    await escolherDiarias(container, '3');
    await clicar(botaoComTexto(container, 'Salvar como pendente'));
    await clicar(botaoDaPessoa(container, 'Marina Tavares'));

    await escolherHospedagem(container, 'Beliche no dormitório');

    expect(marcado(botaoComTexto(container, JORNADA))).toBe(true);
    expect(seletorDeDiarias(container).value).toBe('3');
    expect(textoDe(container)).toContain('R$ 150,00 de acomodação, à parte da contribuição.');
  });

  it('Jornada, beliche e três diárias, inscrição confirmada — a Jornada fica marcada e a próxima pessoa abre o beliche em três diárias', async () => {
    const container = await abrirComPessoa('Sérgio Bittencourt');
    await trocarEvento(container, JORNADA);
    await escolherHospedagem(container, 'Beliche no dormitório');
    await escolherDiarias(container, '3');
    await clicar(botaoComTexto(container, 'Alocar um leito'));
    await clicar(botaoDeConfirmar(container));
    await clicar(botaoDaPessoa(container, 'Marina Tavares'));

    await escolherHospedagem(container, 'Beliche no dormitório');

    expect(marcado(botaoComTexto(container, JORNADA))).toBe(true);
    expect(seletorDeDiarias(container).value).toBe('3');
    expect(textoDe(container)).toContain('R$ 150,00 de acomodação, à parte da contribuição.');
  });
});

describe('InscricaoPage: densidade', () => {
  it.each([
    { campo: false, minimo: 'var(--target-office)' },
    { campo: true, minimo: 'var(--target-field)' },
  ])('campo=$campo — os botões de confirmar e de salvar usam o alvo $minimo', async ({ campo, minimo }) => {
    definirDensidade(campo);
    const container = await abrirComPessoa('Helena Duarte');

    expect(botaoDeConfirmar(container).style.minHeight).toBe(minimo);
    expect(botaoComTexto(container, 'Salvar como pendente').style.minHeight).toBe(minimo);
  });

  it.each([
    { campo: false, colunas: 'repeat(3,minmax(0,1fr))' },
    { campo: true, colunas: '1fr' },
  ])('campo=$campo — os níveis de contribuição ficam em $colunas', async ({ campo, colunas }) => {
    definirDensidade(campo);
    const container = await abrirComPessoa('Helena Duarte');

    expect(botaoDoNivel(container, 'Social').parentElement?.style.gridTemplateColumns.replace(/ /g, '')).toBe(colunas);
  });

  it.each([
    { campo: false, minimo: '40px' },
    { campo: true, minimo: 'var(--target-field)' },
  ])('campo=$campo — os botões da modalidade da criança usam o alvo $minimo', async ({ campo, minimo }) => {
    definirDensidade(campo);
    const container = await abrirComPessoa('Antônio Duarte');

    const alvos = ['Permanece sob supervisão', 'Participa do ritual'].map(
      (modalidade) => botaoComTexto(container, modalidade).style.minHeight,
    );

    expect(alvos).toEqual([minimo, minimo]);
  });

  it('campo — a tela mostra as mesmas pendências e o mesmo total que no escritório', async () => {
    definirDensidade(true);
    const container = await abrirComPessoa('Marina Tavares');
    await digitar(campoDoValor(container), '100');

    expect(pendenciasMostradas(container)).toEqual([
      ['Anamnese pendente', 'IN5'],
      ['Conversa de primeira vez não registrada', 'IN6'],
      PENDENCIA_DE_EMERGENCIA,
    ]);
    expect(folhaComTexto(container, 'span', 'R$ 100,00')).toBeDefined();
  });

  it.each([
    { campo: false, minimo: '' },
    { campo: true, minimo: 'var(--target-field)' },
  ])('campo=$campo — níveis, hospedagens e refeições só ganham alvo mínimo em campo', async ({ campo, minimo }) => {
    definirDensidade(campo);
    const container = await abrirComPessoa('Helena Duarte');
    await trocarEvento(container, JORNADA);
    const botoes = [
      ...['Social', 'Sustentável', 'Próspero'].map((nivel) => botaoDoNivel(container, nivel)),
      ...['Não vai dormir na casa', 'Colchonete próprio na igreja', 'Beliche no dormitório', 'Quarto'].map((rotulo) =>
        opcaoEmLinha(container, rotulo),
      ),
      ...['Ceia', 'Café da manhã', 'Almoço', 'Jantar'].map((rotulo) => opcaoEmLinha(container, rotulo)),
    ];

    expect(botoes.map((botao) => botao.style.minHeight)).toEqual(Array(11).fill(minimo));
  });

  it.each([
    { campo: false, minimo: 'var(--target-office)' },
    { campo: true, minimo: 'var(--target-field)' },
  ])('campo=$campo — contato de emergência, restrições e valor combinado usam o alvo $minimo', async ({ campo, minimo }) => {
    definirDensidade(campo);
    const container = await abrirComPessoa('Helena Duarte');

    const alvos = ['Contato de emergência', 'Restrições alimentares', 'Valor combinado'].map(
      (rotulo) => campoRotulado<HTMLInputElement>(container, rotulo).style.minHeight,
    );

    expect(alvos).toEqual([minimo, minimo, minimo]);
  });

  it.each([
    { campo: false, campoDeBusca: 'var(--target-office)', linhaDaPessoa: '' },
    { campo: true, campoDeBusca: 'var(--target-field)', linhaDaPessoa: 'var(--target-field)' },
  ])('campo=$campo — o campo de busca usa o alvo $campoDeBusca e as pessoas só ganham alvo mínimo em campo', async ({ campo, campoDeBusca, linhaDaPessoa }) => {
    definirDensidade(campo);
    const container = await abrir();

    const linhas = PESSOAS_DO_DIRETORIO.map((nome) => botaoDaPessoa(container, nome).style.minHeight);

    expect(campoRotulado<HTMLInputElement>(container, 'Buscar no diretório').style.minHeight).toBe(campoDeBusca);
    expect(linhas).toEqual(Array(6).fill(linhaDaPessoa));
  });

  it.each([{ campo: false }, { campo: true }])(
    'campo=$campo — Trocar, Copiar, as ações de pendência e Não tem nenhuma ficam no alvo de escritório, sem acompanhar a densidade',
    async ({ campo }) => {
      definirDensidade(campo);
      const container = await abrirComPessoa('Marina Tavares');
      await escolherHospedagem(container, 'Beliche no dormitório');

      const alvos = [
        'Trocar',
        'Copiar',
        'Copiar o link para mandar no WhatsApp',
        'Registrar a conversa',
        'Alocar um leito',
        'Não tem nenhuma',
      ].map((rotulo) => botaoComTexto(container, rotulo).style.minHeight);

      expect(alvos).toEqual(Array(6).fill('var(--target-office)'));
    },
  );

  it.each([{ campo: false }, { campo: true }])(
    'campo=$campo — os seletores de responsável e de diárias ficam no alvo de escritório, sem acompanhar a densidade',
    async ({ campo }) => {
      definirDensidade(campo);
      const container = await abrirComPessoa('Antônio Duarte');
      await escolherHospedagem(container, 'Beliche no dormitório');

      const alvos = [seletorDeResponsavel(container), seletorDeDiarias(container)].map((seletor) => seletor.style.minHeight);

      expect(alvos).toEqual(['var(--target-office)', 'var(--target-office)']);
    },
  );
});
