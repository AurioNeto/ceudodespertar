import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { botaoComTexto, clicar, desmontarTudo, elemento, folhaComTexto, montar, todos } from '@/testes/montagem';
import { PeriodLock, type PeriodLockClosedProps, type PeriodLockReopenableProps } from './PeriodLock';

afterEach(desmontarTudo);

const TITULO = 'Período 07/2026 está fechado';
const RAZAO = 'O mês foi fechado em 05/08 e o relatório já foi assinado.';
const AVISO_DE_QUEM_NAO_REABRE = 'Reabrir exige um administrador, e o motivo fica registrado de forma permanente.';
const ACAO_DE_REABRIR = 'Reabrir período';
const ROTULO_DO_MOTIVO = 'Motivo da reabertura';
const AVISO_DE_MOTIVO_OBRIGATORIO = 'Sem motivo, a reabertura não é registrável.';
const MOTIVO = 'O relatório de julho saiu com a conta errada.';

type ComoFechado = Partial<PeriodLockClosedProps>;
type ComoReabrivel = Partial<Omit<PeriodLockReopenableProps, 'canReopen'>>;

const bloqueio = (props: ComoFechado = {}) => (
  <PeriodLock title={TITULO} reason={RAZAO} reopenDeniedNote={AVISO_DE_QUEM_NAO_REABRE} {...props} />
);

const bloqueioReabrivel = (props: ComoReabrivel = {}) => (
  <PeriodLock
    title={TITULO}
    reason={RAZAO}
    canReopen
    reopenLabel={ACAO_DE_REABRIR}
    reopenReasonLabel={ROTULO_DO_MOTIVO}
    reopenReasonRequiredNote={AVISO_DE_MOTIVO_OBRIGATORIO}
    {...props}
  />
);

const comPermissaoCalculada = (canReopen: boolean, onReopen?: (reopenReason: string) => void) => (
  <PeriodLock
    title={TITULO}
    reason={RAZAO}
    canReopen={canReopen}
    reopenDeniedNote={AVISO_DE_QUEM_NAO_REABRE}
    reopenLabel={ACAO_DE_REABRIR}
    reopenReasonLabel={ROTULO_DO_MOTIVO}
    reopenReasonRequiredNote={AVISO_DE_MOTIVO_OBRIGATORIO}
    onReopen={onReopen}
  />
);

const caixaDoMotivo = (origem: ParentNode) => elemento<HTMLTextAreaElement>(origem, 'textarea');
const botaoDeReabrir = (origem: ParentNode) => botaoComTexto(origem, ACAO_DE_REABRIR);

async function digitarNoMotivo(caixa: HTMLTextAreaElement, valor: string) {
  const definirValor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  await act(async () => {
    definirValor?.call(caixa, valor);
    caixa.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('PeriodLock: o bloqueio', () => {
  it('mostra o título recebido', async () => {
    const { container } = await montar(bloqueio());
    expect(folhaComTexto(container, 'div', TITULO)).toBeTruthy();
  });

  it('mostra a razão recebida', async () => {
    const { container } = await montar(bloqueio());
    expect(folhaComTexto(container, 'p', RAZAO)).toBeTruthy();
  });

  it('com razão vazia, mantém o título e deixa o parágrafo da razão vazio', async () => {
    const { container } = await montar(bloqueio({ reason: '' }));
    expect(folhaComTexto(container, 'div', TITULO)).toBeTruthy();
    expect(folhaComTexto(container, 'p', '')).toBeTruthy();
  });

  it('o título sai como foi recebido, sem palavra do componente em volta', async () => {
    const { container } = await montar(bloqueio({ title: 'Julho' }));
    expect(folhaComTexto(container, 'div', 'Julho')).toBeTruthy();
  });

  it('o período fechado não traz nenhum controle de edição', async () => {
    const { container } = await montar(bloqueio());
    expect(todos(container, 'input, textarea, select')).toHaveLength(0);
  });
});

describe('PeriodLock: nenhuma palavra de negócio dentro do componente', () => {
  const ATRIBUTOS_QUE_SE_LEEM = [
    'placeholder',
    'title',
    'alt',
    'aria-label',
    'aria-description',
    'aria-roledescription',
    'aria-valuetext',
    'aria-placeholder',
  ] as const;

  const valoresDeAtributoQueSeLe = (container: HTMLElement) =>
    todos(container, '*')
      .flatMap((no) => ATRIBUTOS_QUE_SE_LEEM.map((nome) => no.getAttribute(nome) ?? ''))
      .filter((valor) => valor !== '');

  const tudoQueSeLe = (container: HTMLElement) => [container.textContent ?? '', ...valoresDeAtributoQueSeLe(container)];

  const sobraDoQueSeLe = (container: HTMLElement, textos: readonly string[]) =>
    tudoQueSeLe(container)
      .map((trecho) => textos.reduce((resto, texto) => resto.replace(texto, ''), trecho))
      .join('');

  it('fechado, tudo o que se lê, em texto e em atributo, vem das props', async () => {
    const textos = ['aaa título', 'bbb razão', 'ccc aviso'];
    const { container } = await montar(bloqueio({ title: textos[0], reason: textos[1], reopenDeniedNote: textos[2] }));
    expect(sobraDoQueSeLe(container, textos)).toBe('');
  });

  it('com permissão de reabrir, tudo o que se lê, em texto e em atributo, vem das props', async () => {
    const textos = ['aaa título', 'bbb razão', 'ccc rótulo do motivo', 'ddd ação', 'eee motivo obrigatório'];
    const { container } = await montar(
      bloqueioReabrivel({
        title: textos[0],
        reason: textos[1],
        reopenReasonLabel: textos[2],
        reopenLabel: textos[3],
        reopenReasonRequiredNote: textos[4],
      }),
    );
    expect(sobraDoQueSeLe(container, textos)).toBe('');
  });

  it('com o motivo escrito, o aviso de motivo obrigatório sai e nada de texto próprio entra', async () => {
    const textos = ['aaa título', 'bbb razão', 'ccc rótulo do motivo', 'ddd ação', MOTIVO];
    const { container } = await montar(
      bloqueioReabrivel({
        title: textos[0],
        reason: textos[1],
        reopenReasonLabel: textos[2],
        reopenLabel: textos[3],
      }),
    );
    await digitarNoMotivo(caixaDoMotivo(container), MOTIVO);
    expect(sobraDoQueSeLe(container, textos)).toBe('');
  });

  const sobraComIntruso = async (preparar: (intruso: HTMLElement) => void) => {
    const { container } = await montar(bloqueio());
    const intruso = document.createElement('span');
    container.append(intruso);
    preparar(intruso);
    return sobraDoQueSeLe(container, [TITULO, RAZAO, AVISO_DE_QUEM_NAO_REABRE]);
  };

  it('o varredor enxerga palavra estranha em texto', async () => {
    const sobra = await sobraComIntruso((intruso) => {
      intruso.textContent = 'palavra de negócio';
    });
    expect(sobra).toBe('palavra de negócio');
  });

  it.each(ATRIBUTOS_QUE_SE_LEEM)('o varredor enxerga palavra estranha no atributo %s', async (nome) => {
    const sobra = await sobraComIntruso((intruso) => intruso.setAttribute(nome, 'palavra de negócio'));
    expect(sobra).toBe('palavra de negócio');
  });

  it('o varredor não acusa nada quando só há o que veio das props', async () => {
    expect(await sobraComIntruso(() => undefined)).toBe('');
  });

  it.each([
    ['fechado', () => bloqueio({ title: '', reason: '', reopenDeniedNote: '' })],
    [
      'com permissão de reabrir',
      () =>
        bloqueioReabrivel({
          title: '',
          reason: '',
          reopenLabel: '',
          reopenReasonLabel: '',
          reopenReasonRequiredNote: '',
        }),
    ],
  ])('%s, com todos os textos vazios, nada é escrito: nem texto, nem atributo', async (_rotulo, arvore) => {
    const { container } = await montar(arvore());
    expect(container.textContent).toBe('');
    expect(valoresDeAtributoQueSeLe(container)).toEqual([]);
  });
});

describe('PeriodLock: ícones', () => {
  it('o bloqueio é marcado por um cadeado fechado', async () => {
    const { container } = await montar(bloqueio());
    expect(elemento<SVGElement>(container, 'svg').classList.contains('lucide-lock')).toBe(true);
  });

  it('o botão de reabrir traz um cadeado aberto', async () => {
    const { container } = await montar(bloqueioReabrivel());
    const glifo = elemento<SVGElement>(botaoDeReabrir(container), 'svg');
    expect(glifo.classList.contains('lucide-lock-open')).toBe(true);
  });
});

describe('PeriodLock: sem permissão de reabrir', () => {
  it.each([
    ['sem canReopen', undefined],
    ['com canReopen falso', false as const],
  ])('%s, não há caminho de reabertura: nenhum botão e nenhum campo', async (_rotulo, canReopen) => {
    const { container } = await montar(bloqueio({ canReopen }));
    expect(todos(container, 'button')).toHaveLength(0);
    expect(todos(container, 'textarea')).toHaveLength(0);
  });

  it('mostra, em texto, o aviso recebido para quem não pode reabrir', async () => {
    const { container } = await montar(bloqueio());
    expect(folhaComTexto(container, 'p', AVISO_DE_QUEM_NAO_REABRE)).toBeTruthy();
  });

  it('onReopen recebido não ganha nenhum ponto de acionamento', async () => {
    const aoReabrir = vi.fn();
    const { container } = await montar(comPermissaoCalculada(false, aoReabrir));
    expect(todos(container, 'button')).toHaveLength(0);
    expect(todos(container, 'textarea')).toHaveLength(0);
    expect(aoReabrir).not.toHaveBeenCalled();
  });
});

describe('PeriodLock: com permissão de reabrir', () => {
  it('oferece o botão de reabrir, desabilitado enquanto não há motivo', async () => {
    const { container } = await montar(bloqueioReabrivel());
    expect(botaoDeReabrir(container).disabled).toBe(true);
  });

  it('não mostra o aviso de quem não pode reabrir, mesmo que ele chegue junto', async () => {
    const { container } = await montar(comPermissaoCalculada(true));
    expect(container.textContent).not.toContain(AVISO_DE_QUEM_NAO_REABRE);
  });

  it('continua dizendo a razão do bloqueio', async () => {
    const { container } = await montar(bloqueioReabrivel());
    expect(folhaComTexto(container, 'p', RAZAO)).toBeTruthy();
  });

  it('a permissão que chega depois faz o caminho de reabertura aparecer', async () => {
    const montado = await montar(bloqueio());
    await montado.atualizar(bloqueioReabrivel());
    expect(botaoDeReabrir(montado.container)).toBeTruthy();
    expect(caixaDoMotivo(montado.container)).toBeTruthy();
    expect(montado.container.textContent).not.toContain(AVISO_DE_QUEM_NAO_REABRE);
  });

  it('a permissão que se perde depois tira o campo e o botão, e volta o aviso', async () => {
    const montado = await montar(bloqueioReabrivel());
    await digitarNoMotivo(caixaDoMotivo(montado.container), MOTIVO);
    await montado.atualizar(bloqueio());
    expect(todos(montado.container, 'button')).toHaveLength(0);
    expect(todos(montado.container, 'textarea')).toHaveLength(0);
    expect(folhaComTexto(montado.container, 'p', AVISO_DE_QUEM_NAO_REABRE)).toBeTruthy();
  });
});

describe('PeriodLock: o motivo da reabertura', () => {
  it('pede o motivo num campo de texto de várias linhas, vazio de início', async () => {
    const { container } = await montar(bloqueioReabrivel());
    const caixa = caixaDoMotivo(container);
    expect(caixa.tagName).toBe('TEXTAREA');
    expect(caixa.value).toBe('');
  });

  it('o campo tem o rótulo recebido e é anunciado como obrigatório', async () => {
    const { container } = await montar(bloqueioReabrivel());
    const caixa = caixaDoMotivo(container);
    expect(caixa.labels?.[0]?.textContent).toBe(ROTULO_DO_MOTIVO);
    expect(caixa.getAttribute('aria-required')).toBe('true');
  });

  it('sem motivo, o botão fica desabilitado e o aviso recebido diz por quê', async () => {
    const { container } = await montar(bloqueioReabrivel());
    expect(botaoDeReabrir(container).disabled).toBe(true);
    expect(folhaComTexto(container, 'span', AVISO_DE_MOTIVO_OBRIGATORIO)).toBeTruthy();
  });

  it('com o motivo escrito, o botão habilita e o aviso de motivo obrigatório some', async () => {
    const { container } = await montar(bloqueioReabrivel());
    await digitarNoMotivo(caixaDoMotivo(container), MOTIVO);
    expect(botaoDeReabrir(container).disabled).toBe(false);
    expect(container.textContent).not.toContain(AVISO_DE_MOTIVO_OBRIGATORIO);
  });

  it.each([
    ['espaços', '     '],
    ['quebras de linha', '\n\n'],
    ['espaços, tabulação e quebra de linha', ' \t \n '],
  ])('motivo só com %s não conta: o botão segue desabilitado', async (_rotulo, valor) => {
    const { container } = await montar(bloqueioReabrivel());
    await digitarNoMotivo(caixaDoMotivo(container), valor);
    expect(botaoDeReabrir(container).disabled).toBe(true);
    expect(folhaComTexto(container, 'span', AVISO_DE_MOTIVO_OBRIGATORIO)).toBeTruthy();
  });

  it('apagar o motivo desabilita o botão de novo', async () => {
    const { container } = await montar(bloqueioReabrivel());
    await digitarNoMotivo(caixaDoMotivo(container), MOTIVO);
    await digitarNoMotivo(caixaDoMotivo(container), '');
    expect(botaoDeReabrir(container).disabled).toBe(true);
  });

  it('sem motivo, clicar no botão não chama onReopen', async () => {
    const aoReabrir = vi.fn();
    const { container } = await montar(bloqueioReabrivel({ onReopen: aoReabrir }));
    await clicar(botaoDeReabrir(container));
    expect(aoReabrir).not.toHaveBeenCalled();
  });

  it('com motivo só de espaços, clicar no botão não chama onReopen', async () => {
    const aoReabrir = vi.fn();
    const { container } = await montar(bloqueioReabrivel({ onReopen: aoReabrir }));
    await digitarNoMotivo(caixaDoMotivo(container), '   ');
    await clicar(botaoDeReabrir(container));
    expect(aoReabrir).not.toHaveBeenCalled();
  });

  it('clicar com o motivo escrito chama onReopen uma vez, com o motivo e mais nada', async () => {
    const aoReabrir = vi.fn();
    const { container } = await montar(bloqueioReabrivel({ onReopen: aoReabrir }));
    await digitarNoMotivo(caixaDoMotivo(container), MOTIVO);
    await clicar(botaoDeReabrir(container));
    expect(aoReabrir).toHaveBeenCalledTimes(1);
    expect(aoReabrir.mock.calls[0]).toEqual([MOTIVO]);
  });

  it('entrega o motivo sem os espaços e quebras de linha das pontas', async () => {
    const aoReabrir = vi.fn();
    const { container } = await montar(bloqueioReabrivel({ onReopen: aoReabrir }));
    await digitarNoMotivo(caixaDoMotivo(container), `  \n${MOTIVO}\t \n`);
    await clicar(botaoDeReabrir(container));
    expect(aoReabrir.mock.calls[0]).toEqual([MOTIVO]);
  });

  it('entrega o motivo de várias linhas inteiro, com as quebras do meio', async () => {
    const aoReabrir = vi.fn();
    const motivoEmDuasLinhas = 'A conta de gás entrou no mês errado.\nAjuste pedido pela tesouraria.';
    const { container } = await montar(bloqueioReabrivel({ onReopen: aoReabrir }));
    await digitarNoMotivo(caixaDoMotivo(container), motivoEmDuasLinhas);
    await clicar(botaoDeReabrir(container));
    expect(aoReabrir.mock.calls[0]).toEqual([motivoEmDuasLinhas]);
  });

  it('o motivo digitado continua no campo depois de reabrir: se a reabertura falhar, ninguém digita de novo', async () => {
    const aoReabrir = vi.fn();
    const { container } = await montar(bloqueioReabrivel({ onReopen: aoReabrir }));
    await digitarNoMotivo(caixaDoMotivo(container), MOTIVO);
    await clicar(botaoDeReabrir(container));
    expect(caixaDoMotivo(container).value).toBe(MOTIVO);
    expect(botaoDeReabrir(container).disabled).toBe(false);
  });

  it('entrega o motivo mais recente, não o primeiro que foi digitado', async () => {
    const aoReabrir = vi.fn();
    const { container } = await montar(bloqueioReabrivel({ onReopen: aoReabrir }));
    await digitarNoMotivo(caixaDoMotivo(container), 'primeira tentativa');
    await digitarNoMotivo(caixaDoMotivo(container), MOTIVO);
    await clicar(botaoDeReabrir(container));
    expect(aoReabrir.mock.calls[0]).toEqual([MOTIVO]);
  });

  it('sem onReopen, clicar com o motivo escrito não falha', async () => {
    const { container } = await montar(bloqueioReabrivel());
    await digitarNoMotivo(caixaDoMotivo(container), MOTIVO);
    await expect(clicar(botaoDeReabrir(container))).resolves.toBeUndefined();
  });

  it('um onReopen que chega depois é o que recebe o motivo', async () => {
    const primeiro = vi.fn();
    const segundo = vi.fn();
    const montado = await montar(bloqueioReabrivel({ onReopen: primeiro }));
    await digitarNoMotivo(caixaDoMotivo(montado.container), MOTIVO);
    await montado.atualizar(bloqueioReabrivel({ onReopen: segundo }));
    await clicar(botaoDeReabrir(montado.container));
    expect(primeiro).not.toHaveBeenCalled();
    expect(segundo.mock.calls[0]).toEqual([MOTIVO]);
  });
});

describe('PeriodLock: style', () => {
  it('o style recebido prevalece sobre o do próprio componente', async () => {
    const { container } = await montar(bloqueio({ style: { padding: '0px', marginTop: 20 } }));
    const raiz = container.firstElementChild as HTMLElement;
    expect(raiz.style.padding).toBe('0px');
    expect(raiz.style.marginTop).toBe('20px');
  });

  it('o style recebido vale também com permissão de reabrir', async () => {
    const { container } = await montar(bloqueioReabrivel({ style: { padding: '0px', marginTop: 20 } }));
    const raiz = container.firstElementChild as HTMLElement;
    expect(raiz.style.padding).toBe('0px');
    expect(raiz.style.marginTop).toBe('20px');
  });
});
