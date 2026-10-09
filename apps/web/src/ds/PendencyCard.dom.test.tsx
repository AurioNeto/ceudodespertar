import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { botaoComTexto, clicar, desmontarTudo, elemento, folhaComTexto, montar } from '@/testes/montagem';
import { PendencyCard, type PendencyCardProps } from './PendencyCard';

afterEach(desmontarTudo);

const PERGUNTA = 'Para que foi esta compra de 135?';
const AUTOR = 'Helena';
const EXEMPLO_DE_RESPOSTA = 'Foram duas compras no mesmo cupom: 65 de gás e 70 de extintor.';
const RAZAO_DE_QUEM_CONFERIU =
  'A pergunta é de quem registrou. Você conferiu este lançamento — a resposta não é sua para dar.';

const pendencia = (props: Partial<PendencyCardProps> = {}) => (
  <PendencyCard question={PERGUNTA} askedBy={AUTOR} {...props} />
);

const caixaDeResposta = (origem: ParentNode) => elemento<HTMLTextAreaElement>(origem, 'textarea');
const controlesDeEntrada = (origem: ParentNode) => origem.querySelectorAll('textarea, input, select, button');

async function digitarNaCaixa(caixa: HTMLTextAreaElement, valor: string) {
  const definirValor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  await act(async () => {
    definirValor?.call(caixa, valor);
    caixa.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('PendencyCard: a pergunta', () => {
  it('anuncia a pendência aberta e mostra a pergunta', async () => {
    const { container } = await montar(pendencia());
    expect(folhaComTexto(container, 'span', 'Pendência aberta')).toBeTruthy();
    expect(folhaComTexto(container, 'p', PERGUNTA)).toBeTruthy();
  });

  it('com data, junta quem perguntou e quando por um ponto médio', async () => {
    const { container } = await montar(pendencia({ askedAt: '12/03 às 14:20' }));
    expect(folhaComTexto(container, 'p', `${AUTOR} · 12/03 às 14:20`)).toBeTruthy();
  });

  it.each([
    ['ausente', undefined],
    ['vazia', ''],
  ])('com data %s, mostra só quem perguntou, sem separador', async (_rotulo, askedAt) => {
    const { container } = await montar(pendencia({ askedAt }));
    expect(folhaComTexto(container, 'p', AUTOR)).toBeTruthy();
  });
});

describe('PendencyCard: pendência já respondida', () => {
  it('mostra a resposta sob o rótulo Resposta', async () => {
    const { container } = await montar(pendencia({ answer: 'Gás e extintor.' }));
    const rotulo = folhaComTexto(container, 'span', 'Resposta');
    const resposta = folhaComTexto(container, 'p', 'Gás e extintor.');
    expect(rotulo.compareDocumentPosition(resposta)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('a pergunta e quem perguntou continuam visíveis ao lado da resposta', async () => {
    const { container } = await montar(pendencia({ answer: 'Gás e extintor.' }));
    expect(folhaComTexto(container, 'p', PERGUNTA)).toBeTruthy();
    expect(folhaComTexto(container, 'p', AUTOR)).toBeTruthy();
  });

  it('o cabeçalho continua dizendo Pendência aberta mesmo com a pendência respondida', async () => {
    const { container } = await montar(pendencia({ answer: 'Gás e extintor.' }));
    expect(folhaComTexto(container, 'span', 'Pendência aberta')).toBeTruthy();
  });

  it.each([
    ['destinatário', true],
    ['quem conferiu', false],
  ])('para %s, não oferece campo nem botão e não repete a razão', async (_papel, canAnswer) => {
    const { container } = await montar(pendencia({ answer: 'Gás e extintor.', canAnswer }));
    expect(controlesDeEntrada(container)).toHaveLength(0);
    expect(container.textContent).not.toContain(RAZAO_DE_QUEM_CONFERIU);
  });

  it('resposta vazia conta como sem resposta e devolve a caixa ao destinatário', async () => {
    const { container } = await montar(pendencia({ answer: '', canAnswer: true }));
    expect(caixaDeResposta(container)).toBeTruthy();
    expect(container.textContent).not.toContain('Resposta');
  });

  it('a resposta que chega depois troca a caixa pelo texto respondido', async () => {
    const montado = await montar(pendencia({ canAnswer: true }));
    await montado.atualizar(pendencia({ canAnswer: true, answer: 'Gás e extintor.' }));
    expect(montado.container.querySelector('textarea')).toBeNull();
    expect(folhaComTexto(montado.container, 'p', 'Gás e extintor.')).toBeTruthy();
  });
});

describe('PendencyCard: para o destinatário', () => {
  it('oferece a caixa de resposta com rótulo ligado e o botão Responder', async () => {
    const { container } = await montar(pendencia({ canAnswer: true }));
    const caixa = caixaDeResposta(container);
    const rotulo = elemento<HTMLLabelElement>(container, 'label');
    expect(rotulo.textContent).toBe('Sua resposta');
    expect(rotulo.htmlFor).toBe(caixa.id);
    expect(botaoComTexto(container, 'Responder').disabled).toBe(false);
  });

  it('a caixa nasce vazia, com um exemplo de resposta como dica', async () => {
    const { container } = await montar(pendencia({ canAnswer: true }));
    const caixa = caixaDeResposta(container);
    expect(caixa.value).toBe('');
    expect(caixa.placeholder).toBe(EXEMPLO_DE_RESPOSTA);
  });

  it('não mostra a razão de quem conferiu', async () => {
    const { container } = await montar(pendencia({ canAnswer: true }));
    expect(container.textContent).not.toContain(RAZAO_DE_QUEM_CONFERIU);
  });

  it('Responder entrega o texto digitado', async () => {
    const aoResponder = vi.fn();
    const { container } = await montar(pendencia({ canAnswer: true, onAnswer: aoResponder }));
    await digitarNaCaixa(caixaDeResposta(container), 'Gás e extintor.');
    await clicar(botaoComTexto(container, 'Responder'));
    expect(aoResponder).toHaveBeenCalledExactlyOnceWith('Gás e extintor.');
  });

  it('Responder entrega o texto exatamente como digitado, sem aparar os espaços', async () => {
    const aoResponder = vi.fn();
    const { container } = await montar(pendencia({ canAnswer: true, onAnswer: aoResponder }));
    await digitarNaCaixa(caixaDeResposta(container), '  Gás  ');
    await clicar(botaoComTexto(container, 'Responder'));
    expect(aoResponder).toHaveBeenCalledExactlyOnceWith('  Gás  ');
  });

  it('Responder com a caixa vazia entrega texto vazio, sem validar', async () => {
    const aoResponder = vi.fn();
    const { container } = await montar(pendencia({ canAnswer: true, onAnswer: aoResponder }));
    await clicar(botaoComTexto(container, 'Responder'));
    expect(aoResponder).toHaveBeenCalledExactlyOnceWith('');
  });

  it('Responder não esvazia a caixa nem trava o botão: um segundo clique responde de novo', async () => {
    const aoResponder = vi.fn();
    const { container } = await montar(pendencia({ canAnswer: true, onAnswer: aoResponder }));
    await digitarNaCaixa(caixaDeResposta(container), 'Gás e extintor.');
    await clicar(botaoComTexto(container, 'Responder'));
    await clicar(botaoComTexto(container, 'Responder'));
    expect(aoResponder.mock.calls).toEqual([['Gás e extintor.'], ['Gás e extintor.']]);
    expect(caixaDeResposta(container).value).toBe('Gás e extintor.');
  });

  it('sem onAnswer, Responder não falha', async () => {
    const { container } = await montar(pendencia({ canAnswer: true }));
    await expect(clicar(botaoComTexto(container, 'Responder'))).resolves.toBeUndefined();
  });

  it('o rascunho sobrevive quando a pergunta é trocada por outra', async () => {
    const montado = await montar(pendencia({ canAnswer: true }));
    await digitarNaCaixa(caixaDeResposta(montado.container), 'Gás e extintor.');
    await montado.atualizar(pendencia({ canAnswer: true, question: 'Outra pergunta?' }));
    expect(caixaDeResposta(montado.container).value).toBe('Gás e extintor.');
  });
});

describe('PendencyCard: para quem conferiu', () => {
  it.each([
    ['sem canAnswer', undefined],
    ['com canAnswer falso', false],
  ])('%s, o campo de resposta está ausente: nem caixa, nem botão', async (_rotulo, canAnswer) => {
    const { container } = await montar(pendencia({ canAnswer }));
    expect(controlesDeEntrada(container)).toHaveLength(0);
  });

  it('nada no cartão aparece desabilitado', async () => {
    const { container } = await montar(pendencia());
    expect(container.querySelector('[disabled], [aria-disabled]')).toBeNull();
  });

  it('explica em texto por que a resposta não é sua', async () => {
    const { container } = await montar(pendencia());
    expect(folhaComTexto(container, 'p', RAZAO_DE_QUEM_CONFERIU)).toBeTruthy();
  });
});

describe('PendencyCard: style', () => {
  it('o style recebido prevalece sobre o do próprio cartão', async () => {
    const { container } = await montar(pendencia({ style: { padding: '0px', marginTop: 20 } }));
    const raiz = container.firstElementChild as HTMLElement;
    expect(raiz.style.padding).toBe('0px');
    expect(raiz.style.marginTop).toBe('20px');
  });
});
