import { afterEach, describe, expect, it, vi } from 'vitest';
import { botaoComTexto, clicar, desmontarTudo, elemento, folhaComTexto, montar, todos } from '@/testes/montagem';
import { ConfirmAction, type ConfirmActionProps } from './ConfirmAction';

afterEach(desmontarTudo);

const NOTA_DE_IRREVERSIBILIDADE = 'Lançamento confirmado só se corrige com estorno.';
const ORIENTACAO_DO_BLOQUEIO = 'Complete o cadastro ou fale com quem registrou.';
const CABECALHO_DE_VARIAS_REGRAS = 'Faltam algumas coisas antes de confirmar';
const FRASE_DE_UMA_REGRA = 'Falta resolver:';
const cabecalhoComARegra = (regra: string) => `${FRASE_DE_UMA_REGRA} ${regra}`;

const textosDoConsumidor = {
  irreversibleNote: NOTA_DE_IRREVERSIBILIDADE,
  blockedGuidance: ORIENTACAO_DO_BLOQUEIO,
  blockedHeadingForOneRule: FRASE_DE_UMA_REGRA,
  blockedHeadingForManyRules: CABECALHO_DE_VARIAS_REGRAS,
};

const confirmacao = (props: Partial<ConfirmActionProps> = {}) => (
  <ConfirmAction {...textosDoConsumidor} {...props} />
);

const TEXTOS_QUE_O_COMPONENTE_TRAZIA_ESCRITOS = [
  'Confirmar é irreversível. Depois disso, só estorno.',
  'Não dá para confirmar',
  'Resolva o que falta acima, ou pergunte a quem registrou.',
];

const avisoDeUmaRegra = (origem: ParentNode, regra: string) =>
  folhaComTexto(origem, 'span', regra).parentElement as HTMLElement;

const SITUACOES_DE_BLOQUEIO: ReadonlyArray<[string, readonly string[]]> = [
  ['sem bloqueio', []],
  ['com uma regra', ['falta a categoria']],
  ['com várias regras', ['falta a categoria', 'falta a conta']],
];

describe('ConfirmAction: nenhum texto de negócio escrito no componente', () => {
  it('sem bloqueio, escreve só a nota do consumidor e o rótulo do botão', async () => {
    const { container } = await montar(confirmacao());
    expect(container.textContent).toBe(`${NOTA_DE_IRREVERSIBILIDADE}Confirmar`);
  });

  it('bloqueado por uma regra, escreve só o cabeçalho do consumidor, o rótulo e a orientação', async () => {
    const { container } = await montar(confirmacao({ blockedBy: ['falta a categoria'] }));
    expect(container.textContent).toBe(
      `${cabecalhoComARegra('falta a categoria')}Confirmar${ORIENTACAO_DO_BLOQUEIO}`,
    );
  });

  it('bloqueado por várias regras, escreve só o cabeçalho, as regras, o rótulo e a orientação', async () => {
    const { container } = await montar(confirmacao({ blockedBy: ['falta a categoria', 'falta a conta'] }));
    expect(container.textContent).toBe(
      `${CABECALHO_DE_VARIAS_REGRAS}falta a categoriafalta a contaConfirmar${ORIENTACAO_DO_BLOQUEIO}`,
    );
  });

  it.each(SITUACOES_DE_BLOQUEIO)(
    '%s, nenhum dos textos que o componente trazia escritos aparece',
    async (_situacao, blockedBy) => {
      const { container } = await montar(confirmacao({ blockedBy }));
      TEXTOS_QUE_O_COMPONENTE_TRAZIA_ESCRITOS.forEach((texto) => expect(container.textContent).not.toContain(texto));
    },
  );
});

describe('ConfirmAction: sem bloqueio', () => {
  it('diz que é irreversível antes do botão de confirmar', async () => {
    const { container } = await montar(confirmacao());
    const nota = folhaComTexto(container, 'p', NOTA_DE_IRREVERSIBILIDADE);
    const botao = botaoComTexto(container, 'Confirmar');
    expect(nota.compareDocumentPosition(botao)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('o botão se chama Confirmar e está habilitado', async () => {
    const { container } = await montar(confirmacao());
    expect(botaoComTexto(container, 'Confirmar').disabled).toBe(false);
  });

  it('não mostra aviso de bloqueio nem orientação para resolver', async () => {
    const { container } = await montar(confirmacao());
    expect(container.textContent).not.toContain(FRASE_DE_UMA_REGRA);
    expect(container.textContent).not.toContain(CABECALHO_DE_VARIAS_REGRAS);
    expect(container.textContent).not.toContain(ORIENTACAO_DO_BLOQUEIO);
    expect(botaoComTexto(container, 'Confirmar').hasAttribute('title')).toBe(false);
  });

  it('aceita rótulo próprio, que substitui o padrão', async () => {
    const { container } = await montar(confirmacao({ label: 'Confirmar lançamento' }));
    expect(botaoComTexto(container, 'Confirmar lançamento')).toBeTruthy();
    expect(todos(container, 'button').map((botao) => botao.textContent)).toEqual(['Confirmar lançamento']);
  });

  it('mostra a nota de irreversibilidade exatamente como o consumidor a passou', async () => {
    const { container } = await montar(confirmacao({ irreversibleNote: 'Depois de confirmado, só com estorno.' }));
    expect(folhaComTexto(container, 'p', 'Depois de confirmado, só com estorno.')).toBeTruthy();
    expect(container.textContent).not.toContain(NOTA_DE_IRREVERSIBILIDADE);
  });

  it('clicar em confirmar chama onConfirm uma vez', async () => {
    const aoConfirmar = vi.fn();
    const { container } = await montar(confirmacao({ onConfirm: aoConfirmar }));
    await clicar(botaoComTexto(container, 'Confirmar'));
    expect(aoConfirmar).toHaveBeenCalledTimes(1);
  });

  it('onConfirm é chamado sem argumento algum: o evento de clique não vaza para o consumidor', async () => {
    const aoConfirmar = vi.fn();
    const { container } = await montar(confirmacao({ onConfirm: aoConfirmar }));
    await clicar(botaoComTexto(container, 'Confirmar'));
    expect(aoConfirmar.mock.calls).toEqual([[]]);
  });

  it('sem onConfirm, clicar não dispara erro algum', async () => {
    const errosDaJanela: unknown[] = [];
    const guardarErro = (evento: ErrorEvent) => {
      errosDaJanela.push(evento.error);
      evento.preventDefault();
    };
    window.addEventListener('error', guardarErro);
    try {
      const { container } = await montar(confirmacao());
      await clicar(botaoComTexto(container, 'Confirmar'));
    } finally {
      window.removeEventListener('error', guardarErro);
    }
    expect(errosDaJanela).toEqual([]);
  });

  it('lista de bloqueios vazia equivale a sem bloqueio', async () => {
    const { container } = await montar(confirmacao({ blockedBy: [] }));
    expect(folhaComTexto(container, 'p', NOTA_DE_IRREVERSIBILIDADE)).toBeTruthy();
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
    const aviso = avisoDeUmaRegra(container, 'falta a categoria');
    const botao = botaoComTexto(container, 'Confirmar');
    expect(aviso.compareDocumentPosition(botao)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('bloqueado por várias regras, o aviso e a lista vêm antes do botão', async () => {
    const { container } = await montar(confirmacao({ blockedBy: ['falta a categoria', 'falta a conta'] }));
    const aviso = folhaComTexto(container, 'span', CABECALHO_DE_VARIAS_REGRAS);
    const lista = elemento(container, 'ul');
    const botao = botaoComTexto(container, 'Confirmar');
    expect(aviso.compareDocumentPosition(lista)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(lista.compareDocumentPosition(botao)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});

describe('ConfirmAction: bloqueado por uma regra', () => {
  const umaRegra = { blockedBy: ['falta a categoria'] };

  it('o aviso é a frase do consumidor, um espaço e a regra, que fica num elemento próprio', async () => {
    const { container } = await montar(confirmacao(umaRegra));
    expect(avisoDeUmaRegra(container, 'falta a categoria').textContent).toBe('Falta resolver: falta a categoria');
  });

  it('usa a frase de uma regra e não o cabeçalho de várias', async () => {
    const { container } = await montar(confirmacao(umaRegra));
    expect(container.textContent).toContain(FRASE_DE_UMA_REGRA);
    expect(container.textContent).not.toContain(CABECALHO_DE_VARIAS_REGRAS);
  });

  it('não desdobra uma única regra numa lista', async () => {
    const { container } = await montar(confirmacao(umaRegra));
    expect(todos(container, 'ul, li')).toHaveLength(0);
  });

  it('troca a nota de irreversibilidade pelo aviso: a nota não aparece bloqueado', async () => {
    const { container } = await montar(confirmacao(umaRegra));
    expect(container.textContent).not.toContain(NOTA_DE_IRREVERSIBILIDADE);
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

  it('a orientação do bloqueio é a que o consumidor passou, qualquer que seja a regra', async () => {
    const { container } = await montar(confirmacao({ blockedBy: ['o período está fechado'] }));
    expect(folhaComTexto(container, 'span', ORIENTACAO_DO_BLOQUEIO)).toBeTruthy();
  });
});

describe('ConfirmAction: bloqueado por várias regras', () => {
  const duasRegras = { blockedBy: ['falta a categoria', 'falta a conta'] };

  it('o aviso é o cabeçalho de várias regras do consumidor, sem nomear regra nenhuma', async () => {
    const { container } = await montar(confirmacao(duasRegras));
    expect(folhaComTexto(container, 'span', CABECALHO_DE_VARIAS_REGRAS)).toBeTruthy();
    expect(container.textContent).not.toContain(FRASE_DE_UMA_REGRA);
  });

  it('lista cada regra, na ordem recebida', async () => {
    const { container } = await montar(confirmacao(duasRegras));
    const itens = todos(container, 'ul > li').map((item) => item.textContent);
    expect(itens).toEqual(['falta a categoria', 'falta a conta']);
  });

  it('o botão fica desabilitado e a nota de irreversibilidade não aparece', async () => {
    const { container } = await montar(confirmacao(duasRegras));
    expect(botaoComTexto(container, 'Confirmar').disabled).toBe(true);
    expect(container.textContent).not.toContain(NOTA_DE_IRREVERSIBILIDADE);
  });

  it('a orientação do bloqueio do consumidor aparece também com várias regras', async () => {
    const { container } = await montar(confirmacao(duasRegras));
    expect(botaoComTexto(container, 'Confirmar').title).toBe(ORIENTACAO_DO_BLOQUEIO);
    expect(folhaComTexto(container, 'span', ORIENTACAO_DO_BLOQUEIO)).toBeTruthy();
  });
});

describe('ConfirmAction: regras repetidas', () => {
  const regrasRepetidas = ['falta a conta', 'falta a conta', 'falta a categoria', 'falta a conta'];

  it('lista cada ocorrência, sem juntar as repetidas', async () => {
    const { container } = await montar(confirmacao({ blockedBy: regrasRepetidas }));
    const itens = todos(container, 'ul > li').map((item) => item.textContent);
    expect(itens).toEqual(regrasRepetidas);
  });

  it('não gera aviso de chave repetida do React, ao montar nem ao crescer a lista', async () => {
    const avisos = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const crescida = [...regrasRepetidas, 'falta a conta'];
    const montado = await montar(confirmacao({ blockedBy: regrasRepetidas }));
    await montado.atualizar(confirmacao({ blockedBy: crescida }));
    const itens = todos(montado.container, 'ul > li').map((item) => item.textContent);
    expect(avisos).not.toHaveBeenCalled();
    expect(itens).toEqual(crescida);
    avisos.mockRestore();
  });

  it('com a mesma regra duas vezes, o aviso é o de várias regras e a lista mostra as duas', async () => {
    const { container } = await montar(confirmacao({ blockedBy: ['falta a conta', 'falta a conta'] }));
    expect(folhaComTexto(container, 'span', CABECALHO_DE_VARIAS_REGRAS)).toBeTruthy();
    expect(todos(container, 'ul > li')).toHaveLength(2);
  });
});

describe('ConfirmAction: a lista de bloqueios muda', () => {
  it('ao esvaziar, volta a nota de irreversibilidade e o botão confirma', async () => {
    const aoConfirmar = vi.fn();
    const montado = await montar(confirmacao({ blockedBy: ['falta a categoria'], onConfirm: aoConfirmar }));
    await montado.atualizar(confirmacao({ blockedBy: [], onConfirm: aoConfirmar }));
    await clicar(botaoComTexto(montado.container, 'Confirmar'));
    expect(folhaComTexto(montado.container, 'p', NOTA_DE_IRREVERSIBILIDADE)).toBeTruthy();
    expect(montado.container.textContent).not.toContain(FRASE_DE_UMA_REGRA);
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
