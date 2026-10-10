import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { botaoComTexto, clicar, desmontarTudo, digitar, elemento, escolherOpcao, montar, todos } from '@/testes/montagem';
import { LeitosPage } from './LeitosPage';
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

beforeEach(() => {
  fixarDensidade('office');
  vi.setSystemTime(AGORA_FIXO);
});

afterEach(async () => {
  await desmontarTudo();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const NOITE_24 = 'noite de 24';
const NOITE_25 = 'noite de 25';

const cabecalho = (container: HTMLElement) => elemento(container, 'header').textContent;
const numero = (container: HTMLElement, rotulo: string) => textoDaFolhaPai(container, rotulo);
const abrirCadastro = (container: HTMLElement) => clicar(botaoComTexto(container, 'Dormitórios e leitos'));
const abrirMapa = (container: HTMLElement) => clicar(botaoComTexto(container, 'Mapa do evento'));

const linhaDoLeito = (container: HTMLElement, identificacao: string): HTMLElement => {
  const etiqueta = todos<HTMLSpanElement>(container, 'span').find(
    (span) => span.childElementCount === 0 && span.textContent === identificacao && span.style.font === 'var(--text-body-strong)',
  );
  const linha = etiqueta?.parentElement?.parentElement;
  if (!linha) throw new Error(`leito não encontrado na grade: ${identificacao}`);
  return linha;
};
const celulasDoLeito = (container: HTMLElement, identificacao: string) => Array.from(linhaDoLeito(container, identificacao).children).slice(1) as HTMLElement[];
const textosDasCelulas = (container: HTMLElement, identificacao: string) =>
  celulasDoLeito(container, identificacao).map((celula) => celula.textContent);
const botaoDeAlocar = (container: HTMLElement, leito: string, noite: string) =>
  elemento<HTMLButtonElement>(container, `button[aria-label="alocar em ${leito} na ${noite}"]`);
const botoesDeAlocarDoLeito = (container: HTMLElement, leito: string) =>
  todos<HTMLButtonElement>(container, `button[aria-label^="alocar em ${leito} na "]`);
const botaoDeLiberar = (container: HTMLElement, leito: string, noite: string, pessoa: string) =>
  elemento<HTMLButtonElement>(container, `button[aria-label="liberar ${leito} na ${noite} — ${pessoa}"]`);
const painelDeEscolha = (container: HTMLElement) => {
  const titulo = todos<HTMLSpanElement>(container, 'span').find((span) => span.textContent?.startsWith('Quem dorme em '));
  return titulo?.closest<HTMLElement>('div[style*="background: var(--bg-sunken)"]') ?? null;
};
const escolherHospede = (container: HTMLElement, nome: string) =>
  clicar(
    todos<HTMLButtonElement>(painelDeEscolha(container)!, 'button').find((botao) => botao.textContent?.startsWith(nome))!,
  );
const alocar = async (container: HTMLElement, leito: string, noite: string, nome: string) => {
  await clicar(botaoDeAlocar(container, leito, noite));
  await escolherHospede(container, nome);
};
const alocarTodosOsHospedes = async (container: HTMLElement) => {
  await alocar(container, 'Beliche 1 · inferior', NOITE_24, 'Helena Duarte');
  await alocar(container, 'Beliche 1 · inferior', NOITE_25, 'Helena Duarte');
  await alocar(container, 'Beliche 2 · superior', NOITE_24, 'Sérgio Bittencourt');
  await alocar(container, 'Beliche 2 · superior', NOITE_25, 'Sérgio Bittencourt');
  await alocar(container, 'Beliche 2 · inferior', NOITE_24, 'Rosa Silveira');
  await alocar(container, 'Beliche 2 · inferior', NOITE_25, 'Clarice Fontes');
};
const candidatosDoPainel = (container: HTMLElement) =>
  todos<HTMLButtonElement>(painelDeEscolha(container)!, 'button')
    .filter((botao) => botao.textContent !== 'Fechar')
    .map((botao) => botao.textContent);
const cartaoDeSemLeito = (container: HTMLElement): HTMLElement => {
  const cartao = todos<HTMLElement>(container, 'div[style*="border: var(--border-hairline)"]').find((candidato) =>
    candidato.textContent?.startsWith('Ainda sem leito'),
  );
  if (!cartao) throw new Error('cartão de Ainda sem leito não encontrado');
  return cartao;
};
const semLeito = (container: HTMLElement) => itensDaListaDoCartao(cartaoDeSemLeito(container));
const linhasDoCadastro = (container: HTMLElement, identificacao: string): HTMLElement => {
  const etiqueta = todos<HTMLSpanElement>(container, 'span').find(
    (span) => span.childElementCount === 0 && span.textContent === identificacao && span.style.font === 'var(--text-body)',
  );
  const linha = etiqueta?.parentElement;
  if (!linha) throw new Error(`leito não encontrado no cadastro: ${identificacao}`);
  return linha;
};
const cartaoDoDormitorio = (container: HTMLElement, nome: string) => {
  const titulo = todos<HTMLSpanElement>(container, 'span').find(
    (span) => span.textContent === nome && span.style.font === 'var(--text-title-sm)',
  );
  const cartao = titulo?.closest<HTMLElement>('div[style*="border: var(--border-hairline)"]');
  if (!cartao) throw new Error(`dormitório não encontrado: ${nome}`);
  return cartao;
};

describe('LeitosPage: cabeçalho e abas', () => {
  it.each([
    {
      densidade: 'office' as const,
      esperado: 'E-10 e E-15 · LeitosLeitosJornada de três dias · 24 a 26/10/2026 · Chácara · Ibiúna',
    },
    { densidade: 'field' as const, esperado: 'E-10 · E-15Leitos' },
  ])('densidade $densidade — o cabeçalho é $esperado', async ({ densidade, esperado }) => {
    fixarDensidade(densidade);

    const { container } = await montar(<LeitosPage />);

    expect(cabecalho(container)).toBe(esperado);
  });

  it('ao abrir — a aba Mapa do evento vem marcada e a de cadastro não', async () => {
    const { container } = await montar(<LeitosPage />);

    expect(botaoComTexto(container, 'Mapa do evento').getAttribute('aria-pressed')).toBe('true');
    expect(botaoComTexto(container, 'Dormitórios e leitos').getAttribute('aria-pressed')).toBe('false');
  });

  it('trocar de aba — leva ao cadastro e de volta ao mapa, marcando a aba ativa', async () => {
    const { container } = await montar(<LeitosPage />);

    await abrirCadastro(container);
    const noCadastro = [
      botaoComTexto(container, 'Dormitórios e leitos').getAttribute('aria-pressed'),
      container.textContent?.includes('Quem cadastra leito: a operação ou a administração?'),
    ];
    await abrirMapa(container);

    expect(noCadastro).toEqual(['true', true]);
    expect(container.textContent).toContain('Vagas-noite ocupadas');
    expect(container.textContent).not.toContain('Quem cadastra leito');
  });
});

describe('LeitosPage: mapa do evento', () => {
  it('ao abrir — 4 de 16 vagas-noite ocupadas, 4 pessoas sem leito e 2 que dormem na igreja', async () => {
    const { container } = await montar(<LeitosPage />);

    expect(numero(container, 'Vagas-noite ocupadas')).toBe('Vagas-noite ocupadas4 de 168 vagas em 7 leitos × 2 noites');
    expect(numero(container, 'Ainda sem leito')).toBe('Ainda sem leito4pessoas que pediram beliche ou quarto');
    expect(numero(container, 'Dormem na igreja')).toBe('Dormem na igreja2colchonete próprio, fora do mapa');
  });

  it('aviso de conflito — diz que o Temazcal da Munay usa o mesmo local na noite de 25 e que o sistema não impede', async () => {
    const { container } = await montar(<LeitosPage />);

    expect(container.textContent).toContain(
      'Outro evento usa o mesmo local na noite de 25Temazcal da Munay, em Chácara · Ibiúna, ocupa cerca de 4 leitos na mesma noite — e o sistema não impede a sobreposição. ' +
        'A conta de leitos é feita por evento, não pela casa inteira, e quem confere as duas agendas é gente.As noites com conflito vêm marcadas na grade. Alocar continua permitido — só não continua silencioso.',
    );
  });

  it('dormitórios — cada um diz quantos leitos ativos tem', async () => {
    const { container } = await montar(<LeitosPage />);

    expect(cartaoDoDormitorio(container, 'Dormitório 1').textContent).toContain('Dormitório 11 leito ativo');
    expect(cartaoDoDormitorio(container, 'Dormitório 2').textContent).toContain('Dormitório 26 leitos ativos');
  });

  it('cabeçalho da grade — uma coluna por noite do evento, e só a noite 25 leva o ícone de alerta do conflito', async () => {
    const { container } = await montar(<LeitosPage />);

    const noites = ['24/10', '25/10'].map((curta) => folhaComTextoExato(container, curta)!.parentElement!);

    expect(noites.map((noite) => noite.querySelectorAll('svg').length)).toEqual([0, 1]);
  });

  it('cama de casal — mostra Tobias nas duas noites, com espaço para mais uma pessoa', async () => {
    const { container } = await montar(<LeitosPage />);

    expect(textosDasCelulas(container, 'Cama de casal')).toEqual(['TobiasAguiarlivre · cabe mais 1', 'TobiasAguiarlivre · cabe mais 1']);
    expect(linhaDoLeito(container, 'Cama de casal').firstElementChild!.textContent).toBe('Cama de casalCama de casal');
  });

  it('beliche ocupado — mostra a pessoa nas duas noites e não oferece alocar: leito ocupado não é alvo', async () => {
    const { container } = await montar(<LeitosPage />);

    expect(textosDasCelulas(container, 'Beliche 1 · superior')).toEqual(['AnaBeatriz Cordeiro', 'AnaBeatriz Cordeiro']);
    expect(botoesDeAlocarDoLeito(container, 'Beliche 1 · superior')).toHaveLength(0);
  });

  it('beliche livre — mostra livre nas duas noites, com o tipo do leito ao lado do nome', async () => {
    const { container } = await montar(<LeitosPage />);

    expect(textosDasCelulas(container, 'Beliche 2 · inferior')).toEqual(['livre', 'livre']);
    expect(linhaDoLeito(container, 'Beliche 2 · inferior').firstElementChild!.textContent).toBe('Beliche 2 · inferiorBeliche inferior');
    expect(linhaDoLeito(container, 'Beliche 3 · superior').firstElementChild!.textContent).toBe('Beliche 3 · superiorBeliche superior');
  });

  it('leito liberado por cancelamento — a primeira noite mostra liberado em 10/09, a segunda não', async () => {
    const { container } = await montar(<LeitosPage />);

    expect(textosDasCelulas(container, 'Beliche 1 · inferior')).toEqual(['livreliberado em 10/09', 'livre']);
  });

  it.each([
    { onde: 'noite 24, célula livre', leito: 'Beliche 2 · inferior', posicao: 0, borda: '1px dashed var(--color-line-strong)', fundo: 'var(--bg-card)' },
    { onde: 'noite 25, célula livre (conflito)', leito: 'Beliche 2 · inferior', posicao: 1, borda: '1px dashed var(--color-pending)', fundo: 'var(--color-pending-soft)' },
    { onde: 'noite 24, célula ocupada', leito: 'Beliche 1 · superior', posicao: 0, borda: '1px solid var(--color-royal)', fundo: 'var(--color-royal-soft)' },
    { onde: 'noite 25, célula ocupada (conflito)', leito: 'Beliche 1 · superior', posicao: 1, borda: '1px solid var(--color-pending)', fundo: 'var(--color-royal-soft)' },
  ])('$onde — a célula tem borda $borda e fundo $fundo', async ({ leito, posicao, borda, fundo }) => {
    const { container } = await montar(<LeitosPage />);

    const celula = celulasDoLeito(container, leito)[posicao]!;

    expect([celula.style.border, celula.style.background]).toEqual([borda, fundo]);
  });

  it('ainda sem leito — lista quem falta, com o tipo pedido, as noites que faltam e a observação', async () => {
    const { container } = await montar(<LeitosPage />);

    expect(cartaoDeSemLeito(container).textContent).toContain('4 pessoas — e inscrição com leito pendente não confirma');
    expect(semLeito(container)).toEqual([
      'Helena Duartebeliche · faltam noite de 24 e noite de 25Gestante — pediu leito inferior.',
      'Clarice Fontesbeliche · falta noite de 25Chega só no segundo dia.',
      'Sérgio Bittencourtbeliche · faltam noite de 24 e noite de 25',
      'Rosa Silveirabeliche · falta noite de 24',
    ]);
  });

  it('dormem na casa e não ocupam leito — lista os colchonetes e quem vai embora, sem entrar na grade', async () => {
    const { container } = await montar(<LeitosPage />);

    expect(itensDaListaDoCartao(cartaoDoRotulo(container, 'Dormem na casa e não ocupam leito'))).toEqual([
      'Marina TavaresDorme na igreja, em colchonete próprio.',
      'Bruna CamargoDorme na igreja, em colchonete próprio.',
      'Eduardo PiresVai embora depois do trabalho.',
    ]);
  });
});

describe('LeitosPage: alocar', () => {
  it('alocar — abre a escolha no dormitório do leito, com o título do leito e da noite e o botão Fechar', async () => {
    const { container } = await montar(<LeitosPage />);

    await clicar(botaoDeAlocar(container, 'Beliche 1 · inferior', NOITE_24));

    expect(painelDeEscolha(container)!.textContent).toContain('Quem dorme em Beliche 1 · inferior na noite de 24Fechar');
    expect(cartaoDoDormitorio(container, 'Dormitório 2').contains(painelDeEscolha(container))).toBe(true);
    expect(cartaoDoDormitorio(container, 'Dormitório 1').contains(painelDeEscolha(container))).toBe(false);
  });

  it('candidatos da noite 24 — só quem pediu hospedagem e ainda não tem leito nessa noite', async () => {
    const { container } = await montar(<LeitosPage />);

    await clicar(botaoDeAlocar(container, 'Beliche 1 · inferior', NOITE_24));

    expect(candidatosDoPainel(container)).toEqual([
      'Helena DuartePediu beliche · 2 noites · Gestante — pediu leito inferior.',
      'Sérgio BittencourtPediu beliche · 2 noites',
      'Rosa SilveiraPediu beliche · 1 noite',
    ]);
  });

  it('quem pediu quarto e foi liberado da cama de casal — volta como candidato com o texto Pediu quarto', async () => {
    const { container } = await montar(<LeitosPage />);
    await clicar(botaoDeLiberar(container, 'Cama de casal', NOITE_24, 'Tobias Aguiar'));

    await clicar(botaoDeAlocar(container, 'Beliche 1 · inferior', NOITE_24));

    expect(candidatosDoPainel(container)).toContain('Tobias AguiarPediu quarto · 2 noites · Dirigente do trabalho.');
  });

  it('candidatos da noite 25 — inclui quem chega só no segundo dia', async () => {
    const { container } = await montar(<LeitosPage />);

    await clicar(botaoDeAlocar(container, 'Beliche 1 · inferior', NOITE_25));

    expect(candidatosDoPainel(container)).toEqual([
      'Helena DuartePediu beliche · 2 noites · Gestante — pediu leito inferior.',
      'Clarice FontesPediu beliche · 1 noite · Chega só no segundo dia.',
      'Sérgio BittencourtPediu beliche · 2 noites',
    ]);
  });

  it('nota do painel — explica que só aparece quem pediu hospedagem e que colchonete não ocupa leito', async () => {
    const { container } = await montar(<LeitosPage />);

    await clicar(botaoDeAlocar(container, 'Beliche 1 · inferior', NOITE_24));

    expect(painelDeEscolha(container)!.textContent).toContain(
      'Só aparece quem pediu hospedagem nesta inscrição. Quem vai de colchonete ou vai embora depois do trabalho não entra no mapa — não é esquecimento, é que não ocupa leito.',
    );
  });

  it('Fechar — some com a escolha sem alocar ninguém', async () => {
    const { container } = await montar(<LeitosPage />);
    await clicar(botaoDeAlocar(container, 'Beliche 1 · inferior', NOITE_24));

    await clicar(botaoComTexto(painelDeEscolha(container)!, 'Fechar'));

    expect(painelDeEscolha(container)).toBeNull();
    expect(numero(container, 'Vagas-noite ocupadas')).toContain('4 de 16');
  });

  it('escolher outra célula — move a escolha para o leito e a noite novos, e para o outro dormitório', async () => {
    const { container } = await montar(<LeitosPage />);
    await clicar(botaoDeAlocar(container, 'Beliche 1 · inferior', NOITE_24));

    await clicar(botaoDeAlocar(container, 'Cama de casal', NOITE_25));

    expect(painelDeEscolha(container)!.textContent).toContain('Quem dorme em Cama de casal na noite de 25');
    expect(cartaoDoDormitorio(container, 'Dormitório 1').contains(painelDeEscolha(container))).toBe(true);
    expect(todos(container, 'span').filter((span) => span.textContent?.startsWith('Quem dorme em '))).toHaveLength(1);
  });

  it('escolher o hóspede — aloca na célula, fecha a escolha e leva o nome da pessoa para a célula', async () => {
    const { container } = await montar(<LeitosPage />);
    await clicar(botaoDeAlocar(container, 'Beliche 1 · inferior', NOITE_24));

    await escolherHospede(container, 'Helena Duarte');

    expect(painelDeEscolha(container)).toBeNull();
    expect(textosDasCelulas(container, 'Beliche 1 · inferior')).toEqual(['HelenaDuarte', 'livre']);
  });

  it('alocar numa noite sem conflito — avisa o nome, o leito e a noite', async () => {
    const { container } = await montar(<LeitosPage />);

    await alocar(container, 'Beliche 1 · inferior', NOITE_24, 'Helena Duarte');

    expect(recadoDaTela(container)).toBe('Helena Duarte alocada em Beliche 1 · inferior na noite de 24.');
  });

  it('alocar na noite 25 — o aviso acrescenta o conflito com o Temazcal da Munay', async () => {
    const { container } = await montar(<LeitosPage />);

    await alocar(container, 'Beliche 2 · inferior', NOITE_25, 'Clarice Fontes');

    expect(recadoDaTela(container)).toBe(
      'Clarice Fontes alocada em Beliche 2 · inferior na noite de 25. Atenção: o Temazcal da Munay usa o mesmo local nessa noite, e o sistema não impede a sobreposição — confirme com quem organiza.',
    );
  });

  it('aviso de alocação — usa alocada no feminino também para quem tem nome masculino', async () => {
    const { container } = await montar(<LeitosPage />);

    await alocar(container, 'Beliche 2 · superior', NOITE_24, 'Sérgio Bittencourt');

    expect(recadoDaTela(container)).toBe('Sérgio Bittencourt alocada em Beliche 2 · superior na noite de 24.');
  });

  it('alocar — sobe as vagas ocupadas e tira da lista de sem leito só a noite alocada', async () => {
    const { container } = await montar(<LeitosPage />);

    await alocar(container, 'Beliche 1 · inferior', NOITE_24, 'Helena Duarte');

    expect(numero(container, 'Vagas-noite ocupadas')).toContain('5 de 16');
    expect(numero(container, 'Ainda sem leito')).toContain('Ainda sem leito4');
    expect(semLeito(container)[0]).toBe('Helena Duartebeliche · falta noite de 25Gestante — pediu leito inferior.');
  });

  it('quem ficou sem leito em nenhuma noite alocada — sai de Ainda sem leito e do painel das duas noites', async () => {
    const { container } = await montar(<LeitosPage />);

    await alocar(container, 'Beliche 2 · inferior', NOITE_24, 'Rosa Silveira');

    expect(numero(container, 'Ainda sem leito')).toContain('Ainda sem leito3');
    expect(semLeito(container).map((item) => item.slice(0, 8))).toEqual(['Helena D', 'Clarice ', 'Sérgio B']);
    await clicar(botaoDeAlocar(container, 'Beliche 3 · inferior', NOITE_24));
    expect(candidatosDoPainel(container).map((item) => item.slice(0, 8))).toEqual(['Helena D', 'Sérgio B']);
  });

  it('a mesma pessoa em outra noite — continua disponível na noite que falta', async () => {
    const { container } = await montar(<LeitosPage />);
    await alocar(container, 'Beliche 1 · inferior', NOITE_24, 'Helena Duarte');

    await clicar(botaoDeAlocar(container, 'Beliche 1 · inferior', NOITE_25));

    expect(candidatosDoPainel(container).map((item) => item.slice(0, 8))).toEqual(['Helena D', 'Clarice ', 'Sérgio B']);
  });

  it('célula alocada — troca a oferta de alocar pelo botão de liberar e some o liberado em 10/09', async () => {
    const { container } = await montar(<LeitosPage />);

    await alocar(container, 'Beliche 1 · inferior', NOITE_24, 'Helena Duarte');

    expect(botoesDeAlocarDoLeito(container, 'Beliche 1 · inferior').map((botao) => botao.getAttribute('aria-label'))).toEqual([
      'alocar em Beliche 1 · inferior na noite de 25',
    ]);
    expect(container.textContent).not.toContain('liberado em 10/09');
    expect(botaoDeLiberar(container, 'Beliche 1 · inferior', NOITE_24, 'Helena Duarte').textContent).toBe('HelenaDuarte');
  });

  it('cama de casal — comporta duas pessoas: a segunda entra e a oferta de alocar some quando enche', async () => {
    const { container } = await montar(<LeitosPage />);

    await alocar(container, 'Cama de casal', NOITE_24, 'Helena Duarte');

    expect(textosDasCelulas(container, 'Cama de casal')).toEqual(['TobiasAguiarHelenaDuarte', 'TobiasAguiarlivre · cabe mais 1']);
    expect(botoesDeAlocarDoLeito(container, 'Cama de casal').map((botao) => botao.getAttribute('aria-label'))).toEqual([
      'alocar em Cama de casal na noite de 25',
    ]);
  });

  it('quem pediu beliche — também pode ser alocado na cama de casal: o mapa não confere o tipo pedido', async () => {
    const { container } = await montar(<LeitosPage />);

    await alocar(container, 'Cama de casal', NOITE_25, 'Clarice Fontes');

    expect(textosDasCelulas(container, 'Cama de casal')[1]).toBe('TobiasAguiarClariceFontes');
  });

  it('abrir uma escolha — apaga o aviso anterior', async () => {
    const { container } = await montar(<LeitosPage />);
    await alocar(container, 'Beliche 1 · inferior', NOITE_24, 'Helena Duarte');

    await clicar(botaoDeAlocar(container, 'Beliche 2 · inferior', NOITE_24));

    expect(recadoDaTela(container)).toBeNull();
  });

  it('x do recado — dispensa o aviso de alocação', async () => {
    const { container } = await montar(<LeitosPage />);
    await alocar(container, 'Beliche 1 · inferior', NOITE_24, 'Helena Duarte');

    await clicar(botaoDoRecado(container)!);

    expect(recadoDaTela(container)).toBeNull();
  });

  it('ninguém sem leito na noite — a escolha diz que quem pediu hospedagem já está alocado', async () => {
    const { container } = await montar(<LeitosPage />);
    await alocar(container, 'Beliche 1 · inferior', NOITE_24, 'Helena Duarte');
    await alocar(container, 'Beliche 2 · superior', NOITE_24, 'Sérgio Bittencourt');
    await alocar(container, 'Beliche 2 · inferior', NOITE_24, 'Rosa Silveira');

    await clicar(botaoDeAlocar(container, 'Beliche 3 · superior', NOITE_24));

    expect(painelDeEscolha(container)!.textContent).toContain('Ninguém sem leito nesta noite. Quem pediu hospedagem já está alocado.');
    expect(candidatosDoPainel(container)).toEqual([]);
  });

  it('todos alocados nas duas noites — a lista vira Todo mundo com leito e Ainda sem leito zera', async () => {
    const { container } = await montar(<LeitosPage />);

    await alocarTodosOsHospedes(container);

    expect(numero(container, 'Ainda sem leito')).toBe('Ainda sem leito0pessoas que pediram beliche ou quarto');
    expect(numero(container, 'Vagas-noite ocupadas')).toContain('10 de 16');
    expect(container.textContent).toContain(
      'Todo mundo com leitoNinguém que pediu hospedagem ficou de fora. Inscrição com leito pendente não confirma.',
    );
    expect(container.textContent).not.toContain('e inscrição com leito pendente não confirma');
  });

  it('Ainda sem leito com pendências — o número vem na cor pendente', async () => {
    const { container } = await montar(<LeitosPage />);

    expect(folhaComTextoExato(container, '4')!.style.color).toBe('var(--color-pending)');
  });

  it('uma pessoa só sem leito — o número 1 continua na cor pendente', async () => {
    const { container } = await montar(<LeitosPage />);
    await alocar(container, 'Beliche 1 · inferior', NOITE_24, 'Helena Duarte');
    await alocar(container, 'Beliche 1 · inferior', NOITE_25, 'Helena Duarte');
    await alocar(container, 'Beliche 2 · superior', NOITE_24, 'Sérgio Bittencourt');
    await alocar(container, 'Beliche 2 · superior', NOITE_25, 'Sérgio Bittencourt');
    await alocar(container, 'Beliche 2 · inferior', NOITE_25, 'Clarice Fontes');

    expect(numero(container, 'Ainda sem leito')).toBe('Ainda sem leito1pessoas que pediram beliche ou quarto');
    expect(folhaComTextoExato(container, '1')!.style.color).toBe('var(--color-pending)');
  });

  it('Ainda sem leito zerado — o número volta à cor padrão', async () => {
    const { container } = await montar(<LeitosPage />);
    await alocarTodosOsHospedes(container);

    expect(folhaComTextoExato(container, '0')!.style.color).toBe('var(--text-primary)');
  });
});

describe('LeitosPage: liberar', () => {
  it('liberar quem está no beliche — deixa a célula livre, volta Ana para a lista de sem leito e baixa as vagas', async () => {
    const { container } = await montar(<LeitosPage />);

    await clicar(botaoDeLiberar(container, 'Beliche 1 · superior', NOITE_24, 'Ana Beatriz Cordeiro'));

    expect(textosDasCelulas(container, 'Beliche 1 · superior')).toEqual(['livre', 'AnaBeatriz Cordeiro']);
    expect(numero(container, 'Vagas-noite ocupadas')).toContain('3 de 16');
    expect(semLeito(container)).toContain('Ana Beatriz Cordeirobeliche · falta noite de 24');
  });

  it('liberar as duas noites — o beliche volta a oferecer alocar e Ana volta com as duas noites faltando', async () => {
    const { container } = await montar(<LeitosPage />);

    await clicar(botaoDeLiberar(container, 'Beliche 1 · superior', NOITE_24, 'Ana Beatriz Cordeiro'));
    await clicar(botaoDeLiberar(container, 'Beliche 1 · superior', NOITE_25, 'Ana Beatriz Cordeiro'));

    expect(textosDasCelulas(container, 'Beliche 1 · superior')).toEqual(['livre', 'livre']);
    expect(semLeito(container)[0]).toBe('Ana Beatriz Cordeirobeliche · faltam noite de 24 e noite de 25');
    expect(numero(container, 'Ainda sem leito')).toContain('Ainda sem leito5');
  });

  it('liberar a primeira pessoa da cama de casal — tira só ela e mantém a outra', async () => {
    const { container } = await montar(<LeitosPage />);
    await alocar(container, 'Cama de casal', NOITE_24, 'Helena Duarte');

    await clicar(botaoDeLiberar(container, 'Cama de casal', NOITE_24, 'Tobias Aguiar'));

    expect(textosDasCelulas(container, 'Cama de casal')[0]).toBe('HelenaDuartelivre · cabe mais 1');
  });

  it('liberar a segunda pessoa da cama de casal — tira quem foi clicado, e não a primeira da célula', async () => {
    const { container } = await montar(<LeitosPage />);
    await alocar(container, 'Cama de casal', NOITE_24, 'Helena Duarte');

    await clicar(botaoDeLiberar(container, 'Cama de casal', NOITE_24, 'Helena Duarte'));

    expect(textosDasCelulas(container, 'Cama de casal')[0]).toBe('TobiasAguiarlivre · cabe mais 1');
  });

  it('liberar quem pediu quarto — volta para a lista descrito como quarto e vira candidato', async () => {
    const { container } = await montar(<LeitosPage />);

    await clicar(botaoDeLiberar(container, 'Cama de casal', NOITE_24, 'Tobias Aguiar'));

    expect(semLeito(container)).toContain('Tobias Aguiarquarto · falta noite de 24Dirigente do trabalho.');
  });

  it('liberar — apaga o aviso da tela', async () => {
    const { container } = await montar(<LeitosPage />);
    await alocar(container, 'Beliche 1 · inferior', NOITE_24, 'Helena Duarte');

    await clicar(botaoDeLiberar(container, 'Beliche 1 · inferior', NOITE_24, 'Helena Duarte'));

    expect(recadoDaTela(container)).toBeNull();
  });

  it('liberar e alocar de novo — o liberado em 10/09 volta a aparecer quando a célula fica livre', async () => {
    const { container } = await montar(<LeitosPage />);
    await alocar(container, 'Beliche 1 · inferior', NOITE_24, 'Helena Duarte');

    await clicar(botaoDeLiberar(container, 'Beliche 1 · inferior', NOITE_24, 'Helena Duarte'));

    expect(textosDasCelulas(container, 'Beliche 1 · inferior')[0]).toBe('livreliberado em 10/09');
  });

  it('trocar de aba — fecha a escolha aberta e apaga o aviso', async () => {
    const { container } = await montar(<LeitosPage />);
    await alocar(container, 'Beliche 1 · inferior', NOITE_24, 'Helena Duarte');
    await clicar(botaoDeAlocar(container, 'Beliche 2 · inferior', NOITE_24));

    await abrirCadastro(container);
    await abrirMapa(container);

    expect(painelDeEscolha(container)).toBeNull();
    expect(recadoDaTela(container)).toBeNull();
    expect(textosDasCelulas(container, 'Beliche 1 · inferior')[0]).toBe('HelenaDuarte');
  });
});

describe('LeitosPage: cadastro de dormitórios e leitos', () => {
  it('aba de cadastro — traz a questão aberta sobre quem cadastra leito e cada dormitório com os seus leitos', async () => {
    const { container } = await montar(<LeitosPage />);

    await abrirCadastro(container);

    expect(container.textContent).toContain(
      'Quem cadastra leito: a operação ou a administração?Se cadastro de dormitório é operação de evento, o Acolhimento mexe. Se é parâmetro da casa, só a administração. ' +
        'A pergunta está aberta desde o mapa de telas e a resposta muda a permissão — por enquanto esta aba segue a leitura mais restrita.',
    );
    expect(cartaoDoDormitorio(container, 'Dormitório 1').textContent).toContain('Dormitório 11 leito ativo');
    expect(cartaoDoDormitorio(container, 'Dormitório 2').textContent).toContain('Dormitório 26 leitos ativos');
  });

  it('linha de leito — mostra a identificação e o tipo por extenso', async () => {
    const { container } = await montar(<LeitosPage />);

    await abrirCadastro(container);

    expect(linhasDoCadastro(container, 'Beliche 3 · superior').textContent).toBe('Beliche 3 · superiorBeliche superiorInativar');
    expect(linhasDoCadastro(container, 'Beliche 2 · inferior').textContent).toBe('Beliche 2 · inferiorBeliche inferiorInativar');
  });

  it('leito com gente alocada — Inativar vem bloqueado, com o motivo e a quantidade de noites ocupadas', async () => {
    const { container } = await montar(<LeitosPage />);

    await abrirCadastro(container);

    const botao = botaoComTexto(linhasDoCadastro(container, 'Beliche 1 · superior'), 'Inativar');
    expect(botao.disabled).toBe(true);
    expect(botao.title).toBe(
      'Tem gente alocada em 2 noites do evento aberto. Libere no mapa primeiro — inativar um leito ocupado faria a alocação sumir da grade sem sumir da conta.',
    );
    expect(linhasDoCadastro(container, 'Beliche 1 · superior').textContent).toContain('Tem gente alocada em 2 noites do evento aberto.');
  });

  it('leito com gente em uma noite só — o motivo fala em 1 noite, no singular', async () => {
    const { container } = await montar(<LeitosPage />);
    await clicar(botaoDeLiberar(container, 'Beliche 1 · superior', NOITE_24, 'Ana Beatriz Cordeiro'));

    await abrirCadastro(container);

    expect(botaoComTexto(linhasDoCadastro(container, 'Beliche 1 · superior'), 'Inativar').title).toContain('Tem gente alocada em 1 noite do evento aberto.');
  });

  it('leito liberado no mapa — Inativar volta a ficar disponível', async () => {
    const { container } = await montar(<LeitosPage />);
    await clicar(botaoDeLiberar(container, 'Beliche 1 · superior', NOITE_24, 'Ana Beatriz Cordeiro'));
    await clicar(botaoDeLiberar(container, 'Beliche 1 · superior', NOITE_25, 'Ana Beatriz Cordeiro'));

    await abrirCadastro(container);

    expect(botaoComTexto(linhasDoCadastro(container, 'Beliche 1 · superior'), 'Inativar').disabled).toBe(false);
  });

  it('Inativar um leito livre — marca como Inativo, troca o botão por Reativar e conta os inativos no dormitório', async () => {
    const { container } = await montar(<LeitosPage />);
    await abrirCadastro(container);

    await clicar(botaoComTexto(linhasDoCadastro(container, 'Beliche 3 · superior'), 'Inativar'));

    expect(linhasDoCadastro(container, 'Beliche 3 · superior').textContent).toBe('Beliche 3 · superiorBeliche superiorInativoReativar');
    expect(cartaoDoDormitorio(container, 'Dormitório 2').textContent).toContain('Dormitório 25 leitos ativos · 1 inativo');
  });

  it('Reativar — devolve o leito ao dormitório, sem a nota de inativos', async () => {
    const { container } = await montar(<LeitosPage />);
    await abrirCadastro(container);
    await clicar(botaoComTexto(linhasDoCadastro(container, 'Beliche 3 · superior'), 'Inativar'));

    await clicar(botaoComTexto(linhasDoCadastro(container, 'Beliche 3 · superior'), 'Reativar'));

    expect(cartaoDoDormitorio(container, 'Dormitório 2').textContent).toContain('Dormitório 26 leitos ativos');
    expect(cartaoDoDormitorio(container, 'Dormitório 2').textContent).not.toContain('inativo');
  });

  it('dois leitos inativos — a nota diz 2 inativos, no plural', async () => {
    const { container } = await montar(<LeitosPage />);
    await abrirCadastro(container);

    await clicar(botaoComTexto(linhasDoCadastro(container, 'Beliche 3 · superior'), 'Inativar'));
    await clicar(botaoComTexto(linhasDoCadastro(container, 'Beliche 3 · inferior'), 'Inativar'));

    expect(cartaoDoDormitorio(container, 'Dormitório 2').textContent).toContain('4 leitos ativos · 2 inativos');
  });

  it('leito inativado — some da conta do mapa: vagas e leitos caem, e a linha vira inativo sem células de alocar', async () => {
    const { container } = await montar(<LeitosPage />);
    await abrirCadastro(container);
    await clicar(botaoComTexto(linhasDoCadastro(container, 'Beliche 3 · superior'), 'Inativar'));

    await abrirMapa(container);

    expect(numero(container, 'Vagas-noite ocupadas')).toBe('Vagas-noite ocupadas4 de 147 vagas em 6 leitos × 2 noites');
    expect(linhaDoLeito(container, 'Beliche 3 · superior').firstElementChild!.textContent).toBe('Beliche 3 · superiorinativo');
    expect(botoesDeAlocarDoLeito(container, 'Beliche 3 · superior')).toHaveLength(0);
    expect(textosDasCelulas(container, 'Beliche 3 · superior')).toEqual(['', '']);
    expect(cartaoDoDormitorio(container, 'Dormitório 2').textContent).toContain('Dormitório 25 leitos ativos');
  });

  it('leito inativado — o nome e o tipo ficam esmaecidos na grade, e os dos leitos ativos não', async () => {
    const { container } = await montar(<LeitosPage />);
    await abrirCadastro(container);
    await clicar(botaoComTexto(linhasDoCadastro(container, 'Beliche 3 · superior'), 'Inativar'));

    await abrirMapa(container);

    const opacidades = ['Beliche 3 · superior', 'Beliche 3 · inferior'].map(
      (leito) => (linhaDoLeito(container, leito).firstElementChild as HTMLElement).style.opacity,
    );
    expect(opacidades).toEqual(['0.5', '1']);
  });

  it('densidade de campo, leito inativado — a célula vazia da grade usa a altura de 52px', async () => {
    fixarDensidade('field');
    const { container } = await montar(<LeitosPage />);
    await abrirCadastro(container);
    await clicar(botaoComTexto(linhasDoCadastro(container, 'Beliche 3 · superior'), 'Inativar'));

    await abrirMapa(container);

    expect(celulasDoLeito(container, 'Beliche 3 · superior').map((celula) => celula.style.minHeight)).toEqual(['52px', '52px']);
  });

  it('Acrescentar leito — abre o formulário com Identificação em branco e o tipo Beliche inferior', async () => {
    const { container } = await montar(<LeitosPage />);
    await abrirCadastro(container);

    await clicar(botaoComTexto(cartaoDoDormitorio(container, 'Dormitório 2'), 'Acrescentar leito'));

    const dormitorio = cartaoDoDormitorio(container, 'Dormitório 2');
    expect(campoDoRotulo(dormitorio, 'Identificação').value).toBe('');
    expect(campoDoRotulo(dormitorio, 'Identificação').placeholder).toBe('F5 · superior');
    expect(campoDoRotulo<HTMLSelectElement>(dormitorio, 'Tipo').value).toBe('BELICHE_INFERIOR');
    expect(todos<HTMLButtonElement>(dormitorio, 'button').slice(-2).map((botao) => botao.textContent)).toEqual(['Acrescentar', 'Cancelar']);
  });

  it('tipos do formulário — os cinco tipos de leito, em ordem, com o rótulo por extenso', async () => {
    const { container } = await montar(<LeitosPage />);
    await abrirCadastro(container);
    await clicar(botaoComTexto(cartaoDoDormitorio(container, 'Dormitório 1'), 'Acrescentar leito'));

    const opcoes = todos<HTMLOptionElement>(campoDoRotulo(cartaoDoDormitorio(container, 'Dormitório 1'), 'Tipo'), 'option');

    expect(opcoes.map((opcao) => [opcao.value, opcao.textContent])).toEqual([
      ['BELICHE_SUPERIOR', 'Beliche superior'],
      ['BELICHE_INFERIOR', 'Beliche inferior'],
      ['CAMA_SOLTEIRO', 'Cama de solteiro'],
      ['CAMA_CASAL', 'Cama de casal'],
      ['QUARTO_PRIVATIVO', 'Quarto privativo'],
    ]);
  });

  it('Acrescentar com identificação — põe o leito no fim do dormitório, fecha o formulário e avisa', async () => {
    const { container } = await montar(<LeitosPage />);
    await abrirCadastro(container);
    await clicar(botaoComTexto(cartaoDoDormitorio(container, 'Dormitório 2'), 'Acrescentar leito'));
    await digitar(campoDoRotulo(cartaoDoDormitorio(container, 'Dormitório 2'), 'Identificação'), '  Beliche 4 · superior ');
    await escolherOpcao(campoDoRotulo<HTMLSelectElement>(cartaoDoDormitorio(container, 'Dormitório 2'), 'Tipo'), 'BELICHE_SUPERIOR');

    await clicar(botaoComTexto(cartaoDoDormitorio(container, 'Dormitório 2'), 'Acrescentar'));

    expect(linhasDoCadastro(container, 'Beliche 4 · superior').textContent).toBe('Beliche 4 · superiorBeliche superiorInativar');
    expect(cartaoDoDormitorio(container, 'Dormitório 2').textContent).toContain('Dormitório 27 leitos ativos');
    expect(container.textContent).not.toContain('Identificação');
    expect(recadoDaTela(container)).toBe('Beliche 4 · superior acrescentado ao dormitório 2. Já aparece no mapa do próximo evento.');
  });

  it('leito acrescentado — já aparece no mapa deste evento e entra na conta de vagas, apesar do aviso falar do próximo evento', async () => {
    const { container } = await montar(<LeitosPage />);
    await abrirCadastro(container);
    await clicar(botaoComTexto(cartaoDoDormitorio(container, 'Dormitório 2'), 'Acrescentar leito'));
    await digitar(campoDoRotulo(cartaoDoDormitorio(container, 'Dormitório 2'), 'Identificação'), 'Beliche 4 · superior');
    await clicar(botaoComTexto(cartaoDoDormitorio(container, 'Dormitório 2'), 'Acrescentar'));

    await abrirMapa(container);

    expect(textosDasCelulas(container, 'Beliche 4 · superior')).toEqual(['livre', 'livre']);
    expect(numero(container, 'Vagas-noite ocupadas')).toBe('Vagas-noite ocupadas4 de 189 vagas em 8 leitos × 2 noites');
  });

  it('cama de casal acrescentada — soma duas vagas por noite; outros tipos somam uma', async () => {
    const { container } = await montar(<LeitosPage />);
    await abrirCadastro(container);
    await clicar(botaoComTexto(cartaoDoDormitorio(container, 'Dormitório 1'), 'Acrescentar leito'));
    await digitar(campoDoRotulo(cartaoDoDormitorio(container, 'Dormitório 1'), 'Identificação'), 'Casal 2');
    await escolherOpcao(campoDoRotulo<HTMLSelectElement>(cartaoDoDormitorio(container, 'Dormitório 1'), 'Tipo'), 'CAMA_CASAL');
    await clicar(botaoComTexto(cartaoDoDormitorio(container, 'Dormitório 1'), 'Acrescentar'));

    await abrirMapa(container);

    expect(numero(container, 'Vagas-noite ocupadas')).toBe('Vagas-noite ocupadas4 de 2010 vagas em 8 leitos × 2 noites');
    expect(textosDasCelulas(container, 'Casal 2')).toEqual(['livre', 'livre']);
  });

  it('quarto privativo acrescentado — soma uma vaga por noite, como o beliche', async () => {
    const { container } = await montar(<LeitosPage />);
    await abrirCadastro(container);
    await clicar(botaoComTexto(cartaoDoDormitorio(container, 'Dormitório 1'), 'Acrescentar leito'));
    await digitar(campoDoRotulo(cartaoDoDormitorio(container, 'Dormitório 1'), 'Identificação'), 'Quarto 1');
    await escolherOpcao(campoDoRotulo<HTMLSelectElement>(cartaoDoDormitorio(container, 'Dormitório 1'), 'Tipo'), 'QUARTO_PRIVATIVO');
    await clicar(botaoComTexto(cartaoDoDormitorio(container, 'Dormitório 1'), 'Acrescentar'));

    await abrirMapa(container);

    expect(numero(container, 'Vagas-noite ocupadas')).toBe('Vagas-noite ocupadas4 de 189 vagas em 8 leitos × 2 noites');
  });

  it('identificação vazia ou só com espaços — Acrescentar não faz nada: o formulário fica aberto, sem aviso', async () => {
    const { container } = await montar(<LeitosPage />);
    await abrirCadastro(container);
    await clicar(botaoComTexto(cartaoDoDormitorio(container, 'Dormitório 2'), 'Acrescentar leito'));
    await digitar(campoDoRotulo(cartaoDoDormitorio(container, 'Dormitório 2'), 'Identificação'), '   ');

    await clicar(botaoComTexto(cartaoDoDormitorio(container, 'Dormitório 2'), 'Acrescentar'));

    expect(campoDoRotulo(cartaoDoDormitorio(container, 'Dormitório 2'), 'Identificação').value).toBe('   ');
    expect(recadoDaTela(container)).toBeNull();
    expect(cartaoDoDormitorio(container, 'Dormitório 2').textContent).toContain('6 leitos ativos');
  });

  it('Cancelar no formulário — fecha sem acrescentar nada', async () => {
    const { container } = await montar(<LeitosPage />);
    await abrirCadastro(container);
    await clicar(botaoComTexto(cartaoDoDormitorio(container, 'Dormitório 2'), 'Acrescentar leito'));
    await digitar(campoDoRotulo(cartaoDoDormitorio(container, 'Dormitório 2'), 'Identificação'), 'Beliche 4');

    await clicar(botaoComTexto(cartaoDoDormitorio(container, 'Dormitório 2'), 'Cancelar'));

    expect(container.textContent).not.toContain('Identificação');
    expect(cartaoDoDormitorio(container, 'Dormitório 2').textContent).toContain('6 leitos ativos');
  });

  it('abrir o formulário em outro dormitório — fecha o primeiro e apaga a identificação', async () => {
    const { container } = await montar(<LeitosPage />);
    await abrirCadastro(container);
    await clicar(botaoComTexto(cartaoDoDormitorio(container, 'Dormitório 1'), 'Acrescentar leito'));
    await digitar(campoDoRotulo(cartaoDoDormitorio(container, 'Dormitório 1'), 'Identificação'), 'Rascunho');

    await clicar(botaoComTexto(cartaoDoDormitorio(container, 'Dormitório 2'), 'Acrescentar leito'));

    expect(cartaoDoDormitorio(container, 'Dormitório 1').textContent).not.toContain('Identificação');
    expect(campoDoRotulo(cartaoDoDormitorio(container, 'Dormitório 2'), 'Identificação').value).toBe('');
  });

  it('o tipo escolhido — continua escolhido ao acrescentar o leito seguinte, enquanto a identificação é zerada', async () => {
    const { container } = await montar(<LeitosPage />);
    await abrirCadastro(container);
    await clicar(botaoComTexto(cartaoDoDormitorio(container, 'Dormitório 1'), 'Acrescentar leito'));
    await digitar(campoDoRotulo(cartaoDoDormitorio(container, 'Dormitório 1'), 'Identificação'), 'Casal 2');
    await escolherOpcao(campoDoRotulo<HTMLSelectElement>(cartaoDoDormitorio(container, 'Dormitório 1'), 'Tipo'), 'CAMA_CASAL');
    await clicar(botaoComTexto(cartaoDoDormitorio(container, 'Dormitório 1'), 'Acrescentar'));

    await clicar(botaoComTexto(cartaoDoDormitorio(container, 'Dormitório 1'), 'Acrescentar leito'));

    const dormitorio = cartaoDoDormitorio(container, 'Dormitório 1');
    expect([campoDoRotulo(dormitorio, 'Identificação').value, campoDoRotulo<HTMLSelectElement>(dormitorio, 'Tipo').value]).toEqual(['', 'CAMA_CASAL']);
  });

  it('formulário aberto e troca de aba — o formulário se perde e o tipo volta a Beliche inferior', async () => {
    const { container } = await montar(<LeitosPage />);
    await abrirCadastro(container);
    await clicar(botaoComTexto(cartaoDoDormitorio(container, 'Dormitório 1'), 'Acrescentar leito'));
    await escolherOpcao(campoDoRotulo<HTMLSelectElement>(cartaoDoDormitorio(container, 'Dormitório 1'), 'Tipo'), 'CAMA_CASAL');
    await abrirMapa(container);

    await abrirCadastro(container);
    await clicar(botaoComTexto(cartaoDoDormitorio(container, 'Dormitório 1'), 'Acrescentar leito'));

    expect(campoDoRotulo<HTMLSelectElement>(cartaoDoDormitorio(container, 'Dormitório 1'), 'Tipo').value).toBe('BELICHE_INFERIOR');
  });

  it('acrescentar leito com o aviso do anterior na tela — abrir o formulário de novo apaga o aviso', async () => {
    const { container } = await montar(<LeitosPage />);
    await abrirCadastro(container);
    await clicar(botaoComTexto(cartaoDoDormitorio(container, 'Dormitório 1'), 'Acrescentar leito'));
    await digitar(campoDoRotulo(cartaoDoDormitorio(container, 'Dormitório 1'), 'Identificação'), 'Casal 2');
    await clicar(botaoComTexto(cartaoDoDormitorio(container, 'Dormitório 1'), 'Acrescentar'));
    const aposAcrescentar = recadoDaTela(container);

    await clicar(botaoComTexto(cartaoDoDormitorio(container, 'Dormitório 1'), 'Acrescentar leito'));

    expect(aposAcrescentar).toBe('Casal 2 acrescentado ao dormitório 1. Já aparece no mapa do próximo evento.');
    expect(recadoDaTela(container)).toBeNull();
  });

  it('inativar um leito — apaga o aviso do leito acrescentado', async () => {
    const { container } = await montar(<LeitosPage />);
    await abrirCadastro(container);
    await clicar(botaoComTexto(cartaoDoDormitorio(container, 'Dormitório 1'), 'Acrescentar leito'));
    await digitar(campoDoRotulo(cartaoDoDormitorio(container, 'Dormitório 1'), 'Identificação'), 'Casal 2');
    await clicar(botaoComTexto(cartaoDoDormitorio(container, 'Dormitório 1'), 'Acrescentar'));
    const aposAcrescentar = recadoDaTela(container);

    await clicar(botaoComTexto(linhasDoCadastro(container, 'Beliche 3 · superior'), 'Inativar'));

    expect(aposAcrescentar).toBe('Casal 2 acrescentado ao dormitório 1. Já aparece no mapa do próximo evento.');
    expect(recadoDaTela(container)).toBeNull();
  });

  it('regra no pé do cadastro — leito não se exclui, se inativa', async () => {
    const { container } = await montar(<LeitosPage />);

    await abrirCadastro(container);

    expect(container.textContent).toContain('Leito não se exclui, se inativa.');
  });
});

describe('LeitosPage: densidade', () => {
  it.each([
    { densidade: 'office' as const, colunasDosNumeros: 'repeat(3, minmax(0,1fr))', minimo: '48px', respiro: '15px 17px', candidato: '' },
    { densidade: 'field' as const, colunasDosNumeros: 'repeat(2, minmax(0,1fr))', minimo: '52px', respiro: '14px 15px', candidato: 'var(--target-field)' },
  ])('densidade $densidade — números em $colunasDosNumeros, células com altura $minimo e escolha com respiro $respiro', async ({ densidade, colunasDosNumeros, minimo, respiro, candidato }) => {
    fixarDensidade(densidade);
    const { container } = await montar(<LeitosPage />);
    await clicar(botaoDeAlocar(container, 'Beliche 1 · inferior', NOITE_24));

    const numeros = folhaComTextoExato(container, 'Vagas-noite ocupadas')!.parentElement!.parentElement!;
    const celula = celulasDoLeito(container, 'Beliche 2 · inferior')[0]!;
    const primeiroCandidato = todos<HTMLButtonElement>(painelDeEscolha(container)!, 'button')[1]!;
    expect(numeros.style.gridTemplateColumns).toBe(colunasDosNumeros);
    expect(celula.style.minHeight).toBe(minimo);
    expect(painelDeEscolha(container)!.style.padding).toBe(respiro);
    expect(primeiroCandidato.style.minHeight).toBe(candidato);
  });

  it.each([
    { densidade: 'office' as const, padding: '18px 24px 30px', larguraMaxima: '1060px', formulario: '1fr 1fr' },
    { densidade: 'field' as const, padding: '14px 16px 26px', larguraMaxima: '', formulario: '1fr' },
  ])('densidade $densidade — o corpo usa padding $padding e largura máxima "$larguraMaxima", e o formulário de leito usa $formulario', async ({ densidade, padding, larguraMaxima, formulario }) => {
    fixarDensidade(densidade);
    const { container } = await montar(<LeitosPage />);
    await abrirCadastro(container);
    await clicar(botaoComTexto(cartaoDoDormitorio(container, 'Dormitório 1'), 'Acrescentar leito'));

    const corpo = elemento(container, 'header').nextElementSibling as HTMLElement;
    const grade = campoDoRotulo(container, 'Identificação').parentElement!.parentElement!.parentElement as HTMLElement;
    expect([corpo.style.padding, corpo.style.maxWidth]).toEqual([padding, larguraMaxima]);
    expect(grade.style.gridTemplateColumns).toBe(formulario);
  });
});

describe('LeitosPage: permissões', () => {
  it('sem sessão nenhuma — o mapa oferece alocar e liberar: a tela não consulta permissão por ação', async () => {
    const { container } = await montar(<LeitosPage />);

    expect(botaoDeAlocar(container, 'Beliche 2 · inferior', NOITE_24).disabled).toBe(false);
    expect(botaoDeLiberar(container, 'Beliche 1 · superior', NOITE_24, 'Ana Beatriz Cordeiro').disabled).toBe(false);
  });

  it('sem sessão nenhuma — a aba de cadastro abre e oferece Acrescentar leito e Inativar habilitados', async () => {
    const { container } = await montar(<LeitosPage />);

    await abrirCadastro(container);

    expect(botaoComTexto(cartaoDoDormitorio(container, 'Dormitório 2'), 'Acrescentar leito').disabled).toBe(false);
    expect(botaoComTexto(linhasDoCadastro(container, 'Beliche 3 · superior'), 'Inativar').disabled).toBe(false);
  });
});
