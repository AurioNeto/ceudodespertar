import { afterEach, describe, expect, it, vi } from 'vitest';
import { botaoComTexto, clicar, desmontarTudo, elemento, folhaComTexto, montar, todos } from '@/testes/montagem';
import { PeriodLock, type PeriodLockProps } from './PeriodLock';

afterEach(desmontarTudo);

const RAZAO = 'O mês foi fechado em 05/08 e o relatório já foi assinado.';
const AVISO_DE_QUEM_NAO_REABRE = 'Reabrir exige um administrador, e o motivo fica registrado de forma permanente.';

const bloqueio = (props: Partial<PeriodLockProps> = {}) => <PeriodLock period="07/2026" reason={RAZAO} {...props} />;

describe('PeriodLock: o bloqueio', () => {
  it('diz qual período está fechado', async () => {
    const { container } = await montar(bloqueio());
    expect(folhaComTexto(container, 'div', 'Período 07/2026 está fechado')).toBeTruthy();
  });

  it('mostra a razão recebida', async () => {
    const { container } = await montar(bloqueio());
    expect(folhaComTexto(container, 'p', RAZAO)).toBeTruthy();
  });

  it('com razão vazia, mantém o aviso de período fechado e deixa o parágrafo da razão vazio', async () => {
    const { container } = await montar(bloqueio({ reason: '' }));
    expect(folhaComTexto(container, 'div', 'Período 07/2026 está fechado')).toBeTruthy();
    expect(folhaComTexto(container, 'p', '')).toBeTruthy();
  });

  it('com período vazio, o aviso sai com o espaço no lugar do período', async () => {
    const { container } = await montar(bloqueio({ period: '' }));
    expect(folhaComTexto(container, 'div', 'Período  está fechado')).toBeTruthy();
  });

  it('o período fechado não traz nenhum controle de edição', async () => {
    const { container } = await montar(bloqueio());
    expect(todos(container, 'input, textarea, select')).toHaveLength(0);
  });
});

describe('PeriodLock: ícones', () => {
  it('o bloqueio é marcado por um cadeado fechado', async () => {
    const { container } = await montar(bloqueio());
    expect(elemento<SVGElement>(container, 'svg').classList.contains('lucide-lock')).toBe(true);
  });

  it('o botão de reabrir traz um cadeado aberto', async () => {
    const { container } = await montar(bloqueio({ canReopen: true }));
    const glifo = elemento<SVGElement>(botaoComTexto(container, 'Reabrir período'), 'svg');
    expect(glifo.classList.contains('lucide-lock-open')).toBe(true);
  });
});

describe('PeriodLock: sem permissão de reabrir', () => {
  it.each([
    ['sem canReopen', undefined],
    ['com canReopen falso', false],
  ])('%s, não há caminho de reabertura: nenhum botão', async (_rotulo, canReopen) => {
    const { container } = await montar(bloqueio({ canReopen }));
    expect(todos(container, 'button')).toHaveLength(0);
  });

  it('explica em texto que reabrir exige um administrador e que o motivo fica registrado', async () => {
    const { container } = await montar(bloqueio());
    expect(folhaComTexto(container, 'p', AVISO_DE_QUEM_NAO_REABRE)).toBeTruthy();
  });

  it('onReopen recebido não ganha nenhum ponto de acionamento', async () => {
    const aoReabrir = vi.fn();
    const { container } = await montar(bloqueio({ onReopen: aoReabrir }));
    expect(todos(container, 'button')).toHaveLength(0);
    expect(aoReabrir).not.toHaveBeenCalled();
  });
});

describe('PeriodLock: com permissão de reabrir', () => {
  it('oferece o botão Reabrir período, habilitado', async () => {
    const { container } = await montar(bloqueio({ canReopen: true }));
    expect(botaoComTexto(container, 'Reabrir período').disabled).toBe(false);
  });

  it('troca o aviso de quem não pode pelo botão: o aviso some', async () => {
    const { container } = await montar(bloqueio({ canReopen: true }));
    expect(container.textContent).not.toContain(AVISO_DE_QUEM_NAO_REABRE);
  });

  it('continua dizendo a razão do bloqueio', async () => {
    const { container } = await montar(bloqueio({ canReopen: true }));
    expect(folhaComTexto(container, 'p', RAZAO)).toBeTruthy();
  });

  it('clicar chama onReopen uma vez', async () => {
    const aoReabrir = vi.fn();
    const { container } = await montar(bloqueio({ canReopen: true, onReopen: aoReabrir }));
    await clicar(botaoComTexto(container, 'Reabrir período'));
    expect(aoReabrir).toHaveBeenCalledTimes(1);
  });

  it('onReopen recebe só o evento de clique: o componente não pede nem entrega o motivo da reabertura', async () => {
    const aoReabrir = vi.fn();
    const { container } = await montar(bloqueio({ canReopen: true, onReopen: aoReabrir }));
    await clicar(botaoComTexto(container, 'Reabrir período'));
    const argumentos = aoReabrir.mock.calls[0] ?? [];
    expect(argumentos).toHaveLength(1);
    expect(argumentos[0]).toMatchObject({ type: 'click' });
    expect(todos(container, 'input, textarea')).toHaveLength(0);
  });

  it('sem onReopen, clicar não falha', async () => {
    const { container } = await montar(bloqueio({ canReopen: true }));
    await expect(clicar(botaoComTexto(container, 'Reabrir período'))).resolves.toBeUndefined();
  });

  it('a permissão que chega depois faz o caminho de reabertura aparecer', async () => {
    const montado = await montar(bloqueio());
    await montado.atualizar(bloqueio({ canReopen: true }));
    expect(botaoComTexto(montado.container, 'Reabrir período')).toBeTruthy();
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
