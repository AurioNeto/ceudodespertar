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
import { AnamnesePage } from './AnamnesePage';
import { cabecalhoDaTela, campoRotulado, definirDensidade, textoDoAviso } from './apoioDeTeste';

beforeEach(() => {
  definirDensidade('office');
});

afterEach(async () => {
  await desmontarTudo();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window.navigator, 'clipboard');
});

const COR_DO_TOM = {
  confirmado: 'var(--color-confirmed)',
  sugestao: 'var(--color-suggest)',
  neutro: 'var(--color-neutral)',
  royal: 'var(--color-royal-ink)',
} as const;

const PERGUNTAS_DA_V3 = [
  'Você faz uso de medicação contínua?',
  'Quais medicações e doses?',
  'Tem ou teve diagnóstico psiquiátrico?',
  'Tem alguma condição cardíaca, hipertensão ou diabetes?',
  'Está gestante ou amamentando?',
  'Fez uso de álcool ou outras substâncias nos últimos 3 dias?',
  'Já participou de trabalho com ayahuasca antes?',
  'Contato de emergência (nome e telefone)',
  'Alguma coisa que a casa precise saber e não foi perguntada?',
];

const PERGUNTAS_DA_V4 = [...PERGUNTAS_DA_V3, 'Faz acompanhamento terapêutico hoje?'];

const folhasDe = (origem: ParentNode) =>
  todos<HTMLSpanElement>(origem, 'span').filter(
    (span) => span.childElementCount === 0 && span.getAttribute('aria-hidden') !== 'true',
  );

const textosDasFolhas = (origem: ParentNode) => folhasDe(origem).map((folha) => folha.textContent);

const itensDeVersao = (container: HTMLElement) =>
  todos<HTMLButtonElement>(container, 'button').filter((botao) =>
    botao.textContent?.startsWith('Anamnese do corpo · v'),
  );

const resumosDasVersoes = (container: HTMLElement) => itensDeVersao(container).map(textosDasFolhas);

const itemDaVersao = (container: HTMLElement, id: string) => {
  const achado = itensDeVersao(container).find((item) => item.textContent?.startsWith(`Anamnese do corpo · ${id}`));
  if (!achado) throw new Error(`versão não encontrada na lista: ${id}`);
  return achado;
};

const abrirVersao = (container: HTMLElement, id: string) => clicar(itemDaVersao(container, id));

const ROTULO_DE_VERSAO = /^Anamnese do corpo · v\d+$/;

const folhaDoTituloDaVersaoAberta = (container: HTMLElement) =>
  folhasDe(container).find((folha) => !folha.closest('button') && ROTULO_DE_VERSAO.test(folha.textContent ?? ''));

const tituloDaVersaoAberta = (container: HTMLElement) => folhaDoTituloDaVersaoAberta(container)?.textContent;

const seloDaVersaoAberta = (container: HTMLElement) => folhaDoTituloDaVersaoAberta(container)?.nextElementSibling;

const descricaoDaVersaoAberta = (container: HTMLElement) =>
  todos(container, 'p')
    .filter((paragrafo) => !paragrafo.closest('header'))
    .map((paragrafo) => paragrafo.textContent);

const linhasDePerguntas = (container: HTMLElement) =>
  folhasDe(container)
    .filter((folha) => /^\d{2}$/.test(folha.textContent ?? ''))
    .map((numero) => numero.parentElement as HTMLElement);

const perguntasDaVersaoAberta = (container: HTMLElement) =>
  linhasDePerguntas(container).map((linha) => textosDasFolhas(linha));

const titulosDasPerguntas = (container: HTMLElement) =>
  perguntasDaVersaoAberta(container).map((folhas) => folhas[1]);

const controleDaPergunta = (container: HTMLElement, posicao: number, controle: 'subir' | 'descer' | 'remover') => {
  const linha = linhasDePerguntas(container)[posicao];
  if (!linha) throw new Error(`pergunta não encontrada na posição ${posicao}`);
  return elemento<HTMLButtonElement>(linha, `button[aria-label="${controle}"]`);
};

const historicoDaVersaoAberta = (container: HTMLElement) => {
  const cartao = folhaComTexto(container, 'span', 'Histórico da versão').parentElement;
  return Array.from(cartao?.children ?? [])
    .slice(1)
    .map((entrada) => textosDasFolhas(entrada));
};

const interruptor = (container: HTMLElement, rotulo: string) =>
  elemento<HTMLButtonElement>(container, `button[role="switch"][aria-label="${rotulo}"]`);

const botaoPresente = (container: HTMLElement, texto: string) =>
  todos<HTMLButtonElement>(container, 'button').some((botao) => botao.textContent?.trim() === texto);

async function montarAnamnese() {
  const montado = await montar(<AnamnesePage />);
  return montado.container;
}

async function publicarRascunhoV4(container: HTMLElement) {
  await abrirVersao(container, 'v4');
  await clicar(botaoComTexto(container, 'Publicar versão'));
}

async function abrirFormularioDeNovaPergunta(container: HTMLElement) {
  await abrirVersao(container, 'v4');
  await clicar(botaoComTexto(container, 'Adicionar pergunta'));
}

describe('AnamnesePage: cabeçalho nas duas densidades', () => {
  it('escritório — mostra o código com o nome da tela, o título, o subtítulo e Novo rascunho', async () => {
    const container = await montarAnamnese();

    const cabecalho = cabecalhoDaTela(container);

    expect(elemento(cabecalho, 'h1').textContent).toBe('Anamnese');
    expect(folhaComTexto(cabecalho, 'div', 'F-10 · Anamnese')).toBeTruthy();
    expect(folhaComTexto(cabecalho, 'p', 'O formulário, suas versões e o que cada uma exige')).toBeTruthy();
    expect(botaoComTexto(cabecalho, 'Novo rascunho')).toBeTruthy();
  });

  it('campo — mostra só o código e o título, sem subtítulo', async () => {
    definirDensidade('field');
    const container = await montarAnamnese();

    const cabecalho = cabecalhoDaTela(container);

    expect(folhaComTexto(cabecalho, 'div', 'F-10')).toBeTruthy();
    expect(cabecalho.querySelector('p')).toBeNull();
    expect(botaoComTexto(cabecalho, 'Novo rascunho')).toBeTruthy();
  });
});

describe('AnamnesePage: lista de versões', () => {
  it.each([
    { nome: 'escritório', densidade: 'office' as const },
    { nome: 'campo', densidade: 'field' as const },
  ])('$nome — lista as quatro versões da mais nova para a mais antiga, com situação e contagens', async ({ densidade }) => {
    definirDensidade(densidade);
    const container = await montarAnamnese();

    expect(resumosDasVersoes(container)).toEqual([
      ['Anamnese do corpo · v4', 'Rascunho', '10 perguntas · 0 respostas'],
      ['Anamnese do corpo · v3', 'Publicada', '9 perguntas · 128 respostas'],
      ['Anamnese do corpo · v2', 'Arquivada', '5 perguntas · 96 respostas'],
      ['Anamnese do corpo · v1', 'Arquivada', '3 perguntas · 41 respostas'],
    ]);
  });

  it.each([
    { nome: 'rascunho', versao: 'v4', cor: COR_DO_TOM.sugestao },
    { nome: 'publicada', versao: 'v3', cor: COR_DO_TOM.confirmado },
    { nome: 'arquivada', versao: 'v2', cor: COR_DO_TOM.neutro },
  ])('versão $nome — o selo da lista tem o tom correspondente', async ({ versao, cor }) => {
    const container = await montarAnamnese();

    const selo = folhasDe(itemDaVersao(container, versao))[1];

    expect(selo?.style.color).toBe(cor);
  });

  it('estado inicial — abre a versão publicada, não o rascunho que está no topo da lista', async () => {
    const container = await montarAnamnese();

    expect(tituloDaVersaoAberta(container)).toBe('Anamnese do corpo · v3');
    expect(itemDaVersao(container, 'v3').style.background).toBe('var(--color-royal-soft)');
    expect(itemDaVersao(container, 'v4').style.background).toBe('var(--bg-card)');
  });

  it('clicar numa versão — abre essa versão e passa o destaque para ela', async () => {
    const container = await montarAnamnese();

    await abrirVersao(container, 'v2');

    expect(tituloDaVersaoAberta(container)).toBe('Anamnese do corpo · v2');
    expect(itemDaVersao(container, 'v2').style.background).toBe('var(--color-royal-soft)');
    expect(itemDaVersao(container, 'v3').style.background).toBe('var(--bg-card)');
  });
});

describe('AnamnesePage: versão publicada aberta', () => {
  it('mostra o rótulo, o selo, quem criou, quando criou e quando publicou', async () => {
    const container = await montarAnamnese();

    expect(tituloDaVersaoAberta(container)).toBe('Anamnese do corpo · v3');
    expect(seloDaVersaoAberta(container)?.textContent).toBe('Publicada');
    expect(
      folhaComTexto(container, 'span', 'criada em 02/06/2026 por Lucia Prado · publicada em 12/06/2026'),
    ).toBeTruthy();
  });

  it('mostra a descrição da versão', async () => {
    const container = await montarAnamnese();

    expect(descricaoDaVersaoAberta(container)).toEqual([
      'Versão em uso. Todo link enviado hoje abre esta versão, e as respostas ficam presas a ela.',
    ]);
  });

  it('oferece Copiar link público e não oferece Publicar versão', async () => {
    const container = await montarAnamnese();

    expect(botaoPresente(container, 'Copiar link público')).toBe(true);
    expect(botaoPresente(container, 'Publicar versão')).toBe(false);
  });

  it('Copiar link público — só avisa com o endereço da versão, sem escrever na área de transferência', async () => {
    const escreverTexto = vi.fn();
    Object.defineProperty(window.navigator, 'clipboard', { value: { writeText: escreverTexto }, configurable: true });
    const container = await montarAnamnese();

    await clicar(botaoComTexto(container, 'Copiar link público'));

    expect(textoDoAviso(container)).toBe(
      'Link público copiado: cdd.app/anamnese/v3 — quem responde não precisa de conta.',
    );
    expect(escreverTexto).not.toHaveBeenCalled();
  });

  it('lista as nove perguntas numeradas, sem controles de edição, e diz que a versão está fechada', async () => {
    const container = await montarAnamnese();

    expect(titulosDasPerguntas(container)).toEqual(PERGUNTAS_DA_V3);
    expect(linhasDePerguntas(container).map((linha) => todos(linha, 'button').length)).toEqual(
      PERGUNTAS_DA_V3.map(() => 0),
    );
    expect(botaoPresente(container, 'Adicionar pergunta')).toBe(false);
    expect(
      folhaComTexto(container, 'span', 'versão fechada: as respostas ficam presas a esta redação'),
    ).toBeTruthy();
  });

  it('pergunta obrigatória com regra de alerta — mostra número, tipo, selo Obrigatória e a regra', async () => {
    const container = await montarAnamnese();

    expect(perguntasDaVersaoAberta(container)[0]).toEqual([
      '01',
      'Você faz uso de medicação contínua?',
      'Sim ou não',
      'Obrigatória',
      'ponto de atenção quando: resposta sim',
    ]);
  });

  it('pergunta opcional com regra de alerta — mostra a regra e não mostra o selo Obrigatória', async () => {
    const container = await montarAnamnese();

    expect(perguntasDaVersaoAberta(container)[1]).toEqual([
      '02',
      'Quais medicações e doses?',
      'Texto longo',
      'ponto de atenção quando: qualquer resposta com antidepressivo',
    ]);
  });

  it('pergunta obrigatória sem regra de alerta — mostra o selo e nenhuma frase de ponto de atenção', async () => {
    const container = await montarAnamnese();

    expect(perguntasDaVersaoAberta(container)[6]).toEqual([
      '07',
      'Já participou de trabalho com ayahuasca antes?',
      'Sim ou não',
      'Obrigatória',
    ]);
  });

  it('pergunta opcional sem regra de alerta — mostra só o número, o título e o tipo', async () => {
    const container = await montarAnamnese();

    expect(perguntasDaVersaoAberta(container)[8]).toEqual([
      '09',
      'Alguma coisa que a casa precise saber e não foi perguntada?',
      'Texto longo',
    ]);
  });

  it('selo Obrigatória — usa o tom royal', async () => {
    const container = await montarAnamnese();

    const selo = folhaComTexto<HTMLSpanElement>(container, 'span', 'Obrigatória');

    expect(selo.style.color).toBe(COR_DO_TOM.royal);
  });

  it('histórico — mostra as três linhas da versão, com data e texto, na ordem em que aconteceram', async () => {
    const container = await montarAnamnese();

    expect(historicoDaVersaoAberta(container)).toEqual([
      ['02/06/2026', 'Rascunho criado a partir da v2.'],
      ['10/06/2026', 'Revisada pela direção.'],
      ['12/06/2026', 'Publicada por Aurio Neto. v2 passou a arquivada.'],
    ]);
  });
});

describe('AnamnesePage: versão arquivada aberta', () => {
  it('v2 — mostra o selo Arquivada, a descrição e a data de publicação, e não oferece publicar nem copiar link', async () => {
    const container = await montarAnamnese();

    await abrirVersao(container, 'v2');

    expect(seloDaVersaoAberta(container)?.textContent).toBe('Arquivada');
    expect(descricaoDaVersaoAberta(container)).toEqual([
      'Arquivada. As respostas dadas nela continuam válidas até vencer, mas ninguém responde mais por aqui.',
    ]);
    expect(
      folhaComTexto(container, 'span', 'criada em 15/01/2024 por Aurio Neto · publicada em 01/02/2024'),
    ).toBeTruthy();
    expect(botaoPresente(container, 'Publicar versão')).toBe(false);
    expect(botaoPresente(container, 'Copiar link público')).toBe(false);
  });

  it('v2 — lista as cinco perguntas sem controles de edição e diz que a versão está fechada', async () => {
    const container = await montarAnamnese();

    await abrirVersao(container, 'v2');

    expect(titulosDasPerguntas(container)).toEqual([
      'Faz uso de medicação contínua?',
      'Tem diagnóstico psiquiátrico?',
      'Tem condição cardíaca?',
      'Está gestante?',
      'Contato de emergência',
    ]);
    expect(todos(container, 'button[aria-label="remover"]')).toHaveLength(0);
    expect(
      folhaComTexto(container, 'span', 'versão fechada: as respostas ficam presas a esta redação'),
    ).toBeTruthy();
  });

  it('v1 — mostra a data de criação sem dia e a publicação sem dia, como estão no cadastro', async () => {
    const container = await montarAnamnese();

    await abrirVersao(container, 'v1');

    expect(
      folhaComTexto(container, 'span', 'criada em 08/2022 por Secretaria · publicada em 09/2022'),
    ).toBeTruthy();
    expect(historicoDaVersaoAberta(container)).toEqual([
      ['09/2022', 'Publicada pela secretaria.'],
      ['01/02/2024', 'Arquivada pela publicação da v2.'],
    ]);
  });
});

describe('AnamnesePage: rascunho aberto', () => {
  it('v4 — mostra o selo Rascunho, quem criou sem data de publicação e a descrição do rascunho', async () => {
    const container = await montarAnamnese();

    await abrirVersao(container, 'v4');

    expect(seloDaVersaoAberta(container)?.textContent).toBe('Rascunho');
    expect(folhaComTexto(container, 'span', 'criada em 28/08/2026 por Lucia Prado')).toBeTruthy();
    expect(descricaoDaVersaoAberta(container)).toEqual([
      'Rascunho aberto a partir da v3. Enquanto não for publicada, ninguém recebe este formulário.',
    ]);
  });

  it('v4 — oferece Publicar versão e não oferece Copiar link público', async () => {
    const container = await montarAnamnese();

    await abrirVersao(container, 'v4');

    expect(botaoPresente(container, 'Publicar versão')).toBe(true);
    expect(botaoPresente(container, 'Copiar link público')).toBe(false);
  });

  it('v4 — lista as dez perguntas com subir, descer e remover em cada uma e diz que só o rascunho se edita', async () => {
    const container = await montarAnamnese();

    await abrirVersao(container, 'v4');

    expect(titulosDasPerguntas(container)).toEqual(PERGUNTAS_DA_V4);
    expect(
      linhasDePerguntas(container).map((linha) =>
        todos(linha, 'button').map((botao) => botao.getAttribute('aria-label')),
      ),
    ).toEqual(PERGUNTAS_DA_V4.map(() => ['subir', 'descer', 'remover']));
    expect(
      folhaComTexto(container, 'span', 'editar só no rascunho — versão publicada não muda'),
    ).toBeTruthy();
  });

  it('v4 — a pergunta nova do rascunho é opcional e sem regra de alerta', async () => {
    const container = await montarAnamnese();

    await abrirVersao(container, 'v4');

    expect(perguntasDaVersaoAberta(container)[9]).toEqual([
      '10',
      'Faz acompanhamento terapêutico hoje?',
      'Sim ou não',
    ]);
  });

  it('v4 — mostra o histórico do rascunho', async () => {
    const container = await montarAnamnese();

    await abrirVersao(container, 'v4');

    expect(historicoDaVersaoAberta(container)).toEqual([
      ['28/08/2026', 'Rascunho criado por Lucia Prado a partir da v3.'],
      ['29/08/2026', 'Pergunta sobre acompanhamento terapêutico adicionada.'],
    ]);
  });
});

describe('AnamnesePage: ordem e remoção de perguntas no rascunho', () => {
  it('subir a segunda pergunta — troca com a primeira e renumera', async () => {
    const container = await montarAnamnese();
    await abrirVersao(container, 'v4');

    await clicar(controleDaPergunta(container, 1, 'subir'));

    expect(titulosDasPerguntas(container).slice(0, 3)).toEqual([
      'Quais medicações e doses?',
      'Você faz uso de medicação contínua?',
      'Tem ou teve diagnóstico psiquiátrico?',
    ]);
    expect(perguntasDaVersaoAberta(container)[0]?.[0]).toBe('01');
  });

  it('subir a primeira pergunta — não muda a ordem', async () => {
    const container = await montarAnamnese();
    await abrirVersao(container, 'v4');

    await clicar(controleDaPergunta(container, 0, 'subir'));

    expect(titulosDasPerguntas(container)).toEqual(PERGUNTAS_DA_V4);
  });

  it('descer a primeira pergunta — troca com a segunda', async () => {
    const container = await montarAnamnese();
    await abrirVersao(container, 'v4');

    await clicar(controleDaPergunta(container, 0, 'descer'));

    expect(titulosDasPerguntas(container).slice(0, 3)).toEqual([
      'Quais medicações e doses?',
      'Você faz uso de medicação contínua?',
      'Tem ou teve diagnóstico psiquiátrico?',
    ]);
  });

  it('descer a última pergunta — não muda a ordem', async () => {
    const container = await montarAnamnese();
    await abrirVersao(container, 'v4');

    await clicar(controleDaPergunta(container, 9, 'descer'));

    expect(titulosDasPerguntas(container)).toEqual(PERGUNTAS_DA_V4);
  });

  it('subir e descer — levam junto o selo e a regra de alerta da pergunta', async () => {
    const container = await montarAnamnese();
    await abrirVersao(container, 'v4');

    await clicar(controleDaPergunta(container, 0, 'descer'));

    expect(perguntasDaVersaoAberta(container)[1]).toEqual([
      '02',
      'Você faz uso de medicação contínua?',
      'Sim ou não',
      'Obrigatória',
      'ponto de atenção quando: resposta sim',
    ]);
  });

  it('remover uma pergunta — tira só ela, renumera e baixa a contagem da lista', async () => {
    const container = await montarAnamnese();
    await abrirVersao(container, 'v4');

    await clicar(controleDaPergunta(container, 1, 'remover'));

    expect(titulosDasPerguntas(container)).toEqual(PERGUNTAS_DA_V4.filter((_, posicao) => posicao !== 1));
    expect(perguntasDaVersaoAberta(container).map((folhas) => folhas[0])).toEqual([
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
      '07',
      '08',
      '09',
    ]);
    expect(resumosDasVersoes(container)[0]).toEqual(['Anamnese do corpo · v4', 'Rascunho', '9 perguntas · 0 respostas']);
  });

  it('mexer nas perguntas do rascunho — não muda as perguntas da versão publicada', async () => {
    const container = await montarAnamnese();
    await abrirVersao(container, 'v4');
    await clicar(controleDaPergunta(container, 0, 'remover'));

    await abrirVersao(container, 'v3');

    expect(titulosDasPerguntas(container)).toEqual(PERGUNTAS_DA_V3);
    expect(resumosDasVersoes(container)[1]).toEqual(['Anamnese do corpo · v3', 'Publicada', '9 perguntas · 128 respostas']);
  });
});

describe('AnamnesePage: nova pergunta no rascunho', () => {
  it('Adicionar pergunta — abre o formulário com tipo Sim ou não, sem regra de alerta e resposta obrigatória ligada', async () => {
    const container = await montarAnamnese();

    await abrirFormularioDeNovaPergunta(container);

    expect(campoRotulado(container, 'Pergunta').value).toBe('');
    expect(campoRotulado(container, 'Pergunta').placeholder).toBe('Faz acompanhamento terapêutico hoje?');
    expect(campoRotulado<HTMLSelectElement>(container, 'Tipo de resposta').value).toBe('Sim ou não');
    expect(campoRotulado(container, 'Vira ponto de atenção quando').value).toBe('');
    expect(interruptor(container, 'Resposta obrigatória').getAttribute('aria-checked')).toBe('true');
    expect(botaoPresente(container, 'Adicionar pergunta')).toBe(false);
  });

  it('formulário aberto — oferece os sete tipos de resposta e a dica da regra de alerta', async () => {
    const container = await montarAnamnese();

    await abrirFormularioDeNovaPergunta(container);

    expect(
      Array.from(campoRotulado<HTMLSelectElement>(container, 'Tipo de resposta').options).map((opcao) => opcao.value),
    ).toEqual(['Sim ou não', 'Texto curto', 'Texto longo', 'Escolha única', 'Múltipla escolha', 'Data', 'Número']);
    expect(folhaComTexto(container, 'span', 'em branco, a resposta não gera alerta')).toBeTruthy();
  });

  it('formulário sem a pergunta escrita — Adicionar fica bloqueado e diz por quê', async () => {
    const container = await montarAnamnese();

    await abrirFormularioDeNovaPergunta(container);

    const adicionar = botaoComTexto(container, 'Adicionar');
    expect(adicionar.disabled).toBe(true);
    expect(adicionar.title).toBe('Escreva a pergunta.');
    expect(folhaComTexto(container, 'span', 'Escreva a pergunta.')).toBeTruthy();
  });

  it('pergunta só com espaços — continua bloqueado', async () => {
    const container = await montarAnamnese();
    await abrirFormularioDeNovaPergunta(container);

    await digitar(campoRotulado(container, 'Pergunta'), '    ');

    expect(botaoComTexto(container, 'Adicionar').disabled).toBe(true);
  });

  it('pergunta escrita — libera Adicionar e some o motivo do bloqueio', async () => {
    const container = await montarAnamnese();
    await abrirFormularioDeNovaPergunta(container);

    await digitar(campoRotulado(container, 'Pergunta'), 'Usa alguma planta medicinal?');

    expect(botaoComTexto(container, 'Adicionar').disabled).toBe(false);
    expect(container.textContent).not.toContain('Escreva a pergunta.');
  });

  it('Adicionar — põe a pergunta no fim da lista, com o título sem espaços das pontas, e fecha o formulário', async () => {
    const container = await montarAnamnese();
    await abrirFormularioDeNovaPergunta(container);
    await digitar(campoRotulado(container, 'Pergunta'), '  Usa alguma planta medicinal?  ');

    await clicar(botaoComTexto(container, 'Adicionar'));

    expect(perguntasDaVersaoAberta(container)[10]).toEqual([
      '11',
      'Usa alguma planta medicinal?',
      'Sim ou não',
      'Obrigatória',
    ]);
    expect(todos(container, 'input')).toHaveLength(0);
    expect(botaoPresente(container, 'Adicionar pergunta')).toBe(true);
    expect(resumosDasVersoes(container)[0]).toEqual(['Anamnese do corpo · v4', 'Rascunho', '11 perguntas · 0 respostas']);
  });

  it('Adicionar com tipo, regra de alerta e resposta opcional — guarda os três, e a regra sem espaços das pontas', async () => {
    const container = await montarAnamnese();
    await abrirFormularioDeNovaPergunta(container);
    await digitar(campoRotulado(container, 'Pergunta'), 'Quando foi a última consulta?');
    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Tipo de resposta'), 'Data');
    await digitar(campoRotulado(container, 'Vira ponto de atenção quando'), '  mais de um ano  ');
    await clicar(interruptor(container, 'Resposta obrigatória'));

    await clicar(botaoComTexto(container, 'Adicionar'));

    expect(perguntasDaVersaoAberta(container)[10]).toEqual([
      '11',
      'Quando foi a última consulta?',
      'Data',
      'ponto de atenção quando: mais de um ano',
    ]);
  });

  it('Adicionar com a regra de alerta só de espaços — a pergunta fica sem regra', async () => {
    const container = await montarAnamnese();
    await abrirFormularioDeNovaPergunta(container);
    await digitar(campoRotulado(container, 'Pergunta'), 'Tem alergia?');
    await digitar(campoRotulado(container, 'Vira ponto de atenção quando'), '   ');

    await clicar(botaoComTexto(container, 'Adicionar'));

    expect(perguntasDaVersaoAberta(container)[10]).toEqual(['11', 'Tem alergia?', 'Sim ou não', 'Obrigatória']);
  });

  it('interruptor Resposta obrigatória — desliga e liga de novo', async () => {
    const container = await montarAnamnese();
    await abrirFormularioDeNovaPergunta(container);

    await clicar(interruptor(container, 'Resposta obrigatória'));
    const depoisDeDesligar = interruptor(container, 'Resposta obrigatória').getAttribute('aria-checked');
    await clicar(interruptor(container, 'Resposta obrigatória'));

    expect(depoisDeDesligar).toBe('false');
    expect(interruptor(container, 'Resposta obrigatória').getAttribute('aria-checked')).toBe('true');
  });

  it('Cancelar — fecha o formulário sem adicionar pergunta, e o formulário reaberto vem vazio', async () => {
    const container = await montarAnamnese();
    await abrirFormularioDeNovaPergunta(container);
    await digitar(campoRotulado(container, 'Pergunta'), 'Rascunho de pergunta');

    await clicar(botaoComTexto(container, 'Cancelar'));
    await clicar(botaoComTexto(container, 'Adicionar pergunta'));

    expect(titulosDasPerguntas(container)).toEqual(PERGUNTAS_DA_V4);
    expect(campoRotulado(container, 'Pergunta').value).toBe('');
  });

  it('formulário aberto e troca de versão — o que foi digitado continua lá quando o rascunho volta', async () => {
    const container = await montarAnamnese();
    await abrirFormularioDeNovaPergunta(container);
    await digitar(campoRotulado(container, 'Pergunta'), 'Texto que ficou pela metade');

    await abrirVersao(container, 'v3');
    const formularioNaPublicada = todos(container, 'input').length;
    await abrirVersao(container, 'v4');

    expect(formularioNaPublicada).toBe(0);
    expect(campoRotulado(container, 'Pergunta').value).toBe('Texto que ficou pela metade');
  });
});

describe('AnamnesePage: Publicar versão', () => {
  it('publicar o rascunho — avisa com o rótulo da versão e que a anterior foi arquivada', async () => {
    const container = await montarAnamnese();

    await publicarRascunhoV4(container);

    expect(textoDoAviso(container)).toBe(
      'Anamnese do corpo · v4 publicada. A versão anterior foi arquivada, e as respostas dadas nela continuam presas a ela.',
    );
  });

  it('publicar o rascunho — ele vira Publicada e a anterior vira Arquivada, na lista', async () => {
    const container = await montarAnamnese();

    await publicarRascunhoV4(container);

    expect(resumosDasVersoes(container).map((resumo) => resumo.slice(0, 2))).toEqual([
      ['Anamnese do corpo · v4', 'Publicada'],
      ['Anamnese do corpo · v3', 'Arquivada'],
      ['Anamnese do corpo · v2', 'Arquivada'],
      ['Anamnese do corpo · v1', 'Arquivada'],
    ]);
  });

  it('publicar o rascunho — a versão aberta passa a ter publicação em 02/09/2026 e a trocar Publicar por Copiar link', async () => {
    const container = await montarAnamnese();

    await publicarRascunhoV4(container);

    expect(seloDaVersaoAberta(container)?.textContent).toBe('Publicada');
    expect(
      folhaComTexto(container, 'span', 'criada em 28/08/2026 por Lucia Prado · publicada em 02/09/2026'),
    ).toBeTruthy();
    expect(botaoPresente(container, 'Publicar versão')).toBe(false);
    expect(botaoPresente(container, 'Copiar link público')).toBe(true);
  });

  it('publicar o rascunho — acrescenta ao histórico "Publicada por Aurio Neto." em 02/09/2026', async () => {
    const container = await montarAnamnese();

    await publicarRascunhoV4(container);

    expect(historicoDaVersaoAberta(container)).toEqual([
      ['28/08/2026', 'Rascunho criado por Lucia Prado a partir da v3.'],
      ['29/08/2026', 'Pergunta sobre acompanhamento terapêutico adicionada.'],
      ['02/09/2026', 'Publicada por Aurio Neto.'],
    ]);
  });

  it('publicar o rascunho — a versão anterior ganha no histórico a linha da arquivação', async () => {
    const container = await montarAnamnese();
    await publicarRascunhoV4(container);

    await abrirVersao(container, 'v3');

    expect(seloDaVersaoAberta(container)?.textContent).toBe('Arquivada');
    expect(historicoDaVersaoAberta(container).at(-1)).toEqual(['02/09/2026', 'Arquivada pela publicação da v4.']);
    expect(botaoPresente(container, 'Copiar link público')).toBe(false);
  });

  it('publicar o rascunho — não mexe nas versões que já estavam arquivadas', async () => {
    const container = await montarAnamnese();
    await publicarRascunhoV4(container);

    await abrirVersao(container, 'v2');

    expect(historicoDaVersaoAberta(container)).toEqual([
      ['01/02/2024', 'Publicada por Aurio Neto.'],
      ['12/06/2026', 'Arquivada pela publicação da v3.'],
    ]);
  });

  it('publicar o rascunho — a descrição continua a de rascunho: diz que ninguém recebe o formulário', async () => {
    const container = await montarAnamnese();

    await publicarRascunhoV4(container);

    expect(descricaoDaVersaoAberta(container)).toEqual([
      'Rascunho aberto a partir da v3. Enquanto não for publicada, ninguém recebe este formulário.',
    ]);
  });

  it('publicar o rascunho — Em uso hoje passa a mostrar a nova versão, com zero respostas', async () => {
    const container = await montarAnamnese();
    const antes = folhaComTexto(container, 'span', 'Em uso hoje: Anamnese do corpo · v3 · 128 respostas');

    await publicarRascunhoV4(container);

    expect(antes).toBeTruthy();
    expect(folhaComTexto(container, 'span', 'Em uso hoje: Anamnese do corpo · v4 · 0 respostas')).toBeTruthy();
  });

  it('publicar o rascunho — as perguntas editadas antes entram na versão publicada, agora fechada', async () => {
    const container = await montarAnamnese();
    await abrirVersao(container, 'v4');
    await clicar(controleDaPergunta(container, 9, 'remover'));

    await clicar(botaoComTexto(container, 'Publicar versão'));

    expect(titulosDasPerguntas(container)).toEqual(PERGUNTAS_DA_V3);
    expect(todos(container, 'button[aria-label="remover"]')).toHaveLength(0);
  });

  it('publicar sem tela de impacto nem confirmação — um clique basta', async () => {
    const container = await montarAnamnese();
    await abrirVersao(container, 'v4');

    await clicar(botaoComTexto(container, 'Publicar versão'));

    expect(todos(container, '[role="dialog"]')).toHaveLength(0);
    expect(botaoPresente(container, 'Confirmar')).toBe(false);
    expect(container.textContent).not.toMatch(/impacto|passarão a ter pendência/i);
    expect(textoDoAviso(container)).toContain('publicada.');
  });

  it('a data da publicação não vem do relógio — com o relógio em 2027 continua 02/09/2026', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2027-03-15T12:00:00Z'));
    const container = await montarAnamnese();

    await publicarRascunhoV4(container);

    expect(historicoDaVersaoAberta(container).at(-1)).toEqual(['02/09/2026', 'Publicada por Aurio Neto.']);
  });
});

describe('AnamnesePage: Novo rascunho', () => {
  it('com um rascunho já aberto — avisa e não cria versão nova', async () => {
    const container = await montarAnamnese();

    await clicar(botaoComTexto(container, 'Novo rascunho'));

    expect(textoDoAviso(container)).toBe('Já existe um rascunho aberto. Publique ou descarte antes de criar outro.');
    expect(itensDeVersao(container)).toHaveLength(4);
    expect(tituloDaVersaoAberta(container)).toBe('Anamnese do corpo · v3');
  });

  it('com um rascunho já aberto — a tela não oferece nenhuma ação de descartar o rascunho', async () => {
    const container = await montarAnamnese();
    await abrirVersao(container, 'v4');

    const textosDosBotoes = todos<HTMLButtonElement>(container, 'button').map((botao) => botao.textContent);

    expect(textosDosBotoes.filter((texto) => /descart|exclu|apag/i.test(texto ?? ''))).toEqual([]);
  });

  it('sem rascunho aberto — cria a versão seguinte no topo da lista, como rascunho, e abre essa versão', async () => {
    const container = await montarAnamnese();
    await publicarRascunhoV4(container);

    await clicar(botaoComTexto(container, 'Novo rascunho'));

    expect(resumosDasVersoes(container)[0]).toEqual(['Anamnese do corpo · v5', 'Rascunho', '10 perguntas · 0 respostas']);
    expect(tituloDaVersaoAberta(container)).toBe('Anamnese do corpo · v5');
    expect(seloDaVersaoAberta(container)?.textContent).toBe('Rascunho');
  });

  it('sem rascunho aberto — avisa que editar não muda o formulário que está no ar', async () => {
    const container = await montarAnamnese();
    await publicarRascunhoV4(container);

    await clicar(botaoComTexto(container, 'Novo rascunho'));

    expect(textoDoAviso(container)).toBe('Rascunho criado. Editar aqui não muda o formulário que está no ar.');
  });

  it('o rascunho novo — nasce da versão que estava aberta, com a descrição, o autor, a data e o histórico de 02/09/2026', async () => {
    const container = await montarAnamnese();
    await publicarRascunhoV4(container);

    await clicar(botaoComTexto(container, 'Novo rascunho'));

    expect(descricaoDaVersaoAberta(container)).toEqual([
      'Rascunho aberto a partir da v4. Enquanto não for publicada, ninguém recebe este formulário.',
    ]);
    expect(folhaComTexto(container, 'span', 'criada em 02/09/2026 por Aurio Neto')).toBeTruthy();
    expect(historicoDaVersaoAberta(container)).toEqual([['02/09/2026', 'Rascunho criado por Aurio Neto a partir da v4.']]);
  });

  it('com outra versão aberta — o rascunho copia as perguntas dessa versão', async () => {
    const container = await montarAnamnese();
    await publicarRascunhoV4(container);
    await abrirVersao(container, 'v2');

    await clicar(botaoComTexto(container, 'Novo rascunho'));

    expect(descricaoDaVersaoAberta(container)[0]).toContain('a partir da v2.');
    expect(titulosDasPerguntas(container)).toEqual([
      'Faz uso de medicação contínua?',
      'Tem diagnóstico psiquiátrico?',
      'Tem condição cardíaca?',
      'Está gestante?',
      'Contato de emergência',
    ]);
  });

  it('o rascunho novo — já vem editável: com controles e com Publicar versão', async () => {
    const container = await montarAnamnese();
    await publicarRascunhoV4(container);

    await clicar(botaoComTexto(container, 'Novo rascunho'));

    expect(botaoPresente(container, 'Publicar versão')).toBe(true);
    expect(todos(container, 'button[aria-label="remover"]')).toHaveLength(10);
  });

  it('editar o rascunho novo — não muda a versão de onde ele nasceu', async () => {
    const container = await montarAnamnese();
    await publicarRascunhoV4(container);
    await clicar(botaoComTexto(container, 'Novo rascunho'));
    await clicar(controleDaPergunta(container, 0, 'remover'));

    await abrirVersao(container, 'v4');

    expect(titulosDasPerguntas(container)).toEqual(PERGUNTAS_DA_V4);
  });

  it('depois de criar o rascunho — um segundo clique volta a avisar que já existe um', async () => {
    const container = await montarAnamnese();
    await publicarRascunhoV4(container);
    await clicar(botaoComTexto(container, 'Novo rascunho'));

    await clicar(botaoComTexto(container, 'Novo rascunho'));

    expect(textoDoAviso(container)).toBe('Já existe um rascunho aberto. Publique ou descarte antes de criar outro.');
    expect(itensDeVersao(container)).toHaveLength(5);
  });

  it('a data e o autor do rascunho não vêm do relógio nem da sessão — 02/09/2026 e Aurio Neto com o relógio em 2027', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2027-03-15T12:00:00Z'));
    const container = await montarAnamnese();
    await publicarRascunhoV4(container);

    await clicar(botaoComTexto(container, 'Novo rascunho'));

    expect(folhaComTexto(container, 'span', 'criada em 02/09/2026 por Aurio Neto')).toBeTruthy();
  });
});

describe('AnamnesePage: regras de validade e exigência', () => {
  it('estado inicial — a anamnese vale por 12 meses e a exigência está ligada, com o texto do que isso faz', async () => {
    const container = await montarAnamnese();

    expect(campoRotulado<HTMLSelectElement>(container, 'Anamnese vale por').value).toBe('12');
    expect(
      interruptor(container, 'Exigir anamnese em dia para confirmar presença').getAttribute('aria-checked'),
    ).toBe('true');
    expect(
      folhaComTexto(container, 'span', 'quem está vencido ou sem resposta não confirma inscrição'),
    ).toBeTruthy();
  });

  it('validade — oferece 6, 12 e 24 meses', async () => {
    const container = await montarAnamnese();

    const opcoes = Array.from(campoRotulado<HTMLSelectElement>(container, 'Anamnese vale por').options);

    expect(opcoes.map((opcao) => [opcao.value, opcao.textContent])).toEqual([
      ['6', '6 meses'],
      ['12', '12 meses'],
      ['24', '24 meses'],
    ]);
  });

  it('trocar a validade — muda o campo e nada mais na tela', async () => {
    const container = await montarAnamnese();
    const antes = container.textContent;

    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Anamnese vale por'), '24');

    expect(campoRotulado<HTMLSelectElement>(container, 'Anamnese vale por').value).toBe('24');
    expect(container.textContent).toBe(antes);
    expect(textoDoAviso(container)).toBeNull();
  });

  it('desligar a exigência — troca o texto para dizer que a confirmação passa com anamnese pendente', async () => {
    const container = await montarAnamnese();

    await clicar(interruptor(container, 'Exigir anamnese em dia para confirmar presença'));

    expect(
      interruptor(container, 'Exigir anamnese em dia para confirmar presença').getAttribute('aria-checked'),
    ).toBe('false');
    expect(
      folhaComTexto(container, 'span', 'a confirmação passa mesmo com anamnese pendente'),
    ).toBeTruthy();
    expect(container.textContent).not.toContain('não confirma inscrição');
  });

  it('as regras — valem para a tela toda: continuam como estavam depois de trocar de versão', async () => {
    const container = await montarAnamnese();
    await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Anamnese vale por'), '6');
    await clicar(interruptor(container, 'Exigir anamnese em dia para confirmar presença'));

    await abrirVersao(container, 'v1');

    expect(campoRotulado<HTMLSelectElement>(container, 'Anamnese vale por').value).toBe('6');
    expect(
      interruptor(container, 'Exigir anamnese em dia para confirmar presença').getAttribute('aria-checked'),
    ).toBe('false');
  });

  it('as regras — não têm botão de salvar: nada na tela as grava', async () => {
    const container = await montarAnamnese();

    const botoes = todos<HTMLButtonElement>(container, 'button').map((botao) => botao.textContent);

    expect(botoes.filter((texto) => /salvar|gravar|aplicar/i.test(texto ?? ''))).toEqual([]);
  });

  it('Em uso hoje — mostra a versão publicada com a contagem de respostas, em qualquer versão aberta', async () => {
    const container = await montarAnamnese();

    await abrirVersao(container, 'v1');

    expect(folhaComTexto(container, 'span', 'Em uso hoje: Anamnese do corpo · v3 · 128 respostas')).toBeTruthy();
  });
});

describe('AnamnesePage: avisos', () => {
  it('fechar aviso — tira o aviso da tela', async () => {
    const container = await montarAnamnese();
    await clicar(botaoComTexto(container, 'Novo rascunho'));

    await clicar(elemento(container, 'button[aria-label="fechar aviso"]'));

    expect(textoDoAviso(container)).toBeNull();
  });

  it('aviso aberto — continua na tela quando outra versão é aberta', async () => {
    const container = await montarAnamnese();
    await clicar(botaoComTexto(container, 'Copiar link público'));

    await abrirVersao(container, 'v2');

    expect(textoDoAviso(container)).toBe(
      'Link público copiado: cdd.app/anamnese/v3 — quem responde não precisa de conta.',
    );
  });
});

describe('AnamnesePage: campo', () => {
  it('abre a mesma lista, a mesma versão e as mesmas perguntas que o escritório', async () => {
    definirDensidade('field');
    const container = await montarAnamnese();

    expect(resumosDasVersoes(container)).toHaveLength(4);
    expect(tituloDaVersaoAberta(container)).toBe('Anamnese do corpo · v3');
    expect(titulosDasPerguntas(container)).toEqual(PERGUNTAS_DA_V3);
  });

  it('publica e cria rascunho do mesmo jeito', async () => {
    definirDensidade('field');
    const container = await montarAnamnese();

    await publicarRascunhoV4(container);
    await clicar(botaoComTexto(container, 'Novo rascunho'));

    expect(resumosDasVersoes(container)[0]).toEqual(['Anamnese do corpo · v5', 'Rascunho', '10 perguntas · 0 respostas']);
  });
});

describe('AnamnesePage: alvo de toque por densidade', () => {
  it.each([
    { nome: 'escritório', densidade: 'office' as const },
    { nome: 'campo', densidade: 'field' as const },
  ])('$nome — Novo rascunho e os campos usam o alvo de escritório', async ({ densidade }) => {
    definirDensidade(densidade);
    const container = await montarAnamnese();

    expect(botaoComTexto(container, 'Novo rascunho').style.minHeight).toBe('var(--target-office)');
    expect(campoRotulado<HTMLSelectElement>(container, 'Anamnese vale por').style.minHeight).toBe(
      'var(--target-office)',
    );
  });

  it.each([
    { nome: 'escritório', densidade: 'office' as const },
    { nome: 'campo', densidade: 'field' as const },
  ])('$nome — subir, descer e remover medem 32 por 32 pixels', async ({ densidade }) => {
    definirDensidade(densidade);
    const container = await montarAnamnese();
    await abrirVersao(container, 'v4');

    const subir = controleDaPergunta(container, 0, 'subir');

    expect([subir.style.width, subir.style.height]).toEqual(['32px', '32px']);
  });

  it('campo — o campo da pergunta nova usa o alvo de escritório', async () => {
    definirDensidade('field');
    const container = await montarAnamnese();

    await abrirFormularioDeNovaPergunta(container);

    expect(campoRotulado(container, 'Pergunta').style.minHeight).toBe('var(--target-office)');
  });
});
