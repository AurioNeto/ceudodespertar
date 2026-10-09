import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clicar, desmontarTudo, elemento, folhaComTexto, montar, todos } from '@/testes/montagem';
import { errosAoClicar } from './apoioDeTeste';
import { BottomSheet, type SheetOption } from './BottomSheet';

afterEach(desmontarTudo);

const OPCOES: readonly SheetOption[] = [
  { value: 'cora', label: 'Cora PJ', meta: 'Conta principal' },
  { value: 'caixa', label: 'Caixa físico' },
  { value: 'cofre', label: 'Cofre', meta: 'Reserva' },
];

const fundoEscurecido = (container: HTMLElement) => container.firstElementChild as HTMLElement;
const painel = (container: HTMLElement) => fundoEscurecido(container).firstElementChild as HTMLElement;
const botoesDeOpcao = (container: HTMLElement) => todos<HTMLButtonElement>(container, 'button');
const temCheck = (botao: HTMLElement) => botao.querySelector('svg') !== null;
const opcoesMarcadas = (container: HTMLElement) => botoesDeOpcao(container).map(temCheck);

const teclar = (alvo: EventTarget, key: string) =>
  act(async () => {
    alvo.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  });

describe('BottomSheet: abertura', () => {
  it('com open falso não renderiza nada', async () => {
    const { container } = await montar(<BottomSheet open={false} options={OPCOES} />);
    expect(container.children).toHaveLength(0);
  });

  it('sem a prop open nasce aberto', async () => {
    const { container } = await montar(<BottomSheet options={OPCOES} />);
    expect(botoesDeOpcao(container)).toHaveLength(OPCOES.length);
  });

  it('trocar open de verdadeiro para falso tira a folha da tela', async () => {
    const montado = await montar(<BottomSheet open options={OPCOES} />);
    await montado.atualizar(<BottomSheet open={false} options={OPCOES} />);
    expect(montado.container.children).toHaveLength(0);
  });

  it('mostra o título quando ele é informado', async () => {
    const { container } = await montar(<BottomSheet title="Conta de origem" options={OPCOES} />);
    expect(folhaComTexto(container, 'div', 'Conta de origem')).toBeTruthy();
  });

  it('sem título o painel só tem o puxador e as opções', async () => {
    const { container } = await montar(<BottomSheet options={OPCOES} />);
    expect(painel(container).children).toHaveLength(1 + OPCOES.length);
  });

  it('com título o painel ganha um bloco a mais entre o puxador e as opções', async () => {
    const { container } = await montar(<BottomSheet title="Conta de origem" options={OPCOES} />);
    expect(painel(container).children).toHaveLength(2 + OPCOES.length);
  });

  it('sem opções mostra só o título e nenhum botão', async () => {
    const { container } = await montar(<BottomSheet title="Conta de origem" />);
    expect(botoesDeOpcao(container)).toHaveLength(0);
    expect(painel(container).children).toHaveLength(2);
  });
});

describe('BottomSheet: opções', () => {
  it('lista as opções na ordem recebida, com o complemento colado ao rótulo', async () => {
    const { container } = await montar(<BottomSheet options={OPCOES} />);
    expect(botoesDeOpcao(container).map((botao) => botao.textContent)).toEqual([
      'Cora PJConta principal',
      'Caixa físico',
      'CofreReserva',
    ]);
  });

  it('só a opção com complemento ganha o bloco de complemento', async () => {
    const { container } = await montar(<BottomSheet options={OPCOES} />);
    const blocosDeTexto = botoesDeOpcao(container).map((botao) => botao.querySelectorAll('span').length);
    expect(blocosDeTexto).toEqual([3, 2, 3]);
  });

  it('as opções são botões de tipo button, que não enviam formulário', async () => {
    const { container } = await montar(<BottomSheet options={OPCOES} />);
    expect(botoesDeOpcao(container).map((botao) => botao.type)).toEqual(['button', 'button', 'button']);
  });
});

describe('BottomSheet: seleção', () => {
  it.each([
    ['null', null],
    ['ausente', undefined],
    ['que não está nas opções', 'inexistente'],
  ])('com value %s nenhuma opção fica marcada', async (_descricao, value) => {
    const { container } = await montar(<BottomSheet options={OPCOES} value={value} />);
    expect(opcoesMarcadas(container)).toEqual([false, false, false]);
  });

  it('marca com check só a opção cujo value bate', async () => {
    const { container } = await montar(<BottomSheet options={OPCOES} value="caixa" />);
    expect(opcoesMarcadas(container)).toEqual([false, true, false]);
  });

  it('a opção marcada ganha o fundo royal suave e as outras ficam transparentes', async () => {
    const { container } = await montar(<BottomSheet options={OPCOES} value="caixa" />);
    expect(botoesDeOpcao(container).map((botao) => botao.style.background)).toEqual([
      'transparent',
      'var(--color-royal-soft)',
      'transparent',
    ]);
  });

  it('a marca é só visual: a opção escolhida não declara estado por atributo ARIA', async () => {
    const { container } = await montar(<BottomSheet options={OPCOES} value="caixa" />);
    expect(container.querySelector('[aria-selected], [aria-checked], [aria-pressed], [aria-current]')).toBeNull();
  });

  it('clicar numa opção chama onSelect uma vez com o value dela', async () => {
    const onSelect = vi.fn();
    const { container } = await montar(<BottomSheet options={OPCOES} onSelect={onSelect} />);
    await clicar(botoesDeOpcao(container)[2] as HTMLElement);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('cofre');
  });

  it('clicar numa opção não fecha a folha nem avisa onClose', async () => {
    const onClose = vi.fn();
    const { container } = await montar(<BottomSheet options={OPCOES} onSelect={vi.fn()} onClose={onClose} />);
    await clicar(botoesDeOpcao(container)[0] as HTMLElement);
    expect(onClose).not.toHaveBeenCalled();
    expect(botoesDeOpcao(container)).toHaveLength(OPCOES.length);
  });

  it('clicar na opção já marcada chama onSelect de novo com o mesmo value, sem alternar', async () => {
    const onSelect = vi.fn();
    const { container } = await montar(<BottomSheet options={OPCOES} value="cora" onSelect={onSelect} />);
    await clicar(botoesDeOpcao(container)[0] as HTMLElement);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('cora');
  });

  it('a marca só muda quando quem usa troca o value: a folha não guarda seleção', async () => {
    const montado = await montar(<BottomSheet options={OPCOES} value="cora" onSelect={vi.fn()} />);
    await clicar(botoesDeOpcao(montado.container)[1] as HTMLElement);
    expect(opcoesMarcadas(montado.container)).toEqual([true, false, false]);
    await montado.atualizar(<BottomSheet options={OPCOES} value="caixa" onSelect={vi.fn()} />);
    expect(opcoesMarcadas(montado.container)).toEqual([false, true, false]);
  });

  it('sem onSelect clicar numa opção não lança erro', async () => {
    const { container } = await montar(<BottomSheet options={OPCOES} />);
    expect(await errosAoClicar(botoesDeOpcao(container)[0] as HTMLElement)).toEqual([]);
  });
});

describe('BottomSheet: fechar', () => {
  it('clicar no fundo escurecido chama onClose uma vez', async () => {
    const onClose = vi.fn();
    const { container } = await montar(<BottomSheet options={OPCOES} onClose={onClose} />);
    await clicar(fundoEscurecido(container));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('clicar no painel, no título ou no puxador não fecha', async () => {
    const onClose = vi.fn();
    const { container } = await montar(<BottomSheet title="Conta de origem" options={OPCOES} onClose={onClose} />);
    await clicar(painel(container));
    await clicar(folhaComTexto(container, 'div', 'Conta de origem'));
    await clicar(elemento(container, 'span'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('não há botão de fechar: todos os botões são opções', async () => {
    const { container } = await montar(<BottomSheet title="Conta de origem" options={OPCOES} onClose={vi.fn()} />);
    expect(botoesDeOpcao(container)).toHaveLength(OPCOES.length);
    expect(container.querySelector('[aria-label], [title]')).toBeNull();
  });

  it('Esc não fecha: a folha não escuta o teclado', async () => {
    const onClose = vi.fn();
    const { container } = await montar(<BottomSheet options={OPCOES} onClose={onClose} />);
    const primeira = botoesDeOpcao(container)[0] as HTMLElement;
    primeira.focus();
    await teclar(primeira, 'Escape');
    await teclar(document.body, 'Escape');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('sem onClose clicar no fundo não lança erro', async () => {
    const { container } = await montar(<BottomSheet options={OPCOES} />);
    expect(await errosAoClicar(fundoEscurecido(container))).toEqual([]);
  });
});

describe('BottomSheet: foco e semântica', () => {
  it('abrir não move o foco para dentro da folha', async () => {
    const anterior = document.createElement('button');
    document.body.append(anterior);
    anterior.focus();
    await montar(<BottomSheet options={OPCOES} />);
    expect(document.activeElement).toBe(anterior);
    anterior.remove();
  });

  it('não se declara como diálogo: sem papel nem aria-modal', async () => {
    const { container } = await montar(<BottomSheet title="Conta de origem" options={OPCOES} />);
    expect(container.querySelector('[role], [aria-modal], [aria-labelledby]')).toBeNull();
  });

  it('não torna o resto da página inerte', async () => {
    const vizinho = document.createElement('div');
    document.body.append(vizinho);
    await montar(<BottomSheet options={OPCOES} />);
    expect(vizinho.hasAttribute('inert')).toBe(false);
    vizinho.remove();
  });
});

describe('BottomSheet: estilo recebido', () => {
  it('nasce posicionada de forma absoluta sobre o pai', async () => {
    const { container } = await montar(<BottomSheet options={OPCOES} />);
    expect(fundoEscurecido(container).style.position).toBe('absolute');
  });

  it('o style recebido vai para o fundo escurecido e vence o posicionamento padrão', async () => {
    const { container } = await montar(<BottomSheet options={OPCOES} style={{ position: 'fixed' }} />);
    expect(fundoEscurecido(container).style.position).toBe('fixed');
  });
});
