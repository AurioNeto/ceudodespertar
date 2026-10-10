import { reais } from '@cdd/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { botaoComTexto, clicar, desmontarTudo, elemento, escolherOpcao, montar, todos } from '@/testes/montagem';
import { PrestacaoDeContasPage } from './PrestacaoDeContasPage';

type Periodos = readonly { readonly chave: string; readonly rotulo: string; readonly dados: Record<string, unknown> }[];

const cenario = vi.hoisted(() => ({
  periodos: (reaisDoMock: Periodos): Periodos => reaisDoMock,
}));

vi.mock('../../mocks/prestacao', async (importarOriginal) => {
  const original = await importarOriginal<{ periodos: Periodos }>();
  return {
    ...original,
    get periodos() {
      return cenario.periodos(original.periodos);
    },
  };
});

const MENOS = '− ';
const COR_CONFIRMADA = 'var(--color-confirmed)';
const COR_DE_ATENCAO = 'var(--color-attention)';

function fixarDensidade(campo: boolean) {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    media: consulta,
    matches: campo,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

beforeEach(() => {
  fixarDensidade(false);
  cenario.periodos = (p) => p;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-10T17:22:00Z'));
});

afterEach(async () => {
  await desmontarTudo();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const avancarUmMilissegundo = () => vi.setSystemTime(Date.now() + 1);

const documento = (container: HTMLElement) => elemento(container, 'article');

const seletorDe = (container: HTMLElement, rotulo: string) => {
  const etiqueta = todos<HTMLLabelElement>(container, 'label').find((l) => l.textContent === rotulo);
  const campo = etiqueta ? document.getElementById(etiqueta.htmlFor) : null;
  if (!(campo instanceof HTMLSelectElement)) throw new Error(`seletor não encontrado: ${rotulo}`);
  return campo;
};

const secao = (container: HTMLElement, titulo: string) => {
  const rotulo = todos<HTMLSpanElement>(documento(container), 'span').find((s) => s.textContent === titulo);
  const achada = rotulo?.closest('section');
  if (!achada) throw new Error(`seção não encontrada: ${titulo}`);
  return achada;
};

const linhasDaSecao = (container: HTMLElement, titulo: string) =>
  Array.from(secao(container, titulo).children)
    .slice(1)
    .map((linha) => linha.textContent);

const resultadoDoPeriodo = (container: HTMLElement) => {
  const rotulo = todos<HTMLSpanElement>(documento(container), 'span').find((s) => s.textContent === 'Resultado do período');
  const valor = rotulo?.nextElementSibling as HTMLElement | null;
  return { texto: valor?.textContent, cor: valor?.style.color };
};

const opcaoDeNivel = (container: HTMLElement, texto: string) => botaoComTexto(container, texto).getAttribute('aria-pressed');

const historico = (container: HTMLElement) => {
  const titulo = todos<HTMLSpanElement>(container, 'span').find((s) => s.textContent === 'Prestações já geradas');
  return Array.from(titulo?.parentElement?.children ?? []).slice(1) as HTMLElement[];
};

const resumoDaEntrada = (entrada: HTMLElement) => ({
  titulo: entrada.children[1]?.children[0]?.children[0]?.textContent,
  selo: entrada.children[1]?.children[0]?.children[1]?.textContent,
  autoria: entrada.children[1]?.children[1]?.textContent,
  hash: entrada.querySelector('code')?.textContent,
});

const recado = (container: HTMLElement) => container.querySelector('[role="status"]')?.textContent ?? null;

const sortearSempre = (valor: number) => vi.spyOn(Math, 'random').mockReturnValue(valor);

describe('PrestacaoDeContasPage: cabeçalho', () => {
  it('escritório — mostra o código com o nome, o título e o subtítulo', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);

    const cabecalho = elemento(container, 'header');
    expect(cabecalho.textContent).toContain('F-24 · Prestação de contas');
    expect(elemento(cabecalho, 'h1').textContent).toBe('Prestação de contas');
    expect(cabecalho.textContent).toContain('Exportação sob demanda, quando alguém pede · CDD');
  });

  it('campo — mostra só o código e o título', async () => {
    fixarDensidade(true);

    const { container } = await montar(<PrestacaoDeContasPage />);

    expect(elemento(container, 'header').textContent).toBe('F-24Prestação de contas');
  });
});

describe('PrestacaoDeContasPage: escolhas do pedido', () => {
  it('Período — oferece agosto e julho de 2026 e abre em agosto', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);

    const periodo = seletorDe(container, 'Período');

    expect(Array.from(periodo.options).map((o) => [o.value, o.textContent])).toEqual([
      ['2026-08', 'Agosto de 2026'],
      ['2026-07', 'Julho de 2026'],
    ]);
    expect(periodo.value).toBe('2026-08');
  });

  it('Unidade — oferece o consolidado e as três unidades e abre no consolidado', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);

    const unidade = seletorDe(container, 'Unidade');

    expect(Array.from(unidade.options).map((o) => [o.value, o.textContent])).toEqual([
      ['consolidado', 'Consolidado — todas as unidades'],
      ['CDD', 'CDD'],
      ['MUNAY', 'Munay'],
      ['LOJINHA', 'Lojinha'],
    ]);
    expect(unidade.value).toBe('consolidado');
  });

  it('Nível de detalhe — abre em Resumo, sem nomes, e Detalhado fica desmarcado', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);

    expect([opcaoDeNivel(container, 'Resumo · sem nomes'), opcaoDeNivel(container, 'Detalhado · uso interno')]).toEqual(['true', 'false']);
  });

  it('Resumo — explica que nomes de pessoas físicas não aparecem e quantas linhas trocam o nome', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);

    expect(container.textContent).toContain(
      'Nomes de pessoas físicas não aparecem. 7 linhas deste período trocam o nome pelo agregado — “empréstimo concedido a Fulano” vira “empréstimos concedidos”. Presta a mesma conta sem expor ninguém, e é o nível que se entrega a quem pede.',
    );
  });

  it('Detalhado — troca a explicação pelo aviso de uso interno restrito', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);

    await clicar(botaoComTexto(container, 'Detalhado · uso interno'));

    expect([opcaoDeNivel(container, 'Resumo · sem nomes'), opcaoDeNivel(container, 'Detalhado · uso interno')]).toEqual(['false', 'true']);
    expect(container.textContent).toContain(
      'Este nível mostra nomes e é de uso interno. Fica restrito a administração, tesouraria e governança — não é o documento que se entrega na assembleia.',
    );
    expect(container.textContent).not.toContain('Nomes de pessoas físicas não aparecem');
  });

  it('julho — a contagem de linhas que o resumo suprime passa a ser a de julho', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);

    await escolherOpcao(seletorDe(container, 'Período'), '2026-07');

    expect(container.textContent).toContain('4 linhas deste período trocam o nome pelo agregado');
  });
});

describe('PrestacaoDeContasPage: documento de agosto de 2026, nível resumo', () => {
  it('abre com o título do documento, o período, a unidade e o nível', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);

    const texto = documento(container).textContent ?? '';
    expect(texto).toContain('Céu do Despertar · Prestação de contas');
    expect(elemento(documento(container), 'h2').textContent).toBe('agosto de 2026');
    expect(texto).toContain('Consolidado — todas as unidades · nível resumo');
  });

  it('receitas — lista as cinco linhas sem nomes e soma o total', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);

    expect(linhasDaSecao(container, 'Receitas')).toEqual([
      'Contribuição de cerimônia41.300,00',
      'Cachê de contratação8.500,00',
      'Venda de mercadoria6.230,00',
      'Hospedagem4.850,00',
      'Doações e apoio1.600,00',
      'Total de receitas62.480,00',
    ]);
  });

  it('despesas — lista as nove linhas sem nomes e soma o total', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);

    expect(linhasDaSecao(container, 'Despesas')).toEqual([
      'Custo de feitio11.200,00',
      'Alimentação de cerimônia9.412,30',
      'Obra do dormitório8.764,80',
      'Cachê a músico6.400,00',
      'Manutenção e zeladoria3.845,20',
      'Custo da lojinha3.517,90',
      'Combustível2.190,00',
      'Prestadores de serviço1.500,00',
      'Administrativo1.287,40',
      'Total de despesas48.117,60',
    ]);
  });

  it('resultado do período — é receitas menos despesas, com sinal de mais e em verde', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);

    expect(resultadoDoPeriodo(container)).toEqual({ texto: '+ 14.362,40', cor: COR_CONFIRMADA });
  });

  it('movimentação patrimonial — explica que não entra no resultado e lista as três linhas', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);

    expect(secao(container, 'Movimentação patrimonial').textContent).toContain(
      'Não entra no resultado: empréstimo e adiantamento movem patrimônio, não receita nem despesa.',
    );
    expect(linhasDaSecao(container, 'Movimentação patrimonial').slice(1)).toEqual([
      'Devolução de empréstimo recebida562,40',
      'Devolução de empréstimo paga1.500,00',
      'Adiantamentos a ressarcir no fim do período1.969,26',
    ]);
  });

  it('saldos por conta — mostra início e fim de cada conta e o consolidado ao fim', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);

    expect(linhasDaSecao(container, 'Saldos por conta')).toEqual([
      'containíciofim',
      'Cora PJ33.480,2041.902,10',
      'Espécie2.940,003.180,40',
      'Nubank Paty2.140,451.240,55',
      'Itaú Munay31.394,8537.994,85',
      'Saldo consolidado ao fim84.317,90',
    ]);
  });

  it('fundo próprio — mostra o saldo, os aportes e as aplicações do período', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);

    expect(secao(container, 'Fundo próprio').textContent).toContain('Parte do saldo com destinação já combinada.');
    expect(linhasDaSecao(container, 'Fundo próprio').slice(1)).toEqual([
      'Saldo do fundo39.235,40',
      'Aportes no período4.000,00',
      'Aplicações no período1.850,00',
    ]);
  });

  it('resultado por cerimônia — mostra contribuições, custos e o saldo com sinal', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);

    expect(linhasDaSecao(container, 'Resultado por cerimônia')).toEqual([
      'Cerimônia de Agosto · 15/08/2026contribuições 12.480,00 · custos 7.310,20+ 5.169,80',
    ]);
  });

  it('rodapé — avisa que o documento é gerado sob demanda e que o hash confere duas prestações', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);

    expect(elemento(documento(container), 'footer').textContent).toBe(
      'Documento gerado sob demanda. O hash do conjunto de lançamentos entra no rodapé do arquivo exportado, e é por ele que duas prestações do mesmo período se conferem.',
    );
  });
});

describe('PrestacaoDeContasPage: nível detalhado mostra os nomes que o resumo esconde', () => {
  it('resumo — nenhum nome de pessoa nem de instituição aparece no documento', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);

    const texto = documento(container).textContent ?? '';
    for (const nome of ['Instituto Terra', 'Marta Neto', 'Chico Aguiar', 'Érico Santana', 'Zé Ferreira', 'Paty Munay', 'Lucia Prado', 'quatro músicos da Munay']) {
      expect(texto).not.toContain(nome);
    }
  });

  it('detalhado — as linhas nominais mostram o nome embaixo do rótulo', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);

    await clicar(botaoComTexto(container, 'Detalhado · uso interno'));

    expect(linhasDaSecao(container, 'Receitas')).toEqual([
      'Contribuição de cerimônia41.300,00',
      'Cachê de contrataçãoInstituto Terra · cerimônia de 09/088.500,00',
      'Venda de mercadoria6.230,00',
      'Hospedagem4.850,00',
      'Doações e apoioMarta Neto · Chico Aguiar · dois anônimos1.600,00',
      'Total de receitas62.480,00',
    ]);
  });

  it('detalhado — despesas e movimentação patrimonial também trazem os nomes', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);

    await clicar(botaoComTexto(container, 'Detalhado · uso interno'));

    expect(linhasDaSecao(container, 'Despesas')).toContain('Cachê a músicoquatro músicos da Munay6.400,00');
    expect(linhasDaSecao(container, 'Despesas')).toContain('Prestadores de serviçoZé Ferreira · diarista · pedreiro1.500,00');
    expect(linhasDaSecao(container, 'Movimentação patrimonial')).toContain('Devolução de empréstimo recebidade Érico Santana, em 18/08562,40');
    expect(linhasDaSecao(container, 'Movimentação patrimonial')).toContain(
      'Adiantamentos a ressarcir no fim do períodoPaty Munay 1.700,86 · Lucia Prado 268,401.969,26',
    );
  });

  it('detalhado — os totais não mudam: só o texto das linhas', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);

    await clicar(botaoComTexto(container, 'Detalhado · uso interno'));

    expect(linhasDaSecao(container, 'Receitas').at(-1)).toBe('Total de receitas62.480,00');
    expect(resultadoDoPeriodo(container).texto).toBe('+ 14.362,40');
    expect(documento(container).textContent).toContain('nível detalhado');
  });

  it('detalhado — as linhas do fundo próprio continuam sem nome', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);

    await clicar(botaoComTexto(container, 'Detalhado · uso interno'));

    expect(linhasDaSecao(container, 'Fundo próprio').slice(1)).toEqual([
      'Saldo do fundo39.235,40',
      'Aportes no período4.000,00',
      'Aplicações no período1.850,00',
    ]);
  });
});

describe('PrestacaoDeContasPage: troca de período e de unidade', () => {
  it('julho — o documento passa a mostrar as linhas, os totais e os saldos de julho', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);

    await escolherOpcao(seletorDe(container, 'Período'), '2026-07');

    expect(elemento(documento(container), 'h2').textContent).toBe('julho de 2026');
    expect(linhasDaSecao(container, 'Receitas').at(-1)).toBe('Total de receitas54.130,00');
    expect(linhasDaSecao(container, 'Despesas').at(-1)).toBe('Total de despesas51.870,20');
    expect(resultadoDoPeriodo(container).texto).toBe('+ 2.259,80');
    expect(linhasDaSecao(container, 'Saldos por conta').at(-1)).toBe('Saldo consolidado ao fim69.955,50');
  });

  it('julho — o resultado de uma cerimônia que custou mais que arrecadou sai com sinal de menos e em atenção', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);

    await escolherOpcao(seletorDe(container, 'Período'), '2026-07');

    expect(linhasDaSecao(container, 'Resultado por cerimônia')).toEqual([
      `Cerimônia de Julho · 25/07/2026contribuições 9.860,00 · custos 11.420,50${MENOS}1.560,50`,
    ]);
    const valor = secao(container, 'Resultado por cerimônia').querySelector('[data-numeric]') as HTMLElement;
    expect(valor.style.color).toBe(COR_DE_ATENCAO);
  });

  it('período com despesa maior que a receita — o resultado sai com sinal de menos e em atenção', async () => {
    cenario.periodos = (periodos) => {
      const julho = periodos[1]!;
      return [
        ...periodos,
        { chave: '2026-06', rotulo: 'Junho de 2026', dados: { ...julho.dados, despesas: [{ rotulo: 'Obra grande', valor: reais(100000) }] } },
      ];
    };
    const { container } = await montar(<PrestacaoDeContasPage />);

    await escolherOpcao(seletorDe(container, 'Período'), '2026-06');

    expect(resultadoDoPeriodo(container)).toEqual({ texto: `${MENOS}45.870,00`, cor: COR_DE_ATENCAO });
  });

  it('trocar a unidade — muda só o nome no documento, e os números continuam os do consolidado', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);

    await escolherOpcao(seletorDe(container, 'Unidade'), 'MUNAY');

    expect(documento(container).textContent).toContain('Munay · nível resumo');
    expect(linhasDaSecao(container, 'Receitas').at(-1)).toBe('Total de receitas62.480,00');
  });
});

describe('PrestacaoDeContasPage: prestações já geradas', () => {
  it('abre com as três do histórico, da mais recente para a mais antiga, com selo, autoria e hash', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);

    expect(historico(container).map(resumoDaEntrada)).toEqual([
      { titulo: 'Julho de 2026 · Consolidado', selo: 'Resumo', autoria: 'PDF · Marta Neto · 12/08/2026, 19:40', hash: 'a41f9c72e8b0d365' },
      { titulo: 'Julho de 2026 · Consolidado', selo: 'Detalhado', autoria: 'Planilha · Aurio Neto · 10/08/2026, 09:12', hash: '7d2e05ba91c4f8a3' },
      { titulo: 'Junho de 2026 · Munay', selo: 'Resumo', autoria: 'PDF · Marta Neto · 08/07/2026, 21:05', hash: 'c93b64f107ae2d58' },
    ]);
  });

  it('o selo de Resumo é verde e o de Detalhado é pendente', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);

    const corDoSelo = (entrada: HTMLElement) => {
      const selo = entrada.children[1]?.children[0]?.children[1];
      return selo instanceof HTMLElement ? selo.style.color : null;
    };
    expect(historico(container).map(corDoSelo)).toEqual([COR_CONFIRMADA, 'var(--color-pending)', COR_CONFIRMADA]);
  });

  it('Gerar PDF — põe a prestação no topo do histórico, com autor e data de demonstração e o hash sorteado', async () => {
    sortearSempre(0.5);
    const { container } = await montar(<PrestacaoDeContasPage />);

    await clicar(botaoComTexto(container, 'Gerar PDF'));

    expect(historico(container)).toHaveLength(4);
    expect(resumoDaEntrada(historico(container)[0] as HTMLElement)).toEqual({
      titulo: 'Agosto de 2026 · Consolidado',
      selo: 'Resumo',
      autoria: 'PDF · Aurio Neto · 10/09/2026, 14:22',
      hash: '8888888888888888',
    });
  });

  it('Gerar planilha — registra o formato Planilha', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);

    await clicar(botaoComTexto(container, 'Gerar planilha'));

    expect(resumoDaEntrada(historico(container)[0] as HTMLElement).autoria).toBe('Planilha · Aurio Neto · 10/09/2026, 14:22');
  });

  it('o hash usa só os dezesseis dígitos hexadecimais', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);

    await clicar(botaoComTexto(container, 'Gerar PDF'));

    expect(resumoDaEntrada(historico(container)[0] as HTMLElement).hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('o sorteio nos extremos — vai de 0 a f', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);
    sortearSempre(0);
    await clicar(botaoComTexto(container, 'Gerar PDF'));
    avancarUmMilissegundo();
    sortearSempre(0.999);

    await clicar(botaoComTexto(container, 'Gerar PDF'));

    expect(historico(container).slice(0, 2).map((e) => resumoDaEntrada(e).hash)).toEqual(['ffffffffffffffff', '0000000000000000']);
  });

  it('o recado diz o período, o formato em minúscula, o nível e o hash registrado', async () => {
    sortearSempre(0.5);
    const { container } = await montar(<PrestacaoDeContasPage />);

    await clicar(botaoComTexto(container, 'Gerar PDF'));

    expect(recado(container)).toContain(
      'Prestação de Agosto de 2026 gerada em pdf, nível resumo. Ficou registrada com o hash 8888888888888888 — é por ele que dois pedidos se conferem entre si.',
    );
  });

  it('nível detalhado e planilha — o recado e o histórico registram o nível detalhado', async () => {
    sortearSempre(0.5);
    const { container } = await montar(<PrestacaoDeContasPage />);
    await clicar(botaoComTexto(container, 'Detalhado · uso interno'));

    await clicar(botaoComTexto(container, 'Gerar planilha'));

    expect(recado(container)).toContain('Prestação de Agosto de 2026 gerada em planilha, nível detalhado.');
    expect(resumoDaEntrada(historico(container)[0] as HTMLElement).selo).toBe('Detalhado');
  });

  it('julho — a prestação gerada leva o período de julho', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);
    await escolherOpcao(seletorDe(container, 'Período'), '2026-07');

    await clicar(botaoComTexto(container, 'Gerar PDF'));

    expect(resumoDaEntrada(historico(container)[0] as HTMLElement).titulo).toBe('Julho de 2026 · Consolidado');
  });

  it.each<{ chave: string; mostrado: string }>([
    { chave: 'CDD', mostrado: 'CDD' },
    { chave: 'MUNAY', mostrado: 'MUNAY' },
    { chave: 'LOJINHA', mostrado: 'LOJINHA' },
  ])('unidade $chave — o histórico mostra a chave da unidade ($mostrado) e não o rótulo do seletor', async ({ chave, mostrado }) => {
    const { container } = await montar(<PrestacaoDeContasPage />);
    await escolherOpcao(seletorDe(container, 'Unidade'), chave);

    await clicar(botaoComTexto(container, 'Gerar PDF'));

    expect(resumoDaEntrada(historico(container)[0] as HTMLElement).titulo).toBe(`Agosto de 2026 · ${mostrado}`);
  });

  it('duas gerações — a mais nova fica no topo e as anteriores descem', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);
    await clicar(botaoComTexto(container, 'Gerar PDF'));
    avancarUmMilissegundo();
    await clicar(botaoComTexto(container, 'Gerar planilha'));

    expect(historico(container).slice(0, 2).map((e) => resumoDaEntrada(e).autoria?.split(' · ')[0])).toEqual(['Planilha', 'PDF']);
    expect(historico(container)).toHaveLength(5);
  });

  it('o recado pode ser dispensado e continua depois de trocar o nível', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);
    await clicar(botaoComTexto(container, 'Gerar PDF'));

    await clicar(botaoComTexto(container, 'Detalhado · uso interno'));
    expect(recado(container)).toContain('nível resumo');

    await clicar(elemento<HTMLButtonElement>(container, 'button[aria-label="fechar recado"]'));
    expect(recado(container)).toBeNull();
  });
});

describe('PrestacaoDeContasPage: densidade', () => {
  it('escritório — botões de gerar com alvo de escritório e documento com respiro de 30px por 34px', async () => {
    const { container } = await montar(<PrestacaoDeContasPage />);

    expect(botaoComTexto(container, 'Gerar PDF').style.minHeight).toBe('var(--target-office)');
    expect(documento(container).style.padding).toBe('30px 34px');
  });

  it('campo — botões de gerar com alvo de campo e documento com respiro de 20px por 18px', async () => {
    fixarDensidade(true);

    const { container } = await montar(<PrestacaoDeContasPage />);

    expect(botaoComTexto(container, 'Gerar PDF').style.minHeight).toBe('var(--target-field)');
    expect(documento(container).style.padding).toBe('20px 18px');
  });

  it.each<{ campo: boolean; largura: string }>([
    { campo: false, largura: '96px' },
    { campo: true, largura: '78px' },
  ])('com campo=$campo — as colunas início e fim dos saldos têm $largura', async ({ campo, largura }) => {
    fixarDensidade(campo);

    const { container } = await montar(<PrestacaoDeContasPage />);

    const coluna = (texto: string) => todos<HTMLSpanElement>(secao(container, 'Saldos por conta'), 'span').find((s) => s.textContent === texto);
    expect([coluna('início')?.style.width, coluna('fim')?.style.width]).toEqual([largura, largura]);
  });

  it('campo — o seletor de nível usa os botões lado a lado, sem quebra', async () => {
    fixarDensidade(true);

    const { container } = await montar(<PrestacaoDeContasPage />);

    expect(botaoComTexto(container, 'Resumo · sem nomes').parentElement?.style.flexWrap).toBe('nowrap');
  });
});
