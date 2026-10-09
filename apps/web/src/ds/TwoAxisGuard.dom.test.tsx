import { afterEach, describe, expect, it } from 'vitest';
import { desmontarTudo, elemento, folhaComTexto, montar, todos } from '@/testes/montagem';
import { TwoAxisGuard, type TwoAxisGuardProps } from './TwoAxisGuard';

afterEach(desmontarTudo);

const TITULO_PADRAO = 'Você tem acesso a esta tela, mas não a esta operação';
const EXPLICACAO = 'Autorizar adiantamento exige vínculo de padrinho ou madrinha.';
const EXIGENCIA = 'Precisa de vínculo ativo de padrinho ou madrinha.';

const guarda = (props: Partial<TwoAxisGuardProps> = {}) => <TwoAxisGuard explanation={EXPLICACAO} {...props} />;

const raizDe = (container: HTMLElement) => container.firstElementChild as HTMLElement;

describe('TwoAxisGuard: o estado explicado', () => {
  it('sem título próprio, diz que há acesso à tela mas não à operação', async () => {
    const { container } = await montar(guarda());
    expect(folhaComTexto(container, 'div', TITULO_PADRAO)).toBeTruthy();
  });

  it('o título próprio substitui o padrão', async () => {
    const { container } = await montar(guarda({ title: 'Autorizar adiantamento não está ao seu alcance' }));
    expect(folhaComTexto(container, 'div', 'Autorizar adiantamento não está ao seu alcance')).toBeTruthy();
    expect(container.textContent).not.toContain(TITULO_PADRAO);
  });

  it('mostra a explicação recebida', async () => {
    const { container } = await montar(guarda());
    expect(folhaComTexto(container, 'p', EXPLICACAO)).toBeTruthy();
  });

  it('com explicação vazia, mantém o título e deixa o parágrafo vazio', async () => {
    const { container } = await montar(guarda({ explanation: '' }));
    expect(folhaComTexto(container, 'div', TITULO_PADRAO)).toBeTruthy();
    expect(folhaComTexto(container, 'p', '')).toBeTruthy();
  });
});

describe('TwoAxisGuard: o que seria preciso', () => {
  it('mostra a exigência quando ela é informada', async () => {
    const { container } = await montar(guarda({ requirement: EXIGENCIA }));
    expect(folhaComTexto(container, 'p', EXIGENCIA)).toBeTruthy();
  });

  it.each([
    ['ausente', undefined],
    ['vazia', ''],
  ])('com exigência %s, só a explicação aparece', async (_rotulo, requirement) => {
    const { container } = await montar(guarda({ requirement }));
    expect(todos(container, 'p')).toHaveLength(1);
  });
});

describe('TwoAxisGuard: não é erro de sistema', () => {
  it('não se anuncia como alerta nem como região viva', async () => {
    const { container } = await montar(guarda({ requirement: EXIGENCIA }));
    expect(container.querySelector('[role="alert"], [aria-live], [role="status"]')).toBeNull();
  });

  it('não oferece controle nenhum: nem botão, nem campo, nem link', async () => {
    const { container } = await montar(guarda({ requirement: EXIGENCIA }));
    expect(todos(container, 'button, input, textarea, select, a')).toHaveLength(0);
  });

  it('a borda do topo, o ícone e a exigência usam o tom do eixo de autorização (royal)', async () => {
    const { container } = await montar(guarda({ requirement: EXIGENCIA }));
    const icone = elemento<SVGElement>(container, 'svg');
    const exigencia = folhaComTexto<HTMLElement>(container, 'p', EXIGENCIA);
    expect(raizDe(container).style.borderTop).toContain('var(--color-royal)');
    expect(icone.getAttribute('stroke')).toBe('var(--color-royal)');
    expect(exigencia.style.color).toBe('var(--color-royal-ink)');
    expect(exigencia.style.background).toBe('var(--color-royal-soft)');
  });

  it('nenhum elemento do guarda usa o tom de atenção nem o de pendência', async () => {
    const { container } = await montar(guarda({ requirement: EXIGENCIA }));
    expect(container.innerHTML).not.toContain('--color-attention');
    expect(container.innerHTML).not.toContain('--color-pending');
  });
});

describe('TwoAxisGuard: style', () => {
  it('o style recebido prevalece sobre o do próprio componente', async () => {
    const { container } = await montar(guarda({ style: { padding: '0px', marginTop: 20 } }));
    expect(raizDe(container).style.padding).toBe('0px');
    expect(raizDe(container).style.marginTop).toBe('20px');
  });
});
