import { afterEach, describe, expect, it, vi } from 'vitest';
import { clicar, desmontarTudo, elemento, folhaComTexto, montar, todos } from '@/testes/montagem';
import { errosAoClicar, glifoDe } from './apoioDeTeste';
import { AttachmentCapture } from './AttachmentCapture';

afterEach(desmontarTudo);

const TEXTOS = {
  label: 'Rótulo do consumidor',
  hint: 'Dica do consumidor.',
  removeLabel: 'Remoção do consumidor',
} as const;
const DICA = TEXTOS.hint;
const SELETOR_DE_REMOVER = `button[title="${TEXTOS.removeLabel}"]`;

const botaoDeCaptura = (container: HTMLElement) => elemento<HTMLButtonElement>(container, 'button');
const botaoDeRemover = (container: HTMLElement) => elemento<HTMLButtonElement>(container, SELETOR_DE_REMOVER);

describe('AttachmentCapture: sem anexo', () => {
  it('oferece um único botão com o rótulo e a dica recebidos por prop', async () => {
    const { container } = await montar(<AttachmentCapture {...TEXTOS} />);
    expect(todos(container, 'button')).toHaveLength(1);
    expect(folhaComTexto(container, 'span', TEXTOS.label)).toBeTruthy();
    expect(folhaComTexto(container, 'span', DICA)).toBeTruthy();
  });

  it('o único texto do botão é o rótulo seguido da dica: o componente não escreve nada além', async () => {
    const { container } = await montar(<AttachmentCapture {...TEXTOS} />);
    expect(botaoDeCaptura(container).textContent).toBe(`${TEXTOS.label}${TEXTOS.hint}`);
  });

  it('trocar rótulo e dica troca o texto do botão inteiro', async () => {
    const { container } = await montar(<AttachmentCapture {...TEXTOS} label="Foto da nota" hint="Sem pressa." />);
    expect(folhaComTexto(container, 'span', 'Foto da nota')).toBeTruthy();
    expect(folhaComTexto(container, 'span', 'Sem pressa.')).toBeTruthy();
    expect(container.textContent).not.toContain(TEXTOS.label);
    expect(container.textContent).not.toContain(DICA);
  });

  it('o botão tem o ícone de câmera decorativo antes do texto', async () => {
    const { container } = await montar(<AttachmentCapture {...TEXTOS} />);
    const icone = botaoDeCaptura(container).firstElementChild as Element;
    expect(icone.tagName.toLowerCase()).toBe('svg');
    expect(icone.getAttribute('aria-hidden')).toBe('true');
    expect(glifoDe(icone)).toBe('camera');
  });

  it('um toque chama onCapture uma vez, sem passo extra', async () => {
    const aoCapturar = vi.fn();
    const { container } = await montar(<AttachmentCapture {...TEXTOS} onCapture={aoCapturar} />);
    await clicar(botaoDeCaptura(container));
    expect(aoCapturar).toHaveBeenCalledOnce();
  });

  it('clicar no texto do botão também captura', async () => {
    const aoCapturar = vi.fn();
    const { container } = await montar(<AttachmentCapture {...TEXTOS} onCapture={aoCapturar} />);
    await clicar(folhaComTexto(container, 'span', DICA));
    expect(aoCapturar).toHaveBeenCalledOnce();
  });

  it('não chama onRemove ao capturar', async () => {
    const aoRemover = vi.fn();
    const { container } = await montar(<AttachmentCapture {...TEXTOS} onCapture={vi.fn()} onRemove={aoRemover} />);
    await clicar(botaoDeCaptura(container));
    expect(aoRemover).not.toHaveBeenCalled();
  });

  it('o botão é de tipo button e dentro de um formulário não o envia', async () => {
    const aoEnviar = vi.fn();
    const { container } = await montar(
      <form
        onSubmit={(evento) => {
          evento.preventDefault();
          aoEnviar();
        }}
      >
        <AttachmentCapture {...TEXTOS} onCapture={vi.fn()} />
      </form>,
    );
    await clicar(botaoDeCaptura(container));
    expect(aoEnviar).not.toHaveBeenCalled();
    expect(botaoDeCaptura(container).type).toBe('button');
  });

  it.each([
    ['null', null],
    ['ausente', undefined],
    ['texto vazio', ''],
  ])('com filename %s ainda oferece a captura', async (_descricao, filename) => {
    const { container } = await montar(<AttachmentCapture {...TEXTOS} {...(filename === undefined ? {} : { filename })} />);
    expect(folhaComTexto(container, 'span', DICA)).toBeTruthy();
    expect(todos(container, SELETOR_DE_REMOVER)).toHaveLength(0);
  });
});

describe('AttachmentCapture: textos vazios', () => {
  const TEXTOS_VAZIOS = { label: '', hint: '', removeLabel: '' } as const;

  it('sem anexo — o botão fica sem texto: o componente não escreve rótulo nem dica', async () => {
    const { container } = await montar(<AttachmentCapture {...TEXTOS_VAZIOS} />);

    expect(botaoDeCaptura(container).textContent).toBe('');
  });

  it('com anexo — o botão de remover fica sem nome: o componente não escreve o nome da remoção', async () => {
    const { container } = await montar(<AttachmentCapture {...TEXTOS_VAZIOS} filename="nota-0912.jpg" />);

    const remover = elemento<HTMLButtonElement>(container, 'button');
    expect(remover.getAttribute('title')).toBe('');
    expect(remover.hasAttribute('aria-label')).toBe(false);
    expect(container.textContent).toBe('nota-0912.jpg');
  });
});

describe('AttachmentCapture: opcional', () => {
  it('não é um campo de formulário nem declara obrigatoriedade', async () => {
    const { container } = await montar(<AttachmentCapture {...TEXTOS} />);
    expect(container.querySelector('input, [required], [aria-required]')).toBeNull();
  });

  it('sem onCapture o toque não lança erro', async () => {
    const { container } = await montar(<AttachmentCapture {...TEXTOS} />);
    expect(await errosAoClicar(botaoDeCaptura(container))).toEqual([]);
  });
});

describe('AttachmentCapture: com anexo', () => {
  it('mostra o nome do arquivo e some a oferta de captura', async () => {
    const { container } = await montar(<AttachmentCapture {...TEXTOS} filename="nota-0912.jpg" />);
    expect(folhaComTexto(container, 'span', 'nota-0912.jpg')).toBeTruthy();
    expect(container.textContent).not.toContain(DICA);
  });

  it('o rótulo não aparece quando já há arquivo', async () => {
    const { container } = await montar(<AttachmentCapture {...TEXTOS} label="Foto da nota" filename="nota-0912.jpg" />);
    expect(container.textContent).not.toContain('Foto da nota');
    expect(container.textContent).not.toContain(TEXTOS.label);
  });

  it('o único botão é o de remover, que se chama como o removeLabel recebido e não tem texto', async () => {
    const { container } = await montar(<AttachmentCapture {...TEXTOS} filename="nota-0912.jpg" />);
    expect(todos(container, 'button')).toHaveLength(1);
    expect(botaoDeRemover(container).title).toBe(TEXTOS.removeLabel);
    expect(botaoDeRemover(container).textContent).toBe('');
    expect(botaoDeRemover(container).type).toBe('button');
  });

  it('o nome acessível do botão de remover é o removeLabel: sem aria-label que o sobreponha e com ícone decorativo', async () => {
    const { container } = await montar(<AttachmentCapture {...TEXTOS} filename="nota-0912.jpg" />);
    const remover = botaoDeRemover(container);
    expect(remover.hasAttribute('aria-label')).toBe(false);
    expect(remover.hasAttribute('aria-labelledby')).toBe(false);
    expect(elemento(remover, 'svg').getAttribute('aria-hidden')).toBe('true');
    expect(remover.title).toBe(TEXTOS.removeLabel);
  });

  it('o nome do botão de remover acompanha o removeLabel: trocar a prop troca o title', async () => {
    const { container } = await montar(
      <AttachmentCapture {...TEXTOS} removeLabel="Tirar anexo" filename="nota-0912.jpg" />,
    );
    expect(elemento<HTMLButtonElement>(container, 'button').title).toBe('Tirar anexo');
  });

  it('o único texto visível é o nome do arquivo: o componente não escreve nada além', async () => {
    const { container } = await montar(<AttachmentCapture {...TEXTOS} filename="nota-0912.jpg" />);
    expect(container.textContent).toBe('nota-0912.jpg');
  });

  it('o ícone de clipe vem antes do nome e o de fechar fica dentro do botão', async () => {
    const { container } = await montar(<AttachmentCapture {...TEXTOS} filename="nota-0912.jpg" />);
    const clipe = container.firstElementChild?.firstElementChild as Element;
    expect(clipe.tagName.toLowerCase()).toBe('svg');
    expect(glifoDe(clipe)).toBe('paperclip');
    expect(glifoDe(elemento(botaoDeRemover(container), 'svg'))).toBe('x');
  });

  it('remover chama onRemove uma vez e não chama onCapture', async () => {
    const aoRemover = vi.fn();
    const aoCapturar = vi.fn();
    const { container } = await montar(
      <AttachmentCapture {...TEXTOS} filename="nota-0912.jpg" onRemove={aoRemover} onCapture={aoCapturar} />,
    );
    await clicar(botaoDeRemover(container));
    expect(aoRemover).toHaveBeenCalledOnce();
    expect(aoCapturar).not.toHaveBeenCalled();
  });

  it('clicar no nome do arquivo não remove nem captura', async () => {
    const aoRemover = vi.fn();
    const aoCapturar = vi.fn();
    const { container } = await montar(
      <AttachmentCapture {...TEXTOS} filename="nota-0912.jpg" onRemove={aoRemover} onCapture={aoCapturar} />,
    );
    await clicar(folhaComTexto(container, 'span', 'nota-0912.jpg'));
    expect(aoRemover).not.toHaveBeenCalled();
    expect(aoCapturar).not.toHaveBeenCalled();
  });

  it('sem onRemove remover não lança erro', async () => {
    const { container } = await montar(<AttachmentCapture {...TEXTOS} filename="nota-0912.jpg" />);
    expect(await errosAoClicar(botaoDeRemover(container))).toEqual([]);
  });

  it('nome longo fica numa linha só, cortado com reticências', async () => {
    const { container } = await montar(<AttachmentCapture {...TEXTOS} filename={`${'a'.repeat(120)}.jpg`} />);
    const nome = folhaComTexto<HTMLElement>(container, 'span', `${'a'.repeat(120)}.jpg`);
    expect(nome.style.whiteSpace).toBe('nowrap');
    expect(nome.style.textOverflow).toBe('ellipsis');
  });

  it('o botão de remover tem alvo mínimo de toque', async () => {
    const { container } = await montar(<AttachmentCapture {...TEXTOS} filename="nota-0912.jpg" />);
    expect(botaoDeRemover(container).style.minHeight).toBe('var(--tap-min)');
    expect(botaoDeRemover(container).style.minWidth).toBe('var(--tap-min)');
  });
});

describe('AttachmentCapture: troca entre os dois estados', () => {
  it('anexar e remover pelas props alternam entre a captura e o arquivo', async () => {
    const montado = await montar(<AttachmentCapture {...TEXTOS} />);
    expect(todos(montado.container, SELETOR_DE_REMOVER)).toHaveLength(0);
    await montado.atualizar(<AttachmentCapture {...TEXTOS} filename="nota-0912.jpg" />);
    expect(folhaComTexto(montado.container, 'span', 'nota-0912.jpg')).toBeTruthy();
    await montado.atualizar(<AttachmentCapture {...TEXTOS} filename={null} />);
    expect(folhaComTexto(montado.container, 'span', DICA)).toBeTruthy();
  });
});

describe('AttachmentCapture: densidade', () => {
  it.each([
    { nome: 'sem densidade, vale a de campo', densidade: undefined, altura: 'var(--target-field)' },
    { nome: 'campo', densidade: 'field', altura: 'var(--target-field)' },
    { nome: 'escritório', densidade: 'office', altura: 'var(--target-office)' },
  ] as const)('sem anexo, $nome: altura mínima $altura', async ({ densidade, altura }) => {
    const { container } = await montar(densidade ? <AttachmentCapture {...TEXTOS} density={densidade} /> : <AttachmentCapture {...TEXTOS} />);
    expect(botaoDeCaptura(container).style.minHeight).toBe(altura);
  });

  it.each([
    { nome: 'sem densidade, vale a de campo', densidade: undefined, altura: 'var(--target-field)' },
    { nome: 'campo', densidade: 'field', altura: 'var(--target-field)' },
    { nome: 'escritório', densidade: 'office', altura: 'var(--target-office)' },
  ] as const)('com anexo, $nome: altura mínima $altura', async ({ densidade, altura }) => {
    const { container } = await montar(
      densidade ? <AttachmentCapture {...TEXTOS} filename="nota.jpg" density={densidade} /> : <AttachmentCapture {...TEXTOS} filename="nota.jpg" />,
    );
    expect((container.firstElementChild as HTMLElement).style.minHeight).toBe(altura);
  });

  it('o style recebido vence o padrão nos dois estados', async () => {
    const semAnexo = await montar(<AttachmentCapture {...TEXTOS} style={{ gap: 2 }} />);
    const comAnexo = await montar(<AttachmentCapture {...TEXTOS} filename="nota.jpg" style={{ gap: 2 }} />);
    expect((semAnexo.container.firstElementChild as HTMLElement).style.gap).toBe('2px');
    expect((comAnexo.container.firstElementChild as HTMLElement).style.gap).toBe('2px');
  });
});
