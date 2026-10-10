import { act } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { Conta, ItemNaFila, LancamentoNaLista } from '@cdd/contracts';
import { reais } from '@cdd/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { botaoComTexto, clicar, desmontarTudo, elemento, montar, todos } from '@/testes/montagem';
import { FechamentoPage } from './FechamentoPage';

const cenario = vi.hoisted(() => {
  const identidade = <T,>(itens: readonly T[]): readonly T[] => itens;
  return {
    fila: identidade<ItemNaFila>,
    contas: identidade<Conta>,
    lancamentos: identidade<LancamentoNaLista>,
  };
});

vi.mock('@/mocks/verificacao', async (importarOriginal) => {
  const original = await importarOriginal<{ filaDeVerificacaoInicial: readonly ItemNaFila[] }>();
  return {
    ...original,
    get filaDeVerificacaoInicial() {
      return cenario.fila(original.filaDeVerificacaoInicial);
    },
  };
});

vi.mock('@/mocks/financeiro', async (importarOriginal) => {
  const original = await importarOriginal<{ contas: readonly Conta[] }>();
  return {
    ...original,
    get contas() {
      return cenario.contas(original.contas);
    },
  };
});

vi.mock('@/mocks/lancamentos', async (importarOriginal) => {
  const original = await importarOriginal<{ lancamentos: readonly LancamentoNaLista[] }>();
  return {
    ...original,
    get lancamentos() {
      return cenario.lancamentos(original.lancamentos);
    },
  };
});

const COR_PENDENTE = 'var(--color-pending)';
const COR_CONFIRMADA = 'var(--color-confirmed)';
const COR_DE_ATENCAO = 'var(--color-attention)';
const COR_DE_MARCA = 'var(--color-royal-deep)';
const MENOS = '− ';

const TITULO_DA_FILA = 'Fila de verificação zerada';
const TITULO_DA_CONCILIACAO = 'Contas conciliadas com o extrato';
const TITULO_DA_CONTAGEM = 'Contagem do caixa em espécie';
const TITULO_DOS_COMPROVANTES = 'Comprovantes anexados';
const TITULO_DAS_TRANSFERENCIAS = 'Transferências com os dois lados';

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
  cenario.fila = (f) => f;
  cenario.contas = (c) => c;
  cenario.lancamentos = (l) => l;
});

afterEach(async () => {
  await desmontarTudo();
  vi.unstubAllGlobals();
});

function LocalAtual() {
  return <output data-local>{useLocation().pathname}</output>;
}

const montarFechamento = () =>
  montar(
    <MemoryRouter initialEntries={['/fechamento']}>
      <FechamentoPage />
      <LocalAtual />
    </MemoryRouter>,
  );

const localAtual = (container: HTMLElement) => elemento(container, '[data-local]').textContent;

const itemDoChecklist = (container: HTMLElement, titulo: string) => {
  const rotulo = todos<HTMLSpanElement>(container, 'span').find((s) => s.textContent === titulo);
  const item = rotulo?.parentElement?.parentElement;
  if (!item) throw new Error(`item do checklist não encontrado: ${titulo}`);
  const [, textos, selo, acao] = Array.from(item.children);
  return {
    detalhe: textos?.children[1]?.textContent,
    selo: selo?.textContent,
    acao: acao?.textContent ?? null,
    borda: item.style.borderLeft,
    botao: acao as HTMLButtonElement | undefined,
  };
};

const semAlerta = (conta: Conta): Conta => ({ ...conta, alerta: null });

const aConferir = (lancamento: LancamentoNaLista): LancamentoNaLista => ({ ...lancamento, status: 'A_CONFERIR' });

const liberarFila = () => {
  cenario.fila = () => [];
};
const conciliarContas = () => {
  cenario.contas = (contas) => contas.map((c) => ({ ...c, conciliacao: 'CONCILIADA' as const }));
};
const contarCaixa = () => {
  const anterior = cenario.contas;
  cenario.contas = (contas) => anterior(contas).map((c) => (c.tipo === 'DINHEIRO' ? semAlerta(c) : c));
};
const anexarTudo = () => {
  cenario.lancamentos = (lancamentos) => lancamentos.map((l) => ({ ...l, comprovante: l.comprovante ?? 'anexo.pdf' }));
};
const liberarBloqueios = () => {
  liberarFila();
  conciliarContas();
  contarCaixa();
};

const lancamentoDoMes = (base: LancamentoNaLista, mudancas: Partial<LancamentoNaLista>): LancamentoNaLista => ({
  ...base,
  competencia: '2026-08' as LancamentoNaLista['competencia'],
  comprovante: 'anexo.pdf',
  ...mudancas,
});

const resumoDoMes = (container: HTMLElement) =>
  ['Entradas', 'Saídas', 'Resultado'].map((rotulo) => {
    const nome = todos<HTMLSpanElement>(container, 'span').find((s) => s.textContent === rotulo);
    return nome?.nextElementSibling?.textContent;
  });

const estadoDoPeriodo = (container: HTMLElement) => {
  const rotulo = todos<HTMLSpanElement>(container, 'span').find((s) => s.textContent?.startsWith('Competência '));
  const textos = Array.from(rotulo?.parentElement?.children ?? []);
  return { competencia: textos[0]?.textContent, situacao: textos[1]?.textContent, orientacao: textos[2]?.textContent, cor: (textos[1] as HTMLElement | undefined)?.style.color };
};

const cartaoDeAcao = (container: HTMLElement) => {
  const titulo = todos<HTMLSpanElement>(container, 'span').find((s) =>
    ['Período fechado', 'Fechamento bloqueado', 'Tudo pronto'].includes(s.textContent ?? ''),
  );
  if (!titulo?.parentElement) throw new Error('cartão de ação não encontrado');
  return { titulo: titulo.textContent, explicacao: titulo.nextElementSibling?.textContent, cartao: titulo.parentElement };
};

const botaoDeFechar = (container: HTMLElement) =>
  todos<HTMLButtonElement>(container, 'button').find((b) => b.textContent?.startsWith('Fechar ')) as HTMLButtonElement;

const caixaDoMotivo = (container: HTMLElement) => elemento<HTMLTextAreaElement>(container, 'textarea[aria-label="Motivo da reabertura"]');

async function digitarMotivo(container: HTMLElement, texto: string) {
  const definirValor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  await act(async () => {
    definirValor?.call(caixaDoMotivo(container), texto);
    caixaDoMotivo(container).dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function fecharOPeriodo(container: HTMLElement) {
  await clicar(botaoDeFechar(container));
}

describe('FechamentoPage: cabeçalho', () => {
  it('escritório — mostra o código com o nome, o título e o subtítulo', async () => {
    const { container } = await montarFechamento();

    const cabecalho = elemento(container, 'header');
    expect(cabecalho.textContent).toContain('F-07 · Fechamento');
    expect(elemento(cabecalho, 'h1').textContent).toBe('Fechamento');
    expect(cabecalho.textContent).toContain('Confere o que falta, registra o saldo e trava o período · CDD');
  });

  it('campo — mostra só o código e o título, sem subtítulo', async () => {
    fixarDensidade(true);

    const { container } = await montarFechamento();

    expect(elemento(container, 'header').textContent).toBe('F-07Fechamento');
  });
});

describe('FechamentoPage: checklist com os dados de demonstração de agosto de 2026', () => {
  it('fila de verificação — com lançamentos esperando, bloqueia e leva à fila', async () => {
    const { container } = await montarFechamento();

    const item = itemDoChecklist(container, TITULO_DA_FILA);

    expect([item.detalhe, item.selo, item.acao, item.borda]).toEqual([
      '12 lançamentos ainda esperando conferência',
      'Bloqueia',
      'Ir para a fila',
      `3px solid ${COR_PENDENTE}`,
    ]);
  });

  it('conciliação — nomeia as contas ativas sem conciliação e bloqueia', async () => {
    const { container } = await montarFechamento();

    const item = itemDoChecklist(container, TITULO_DA_CONCILIACAO);

    expect([item.detalhe, item.selo, item.acao]).toEqual([
      'Espécie e Nubank Paty sem conciliação de agosto',
      'Bloqueia',
      'Abrir contas',
    ]);
  });

  it('contagem do caixa — com alerta na conta de espécie, bloqueia', async () => {
    const { container } = await montarFechamento();

    const item = itemDoChecklist(container, TITULO_DA_CONTAGEM);

    expect([item.detalhe, item.selo, item.acao]).toEqual(['última contagem foi em 31/07', 'Bloqueia', 'Registrar contagem']);
  });

  it('comprovantes — lançamentos do mês sem anexo são só aviso, em atenção, e levam aos lançamentos', async () => {
    const { container } = await montarFechamento();

    const item = itemDoChecklist(container, TITULO_DOS_COMPROVANTES);

    expect([item.detalhe, item.selo, item.acao, item.borda]).toEqual([
      '5 lançamentos sem anexo — não impede o fechamento, mas fica registrado assim',
      'Só aviso',
      'Ver lançamentos',
      `3px solid ${COR_DE_ATENCAO}`,
    ]);
  });

  it('transferências — as duas do mês têm origem e destino diferentes: resolvido e sem botão', async () => {
    const { container } = await montarFechamento();

    const item = itemDoChecklist(container, TITULO_DAS_TRANSFERENCIAS);

    expect([item.detalhe, item.selo, item.acao, item.borda]).toEqual([
      '2 transferências do mês batem origem e destino',
      'Resolvido',
      null,
      `3px solid ${COR_CONFIRMADA}`,
    ]);
  });

  it('cabeçalho do checklist — conta os itens que bloqueiam', async () => {
    const { container } = await montarFechamento();

    expect(container.textContent).toContain('3 itens bloqueiam o fechamento');
  });

  it.each<{ nome: string; ir: string; rota: string; titulo: string }>([
    { nome: 'Ir para a fila', ir: 'Ir para a fila', rota: '/verificacao-de-lote', titulo: TITULO_DA_FILA },
    { nome: 'Abrir contas', ir: 'Abrir contas', rota: '/contas-e-fundo', titulo: TITULO_DA_CONCILIACAO },
    { nome: 'Registrar contagem', ir: 'Registrar contagem', rota: '/contas-e-fundo', titulo: TITULO_DA_CONTAGEM },
    { nome: 'Ver lançamentos', ir: 'Ver lançamentos', rota: '/lancamentos', titulo: TITULO_DOS_COMPROVANTES },
  ])('botão $nome — leva para $rota', async ({ rota, titulo }) => {
    const { container } = await montarFechamento();

    await clicar(itemDoChecklist(container, titulo).botao as HTMLButtonElement);

    expect(localAtual(container)).toBe(rota);
  });
});

describe('FechamentoPage: bloqueios individuais', () => {
  it('fila com um só lançamento — usa o singular', async () => {
    cenario.fila = (fila) => fila.slice(0, 1);
    const { container } = await montarFechamento();

    expect(itemDoChecklist(container, TITULO_DA_FILA).detalhe).toBe('1 lançamento ainda esperando conferência');
  });

  it('fila vazia — resolvida, com a frase de nada pendente e sem botão', async () => {
    liberarFila();
    const { container } = await montarFechamento();

    const item = itemDoChecklist(container, TITULO_DA_FILA);

    expect([item.detalhe, item.selo, item.acao]).toEqual(['nada pendente na fila', 'Resolvido', null]);
  });

  it('conciliação — contas todas conciliadas contam as ativas e citam o dia 31/08', async () => {
    conciliarContas();
    const { container } = await montarFechamento();

    const item = itemDoChecklist(container, TITULO_DA_CONCILIACAO);

    expect([item.detalhe, item.selo]).toEqual(['4 contas conciliadas em 31/08', 'Resolvido']);
  });

  it('conciliação — três contas pendentes são ligadas por "e" entre todas', async () => {
    cenario.contas = (contas) => contas.map((c) => ({ ...c, conciliacao: 'PENDENTE' as const }));
    const { container } = await montarFechamento();

    expect(itemDoChecklist(container, TITULO_DA_CONCILIACAO).detalhe).toBe(
      'Cora PJ e Espécie e Nubank Paty e Itaú Munay sem conciliação de agosto',
    );
  });

  it('conciliação — conta inativa pendente não bloqueia nem entra na contagem', async () => {
    cenario.contas = (contas) =>
      contas.map((c) => ({
        ...c,
        conciliacao: c.nome === 'Itaú Munay' ? ('PENDENTE' as const) : ('CONCILIADA' as const),
        ativa: c.nome !== 'Itaú Munay',
      }));
    const { container } = await montarFechamento();

    const item = itemDoChecklist(container, TITULO_DA_CONCILIACAO);

    expect([item.detalhe, item.selo]).toEqual(['3 contas conciliadas em 31/08', 'Resolvido']);
  });

  it('contagem do caixa — conta de espécie sem alerta é resolvida e nomeia quem cuida do caixa', async () => {
    contarCaixa();
    const { container } = await montarFechamento();

    const item = itemDoChecklist(container, TITULO_DA_CONTAGEM);

    expect([item.detalhe, item.selo, item.acao]).toEqual(['contada por Chico Aguiar, sem diferença', 'Resolvido', null]);
  });

  it('contagem do caixa — sem nenhuma conta de espécie ativa, continua bloqueada', async () => {
    cenario.contas = (contas) => contas.map((c) => (c.tipo === 'DINHEIRO' ? { ...c, ativa: false, alerta: null } : c));
    const { container } = await montarFechamento();

    const item = itemDoChecklist(container, TITULO_DA_CONTAGEM);

    expect([item.detalhe, item.selo]).toEqual(['última contagem foi em 31/07', 'Bloqueia']);
  });

  it('comprovantes — com tudo anexado, o item fica resolvido, mas a frase continua dizendo que há lançamentos sem anexo', async () => {
    anexarTudo();
    const { container } = await montarFechamento();

    const item = itemDoChecklist(container, TITULO_DOS_COMPROVANTES);

    expect([item.detalhe, item.selo, item.acao]).toEqual([
      '0 lançamentos sem anexo — não impede o fechamento, mas fica registrado assim',
      'Resolvido',
      null,
    ]);
  });

  it('comprovantes — só conta os lançamentos da competência de agosto', async () => {
    cenario.lancamentos = (lancamentos) => {
      const base = lancamentos[0] as LancamentoNaLista;
      return [
        lancamentoDoMes(base, { comprovante: null }),
        lancamentoDoMes(base, { comprovante: null, competencia: '2026-07' as LancamentoNaLista['competencia'] }),
      ];
    };
    const { container } = await montarFechamento();

    expect(itemDoChecklist(container, TITULO_DOS_COMPROVANTES).detalhe).toContain('1 lançamento sem anexo');
  });

  it('transferência sem conta de destino — bloqueia, no singular, e leva aos lançamentos', async () => {
    cenario.lancamentos = (lancamentos) => [
      ...lancamentos,
      lancamentoDoMes(lancamentos[0] as LancamentoNaLista, { tipo: 'TRANSFERENCIA', contaDestino: null }),
    ];
    const { container } = await montarFechamento();

    const item = itemDoChecklist(container, TITULO_DAS_TRANSFERENCIAS);

    expect([item.detalhe, item.selo, item.acao]).toEqual([
      '1 transferência sem conta de destino, ou com a mesma conta nos dois lados',
      'Bloqueia',
      'Ver lançamentos',
    ]);
  });

  it('transferência com a mesma conta nos dois lados — também bloqueia, e duas usam o plural', async () => {
    cenario.lancamentos = (lancamentos) => [
      ...lancamentos,
      lancamentoDoMes(lancamentos[0] as LancamentoNaLista, { tipo: 'TRANSFERENCIA', conta: 'Cora PJ', contaDestino: 'Cora PJ' }),
      lancamentoDoMes(lancamentos[0] as LancamentoNaLista, { tipo: 'TRANSFERENCIA', conta: 'Espécie', contaDestino: null }),
    ];
    const { container } = await montarFechamento();

    expect(itemDoChecklist(container, TITULO_DAS_TRANSFERENCIAS).detalhe).toBe(
      '2 transferências sem conta de destino, ou com a mesma conta nos dois lados',
    );
  });

  it('um único bloqueio — usa o singular na situação, no cabeçalho do checklist e no motivo do botão', async () => {
    liberarFila();
    conciliarContas();
    const { container } = await montarFechamento();

    expect(estadoDoPeriodo(container).situacao).toBe('Aberto, com 1 pendência');
    expect(container.textContent).toContain('1 item bloqueia o fechamento');
    expect(container.textContent).toContain('Resolva 1 pendência antes de fechar.');
  });
});

describe('FechamentoPage: situação do período', () => {
  it('com bloqueios — mostra Aberto com a contagem, em tom pendente, e pede para resolver', async () => {
    const { container } = await montarFechamento();

    expect(estadoDoPeriodo(container)).toEqual({
      competencia: 'Competência 08/2026 · CDD',
      situacao: 'Aberto, com 3 pendências',
      orientacao: 'Resolva as pendências abaixo para liberar o fechamento.',
      cor: COR_PENDENTE,
    });
  });

  it('sem bloqueios — mostra Pronto para fechar, em tom de marca', async () => {
    liberarBloqueios();
    const { container } = await montarFechamento();

    expect(estadoDoPeriodo(container)).toEqual({
      competencia: 'Competência 08/2026 · CDD',
      situacao: 'Pronto para fechar',
      orientacao: 'Nada bloqueia o fechamento. Depois de fechado, correção só reabrindo o período.',
      cor: COR_DE_MARCA,
    });
  });

  it('sem bloqueios e com aviso — o checklist diz tudo resolvido e conta o aviso que não bloqueia', async () => {
    liberarBloqueios();
    const { container } = await montarFechamento();

    expect(container.textContent).toContain('tudo resolvido · 1 aviso que não bloqueia');
  });

  it('sem bloqueio e sem aviso — o checklist diz apenas tudo resolvido', async () => {
    liberarBloqueios();
    anexarTudo();
    const { container } = await montarFechamento();

    expect(container.textContent).toContain('tudo resolvido');
    expect(container.textContent).not.toContain('aviso que não bloqueia');
  });
});

describe('FechamentoPage: totais do mês, com e sem estorno', () => {
  it('dados de demonstração — soma as entradas, as saídas sem o estornado e o resultado', async () => {
    const { container } = await montarFechamento();

    expect(resumoDoMes(container)).toEqual(['4.425,00', '3.038,35', '1.386,65']);
  });

  it('entrada estornada — continua contando nas entradas, ao contrário da saída estornada', async () => {
    cenario.lancamentos = (lancamentos) => {
      const base = lancamentos[0] as LancamentoNaLista;
      return [
        lancamentoDoMes(base, { tipo: 'ENTRADA', valor: reais(100), status: 'CONFIRMADO' }),
        lancamentoDoMes(base, { tipo: 'ENTRADA', valor: reais(50), status: 'ESTORNADO' }),
        lancamentoDoMes(base, { tipo: 'SAIDA', valor: reais(30), status: 'CONFIRMADO' }),
        lancamentoDoMes(base, { tipo: 'SAIDA', valor: reais(20), status: 'ESTORNADO' }),
      ];
    };
    const { container } = await montarFechamento();

    expect(resumoDoMes(container)).toEqual(['150,00', '30,00', '120,00']);
  });

  it('transferência e lançamento de outra competência — ficam fora de entradas e saídas', async () => {
    cenario.lancamentos = (lancamentos) => {
      const base = lancamentos[0] as LancamentoNaLista;
      return [
        lancamentoDoMes(base, { tipo: 'TRANSFERENCIA', valor: reais(900) }),
        lancamentoDoMes(base, { tipo: 'ENTRADA', valor: reais(70), competencia: '2026-07' as LancamentoNaLista['competencia'] }),
        lancamentoDoMes(base, { tipo: 'SAIDA', valor: reais(10) }),
      ];
    };
    const { container } = await montarFechamento();

    expect(resumoDoMes(container)).toEqual(['0,00', '10,00', '-10,00']);
  });

  it('saldo por conta — lista as contas ativas com o saldo e o total', async () => {
    const { container } = await montarFechamento();

    const texto = container.textContent ?? '';
    expect(texto).toContain('Saldo por conta que fica registrado no fechamento');
    expect(texto).toContain('Cora PJ41.902,10Espécie3.180,40Nubank Paty1.240,55Itaú Munay37.994,85');
    expect(texto).toContain('Total84.317,90');
  });

  it('saldo por conta — conta inativa fica fora da lista e do total', async () => {
    cenario.contas = (contas) => contas.map((c) => ({ ...c, ativa: c.nome !== 'Itaú Munay' }));
    const { container } = await montarFechamento();

    expect(container.textContent).not.toContain('37.994,85');
    expect(container.textContent).toContain('Total46.323,05');
  });
});

describe('FechamentoPage: o que o fechamento não confere hoje', () => {
  it('lançamentos a conferir no mês — não bloqueiam: só a fila de verificação conta', async () => {
    liberarBloqueios();
    cenario.lancamentos = (lancamentos) => lancamentos.map(aConferir);
    const { container } = await montarFechamento();

    expect(estadoDoPeriodo(container).situacao).toBe('Pronto para fechar');
    expect(botaoDeFechar(container).disabled).toBe(false);
  });

  it('período fechado — não mostra o hash do conjunto de lançamentos', async () => {
    liberarBloqueios();
    const { container } = await montarFechamento();

    await fecharOPeriodo(container);

    expect(container.textContent).not.toMatch(/hash/i);
  });

  it('o aviso de fechamento não é anunciado como status: não tem papel de região viva', async () => {
    liberarBloqueios();
    const { container } = await montarFechamento();

    await fecharOPeriodo(container);

    expect(container.textContent).toContain('agosto de 2026 fechado.');
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
});

describe('FechamentoPage: fechar o período', () => {
  it('com bloqueios — o botão de fechar fica desativado e diz quantas pendências faltam', async () => {
    const { container } = await montarFechamento();

    const botao = botaoDeFechar(container);

    expect(botao.textContent).toBe('Fechar agosto de 2026');
    expect(botao.disabled).toBe(true);
    expect(botao.title).toBe('Resolva 3 pendências antes de fechar.');
    expect(container.textContent).toContain('Resolva 3 pendências antes de fechar.');
  });

  it('com bloqueios — o cartão de ação diz Fechamento bloqueado e lista os itens que bloqueiam', async () => {
    const { container } = await montarFechamento();

    expect(cartaoDeAcao(container)).toMatchObject({
      titulo: 'Fechamento bloqueado',
      explicacao: 'Fila de verificação zerada · Contas conciliadas com o extrato · Contagem do caixa em espécie',
    });
  });

  it('clicar no botão desativado — não fecha o período', async () => {
    const { container } = await montarFechamento();

    await clicar(botaoDeFechar(container));

    expect(estadoDoPeriodo(container).situacao).toBe('Aberto, com 3 pendências');
  });

  it('sem bloqueios — o botão fica ativo, sem motivo, e o cartão diz Tudo pronto', async () => {
    liberarBloqueios();
    const { container } = await montarFechamento();

    expect(botaoDeFechar(container).disabled).toBe(false);
    expect(botaoDeFechar(container).title).toBe('');
    expect(cartaoDeAcao(container)).toMatchObject({
      titulo: 'Tudo pronto',
      explicacao: 'Ao fechar, os saldos acima viram o registro oficial de agosto.',
    });
  });

  it('Fechar — o período passa a Fechado, em verde, com quem fechou e a regra do bloqueio', async () => {
    liberarBloqueios();
    const { container } = await montarFechamento();

    await fecharOPeriodo(container);

    expect(estadoDoPeriodo(container)).toMatchObject({
      situacao: 'Fechado',
      orientacao: 'Fechado por Aurio Neto em 01/09/2026, 09:20. Lançamentos com data de agosto ficam bloqueados.',
      cor: COR_CONFIRMADA,
    });
  });

  it('Fechar — avisa o fechamento com o mês por extenso em minúscula, e o aviso pode ser dispensado', async () => {
    liberarBloqueios();
    const { container } = await montarFechamento();

    await fecharOPeriodo(container);

    expect(container.textContent).toContain('agosto de 2026 fechado. Novos lançamentos no período só depois de reabrir.');
    await clicar(elemento<HTMLButtonElement>(container, 'button[aria-label="fechar aviso"]'));
    expect(container.textContent).not.toContain('fechado. Novos lançamentos');
  });

  it('Fechar — troca o cartão de ação: sai o botão de fechar e entram Ata em PDF e Reabrir período', async () => {
    liberarBloqueios();
    const { container } = await montarFechamento();

    await fecharOPeriodo(container);

    expect(cartaoDeAcao(container)).toMatchObject({
      titulo: 'Período fechado',
      explicacao: 'A ata guarda os saldos, o resultado e quem assinou o fechamento.',
    });
    expect(todos(container, 'button').filter((b) => b.textContent?.startsWith('Fechar '))).toHaveLength(0);
    expect(botaoComTexto(container, 'Ata em PDF')).toBeDefined();
    expect(botaoComTexto(container, 'Reabrir período')).toBeDefined();
  });

  it('Ata em PDF — avisa a geração com o texto fixo de agosto de 2026', async () => {
    liberarBloqueios();
    const { container } = await montarFechamento();
    await fecharOPeriodo(container);

    await clicar(botaoComTexto(container, 'Ata em PDF'));

    expect(container.textContent).toContain('Ata de fechamento de agosto de 2026 gerada em PDF.');
  });

  it('período fechado — o checklist continua à mostra, com os itens resolvidos', async () => {
    liberarBloqueios();
    const { container } = await montarFechamento();

    await fecharOPeriodo(container);

    expect(itemDoChecklist(container, TITULO_DA_FILA).selo).toBe('Resolvido');
  });
});

describe('FechamentoPage: reabrir o período', () => {
  async function montarFechado() {
    liberarBloqueios();
    const montado = await montarFechamento();
    await fecharOPeriodo(montado.container);
    return montado;
  }

  it('sem consultar a sessão — qualquer pessoa vê o botão Reabrir período', async () => {
    const { container } = await montarFechado();

    expect(botaoComTexto(container, 'Reabrir período').disabled).toBe(false);
  });

  it('Reabrir período — abre a pergunta com a caixa do motivo e os botões Reabrir e Cancelar', async () => {
    const { container } = await montarFechado();

    await clicar(botaoComTexto(container, 'Reabrir período'));

    expect(container.textContent).toContain('Por que este período precisa ser reaberto?');
    expect(caixaDoMotivo(container).placeholder).toBe('o motivo fica no histórico do período, de forma permanente');
    expect(caixaDoMotivo(container).rows).toBe(3);
    expect(caixaDoMotivo(container).hasAttribute('maxlength')).toBe(false);
  });

  it('sem motivo — Reabrir fica desativado e explica que sem motivo não se registra', async () => {
    const { container } = await montarFechado();
    await clicar(botaoComTexto(container, 'Reabrir período'));

    const reabrir = botaoComTexto(container, 'Reabrir');

    expect(reabrir.disabled).toBe(true);
    expect(reabrir.title).toBe('Sem motivo, a reabertura não é registrável.');
  });

  it('motivo só de espaços — continua sem poder reabrir', async () => {
    const { container } = await montarFechado();
    await clicar(botaoComTexto(container, 'Reabrir período'));

    await digitarMotivo(container, '    ');

    expect(botaoComTexto(container, 'Reabrir').disabled).toBe(true);
  });

  it('motivo escrito — libera o botão Reabrir e some a explicação', async () => {
    const { container } = await montarFechado();
    await clicar(botaoComTexto(container, 'Reabrir período'));

    await digitarMotivo(container, 'nota fiscal lançada em agosto');

    expect(botaoComTexto(container, 'Reabrir').disabled).toBe(false);
    expect(container.textContent).not.toContain('Sem motivo, a reabertura não é registrável.');
  });

  it('Reabrir — volta ao período aberto e o aviso cita o motivo sem os espaços das pontas', async () => {
    const { container } = await montarFechado();
    await clicar(botaoComTexto(container, 'Reabrir período'));
    await digitarMotivo(container, '  nota fiscal lançada em agosto  ');

    await clicar(botaoComTexto(container, 'Reabrir'));

    expect(estadoDoPeriodo(container).situacao).toBe('Pronto para fechar');
    expect(container.textContent).toContain('Agosto reaberto por Aurio Neto. O motivo ficou no histórico do período: nota fiscal lançada em agosto');
    expect(container.textContent).not.toContain('Por que este período precisa ser reaberto?');
  });

  it('Reabrir — o botão de fechar volta e o de Reabrir período some', async () => {
    const { container } = await montarFechado();
    await clicar(botaoComTexto(container, 'Reabrir período'));
    await digitarMotivo(container, 'ajuste');

    await clicar(botaoComTexto(container, 'Reabrir'));

    expect(botaoDeFechar(container).textContent).toBe('Fechar agosto de 2026');
    expect(todos(container, 'button').filter((b) => b.textContent === 'Reabrir período')).toHaveLength(0);
  });

  it('Reabrir — o motivo é apagado: ao fechar e reabrir de novo, a caixa começa vazia', async () => {
    const { container } = await montarFechado();
    await clicar(botaoComTexto(container, 'Reabrir período'));
    await digitarMotivo(container, 'ajuste');
    await clicar(botaoComTexto(container, 'Reabrir'));
    await fecharOPeriodo(container);

    await clicar(botaoComTexto(container, 'Reabrir período'));

    expect(caixaDoMotivo(container).value).toBe('');
  });

  it('Cancelar — esconde a pergunta e mantém o período fechado, sem apagar o que foi escrito', async () => {
    const { container } = await montarFechado();
    await clicar(botaoComTexto(container, 'Reabrir período'));
    await digitarMotivo(container, 'ajuste');

    await clicar(botaoComTexto(container, 'Cancelar'));

    expect(container.textContent).not.toContain('Por que este período precisa ser reaberto?');
    expect(estadoDoPeriodo(container).situacao).toBe('Fechado');

    await clicar(botaoComTexto(container, 'Reabrir período'));

    expect(caixaDoMotivo(container).value).toBe('ajuste');
  });
});

describe('FechamentoPage: meses anteriores', () => {
  it('lista os quatro meses fechados, com quem fechou, o selo e o resultado com sinal', async () => {
    const { container } = await montarFechamento();

    const texto = container.textContent ?? '';
    expect(texto).toContain('Julho de 2026fechado por Aurio Neto em 03/08 · reaberto uma vezFechado+ 4.180,22');
    expect(texto).toContain('Junho de 2026fechado por Lucia Prado em 02/07Fechado+ 2.905,10');
    expect(texto).toContain(`Maio de 2026fechado por Aurio Neto em 04/06Fechado${MENOS}1.244,80`);
    expect(texto).toContain('Abril de 2026fechado por Aurio Neto em 05/05Fechado+ 6.512,45');
  });

  it('cada mês anterior leva o selo Fechado em verde', async () => {
    const { container } = await montarFechamento();

    const selos = todos<HTMLSpanElement>(container, 'span').filter((s) => s.textContent === 'Fechado');

    expect(selos.map((s) => s.style.color)).toEqual([COR_CONFIRMADA, COR_CONFIRMADA, COR_CONFIRMADA, COR_CONFIRMADA]);
  });

  it('o resultado de maio, negativo, fica em atenção e os positivos em verde', async () => {
    const { container } = await montarFechamento();

    const corDoResultado = (mes: string) => {
      const rotulo = todos<HTMLSpanElement>(container, 'span').find((s) => s.textContent === mes);
      const resultado = rotulo?.parentElement?.parentElement?.lastElementChild;
      return resultado instanceof HTMLElement ? resultado.style.color : null;
    };
    expect(['Julho de 2026', 'Maio de 2026'].map(corDoResultado)).toEqual([COR_CONFIRMADA, COR_DE_ATENCAO]);
  });
});

describe('FechamentoPage: densidade', () => {
  it('escritório — o botão de fechar tem a largura do conteúdo', async () => {
    liberarBloqueios();
    const { container } = await montarFechamento();

    expect(botaoDeFechar(container).style.width).toBe('');
    expect(botaoDeFechar(container).style.minHeight).toBe('var(--target-office)');
  });

  it('campo — o botão de fechar ocupa a largura toda e usa o alvo de toque de campo', async () => {
    fixarDensidade(true);
    liberarBloqueios();
    const { container } = await montarFechamento();

    expect(botaoDeFechar(container).style.width).toBe('100%');
    expect(botaoDeFechar(container).style.minHeight).toBe('var(--target-field)');
  });

  it('campo — cada item do checklist empilha o texto, o selo e a ação em coluna', async () => {
    fixarDensidade(true);
    const { container } = await montarFechamento();

    const rotulo = todos<HTMLSpanElement>(container, 'span').find((s) => s.textContent === TITULO_DA_FILA);
    expect(rotulo?.parentElement?.parentElement?.style.flexDirection).toBe('column');
  });
});
