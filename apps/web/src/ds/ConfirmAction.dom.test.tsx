import { afterEach, describe, expect, it, vi } from 'vitest';
import { botaoComTexto, clicar, desmontarTudo, elemento, folhaComTexto, montar, todos } from '@/testes/montagem';
import { ConfirmAction, type ConfirmActionProps } from './ConfirmAction';

afterEach(desmontarTudo);

const NOTA_PADRAO = 'Confirmar é irreversível. Depois disso, só estorno.';
const ORIENTACAO_DO_BLOQUEIO = 'Resolva o que falta acima, ou pergunte a quem registrou.';

const confirmacao = (props: ConfirmActionProps = {}) => <ConfirmAction {...props} />;

describe('ConfirmAction: sem bloqueio', () => {
  it('diz que é irreversível antes do botão de confirmar', async () => {
    const { container } = await montar(confirmacao());
    const nota = folhaComTexto(container, 'p', NOTA_PADRAO);
    const botao = botaoComTexto(container, 'Confirmar');
    expect(nota.compareDocumentPosition(botao)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('o botão se chama Confirmar e está habilitado', async () => {
    const { container } = await montar(confirmacao());
    expect(botaoComTexto(container, 'Confirmar').disabled).toBe(false);
  });

  it('não mostra aviso de bloqueio nem orientação para resolver', async () => {
    const { container } = await montar(confirmacao());
    expect(container.textContent).not.toContain('Não dá para confirmar');
    expect(container.textContent).not.toContain(ORIENTACAO_DO_BLOQUEIO);
    expect(botaoComTexto(container, 'Confirmar').hasAttribute('title')).toBe(false);
  });

  it('aceita rótulo e nota de irreversibilidade próprios, que substituem os padrões', async () => {
    const { container } = await montar(
      confirmacao({ label: 'Confirmar lançamento', irreversibleNote: 'Depois de confirmado, só com estorno.' }),
    );
    expect(botaoComTexto(container, 'Confirmar lançamento')).toBeTruthy();
    expect(folhaComTexto(container, 'p', 'Depois de confirmado, só com estorno.')).toBeTruthy();
    expect(container.textContent).not.toContain(NOTA_PADRAO);
  });

  it('clicar em confirmar chama onConfirm uma vez', async () => {
    const aoConfirmar = vi.fn();
    const { container } = await montar(confirmacao({ onConfirm: aoConfirmar }));
    await clicar(botaoComTexto(container, 'Confirmar'));
    expect(aoConfirmar).toHaveBeenCalledTimes(1);
  });

  it('onConfirm recebe só o evento de clique, nada que diga o que está sendo confirmado', async () => {
    const aoConfirmar = vi.fn();
    const { container } = await montar(confirmacao({ onConfirm: aoConfirmar }));
    await clicar(botaoComTexto(container, 'Confirmar'));
    const argumentos = aoConfirmar.mock.calls[0] ?? [];
    expect(argumentos).toHaveLength(1);
    expect(argumentos[0]).toMatchObject({ type: 'click' });
  });

  it('sem onConfirm, clicar não falha', async () => {
    const { container } = await montar(confirmacao());
    await expect(clicar(botaoComTexto(container, 'Confirmar'))).resolves.toBeUndefined();
  });

  it('lista de bloqueios vazia equivale a sem bloqueio', async () => {
    const { container } = await montar(confirmacao({ blockedBy: [] }));
    expect(folhaComTexto(container, 'p', NOTA_PADRAO)).toBeTruthy();
    expect(botaoComTexto(container, 'Confirmar').disabled).toBe(false);
  });
});

describe('ConfirmAction: densidade', () => {
  it('por padrão é de escritório: alvo de escritório e botão que não ocupa a largura toda', async () => {
    const { container } = await montar(confirmacao());
    const botao = botaoComTexto(container, 'Confirmar');
    expect(botao.style.minHeight).toBe('var(--target-office)');
    expect(botao.style.width).toBe('');
  });

  it('em campo, usa o alvo de campo e o botão ocupa a largura toda', async () => {
    const { container } = await montar(confirmacao({ density: 'field' }));
    const botao = botaoComTexto(container, 'Confirmar');
    expect(botao.style.minHeight).toBe('var(--target-field)');
    expect(botao.style.width).toBe('100%');
  });

  it.each([
    ['uma regra', ['falta a categoria']],
    ['várias regras', ['falta a categoria', 'falta a conta']],
  ])('em campo e bloqueado por %s, o botão mantém o alvo de campo e a largura toda', async (_rotulo, blockedBy) => {
    const { container } = await montar(confirmacao({ blockedBy, density: 'field' }));
    const botao = botaoComTexto(container, 'Confirmar');
    expect(botao.style.minHeight).toBe('var(--target-field)');
    expect(botao.style.width).toBe('100%');
  });
});

describe('ConfirmAction: ordem de leitura', () => {
  it('empilha em coluna, sem inverter visualmente a ordem do DOM', async () => {
    const { container } = await montar(confirmacao());
    const raiz = container.firstElementChild as HTMLElement;
    expect(raiz.style.flexDirection).toBe('column');
  });

  it('bloqueado por uma regra, o aviso vem antes do botão', async () => {
    const { container } = await montar(confirmacao({ blockedBy: ['falta a categoria'] }));
    const aviso = folhaComTexto(container, 'span', 'Não dá para confirmar: falta a categoria');
    const botao = botaoComTexto(container, 'Confirmar');
    expect(aviso.compareDocumentPosition(botao)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('bloqueado por várias regras, o aviso e a lista vêm antes do botão', async () => {
    const { container } = await montar(confirmacao({ blockedBy: ['falta a categoria', 'falta a conta'] }));
    const aviso = folhaComTexto(container, 'span', 'Não dá para confirmar ainda');
    const lista = elemento(container, 'ul');
    const botao = botaoComTexto(container, 'Confirmar');
    expect(aviso.compareDocumentPosition(lista)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(lista.compareDocumentPosition(botao)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});

describe('ConfirmAction: bloqueado por uma regra', () => {
  const umaRegra = { blockedBy: ['falta a categoria'] };

  it('nomeia a regra na própria mensagem', async () => {
    const { container } = await montar(confirmacao(umaRegra));
    expect(folhaComTexto(container, 'span', 'Não dá para confirmar: falta a categoria')).toBeTruthy();
  });

  it('não desdobra uma única regra numa lista', async () => {
    const { container } = await montar(confirmacao(umaRegra));
    expect(todos(container, 'ul, li')).toHaveLength(0);
  });

  it('troca a nota de irreversibilidade pelo aviso: a nota não aparece bloqueado', async () => {
    const { container } = await montar(confirmacao(umaRegra));
    expect(container.textContent).not.toContain(NOTA_PADRAO);
  });

  it('o botão fica desabilitado, com a orientação visível e como dica do botão', async () => {
    const { container } = await montar(confirmacao(umaRegra));
    const botao = botaoComTexto(container, 'Confirmar');
    expect(botao.disabled).toBe(true);
    expect(botao.title).toBe(ORIENTACAO_DO_BLOQUEIO);
    expect(folhaComTexto(container, 'span', ORIENTACAO_DO_BLOQUEIO)).toBeTruthy();
  });

  it('clicar no botão bloqueado não chama onConfirm', async () => {
    const aoConfirmar = vi.fn();
    const { container } = await montar(confirmacao({ ...umaRegra, onConfirm: aoConfirmar }));
    await clicar(botaoComTexto(container, 'Confirmar'));
    expect(aoConfirmar).not.toHaveBeenCalled();
  });

  it('o rótulo próprio também aparece no botão bloqueado', async () => {
    const { container } = await montar(confirmacao({ ...umaRegra, label: 'Confirmar lançamento' }));
    expect(botaoComTexto(container, 'Confirmar lançamento').disabled).toBe(true);
  });

  it('a orientação do bloqueio é a mesma para qualquer regra', async () => {
    const { container } = await montar(confirmacao({ blockedBy: ['o período está fechado'] }));
    expect(folhaComTexto(container, 'span', ORIENTACAO_DO_BLOQUEIO)).toBeTruthy();
  });
});

describe('ConfirmAction: bloqueado por várias regras', () => {
  const duasRegras = { blockedBy: ['falta a categoria', 'falta a conta'] };

  it('o aviso não nomeia regra nenhuma: vem só a frase geral', async () => {
    const { container } = await montar(confirmacao(duasRegras));
    expect(folhaComTexto(container, 'span', 'Não dá para confirmar ainda')).toBeTruthy();
    expect(container.textContent).not.toContain('Não dá para confirmar:');
  });

  it('lista cada regra, na ordem recebida', async () => {
    const { container } = await montar(confirmacao(duasRegras));
    const itens = todos(container, 'ul > li').map((item) => item.textContent);
    expect(itens).toEqual(['falta a categoria', 'falta a conta']);
  });

  it('o botão fica desabilitado e a nota de irreversibilidade não aparece', async () => {
    const { container } = await montar(confirmacao(duasRegras));
    expect(botaoComTexto(container, 'Confirmar').disabled).toBe(true);
    expect(container.textContent).not.toContain(NOTA_PADRAO);
  });
});

describe('ConfirmAction: a lista de bloqueios muda', () => {
  it('ao esvaziar, volta a nota de irreversibilidade e o botão confirma', async () => {
    const aoConfirmar = vi.fn();
    const montado = await montar(confirmacao({ blockedBy: ['falta a categoria'], onConfirm: aoConfirmar }));
    await montado.atualizar(confirmacao({ blockedBy: [], onConfirm: aoConfirmar }));
    await clicar(botaoComTexto(montado.container, 'Confirmar'));
    expect(folhaComTexto(montado.container, 'p', NOTA_PADRAO)).toBeTruthy();
    expect(montado.container.textContent).not.toContain('Não dá para confirmar');
    expect(aoConfirmar).toHaveBeenCalledTimes(1);
  });

  it('ao ganhar uma regra, o botão passa a bloquear', async () => {
    const montado = await montar(confirmacao());
    await montado.atualizar(confirmacao({ blockedBy: ['falta a categoria'] }));
    expect(botaoComTexto(montado.container, 'Confirmar').disabled).toBe(true);
  });
});

describe('ConfirmAction: style', () => {
  it('o style recebido prevalece sobre o do próprio componente', async () => {
    const { container } = await montar(confirmacao({ style: { gap: 0, marginTop: 20 } }));
    const raiz = container.firstElementChild as HTMLElement;
    expect(raiz.style.gap).toBe('0px');
    expect(raiz.style.marginTop).toBe('20px');
  });
});
