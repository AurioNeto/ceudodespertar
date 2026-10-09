import { afterEach, describe, expect, it, vi } from 'vitest';
import { clicar, desmontarTudo, elemento, folhaComTexto, montar, todos } from '@/testes/montagem';
import { errosAoClicar } from './apoioDeTeste';
import { AttachmentCapture } from './AttachmentCapture';

afterEach(desmontarTudo);

const DICA = 'Um toque, direto da câmera. Nunca obrigatório.';

const botaoDeCaptura = (container: HTMLElement) => elemento<HTMLButtonElement>(container, 'button');
const botaoDeRemover = (container: HTMLElement) => elemento<HTMLButtonElement>(container, 'button[title="Remover comprovante"]');

describe('AttachmentCapture: sem anexo', () => {
  it('oferece um único botão com o rótulo padrão Comprovante e a dica de um toque', async () => {
    const { container } = await montar(<AttachmentCapture />);
    expect(todos(container, 'button')).toHaveLength(1);
    expect(folhaComTexto(container, 'span', 'Comprovante')).toBeTruthy();
    expect(folhaComTexto(container, 'span', DICA)).toBeTruthy();
  });

  it('aceita rótulo próprio no lugar de Comprovante e mantém a dica', async () => {
    const { container } = await montar(<AttachmentCapture label="Foto da nota" />);
    expect(folhaComTexto(container, 'span', 'Foto da nota')).toBeTruthy();
    expect(container.textContent).not.toContain('Comprovante');
    expect(folhaComTexto(container, 'span', DICA)).toBeTruthy();
  });

  it('o botão tem o ícone de câmera decorativo antes do texto', async () => {
    const { container } = await montar(<AttachmentCapture />);
    const icone = botaoDeCaptura(container).firstElementChild as Element;
    expect(icone.tagName.toLowerCase()).toBe('svg');
    expect(icone.getAttribute('aria-hidden')).toBe('true');
  });

  it('um toque chama onCapture uma vez, sem passo extra', async () => {
    const aoCapturar = vi.fn();
    const { container } = await montar(<AttachmentCapture onCapture={aoCapturar} />);
    await clicar(botaoDeCaptura(container));
    expect(aoCapturar).toHaveBeenCalledOnce();
  });

  it('clicar no texto do botão também captura', async () => {
    const aoCapturar = vi.fn();
    const { container } = await montar(<AttachmentCapture onCapture={aoCapturar} />);
    await clicar(folhaComTexto(container, 'span', DICA));
    expect(aoCapturar).toHaveBeenCalledOnce();
  });

  it('não chama onRemove ao capturar', async () => {
    const aoRemover = vi.fn();
    const { container } = await montar(<AttachmentCapture onCapture={vi.fn()} onRemove={aoRemover} />);
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
        <AttachmentCapture onCapture={vi.fn()} />
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
    const { container } = await montar(<AttachmentCapture {...(filename === undefined ? {} : { filename })} />);
    expect(folhaComTexto(container, 'span', DICA)).toBeTruthy();
    expect(todos(container, 'button[title="Remover comprovante"]')).toHaveLength(0);
  });
});

describe('AttachmentCapture: opcional', () => {
  it('o texto diz que nunca é obrigatório', async () => {
    const { container } = await montar(<AttachmentCapture />);
    expect(container.textContent).toContain('Nunca obrigatório');
  });

  it('não é um campo de formulário nem declara obrigatoriedade', async () => {
    const { container } = await montar(<AttachmentCapture />);
    expect(container.querySelector('input, [required], [aria-required]')).toBeNull();
  });

  it('sem onCapture o toque não lança erro', async () => {
    const { container } = await montar(<AttachmentCapture />);
    expect(await errosAoClicar(botaoDeCaptura(container))).toEqual([]);
  });
});

describe('AttachmentCapture: com anexo', () => {
  it('mostra o nome do arquivo e some a oferta de captura', async () => {
    const { container } = await montar(<AttachmentCapture filename="nota-0912.jpg" />);
    expect(folhaComTexto(container, 'span', 'nota-0912.jpg')).toBeTruthy();
    expect(container.textContent).not.toContain('Um toque');
  });

  it('o rótulo não aparece quando já há arquivo', async () => {
    const { container } = await montar(<AttachmentCapture label="Foto da nota" filename="nota-0912.jpg" />);
    expect(container.textContent).not.toContain('Foto da nota');
    expect(container.textContent).not.toContain('Comprovante');
  });

  it('o único botão é o de remover, que se chama Remover comprovante e não tem texto', async () => {
    const { container } = await montar(<AttachmentCapture filename="nota-0912.jpg" />);
    expect(todos(container, 'button')).toHaveLength(1);
    expect(botaoDeRemover(container).textContent).toBe('');
    expect(botaoDeRemover(container).type).toBe('button');
  });

  it('o ícone de clipe vem antes do nome e o de fechar fica dentro do botão', async () => {
    const { container } = await montar(<AttachmentCapture filename="nota-0912.jpg" />);
    expect(container.firstElementChild?.firstElementChild?.tagName.toLowerCase()).toBe('svg');
    expect(botaoDeRemover(container).querySelector('svg')).not.toBeNull();
  });

  it('remover chama onRemove uma vez e não chama onCapture', async () => {
    const aoRemover = vi.fn();
    const aoCapturar = vi.fn();
    const { container } = await montar(
      <AttachmentCapture filename="nota-0912.jpg" onRemove={aoRemover} onCapture={aoCapturar} />,
    );
    await clicar(botaoDeRemover(container));
    expect(aoRemover).toHaveBeenCalledOnce();
    expect(aoCapturar).not.toHaveBeenCalled();
  });

  it('clicar no nome do arquivo não remove nem captura', async () => {
    const aoRemover = vi.fn();
    const aoCapturar = vi.fn();
    const { container } = await montar(
      <AttachmentCapture filename="nota-0912.jpg" onRemove={aoRemover} onCapture={aoCapturar} />,
    );
    await clicar(folhaComTexto(container, 'span', 'nota-0912.jpg'));
    expect(aoRemover).not.toHaveBeenCalled();
    expect(aoCapturar).not.toHaveBeenCalled();
  });

  it('sem onRemove remover não lança erro', async () => {
    const { container } = await montar(<AttachmentCapture filename="nota-0912.jpg" />);
    expect(await errosAoClicar(botaoDeRemover(container))).toEqual([]);
  });

  it('nome longo fica numa linha só, cortado com reticências', async () => {
    const { container } = await montar(<AttachmentCapture filename={`${'a'.repeat(120)}.jpg`} />);
    const nome = folhaComTexto<HTMLElement>(container, 'span', `${'a'.repeat(120)}.jpg`);
    expect(nome.style.whiteSpace).toBe('nowrap');
    expect(nome.style.textOverflow).toBe('ellipsis');
  });

  it('o botão de remover tem alvo mínimo de toque', async () => {
    const { container } = await montar(<AttachmentCapture filename="nota-0912.jpg" />);
    expect(botaoDeRemover(container).style.minHeight).toBe('var(--tap-min)');
    expect(botaoDeRemover(container).style.minWidth).toBe('var(--tap-min)');
  });
});

describe('AttachmentCapture: troca entre os dois estados', () => {
  it('anexar e remover pelas props alternam entre a captura e o arquivo', async () => {
    const montado = await montar(<AttachmentCapture />);
    expect(todos(montado.container, 'button[title="Remover comprovante"]')).toHaveLength(0);
    await montado.atualizar(<AttachmentCapture filename="nota-0912.jpg" />);
    expect(folhaComTexto(montado.container, 'span', 'nota-0912.jpg')).toBeTruthy();
    await montado.atualizar(<AttachmentCapture filename={null} />);
    expect(folhaComTexto(montado.container, 'span', DICA)).toBeTruthy();
  });
});

describe('AttachmentCapture: densidade', () => {
  it.each([
    ['sem densidade, vale a de campo', undefined, 'var(--target-field)'],
    ['campo', 'field', 'var(--target-field)'],
    ['escritório', 'office', 'var(--target-office)'],
  ] as const)('sem anexo, %s: altura mínima %s', async (_nome, densidade, altura) => {
    const { container } = await montar(densidade ? <AttachmentCapture density={densidade} /> : <AttachmentCapture />);
    expect(botaoDeCaptura(container).style.minHeight).toBe(altura);
  });

  it.each([
    ['sem densidade, vale a de campo', undefined, 'var(--target-field)'],
    ['campo', 'field', 'var(--target-field)'],
    ['escritório', 'office', 'var(--target-office)'],
  ] as const)('com anexo, %s: altura mínima %s', async (_nome, densidade, altura) => {
    const { container } = await montar(
      densidade ? <AttachmentCapture filename="nota.jpg" density={densidade} /> : <AttachmentCapture filename="nota.jpg" />,
    );
    expect((container.firstElementChild as HTMLElement).style.minHeight).toBe(altura);
  });

  it('o style recebido vence o padrão nos dois estados', async () => {
    const semAnexo = await montar(<AttachmentCapture style={{ gap: 2 }} />);
    const comAnexo = await montar(<AttachmentCapture filename="nota.jpg" style={{ gap: 2 }} />);
    expect((semAnexo.container.firstElementChild as HTMLElement).style.gap).toBe('2px');
    expect((comAnexo.container.firstElementChild as HTMLElement).style.gap).toBe('2px');
  });
});
