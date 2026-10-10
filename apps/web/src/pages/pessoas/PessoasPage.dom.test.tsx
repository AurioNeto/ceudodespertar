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
import { PessoasPage } from './PessoasPage';
import { cabecalhoDaTela, campoRotulado, definirDensidade, textoDoAviso } from './apoioDeTeste';

beforeEach(() => {
  definirDensidade('office');
});

afterEach(async () => {
  await desmontarTudo();
  vi.unstubAllGlobals();
});

const TODAS_AS_PESSOAS = [
  'Ana Beatriz Cordeiro',
  'Carlos Menezes',
  'Rosa Silveira',
  'Eduardo Pires',
  'Marina Tavares',
  'Sérgio Bittencourt',
  'Helena Duarte',
  'Tobias Aguiar',
  'Bruna Camargo',
  'Otávio Lins',
];

const COR_DO_TOM = {
  confirmado: 'var(--color-confirmed)',
  sugestao: 'var(--color-suggest)',
  pendente: 'var(--color-pending)',
  neutro: 'var(--color-neutral)',
  royal: 'var(--color-royal-ink)',
} as const;

const linhasDePessoas = (container: HTMLElement) =>
  todos<HTMLButtonElement>(container, 'button').filter((botao) => botao.textContent?.includes(' desde '));

const nomeDaLinha = (linha: HTMLElement) => {
  const folhaDeNome = todos(linha, 'span').find(
    (span) => span.childElementCount === 0 && span.getAttribute('aria-hidden') !== 'true',
  );
  return folhaDeNome?.textContent;
};

const nomesNaLista = (container: HTMLElement) => linhasDePessoas(container).map(nomeDaLinha);

const linhaDe = (container: HTMLElement, nome: string) => {
  const achada = linhasDePessoas(container).find((linha) => nomeDaLinha(linha) === nome);
  if (!achada) throw new Error(`pessoa não encontrada na lista: ${nome}`);
  return achada;
};

const selosDe = (origem: HTMLElement) =>
  todos<HTMLSpanElement>(origem, 'span').filter(
    (span) => span.childElementCount === 0 && span.style.borderRadius === 'var(--radius-pill)',
  );

const seloComTexto = (origem: HTMLElement, texto: string) => {
  const achado = selosDe(origem).find((selo) => selo.textContent === texto);
  if (!achado) throw new Error(`selo não encontrado: ${texto}`);
  return achado;
};

const textosDosSelos = (origem: HTMLElement) => selosDe(origem).map((selo) => selo.textContent);

const indicador = (container: HTMLElement, rotulo: string) => {
  const cartao = folhaComTexto(container, 'span', rotulo).parentElement;
  return Array.from(cartao?.children ?? []).map((filho) => filho.textContent);
};

const dadoDaFicha = (container: HTMLElement, rotulo: string) =>
  folhaComTexto(container, 'span', rotulo).nextElementSibling?.textContent;

const cartaoDaFicha = (container: HTMLElement, titulo: string) => {
  const cartao = folhaComTexto(container, 'span', titulo).parentElement?.parentElement;
  if (!cartao) throw new Error(`cartão não encontrado: ${titulo}`);
  return cartao;
};

const emailDoAcesso = (container: HTMLElement) =>
  todos(cartaoDaFicha(container, 'Acesso ao sistema'), 'span').find((span) => span.textContent?.includes('@'))
    ?.textContent;

const campoDoGrupo = (container: HTMLElement) =>
  elemento<HTMLSelectElement>(container, 'select[aria-label="Grupo de permissão"]');

async function montarPessoas() {
  const montado = await montar(<PessoasPage />);
  return montado.container;
}

async function abrirFicha(container: HTMLElement, nome: string) {
  await clicar(linhaDe(container, nome));
}

async function voltarParaALista(container: HTMLElement) {
  await clicar(botaoComTexto(container, 'Voltar para a lista'));
}

async function filtrarPor(container: HTMLElement, opcao: string) {
  await escolherOpcao(campoRotulado<HTMLSelectElement>(container, 'Filtro'), opcao);
}

async function buscar(container: HTMLElement, texto: string) {
  await digitar(campoRotulado(container, 'Buscar'), texto);
}

describe('PessoasPage: cabeçalho nas duas densidades', () => {
  it('escritório — mostra o código com o nome da tela, o título e o subtítulo', async () => {
    definirDensidade('office');
    const container = await montarPessoas();

    const cabecalho = cabecalhoDaTela(container);

    expect(elemento(cabecalho, 'h1').textContent).toBe('Pessoas');
    expect(folhaComTexto(cabecalho, 'div', 'F-09 · Pessoas')).toBeTruthy();
    expect(folhaComTexto(cabecalho, 'p', 'Quem é da casa e quem entra no sistema — dois eixos, um cadastro só')).toBeTruthy();
  });

  it('campo — mostra só o código e o título, sem subtítulo', async () => {
    definirDensidade('field');
    const container = await montarPessoas();

    const cabecalho = cabecalhoDaTela(container);

    expect(elemento(cabecalho, 'h1').textContent).toBe('Pessoas');
    expect(folhaComTexto(cabecalho, 'div', 'F-09')).toBeTruthy();
    expect(cabecalho.querySelector('p')).toBeNull();
    expect(cabecalho.textContent).not.toContain('dois eixos');
  });
});

describe('PessoasPage: lista inicial', () => {
  it.each([{ nome: 'escritório', densidade: 'office' as const }, { nome: 'campo', densidade: 'field' as const }])(
    '$nome — lista as dez pessoas na ordem do cadastro, com a inativa no fim',
    async ({ densidade }) => {
      definirDensidade(densidade);
      const container = await montarPessoas();

      expect(nomesNaLista(container)).toEqual(TODAS_AS_PESSOAS);
    },
  );

  it('linha de pessoa — mostra vínculo, ano de entrada e cidade', async () => {
    const container = await montarPessoas();

    const linha = linhaDe(container, 'Ana Beatriz Cordeiro');

    expect(linha.textContent).toContain('Fardado desde 2014 · São Paulo · SP');
  });

  it('linha de pessoa — o avatar mostra a inicial do primeiro e do último nome, escondido da leitura de tela', async () => {
    const container = await montarPessoas();

    const avatar = elemento(linhaDe(container, 'Ana Beatriz Cordeiro'), 'span[aria-hidden="true"]');

    expect(avatar.textContent).toBe('AC');
  });

  it('pessoa em dia com acesso ativo — mostra o selo da anamnese em dia e o grupo, sem selo de inativa', async () => {
    const container = await montarPessoas();

    const linha = linhaDe(container, 'Ana Beatriz Cordeiro');

    expect(textosDosSelos(linha)).toEqual(['Anamnese em dia', 'Secretaria']);
  });

  it('pessoa sem anamnese e sem acesso — mostra só o selo Sem anamnese', async () => {
    const container = await montarPessoas();

    const linha = linhaDe(container, 'Marina Tavares');

    expect(textosDosSelos(linha)).toEqual(['Sem anamnese']);
  });

  it('pessoa inativa — mostra a anamnese vencida, o grupo do acesso e o selo Inativa, nessa ordem', async () => {
    const container = await montarPessoas();

    const linha = linhaDe(container, 'Otávio Lins');

    expect(textosDosSelos(linha)).toEqual(['Anamnese vencida', 'Leitura', 'Inativa']);
  });

  it('pessoa inativa — a linha fica com o fundo afundado e mais clara; a ativa usa o fundo de cartão', async () => {
    const container = await montarPessoas();

    const inativa = linhaDe(container, 'Otávio Lins');
    const ativa = linhaDe(container, 'Ana Beatriz Cordeiro');

    expect([inativa.style.background, inativa.style.opacity]).toEqual(['var(--bg-sunken)', '0.75']);
    expect([ativa.style.background, ativa.style.opacity]).toEqual(['var(--bg-card)', '1']);
  });

  it.each([
    { nome: 'em dia', pessoa: 'Carlos Menezes', texto: 'Anamnese em dia', cor: COR_DO_TOM.confirmado },
    { nome: 'vencida', pessoa: 'Eduardo Pires', texto: 'Anamnese vencida', cor: COR_DO_TOM.sugestao },
    { nome: 'ausente', pessoa: 'Bruna Camargo', texto: 'Sem anamnese', cor: COR_DO_TOM.pendente },
  ])('anamnese $nome — o selo da linha tem o texto $texto no tom correspondente', async ({ pessoa, texto, cor }) => {
    const container = await montarPessoas();

    const selo = seloComTexto(linhaDe(container, pessoa), texto);

    expect(selo.style.color).toBe(cor);
  });

  it('selos de grupo e de inativa — o grupo é royal e a inativa é neutra', async () => {
    const container = await montarPessoas();

    const linha = linhaDe(container, 'Otávio Lins');

    expect(seloComTexto(linha, 'Leitura').style.color).toBe(COR_DO_TOM.royal);
    expect(seloComTexto(linha, 'Inativa').style.color).toBe(COR_DO_TOM.neutro);
  });

  it('pessoa com ponto de atenção — o triângulo da linha leva o título do ponto na dica', async () => {
    const container = await montarPessoas();

    const dicas = todos(linhaDe(container, 'Ana Beatriz Cordeiro'), 'span[title]');

    expect(dicas.map((dica) => dica.title)).toEqual(['Uso contínuo de sertralina']);
  });

  it('pessoa sem ponto de atenção — a linha não leva triângulo nem dica', async () => {
    const container = await montarPessoas();

    const dicas = todos(linhaDe(container, 'Rosa Silveira'), 'span[title]');

    expect(dicas).toHaveLength(0);
  });

  it('dica do ponto de atenção — mostra só o título, sem a explicação que veio na anamnese', async () => {
    const container = await montarPessoas();

    const dica = elemento(linhaDe(container, 'Carlos Menezes'), 'span[title]');

    expect(dica.title).toBe('Pressão alta controlada');
    expect(dica.title).not.toContain('losartana');
  });
});

describe('PessoasPage: indicadores', () => {
  it('estado inicial — mostra cadastradas, em dia, pendentes e com acesso, cada uma com a nota', async () => {
    const container = await montarPessoas();

    expect(indicador(container, 'Cadastradas')).toEqual(['Cadastradas', '10', '9 ativas']);
    expect(indicador(container, 'Anamnese em dia')).toEqual(['Anamnese em dia', '6', 'dentro da validade']);
    expect(indicador(container, 'Anamnese pendente')).toEqual(['Anamnese pendente', '4', 'sem resposta ou vencida']);
    expect(indicador(container, 'Com acesso')).toEqual(['Com acesso', '6', '1 tem cadastro inativo']);
  });

  it('campo — mostra os mesmos quatro indicadores com os mesmos números', async () => {
    definirDensidade('field');
    const container = await montarPessoas();

    expect(indicador(container, 'Cadastradas')).toEqual(['Cadastradas', '10', '9 ativas']);
    expect(indicador(container, 'Com acesso')).toEqual(['Com acesso', '6', '1 tem cadastro inativo']);
  });

  it('filtro e busca — não mexem nos indicadores: eles contam o cadastro inteiro', async () => {
    const container = await montarPessoas();

    await filtrarPor(container, 'Visitante');
    await buscar(container, 'marina');

    expect(nomesNaLista(container)).toEqual(['Marina Tavares']);
    expect(indicador(container, 'Cadastradas')).toEqual(['Cadastradas', '10', '9 ativas']);
  });
});

describe('PessoasPage: filtro', () => {
  it('estado inicial — o filtro começa em Todas e oferece seis opções', async () => {
    const container = await montarPessoas();

    const filtro = campoRotulado<HTMLSelectElement>(container, 'Filtro');

    expect(filtro.value).toBe('todos');
    expect(Array.from(filtro.options).map((opcao) => [opcao.value, opcao.textContent])).toEqual([
      ['todos', 'Todas'],
      ['Fardado', 'Fardados'],
      ['Frequentador', 'Frequentadores'],
      ['Visitante', 'Visitantes'],
      ['pendentes', 'Anamnese pendente'],
      ['ativos', 'Somente ativas'],
    ]);
  });

  it.each([
    { nome: 'Todas', valor: 'todos', esperadas: TODAS_AS_PESSOAS },
    {
      nome: 'Fardados',
      valor: 'Fardado',
      esperadas: ['Ana Beatriz Cordeiro', 'Carlos Menezes', 'Rosa Silveira', 'Sérgio Bittencourt', 'Tobias Aguiar'],
    },
    {
      nome: 'Frequentadores',
      valor: 'Frequentador',
      esperadas: ['Eduardo Pires', 'Helena Duarte', 'Otávio Lins'],
    },
    { nome: 'Visitantes', valor: 'Visitante', esperadas: ['Marina Tavares', 'Bruna Camargo'] },
    {
      nome: 'Anamnese pendente',
      valor: 'pendentes',
      esperadas: ['Eduardo Pires', 'Marina Tavares', 'Bruna Camargo', 'Otávio Lins'],
    },
    {
      nome: 'Somente ativas',
      valor: 'ativos',
      esperadas: TODAS_AS_PESSOAS.filter((nome) => nome !== 'Otávio Lins'),
    },
  ])('opção $nome — lista só as pessoas que ela pede, na ordem do cadastro', async ({ valor, esperadas }) => {
    const container = await montarPessoas();

    await filtrarPor(container, valor);

    expect(nomesNaLista(container)).toEqual(esperadas);
  });

  it('opção Anamnese pendente — junta vencida e ausente, inclusive a pessoa inativa', async () => {
    const container = await montarPessoas();

    await filtrarPor(container, 'pendentes');

    expect(linhaDe(container, 'Otávio Lins').textContent).toContain('Inativa');
    expect(textosDosSelos(linhaDe(container, 'Eduardo Pires'))).toContain('Anamnese vencida');
    expect(textosDosSelos(linhaDe(container, 'Bruna Camargo'))).toContain('Sem anamnese');
  });

  it('voltar para Todas — devolve a lista inteira', async () => {
    const container = await montarPessoas();
    await filtrarPor(container, 'Visitante');

    await filtrarPor(container, 'todos');

    expect(nomesNaLista(container)).toEqual(TODAS_AS_PESSOAS);
  });
});

describe('PessoasPage: busca', () => {
  it('estado inicial — o campo Buscar está vazio e sugere nome, cidade ou telefone', async () => {
    const container = await montarPessoas();

    const campo = campoRotulado(container, 'Buscar');

    expect(campo.value).toBe('');
    expect(campo.placeholder).toBe('nome, cidade ou telefone');
  });

  it.each([
    { nome: 'nome', texto: 'ana', esperadas: ['Ana Beatriz Cordeiro'] },
    { nome: 'pedaço do sobrenome', texto: 'menezes', esperadas: ['Carlos Menezes'] },
    { nome: 'cidade', texto: 'ibiúna', esperadas: ['Rosa Silveira', 'Tobias Aguiar'] },
    { nome: 'telefone', texto: '98812-4410', esperadas: ['Ana Beatriz Cordeiro'] },
    { nome: 'prefixo do telefone', texto: '(21)', esperadas: ['Marina Tavares'] },
  ])('por $nome — lista só quem contém o texto', async ({ texto, esperadas }) => {
    const container = await montarPessoas();

    await buscar(container, texto);

    expect(nomesNaLista(container)).toEqual(esperadas);
  });

  it('texto em maiúsculas e com espaços nas pontas — acha do mesmo jeito', async () => {
    const container = await montarPessoas();

    await buscar(container, '  COTIA  ');

    expect(nomesNaLista(container)).toEqual(['Carlos Menezes']);
  });

  it('texto só com espaços — não filtra nada', async () => {
    const container = await montarPessoas();

    await buscar(container, '   ');

    expect(nomesNaLista(container)).toEqual(TODAS_AS_PESSOAS);
  });

  it('busca junto com o filtro — vale as duas condições', async () => {
    const container = await montarPessoas();
    await filtrarPor(container, 'Fardado');

    await buscar(container, 'são paulo');

    expect(nomesNaLista(container)).toEqual(['Ana Beatriz Cordeiro']);
  });

  it('busca olha só nome, cidade e telefone — vínculo e grupo de acesso não contam', async () => {
    const container = await montarPessoas();

    await buscar(container, 'fardado');
    const porVinculo = nomesNaLista(container);
    await buscar(container, 'tesouraria');
    const porGrupo = nomesNaLista(container);

    expect(porVinculo).toEqual([]);
    expect(porGrupo).toEqual([]);
  });

  it('texto sem acento — não acha quem tem acento: Sérgio e Ibiúna só aparecem com o acento', async () => {
    const container = await montarPessoas();

    await buscar(container, 'sergio');
    const semAcento = nomesNaLista(container);
    await buscar(container, 'sérgio');
    const comAcento = nomesNaLista(container);

    expect(semAcento).toEqual([]);
    expect(comAcento).toEqual(['Sérgio Bittencourt']);
  });

  it('sem nenhum resultado — a lista fica em branco, sem texto de vazio nem aviso', async () => {
    const container = await montarPessoas();

    await buscar(container, 'zzzz');

    expect(nomesNaLista(container)).toEqual([]);
    expect(textoDoAviso(container)).toBeNull();
    expect(container.textContent).not.toMatch(/nenhuma pessoa|não encontr|sem resultado/i);
  });
});

describe('PessoasPage: avisos', () => {
  it('Nova pessoa — mostra o aviso do formulário de cadastro e convite, que ainda não existe', async () => {
    const container = await montarPessoas();

    await clicar(botaoComTexto(container, 'Nova pessoa'));

    expect(textoDoAviso(container)).toBe('Formulário de nova pessoa — cadastro e convite.');
  });

  it('fechar aviso — tira o aviso da tela', async () => {
    const container = await montarPessoas();
    await clicar(botaoComTexto(container, 'Nova pessoa'));

    await clicar(elemento(container, 'button[aria-label="fechar aviso"]'));

    expect(textoDoAviso(container)).toBeNull();
    expect(container.textContent).not.toContain('Formulário de nova pessoa');
  });

  it('aviso aberto na ficha — continua na tela depois de voltar para a lista', async () => {
    const container = await montarPessoas();
    await abrirFicha(container, 'Ana Beatriz Cordeiro');
    await clicar(botaoComTexto(container, 'Editar'));

    await voltarParaALista(container);

    expect(textoDoAviso(container)).toBe('Edição do cadastro da pessoa.');
  });

  it('um aviso novo — troca o anterior em vez de empilhar', async () => {
    const container = await montarPessoas();
    await clicar(botaoComTexto(container, 'Nova pessoa'));
    await abrirFicha(container, 'Carlos Menezes');

    await clicar(botaoComTexto(container, 'Enviar anamnese'));

    expect(todos(container, 'button[aria-label="fechar aviso"]')).toHaveLength(1);
    expect(textoDoAviso(container)).toBe('Anamnese enviada para Carlos Menezes.');
  });
});

describe('PessoasPage: ficha da pessoa', () => {
  it('abrir a ficha — esconde a lista, a busca, o filtro e os indicadores', async () => {
    const container = await montarPessoas();

    await abrirFicha(container, 'Ana Beatriz Cordeiro');

    expect(nomesNaLista(container)).toEqual([]);
    expect(todos(container, 'input')).toHaveLength(0);
    expect(container.textContent).not.toContain('Cadastradas');
    expect(container.textContent).not.toContain('Somente ativas');
  });

  it('abrir a ficha — mostra o nome em título, o vínculo, o ano e a cidade', async () => {
    const container = await montarPessoas();

    await abrirFicha(container, 'Ana Beatriz Cordeiro');

    expect(elemento(container, 'h2').textContent).toBe('Ana Beatriz Cordeiro');
    expect(folhaComTexto(container, 'span', 'Fardado desde 2014 · São Paulo · SP')).toBeTruthy();
  });

  it('cartão Dados — mostra telefone, nascimento, cidade e contato de emergência', async () => {
    const container = await montarPessoas();

    await abrirFicha(container, 'Ana Beatriz Cordeiro');

    expect(dadoDaFicha(container, 'Telefone')).toBe('(11) 98812-4410');
    expect(dadoDaFicha(container, 'Nascimento')).toBe('12/04/1988');
    expect(dadoDaFicha(container, 'Cidade')).toBe('São Paulo · SP');
    expect(dadoDaFicha(container, 'Contato de emergência')).toBe('Marcos Cordeiro · (11) 99110-2233');
  });

  it('Voltar para a lista — devolve a lista inteira e os indicadores, e a busca e o filtro ficam como estavam', async () => {
    const container = await montarPessoas();
    await filtrarPor(container, 'Fardado');
    await buscar(container, 'ana');
    await abrirFicha(container, 'Ana Beatriz Cordeiro');

    await voltarParaALista(container);

    expect(nomesNaLista(container)).toEqual(['Ana Beatriz Cordeiro']);
    expect(campoRotulado(container, 'Buscar').value).toBe('ana');
    expect(campoRotulado<HTMLSelectElement>(container, 'Filtro').value).toBe('Fardado');
    expect(indicador(container, 'Cadastradas')).toEqual(['Cadastradas', '10', '9 ativas']);
  });

  it('campo — abre a ficha com os mesmos cartões', async () => {
    definirDensidade('field');
    const container = await montarPessoas();

    await abrirFicha(container, 'Ana Beatriz Cordeiro');

    expect(dadoDaFicha(container, 'Telefone')).toBe('(11) 98812-4410');
    expect(emailDoAcesso(container)).toBe('ana.cordeiro@cdd.org');
  });
});

describe('PessoasPage: anamnese na ficha e pontos de atenção', () => {
  it('anamnese em dia — mostra a data, a versão do formulário, o selo e o ponto com a explicação', async () => {
    const container = await montarPessoas();

    await abrirFicha(container, 'Ana Beatriz Cordeiro');

    const cartao = cartaoDaFicha(container, 'Anamnese');
    expect(cartao.textContent).toContain('respondida em 14/08/2026 · formulário v3');
    expect(textosDosSelos(cartao)).toEqual(['Anamnese em dia']);
    expect(cartao.textContent).toContain('Uso contínuo de sertralina');
    expect(cartao.textContent).toContain('50 mg pela manhã, com acompanhamento psiquiátrico desde 2021');
  });

  it('anamnese vencida — mostra a versão antiga, o selo vencida e o ponto que precisa reconfirmar', async () => {
    const container = await montarPessoas();

    await abrirFicha(container, 'Eduardo Pires');

    const cartao = cartaoDaFicha(container, 'Anamnese');
    expect(cartao.textContent).toContain('respondida em 11/03/2024 · formulário v2');
    expect(seloComTexto(cartao, 'Anamnese vencida').style.color).toBe(COR_DO_TOM.sugestao);
    expect(cartao.textContent).toContain('Histórico de crise de ansiedade');
    expect(cartao.textContent).toContain('declarado na v2; precisa reconfirmar na versão atual');
  });

  it('anamnese ausente — diz que nunca respondeu, mostra o selo Sem anamnese e nenhum ponto declarado', async () => {
    const container = await montarPessoas();

    await abrirFicha(container, 'Marina Tavares');

    const cartao = cartaoDaFicha(container, 'Anamnese');
    expect(cartao.textContent).toContain('nunca respondeu');
    expect(cartao.textContent).not.toContain('respondida em');
    expect(seloComTexto(cartao, 'Sem anamnese').style.color).toBe(COR_DO_TOM.pendente);
    expect(cartao.textContent).toContain('Nenhum ponto de atenção declarado.');
  });

  it('anamnese em dia sem ponto — diz que nenhum ponto de atenção foi declarado', async () => {
    const container = await montarPessoas();

    await abrirFicha(container, 'Rosa Silveira');

    const cartao = cartaoDaFicha(container, 'Anamnese');
    expect(cartao.textContent).toContain('respondida em 20/06/2026 · formulário v3');
    expect(cartao.textContent).toContain('Nenhum ponto de atenção declarado.');
  });

  it('ficha de pessoa com ponto de saúde — mostra o ponto e a explicação sem consultar permissão alguma', async () => {
    const container = await montarPessoas();

    await abrirFicha(container, 'Helena Duarte');

    expect(cartaoDaFicha(container, 'Anamnese').textContent).toContain('Gestante — 5º mês');
    expect(cartaoDaFicha(container, 'Anamnese').textContent).toContain(
      'orientada a não tomar até o parto; participa fora do salão',
    );
  });
});

describe('PessoasPage: cartão Acesso ao sistema', () => {
  it('pessoa com acesso ativo — mostra o e-mail, o grupo, o selo, o último acesso e Revogar acesso', async () => {
    const container = await montarPessoas();

    await abrirFicha(container, 'Ana Beatriz Cordeiro');

    const cartao = cartaoDaFicha(container, 'Acesso ao sistema');
    expect(emailDoAcesso(container)).toBe('ana.cordeiro@cdd.org');
    expect(campoDoGrupo(container).value).toBe('Secretaria');
    expect(seloComTexto(cartao, 'Acesso ativo').style.color).toBe(COR_DO_TOM.confirmado);
    expect(cartao.textContent).toContain('Último acesso: hoje, 08:41. Revogar não apaga o histórico de lançamentos.');
    expect(botaoComTexto(cartao, 'Revogar acesso')).toBeTruthy();
  });

  it('pessoa com convite pendente — mostra o selo Convite pendente e que nunca entrou', async () => {
    const container = await montarPessoas();

    await abrirFicha(container, 'Tobias Aguiar');

    const cartao = cartaoDaFicha(container, 'Acesso ao sistema');
    expect(seloComTexto(cartao, 'Convite pendente').style.color).toBe(COR_DO_TOM.sugestao);
    expect(cartao.textContent).toContain('Último acesso: nunca entrou.');
  });

  it('pessoa com acesso suspenso e cadastro inativo — mostra o selo Suspenso e só oferece revogar', async () => {
    const container = await montarPessoas();

    await abrirFicha(container, 'Otávio Lins');

    const cartao = cartaoDaFicha(container, 'Acesso ao sistema');
    expect(seloComTexto(cartao, 'Suspenso').style.color).toBe(COR_DO_TOM.pendente);
    expect(botaoComTexto(cartao, 'Revogar acesso')).toBeTruthy();
    expect(cartao.textContent).not.toMatch(/reativar|restabelecer/i);
  });

  it('pessoa sem acesso — explica que não entra no sistema e oferece Conceder acesso', async () => {
    const container = await montarPessoas();

    await abrirFicha(container, 'Eduardo Pires');

    const cartao = cartaoDaFicha(container, 'Acesso ao sistema');
    expect(cartao.textContent).toContain(
      'Esta pessoa não entra no sistema. Conceder acesso cria um usuário ligado a este cadastro.',
    );
    expect(botaoComTexto(cartao, 'Conceder acesso')).toBeTruthy();
    expect(todos(cartao, 'select')).toHaveLength(0);
  });

  it('seletor de grupo — oferece os seis grupos do catálogo, pelo nome', async () => {
    const container = await montarPessoas();

    await abrirFicha(container, 'Ana Beatriz Cordeiro');

    expect(Array.from(campoDoGrupo(container).options).map((opcao) => opcao.value)).toEqual([
      'Direção',
      'Tesouraria',
      'Secretaria',
      'Registro rápido',
      'Guardião',
      'Leitura',
    ]);
  });

  it('escolher outro grupo — troca o grupo da pessoa, avisa e leva o novo grupo para a lista', async () => {
    const container = await montarPessoas();
    await abrirFicha(container, 'Ana Beatriz Cordeiro');

    await escolherOpcao(campoDoGrupo(container), 'Tesouraria');

    expect(campoDoGrupo(container).value).toBe('Tesouraria');
    expect(textoDoAviso(container)).toBe('Grupo de permissão atualizado.');
    await voltarParaALista(container);
    expect(textosDosSelos(linhaDe(container, 'Ana Beatriz Cordeiro'))).toEqual(['Anamnese em dia', 'Tesouraria']);
  });

  it('escolher outro grupo — mantém a situação do acesso: convite continua pendente', async () => {
    const container = await montarPessoas();
    await abrirFicha(container, 'Tobias Aguiar');

    await escolherOpcao(campoDoGrupo(container), 'Direção');

    expect(textosDosSelos(cartaoDaFicha(container, 'Acesso ao sistema'))).toEqual(['Convite pendente']);
  });

  it('Revogar acesso — avisa, volta o cartão para pessoa sem acesso e tira o grupo da linha', async () => {
    const container = await montarPessoas();
    await abrirFicha(container, 'Ana Beatriz Cordeiro');

    await clicar(botaoComTexto(container, 'Revogar acesso'));

    expect(textoDoAviso(container)).toBe('Acesso revogado. O histórico do que essa pessoa lançou continua intacto.');
    expect(cartaoDaFicha(container, 'Acesso ao sistema').textContent).toContain('Esta pessoa não entra no sistema.');
    await voltarParaALista(container);
    expect(textosDosSelos(linhaDe(container, 'Ana Beatriz Cordeiro'))).toEqual(['Anamnese em dia']);
    expect(indicador(container, 'Com acesso')).toEqual(['Com acesso', '5', '1 tem cadastro inativo']);
  });

  it('revogar o acesso da única pessoa inativa — a nota passa a dizer que todas têm cadastro ativo', async () => {
    const container = await montarPessoas();
    await abrirFicha(container, 'Otávio Lins');
    await clicar(botaoComTexto(container, 'Revogar acesso'));

    await voltarParaALista(container);

    expect(indicador(container, 'Com acesso')).toEqual(['Com acesso', '5', 'todas com cadastro ativo']);
  });

  it('Conceder acesso — cria o convite no grupo Leitura, avisa e mostra o cartão com o e-mail novo', async () => {
    const container = await montarPessoas();
    await abrirFicha(container, 'Eduardo Pires');

    await clicar(botaoComTexto(container, 'Conceder acesso'));

    const cartao = cartaoDaFicha(container, 'Acesso ao sistema');
    expect(textoDoAviso(container)).toBe('Convite enviado. O acesso nasce no grupo Leitura.');
    expect(emailDoAcesso(container)).toBe('eduardo@cdd.org');
    expect(campoDoGrupo(container).value).toBe('Leitura');
    expect(textosDosSelos(cartao)).toEqual(['Convite pendente']);
    expect(cartao.textContent).toContain('Último acesso: nunca entrou.');
  });

  it('Conceder acesso — leva o novo acesso para a lista e para o indicador Com acesso', async () => {
    const container = await montarPessoas();
    await abrirFicha(container, 'Eduardo Pires');
    await clicar(botaoComTexto(container, 'Conceder acesso'));

    await voltarParaALista(container);

    expect(textosDosSelos(linhaDe(container, 'Eduardo Pires'))).toEqual(['Anamnese vencida', 'Leitura']);
    expect(indicador(container, 'Com acesso')).toEqual(['Com acesso', '7', '1 tem cadastro inativo']);
  });

  it.each([
    { nome: 'o primeiro nome de quem nunca teve acesso', pessoa: 'Marina Tavares', email: 'marina@cdd.org' },
    { nome: 'o primeiro nome de quem nunca teve acesso, sem o sobrenome', pessoa: 'Eduardo Pires', email: 'eduardo@cdd.org' },
  ])('e-mail do convite — usa $nome', async ({ pessoa, email }) => {
    const container = await montarPessoas();
    await abrirFicha(container, pessoa);

    await clicar(botaoComTexto(container, 'Conceder acesso'));

    expect(emailDoAcesso(container)).toBe(email);
  });

  it.each([
    { nome: 'o primeiro nome, sem o sobrenome do e-mail antigo', pessoa: 'Ana Beatriz Cordeiro', email: 'ana@cdd.org' },
    { nome: 'o primeiro nome com o acento que ele tem', pessoa: 'Sérgio Bittencourt', email: 'sérgio@cdd.org' },
  ])('e-mail do convite, depois de revogar o acesso — usa $nome', async ({ pessoa, email }) => {
    const container = await montarPessoas();
    await abrirFicha(container, pessoa);
    await clicar(botaoComTexto(container, 'Revogar acesso'));

    await clicar(botaoComTexto(container, 'Conceder acesso'));

    expect(emailDoAcesso(container)).toBe(email);
  });
});

describe('PessoasPage: inativar e reativar', () => {
  it('pessoa ativa — a ficha oferece Inativar', async () => {
    const container = await montarPessoas();

    await abrirFicha(container, 'Ana Beatriz Cordeiro');

    expect(botaoComTexto(container, 'Inativar')).toBeTruthy();
    expect(todos(container, 'button').some((botao) => botao.textContent === 'Reativar')).toBe(false);
  });

  it('Inativar — avisa que nada é apagado e a ficha passa a oferecer Reativar', async () => {
    const container = await montarPessoas();
    await abrirFicha(container, 'Ana Beatriz Cordeiro');

    await clicar(botaoComTexto(container, 'Inativar'));

    expect(textoDoAviso(container)).toBe(
      'Cadastro inativado. Nada é apagado — presenças e anamneses continuam no histórico.',
    );
    expect(botaoComTexto(container, 'Reativar')).toBeTruthy();
    expect(elemento(container, 'h2').textContent).toBe('Ana Beatriz Cordeiro');
  });

  it('Inativar — leva o selo Inativa para a lista, tira a pessoa de Somente ativas e baixa as ativas', async () => {
    const container = await montarPessoas();
    await abrirFicha(container, 'Ana Beatriz Cordeiro');
    await clicar(botaoComTexto(container, 'Inativar'));

    await voltarParaALista(container);

    expect(textosDosSelos(linhaDe(container, 'Ana Beatriz Cordeiro'))).toEqual([
      'Anamnese em dia',
      'Secretaria',
      'Inativa',
    ]);
    expect(indicador(container, 'Cadastradas')).toEqual(['Cadastradas', '10', '8 ativas']);
    await filtrarPor(container, 'ativos');
    expect(nomesNaLista(container)).not.toContain('Ana Beatriz Cordeiro');
  });

  it('Inativar quem tem acesso — o acesso fica e a nota de Com acesso passa a contar dois cadastros inativos', async () => {
    const container = await montarPessoas();
    await abrirFicha(container, 'Ana Beatriz Cordeiro');
    await clicar(botaoComTexto(container, 'Inativar'));

    await voltarParaALista(container);

    expect(indicador(container, 'Com acesso')).toEqual(['Com acesso', '6', '2 têm cadastro inativo']);
  });

  it('Inativar — não tira a pessoa das contagens de anamnese', async () => {
    const container = await montarPessoas();
    await abrirFicha(container, 'Ana Beatriz Cordeiro');
    await clicar(botaoComTexto(container, 'Inativar'));

    await voltarParaALista(container);

    expect(indicador(container, 'Anamnese em dia')).toEqual(['Anamnese em dia', '6', 'dentro da validade']);
  });

  it('Reativar — avisa, volta o botão para Inativar e tira o selo Inativa da lista', async () => {
    const container = await montarPessoas();
    await abrirFicha(container, 'Otávio Lins');

    await clicar(botaoComTexto(container, 'Reativar'));

    expect(textoDoAviso(container)).toBe('Cadastro reativado.');
    expect(botaoComTexto(container, 'Inativar')).toBeTruthy();
    await voltarParaALista(container);
    expect(textosDosSelos(linhaDe(container, 'Otávio Lins'))).toEqual(['Anamnese vencida', 'Leitura']);
    expect(indicador(container, 'Cadastradas')).toEqual(['Cadastradas', '10', '10 ativas']);
    expect(indicador(container, 'Com acesso')).toEqual(['Com acesso', '6', 'todas com cadastro ativo']);
  });

  it('Inativar e Reativar em sequência — devolve o cadastro ao estado de antes', async () => {
    const container = await montarPessoas();
    await abrirFicha(container, 'Carlos Menezes');
    await clicar(botaoComTexto(container, 'Inativar'));

    await clicar(botaoComTexto(container, 'Reativar'));

    expect(textoDoAviso(container)).toBe('Cadastro reativado.');
    await voltarParaALista(container);
    expect(textosDosSelos(linhaDe(container, 'Carlos Menezes'))).toEqual(['Anamnese em dia', 'Tesouraria']);
  });
});

describe('PessoasPage: ações da ficha que só avisam', () => {
  it('Editar — avisa que a edição do cadastro ainda não existe', async () => {
    const container = await montarPessoas();
    await abrirFicha(container, 'Ana Beatriz Cordeiro');

    await clicar(botaoComTexto(container, 'Editar'));

    expect(textoDoAviso(container)).toBe('Edição do cadastro da pessoa.');
  });

  it('Enviar anamnese — avisa com o nome da pessoa e não muda a situação da anamnese', async () => {
    const container = await montarPessoas();
    await abrirFicha(container, 'Eduardo Pires');

    await clicar(botaoComTexto(container, 'Enviar anamnese'));

    expect(textoDoAviso(container)).toBe('Anamnese enviada para Eduardo Pires.');
    expect(textosDosSelos(cartaoDaFicha(container, 'Anamnese'))).toEqual(['Anamnese vencida']);
  });
});

describe('PessoasPage: alvo de toque por densidade', () => {
  it.each([
    { nome: 'escritório', densidade: 'office' as const },
    { nome: 'campo', densidade: 'field' as const },
  ])('$nome — o botão Nova pessoa, a busca e o filtro usam o alvo de escritório', async ({ densidade }) => {
    definirDensidade(densidade);
    const container = await montarPessoas();

    expect(botaoComTexto(container, 'Nova pessoa').style.minHeight).toBe('var(--target-office)');
    expect(campoRotulado(container, 'Buscar').style.minHeight).toBe('var(--target-office)');
    expect(campoRotulado<HTMLSelectElement>(container, 'Filtro').style.minHeight).toBe('var(--target-office)');
  });

  it('campo — os botões da ficha também usam o alvo de escritório', async () => {
    definirDensidade('field');
    const container = await montarPessoas();
    await abrirFicha(container, 'Ana Beatriz Cordeiro');

    expect(botaoComTexto(container, 'Editar').style.minHeight).toBe('var(--target-office)');
    expect(botaoComTexto(container, 'Revogar acesso').style.minHeight).toBe('var(--target-office)');
  });
});
