import { afterEach, describe, expect, it, vi } from 'vitest';
import { botaoComTexto, clicar, desmontarTudo, elemento, folhaComTexto, montar, todos } from '@/testes/montagem';
import { PeriodLock, type PeriodLockClosedProps, type PeriodLockReopenableProps } from './PeriodLock';

afterEach(desmontarTudo);

const TITULO = 'Período 07/2026 está fechado';
const RAZAO = 'O mês foi fechado em 05/08 e o relatório já foi assinado.';
const AVISO_DE_QUEM_NAO_REABRE = 'Reabrir exige um administrador, e o motivo fica registrado de forma permanente.';
const ACAO_DE_REABRIR = 'Reabrir período';

type ComoFechado = Partial<PeriodLockClosedProps>;
type ComoReabrivel = Partial<Omit<PeriodLockReopenableProps, 'canReopen'>>;

const bloqueio = (props: ComoFechado = {}) => (
  <PeriodLock title={TITULO} reason={RAZAO} reopenDeniedNote={AVISO_DE_QUEM_NAO_REABRE} {...props} />
);

const bloqueioReabrivel = (props: ComoReabrivel = {}) => (
  <PeriodLock title={TITULO} reason={RAZAO} canReopen reopenLabel={ACAO_DE_REABRIR} {...props} />
);

const comPermissaoCalculada = (canReopen: boolean, onReopen?: () => void) => (
  <PeriodLock
    title={TITULO}
    reason={RAZAO}
    canReopen={canReopen}
    reopenDeniedNote={AVISO_DE_QUEM_NAO_REABRE}
    reopenLabel={ACAO_DE_REABRIR}
    onReopen={onReopen}
  />
);

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
  const sobraDoTexto = (container: HTMLElement, textos: readonly string[]) =>
    textos.reduce((resto, texto) => resto.replace(texto, ''), container.textContent ?? '');

  it('fechado, tudo o que aparece vem das props', async () => {
    const textos = ['aaa título', 'bbb razão', 'ccc aviso'];
    const { container } = await montar(bloqueio({ title: textos[0], reason: textos[1], reopenDeniedNote: textos[2] }));
    expect(sobraDoTexto(container, textos)).toBe('');
  });

  it('com permissão de reabrir, tudo o que aparece vem das props', async () => {
    const textos = ['aaa título', 'bbb razão', 'ccc ação'];
    const { container } = await montar(
      bloqueioReabrivel({ title: textos[0], reason: textos[1], reopenLabel: textos[2] }),
    );
    expect(sobraDoTexto(container, textos)).toBe('');
  });
});

describe('PeriodLock: ícones', () => {
  it('o bloqueio é marcado por um cadeado fechado', async () => {
    const { container } = await montar(bloqueio());
    expect(elemento<SVGElement>(container, 'svg').classList.contains('lucide-lock')).toBe(true);
  });

  it('o botão de reabrir traz um cadeado aberto', async () => {
    const { container } = await montar(bloqueioReabrivel());
    const glifo = elemento<SVGElement>(botaoComTexto(container, ACAO_DE_REABRIR), 'svg');
    expect(glifo.classList.contains('lucide-lock-open')).toBe(true);
  });
});

describe('PeriodLock: sem permissão de reabrir', () => {
  it.each([
    ['sem canReopen', undefined],
    ['com canReopen falso', false as const],
  ])('%s, não há caminho de reabertura: nenhum botão', async (_rotulo, canReopen) => {
    const { container } = await montar(bloqueio({ canReopen }));
    expect(todos(container, 'button')).toHaveLength(0);
  });

  it('mostra, em texto, o aviso recebido para quem não pode reabrir', async () => {
    const { container } = await montar(bloqueio());
    expect(folhaComTexto(container, 'p', AVISO_DE_QUEM_NAO_REABRE)).toBeTruthy();
  });

  it('onReopen recebido não ganha nenhum ponto de acionamento', async () => {
    const aoReabrir = vi.fn();
    const { container } = await montar(comPermissaoCalculada(false, aoReabrir));
    expect(todos(container, 'button')).toHaveLength(0);
    expect(aoReabrir).not.toHaveBeenCalled();
  });
});

describe('PeriodLock: com permissão de reabrir', () => {
  it('oferece o botão Reabrir período, habilitado', async () => {
    const { container } = await montar(bloqueioReabrivel());
    expect(botaoComTexto(container, ACAO_DE_REABRIR).disabled).toBe(false);
  });

  it('não mostra o aviso de quem não pode reabrir, mesmo que ele chegue junto', async () => {
    const { container } = await montar(comPermissaoCalculada(true));
    expect(container.textContent).not.toContain(AVISO_DE_QUEM_NAO_REABRE);
  });

  it('continua dizendo a razão do bloqueio', async () => {
    const { container } = await montar(bloqueioReabrivel());
    expect(folhaComTexto(container, 'p', RAZAO)).toBeTruthy();
  });

  it('clicar chama onReopen uma vez', async () => {
    const aoReabrir = vi.fn();
    const { container } = await montar(bloqueioReabrivel({ onReopen: aoReabrir }));
    await clicar(botaoComTexto(container, ACAO_DE_REABRIR));
    expect(aoReabrir).toHaveBeenCalledTimes(1);
  });

  it('onReopen recebe só o evento de clique: o componente não pede nem entrega o motivo da reabertura', async () => {
    const aoReabrir = vi.fn();
    const { container } = await montar(bloqueioReabrivel({ onReopen: aoReabrir }));
    await clicar(botaoComTexto(container, ACAO_DE_REABRIR));
    const argumentos = aoReabrir.mock.calls[0] ?? [];
    expect(argumentos).toHaveLength(1);
    expect(argumentos[0]).toMatchObject({ type: 'click' });
    expect(todos(container, 'input, textarea')).toHaveLength(0);
  });

  it('sem onReopen, clicar não falha', async () => {
    const { container } = await montar(bloqueioReabrivel());
    await expect(clicar(botaoComTexto(container, ACAO_DE_REABRIR))).resolves.toBeUndefined();
  });

  it('a permissão que chega depois faz o caminho de reabertura aparecer', async () => {
    const montado = await montar(bloqueio());
    await montado.atualizar(bloqueioReabrivel());
    expect(botaoComTexto(montado.container, ACAO_DE_REABRIR)).toBeTruthy();
    expect(montado.container.textContent).not.toContain(AVISO_DE_QUEM_NAO_REABRE);
  });
});

describe('PeriodLock: style', () => {
  it('o style recebido prevalece sobre o do próprio componente', async () => {
    const { container } = await montar(bloqueio({ style: { padding: '0px', marginTop: 20 } }));
    const raiz = container.firstElementChild as HTMLElement;
    expect(raiz.style.padding).toBe('0px');
    expect(raiz.style.marginTop).toBe('20px');
  });
});
