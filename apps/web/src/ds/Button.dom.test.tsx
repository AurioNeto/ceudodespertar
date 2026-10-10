import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button, type ButtonVariant } from './Button';
import { clicar, desmontarTudo, elemento, montar, passarMouseSobre, tirarMouseDe } from '@/testes/montagem';

afterEach(desmontarTudo);

const botaoDe = (container: HTMLElement) => elemento<HTMLButtonElement>(container, 'button');

const VISUAL_POR_VARIANTE: readonly [ButtonVariant, string, string, string][] = [
  ['primary', 'var(--action-bg)', 'var(--action-fg)', '1.5px solid transparent'],
  ['ghost', 'transparent', 'var(--color-royal)', '1.5px solid var(--color-royal-border)'],
  ['quiet', 'var(--bg-sunken)', 'var(--text-primary)', '1px solid var(--color-line)'],
  ['suggest', 'var(--color-suggest-soft)', 'var(--color-suggest)', '1.5px solid var(--color-suggest-border)'],
  ['onChrome', 'rgba(255, 255, 255, 0.12)', 'rgb(255, 255, 255)', '1.5px solid rgba(255, 255, 255, 0.28)'],
];

const FUNDO_NO_HOVER: readonly [ButtonVariant, string][] = [
  ['primary', 'var(--action-bg-hover)'],
  ['ghost', 'var(--color-royal-soft)'],
  ['quiet', 'var(--color-line)'],
  ['suggest', 'var(--color-suggest-border)'],
  ['onChrome', 'rgba(255, 255, 255, 0.2)'],
];

describe('Button — estrutura básica', () => {
  it('renderiza os filhos dentro de um button do tipo button — texto e tipo', async () => {
    const { container } = await montar(<Button>Salvar</Button>);

    expect(botaoDe(container).textContent).toBe('Salvar');
    expect(botaoDe(container).type).toBe('button');
  });

  it('sem filhos — renderiza o button vazio', async () => {
    const { container } = await montar(<Button />);

    expect(botaoDe(container).textContent).toBe('');
  });

  it('clique habilitado — chama onClick uma vez', async () => {
    const aoClicar = vi.fn();
    const { container } = await montar(<Button onClick={aoClicar}>Salvar</Button>);

    await clicar(botaoDe(container));

    expect(aoClicar).toHaveBeenCalledTimes(1);
  });

  it('repassa atributos extras ao button — aria-label, data-* e className', async () => {
    const { container } = await montar(
      <Button aria-label="Fechar painel" data-teste="x" className="classe-externa">
        ×
      </Button>,
    );

    expect(botaoDe(container).getAttribute('aria-label')).toBe('Fechar painel');
    expect(botaoDe(container).getAttribute('data-teste')).toBe('x');
    expect(botaoDe(container).className).toBe('classe-externa');
  });
});

describe('Button — variantes', () => {
  it('sem variante — usa a primária', async () => {
    const { container } = await montar(<Button>Ok</Button>);

    expect(botaoDe(container).style.background).toBe('var(--action-bg)');
  });

  it.each(VISUAL_POR_VARIANTE)(
    'variante %s — aplica fundo, cor do texto e borda',
    async (variante, fundo, cor, borda) => {
      const { container } = await montar(<Button variant={variante}>Ok</Button>);

      const botao = botaoDe(container);
      expect([botao.style.background, botao.style.color, botao.style.border]).toEqual([fundo, cor, borda]);
    },
  );

  it.each(FUNDO_NO_HOVER)('variante %s com o mouse em cima — troca o fundo', async (variante, fundo) => {
    const { container } = await montar(<Button variant={variante}>Ok</Button>);

    await passarMouseSobre(botaoDe(container));

    expect(botaoDe(container).style.background).toBe(fundo);
  });

  it('mouse em cima — sobe um pixel', async () => {
    const { container } = await montar(<Button>Ok</Button>);

    await passarMouseSobre(botaoDe(container));

    expect(botaoDe(container).style.transform).toBe('translateY(-1px)');
  });

  it('mouse sai depois de entrar — volta ao fundo da variante e à posição original', async () => {
    const { container } = await montar(<Button variant="ghost">Ok</Button>);
    await passarMouseSobre(botaoDe(container));

    await tirarMouseDe(botaoDe(container));

    const botao = botaoDe(container);
    expect([botao.style.background, botao.style.transform]).toEqual(['transparent', 'none']);
  });

  it('sem hover — fica na posição original', async () => {
    const { container } = await montar(<Button>Ok</Button>);

    expect(botaoDe(container).style.transform).toBe('none');
  });
});

describe('Button — densidade e largura', () => {
  it('sem densidade — usa a de escritório', async () => {
    const { container } = await montar(<Button>Ok</Button>);

    const botao = botaoDe(container);
    expect([botao.style.minHeight, botao.style.padding, botao.style.font]).toEqual([
      'var(--target-office)',
      '0px 18px',
      '600 15px var(--font-body)',
    ]);
  });

  it('densidade field — usa alvo maior, mais respiro e fonte mais pesada', async () => {
    const { container } = await montar(<Button density="field">Ok</Button>);

    const botao = botaoDe(container);
    expect([botao.style.minHeight, botao.style.padding, botao.style.font]).toEqual([
      'var(--target-field)',
      '0px 22px',
      '700 16.5px var(--font-body)',
    ]);
  });

  it('fullWidth — ocupa 100% da largura', async () => {
    const { container } = await montar(<Button fullWidth>Ok</Button>);

    expect(botaoDe(container).style.width).toBe('100%');
  });

  it('sem fullWidth — não fixa largura', async () => {
    const { container } = await montar(<Button>Ok</Button>);

    expect(botaoDe(container).style.width).toBe('');
  });
});

describe('Button — ícone', () => {
  it('sem iconName — não desenha ícone', async () => {
    const { container } = await montar(<Button>Ok</Button>);

    expect(container.querySelector('svg')).toBeNull();
  });

  it('iconAfter sem iconName — não desenha ícone', async () => {
    const { container } = await montar(<Button iconAfter>Ok</Button>);

    expect(container.querySelector('svg')).toBeNull();
  });

  it('com iconName — o ícone vem antes do texto', async () => {
    const { container } = await montar(<Button iconName="check">Ok</Button>);

    expect(botaoDe(container).firstElementChild?.tagName.toLowerCase()).toBe('svg');
    expect(botaoDe(container).lastChild?.textContent).toBe('Ok');
  });

  it('com iconName e iconAfter — o ícone vem depois do texto', async () => {
    const { container } = await montar(
      <Button iconName="chevron-right" iconAfter>
        Ok
      </Button>,
    );

    expect(botaoDe(container).firstChild?.textContent).toBe('Ok');
    expect(botaoDe(container).lastElementChild?.tagName.toLowerCase()).toBe('svg');
  });

  it('ícone — é decorativo e identifica o glifo pedido', async () => {
    const { container } = await montar(<Button iconName="check">Ok</Button>);

    const icone = elemento<SVGElement>(container, 'svg');
    expect(icone.getAttribute('aria-hidden')).toBe('true');
    expect(icone.classList.contains('lucide-check')).toBe(true);
  });

  it('densidade de escritório — ícone de 18px', async () => {
    const { container } = await montar(<Button iconName="check">Ok</Button>);

    const icone = elemento<SVGElement>(container, 'svg');
    expect([icone.getAttribute('width'), icone.getAttribute('height')]).toEqual(['18', '18']);
  });

  it('densidade field — ícone de 20px', async () => {
    const { container } = await montar(
      <Button iconName="check" density="field">
        Ok
      </Button>,
    );

    const icone = elemento<SVGElement>(container, 'svg');
    expect([icone.getAttribute('width'), icone.getAttribute('height')]).toEqual(['20', '20']);
  });
});

describe('Button — desabilitado', () => {
  it('disabled — o button fica desabilitado', async () => {
    const { container } = await montar(<Button disabled>Ok</Button>);

    expect(botaoDe(container).disabled).toBe(true);
  });

  it('disabled — troca para o visual apagado, sobrepondo o da variante', async () => {
    const { container } = await montar(
      <Button variant="primary" disabled>
        Ok
      </Button>,
    );

    const botao = botaoDe(container);
    expect([botao.style.background, botao.style.color, botao.style.border, botao.style.cursor]).toEqual([
      'var(--bg-sunken)',
      'var(--color-ink-subtle)',
      '1px solid var(--color-line)',
      'not-allowed',
    ]);
  });

  it('habilitado — cursor de clique', async () => {
    const { container } = await montar(<Button>Ok</Button>);

    expect(botaoDe(container).style.cursor).toBe('pointer');
  });

  it('disabled — clique não chama onClick', async () => {
    const aoClicar = vi.fn();
    const { container } = await montar(
      <Button disabled onClick={aoClicar}>
        Ok
      </Button>,
    );

    await clicar(botaoDe(container));

    expect(aoClicar).not.toHaveBeenCalled();
  });

  it('disabled com o mouse em cima — o React ignora o hover em botão desabilitado, sem mudar fundo nem posição', async () => {
    const { container } = await montar(
      <Button disabled variant="primary">
        Ok
      </Button>,
    );

    await passarMouseSobre(botaoDe(container));

    const botao = botaoDe(container);
    expect([botao.style.background, botao.style.transform]).toEqual(['var(--bg-sunken)', 'none']);
  });

  it('hover habilitado e depois fica disabled — volta à posição original e ao visual apagado', async () => {
    const { container, atualizar } = await montar(<Button variant="primary">Ok</Button>);
    await passarMouseSobre(botaoDe(container));

    await atualizar(
      <Button disabled variant="primary">
        Ok
      </Button>,
    );

    const botao = botaoDe(container);
    expect([botao.style.transform, botao.style.background, botao.style.color]).toEqual([
      'none',
      'var(--bg-sunken)',
      'var(--color-ink-subtle)',
    ]);
  });

  it('disabled sem blockedReason — não envolve o button nem põe title', async () => {
    const { container } = await montar(<Button disabled>Ok</Button>);

    expect(container.firstElementChild).toBe(botaoDe(container));
    expect(botaoDe(container).hasAttribute('title')).toBe(false);
  });
});

describe('Button — blockedReason', () => {
  it('disabled com blockedReason — mostra o motivo abaixo do botão', async () => {
    const { container } = await montar(
      <Button disabled blockedReason="Falta a permissão de confirmar">
        Confirmar
      </Button>,
    );

    const envoltorio = elemento<HTMLSpanElement>(container, ':scope > span');
    expect(Array.from(envoltorio.children).map((filho) => [filho.tagName.toLowerCase(), filho.textContent])).toEqual([
      ['button', 'Confirmar'],
      ['span', 'Falta a permissão de confirmar'],
    ]);
  });

  it('disabled com blockedReason — o motivo vira o title do botão', async () => {
    const { container } = await montar(
      <Button disabled blockedReason="Falta a permissão de confirmar">
        Confirmar
      </Button>,
    );

    expect(botaoDe(container).title).toBe('Falta a permissão de confirmar');
  });

  it('disabled com blockedReason — o motivo aparece em cor de atenção', async () => {
    const { container } = await montar(
      <Button disabled blockedReason="Período fechado">
        Confirmar
      </Button>,
    );

    const motivo = elemento<HTMLSpanElement>(container, ':scope > span > span');
    expect(motivo.style.color).toBe('var(--color-attention)');
  });

  it('disabled com blockedReason — o envoltório alinha ao início', async () => {
    const { container } = await montar(
      <Button disabled blockedReason="Período fechado">
        Confirmar
      </Button>,
    );

    const envoltorio = elemento<HTMLSpanElement>(container, ':scope > span');
    expect([envoltorio.style.flexDirection, envoltorio.style.alignItems]).toEqual(['column', 'flex-start']);
  });

  it('disabled com blockedReason e fullWidth — o envoltório estica', async () => {
    const { container } = await montar(
      <Button disabled fullWidth blockedReason="Período fechado">
        Confirmar
      </Button>,
    );

    const envoltorio = elemento<HTMLSpanElement>(container, ':scope > span');
    expect(envoltorio.style.alignItems).toBe('stretch');
  });

  it('disabled com blockedReason e blockedReasonId — o id vai para o motivo, que fica no mesmo lugar', async () => {
    const { container } = await montar(
      <Button disabled blockedReason="Período fechado" blockedReasonId="motivo-do-bloqueio">
        Confirmar
      </Button>,
    );

    const motivo = elemento<HTMLSpanElement>(container, ':scope > span > span');
    expect(motivo.id).toBe('motivo-do-bloqueio');
    expect(motivo.previousElementSibling).toBe(botaoDe(container));
    expect(botaoDe(container).hasAttribute('id')).toBe(false);
  });

  it('disabled com blockedReason e sem blockedReasonId — o motivo não leva id', async () => {
    const { container } = await montar(
      <Button disabled blockedReason="Período fechado">
        Confirmar
      </Button>,
    );

    expect(elemento<HTMLSpanElement>(container, ':scope > span > span').hasAttribute('id')).toBe(false);
  });

  it('blockedReasonId não vai para o button como atributo extra', async () => {
    const { container } = await montar(<Button blockedReasonId="motivo-do-bloqueio">Confirmar</Button>);

    expect(botaoDe(container).hasAttribute('blockedreasonid')).toBe(false);
    expect(botaoDe(container).hasAttribute('id')).toBe(false);
  });

  it('blockedReason sem disabled — não mostra o motivo nem põe title', async () => {
    const { container } = await montar(<Button blockedReason="Período fechado">Confirmar</Button>);

    expect(container.firstElementChild).toBe(botaoDe(container));
    expect(container.textContent).toBe('Confirmar');
    expect(botaoDe(container).hasAttribute('title')).toBe(false);
  });

  it('blockedReason vazio com disabled — não envolve o button', async () => {
    const { container } = await montar(
      <Button disabled blockedReason="">
        Confirmar
      </Button>,
    );

    expect(container.firstElementChild).toBe(botaoDe(container));
  });

  it('habilitado com title próprio — mantém o title', async () => {
    const { container } = await montar(<Button title="Dica">Confirmar</Button>);

    expect(botaoDe(container).title).toBe('Dica');
  });

  it('disabled com title próprio e sem blockedReason — mantém o title', async () => {
    const { container } = await montar(
      <Button disabled title="Dica">
        Confirmar
      </Button>,
    );

    expect(botaoDe(container).title).toBe('Dica');
  });
});

describe('Button — {...rest} aplicado por último', () => {
  it('title próprio com disabled e blockedReason — o title próprio vence o motivo', async () => {
    const { container } = await montar(
      <Button disabled blockedReason="Falta a permissão" title="Dica própria">
        Confirmar
      </Button>,
    );

    expect(botaoDe(container).title).toBe('Dica própria');
  });

  it('title undefined explícito com disabled e blockedReason — apaga o title do motivo', async () => {
    const { container } = await montar(
      <Button disabled blockedReason="Falta a permissão" title={undefined}>
        Confirmar
      </Button>,
    );

    expect(botaoDe(container).hasAttribute('title')).toBe(false);
  });

  it('title próprio com disabled e blockedReason — o motivo continua visível abaixo', async () => {
    const { container } = await montar(
      <Button disabled blockedReason="Falta a permissão" title="Dica própria">
        Confirmar
      </Button>,
    );

    expect(container.textContent).toBe('ConfirmarFalta a permissão');
  });

  it('onMouseEnter próprio — substitui o interno: o hover não muda o visual', async () => {
    const aoEntrar = vi.fn();
    const { container } = await montar(
      <Button variant="ghost" onMouseEnter={aoEntrar}>
        Ok
      </Button>,
    );

    await passarMouseSobre(botaoDe(container));

    const botao = botaoDe(container);
    expect(aoEntrar).toHaveBeenCalledTimes(1);
    expect([botao.style.background, botao.style.transform]).toEqual(['transparent', 'none']);
  });

  it('onMouseLeave próprio — substitui o interno: o visual do hover não é desfeito', async () => {
    const aoSair = vi.fn();
    const { container } = await montar(
      <Button variant="ghost" onMouseLeave={aoSair}>
        Ok
      </Button>,
    );
    await passarMouseSobre(botaoDe(container));

    await tirarMouseDe(botaoDe(container));

    const botao = botaoDe(container);
    expect(aoSair).toHaveBeenCalledTimes(1);
    expect([botao.style.background, botao.style.transform]).toEqual(['var(--color-royal-soft)', 'translateY(-1px)']);
  });

  it('type próprio — substitui o type button', async () => {
    const { container } = await montar(<Button type="submit">Enviar</Button>);

    expect(botaoDe(container).type).toBe('submit');
  });
});

describe('Button — style', () => {
  it('style próprio — sobrepõe o fundo da variante', async () => {
    const { container } = await montar(<Button style={{ background: 'red' }}>Ok</Button>);

    expect(botaoDe(container).style.background).toBe('red');
  });

  it('style próprio com mouse em cima — o fundo próprio vence o do hover', async () => {
    const { container } = await montar(<Button style={{ background: 'red' }}>Ok</Button>);

    await passarMouseSobre(botaoDe(container));

    expect(botaoDe(container).style.background).toBe('red');
  });

  it('style próprio com disabled — o fundo próprio vence o visual apagado', async () => {
    const { container } = await montar(
      <Button disabled style={{ background: 'red' }}>
        Ok
      </Button>,
    );

    expect(botaoDe(container).style.background).toBe('red');
  });

  it('style próprio — mantém o resto do visual da variante', async () => {
    const { container } = await montar(<Button style={{ margin: '4px' }}>Ok</Button>);

    const botao = botaoDe(container);
    expect([botao.style.margin, botao.style.background]).toEqual(['4px', 'var(--action-bg)']);
  });
});
