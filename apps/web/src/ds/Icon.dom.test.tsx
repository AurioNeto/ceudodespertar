import { Component, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Icon, type IconName } from './Icon';
import { desmontarTudo, elemento, montar } from '../testes/montagem';

afterEach(desmontarTudo);

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const GLIFO_POR_NOME: readonly [IconName, string][] = [
  ['arrow-down-left', 'arrow-down-left'],
  ['arrow-left', 'arrow-left'],
  ['arrow-left-right', 'arrow-left-right'],
  ['arrow-right', 'arrow-right'],
  ['arrow-up-right', 'arrow-up-right'],
  ['ban', 'ban'],
  ['calendar-days', 'calendar-days'],
  ['camera', 'camera'],
  ['chart-no-axes-column', 'chart-no-axes-column'],
  ['check', 'check'],
  ['check-check', 'check-check'],
  ['chevron-down', 'chevron-down'],
  ['chevron-right', 'chevron-right'],
  ['circle-alert', 'circle-alert'],
  ['circle-check', 'circle-check'],
  ['circle-plus', 'circle-plus'],
  ['circle-x', 'circle-x'],
  ['clipboard-list', 'clipboard-list'],
  ['copy', 'copy'],
  ['credit-card', 'credit-card'],
  ['eye', 'eye'],
  ['eye-off', 'eye-off'],
  ['file-down', 'file-down'],
  ['file-spreadsheet', 'file-spreadsheet'],
  ['flask-conical', 'flask-conical'],
  ['globe', 'globe'],
  ['inbox', 'inbox'],
  ['key-round', 'key-round'],
  ['landmark', 'landmark'],
  ['layout-dashboard', 'layout-dashboard'],
  ['link', 'link'],
  ['list', 'list'],
  ['lock', 'lock'],
  ['lock-open', 'lock-open'],
  ['log-in', 'log-in'],
  ['mail', 'mail'],
  ['message-circle-question', 'message-circle-question-mark'],
  ['minus', 'minus'],
  ['monitor', 'monitor'],
  ['paperclip', 'paperclip'],
  ['pencil', 'pencil'],
  ['plus', 'plus'],
  ['receipt-text', 'receipt-text'],
  ['rotate-ccw', 'rotate-ccw'],
  ['rotate-cw', 'rotate-cw'],
  ['scale', 'scale'],
  ['scroll-text', 'scroll-text'],
  ['search', 'search'],
  ['send', 'send'],
  ['settings-2', 'settings-2'],
  ['sheet', 'sheet'],
  ['shield-alert', 'shield-alert'],
  ['shield-half', 'shield-half'],
  ['smartphone', 'smartphone'],
  ['sparkles', 'sparkles'],
  ['trash-2', 'trash-2'],
  ['triangle-alert', 'triangle-alert'],
  ['undo-2', 'undo-2'],
  ['user-plus', 'user-plus'],
  ['user-round', 'user-round'],
  ['user-x', 'user-x'],
  ['users', 'users'],
  ['wallet', 'wallet'],
  ['wifi-off', 'wifi-off'],
  ['x', 'x'],
];

class LimiteDeErro extends Component<{ children: ReactNode }, { erro: Error | null }> {
  override state: { erro: Error | null } = { erro: null };

  static getDerivedStateFromError(erro: Error) {
    return { erro };
  }

  override render() {
    return this.state.erro ? <p data-erro>{this.state.erro.message}</p> : this.props.children;
  }
}

const glifoDe = (container: HTMLElement) => elemento<SVGElement>(container, 'svg');

describe('Icon — nome para glifo', () => {
  it.each(GLIFO_POR_NOME)('nome %s — desenha o glifo lucide %s', async (nome, glifo) => {
    const { container } = await montar(<Icon name={nome} />);

    expect(glifoDe(container).classList.contains(`lucide-${glifo}`)).toBe(true);
  });

  it('nomes diferentes — desenham traços diferentes', async () => {
    const { container } = await montar(
      <>
        <Icon name="check" />
        <Icon name="x" />
      </>,
    );

    const [primeiro, segundo] = Array.from(container.querySelectorAll('svg'));
    expect(primeiro?.innerHTML).not.toBe(segundo?.innerHTML);
  });

  it('nome registrado — desenha um único svg com traços dentro', async () => {
    const { container } = await montar(<Icon name="check" />);

    expect(container.querySelectorAll('svg').length).toBe(1);
    expect(glifoDe(container).childElementCount).toBeGreaterThan(0);
  });

  it('nome fora do registro — falha ao renderizar, com elemento inválido', async () => {
    const nomeInexistente = 'nao-existe' as IconName;

    const { container } = await montar(
      <LimiteDeErro>
        <Icon name={nomeInexistente} />
      </LimiteDeErro>,
    );

    expect(container.querySelector('svg')).toBeNull();
    expect(elemento(container, '[data-erro]').textContent).toContain('Element type is invalid');
  });
});

describe('Icon — propriedades', () => {
  it('sem props além do nome — 18px, cor herdada, traço 2 e decorativo', async () => {
    const { container } = await montar(<Icon name="check" />);

    const glifo = glifoDe(container);
    expect([
      glifo.getAttribute('width'),
      glifo.getAttribute('height'),
      glifo.getAttribute('stroke'),
      glifo.getAttribute('stroke-width'),
      glifo.getAttribute('aria-hidden'),
    ]).toEqual(['18', '18', 'currentColor', '2', 'true']);
  });

  it('size — define largura e altura', async () => {
    const { container } = await montar(<Icon name="check" size={32} />);

    const glifo = glifoDe(container);
    expect([glifo.getAttribute('width'), glifo.getAttribute('height')]).toEqual(['32', '32']);
  });

  it('color — vira a cor do traço', async () => {
    const { container } = await montar(<Icon name="check" color="var(--color-royal)" />);

    expect(glifoDe(container).getAttribute('stroke')).toBe('var(--color-royal)');
  });

  it('className — soma-se às classes do glifo', async () => {
    const { container } = await montar(<Icon name="check" className="minha-classe" />);

    const classes = glifoDe(container).classList;
    expect([classes.contains('minha-classe'), classes.contains('lucide-check')]).toEqual([true, true]);
  });

  it('sem style — não encolhe dentro de flex', async () => {
    const { container } = await montar(<Icon name="check" />);

    expect(glifoDe(container).style.flex).toBe('0 0 auto');
  });

  it('style próprio — soma-se ao flex padrão', async () => {
    const { container } = await montar(<Icon name="check" style={{ marginTop: '2px' }} />);

    const glifo = glifoDe(container);
    expect([glifo.style.flex, glifo.style.marginTop]).toEqual(['0 0 auto', '2px']);
  });

  it('style próprio com flex — sobrepõe o flex padrão', async () => {
    const { container } = await montar(<Icon name="check" style={{ flex: '0 1 auto' }} />);

    expect(glifoDe(container).style.flex).toBe('0 1 auto');
  });
});
