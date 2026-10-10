import { act } from 'react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { botaoComTexto, clicar, desmontarTudo, elemento, folhaComTexto, montar, todos } from '@/testes/montagem';
import { PendencyCard, type AddresseeTexts, type PendencyCardProps, type PendencyTexts, type ReviewerTexts } from './PendencyCard';

afterEach(desmontarTudo);

const ID_DA_PENDENCIA = 'pendencia-1';
const PERGUNTA = 'Para que foi esta compra de 135?';
const AUTOR = 'Helena';
const RESPOSTA = 'Gás e extintor.';

const TEXTOS_COMUNS: PendencyTexts = {
  openHeading: 'Aguardando quem registrou',
  answeredHeading: 'Pergunta respondida',
  answerLabel: 'O que foi dito',
};

const TEXTOS_DO_DESTINATARIO: AddresseeTexts = {
  ...TEXTOS_COMUNS,
  draftLabel: 'Escreva aqui',
  draftPlaceholder: 'Conte em uma frase',
  submitLabel: 'Enviar resposta',
  emptyDraftReason: 'Sem texto não há o que enviar.',
};

const TEXTOS_DE_QUEM_CONFERIU: ReviewerTexts = {
  ...TEXTOS_COMUNS,
  reviewerReason: 'Quem responde é quem registrou.',
  reopenLabel: 'Perguntar de novo',
};

type PropsDaPergunta = Partial<
  Pick<PendencyCardProps, 'pendencyId' | 'question' | 'askedBy' | 'askedAt' | 'answer' | 'style'>
>;
type PropsDoDestinatario = Extract<PendencyCardProps, { role: 'addressee' }>;
type PropsDeQuemConferiu = Extract<PendencyCardProps, { role: 'reviewer' }>;

const paraOOutroLeitor = (props: PropsDaPergunta = {}) => (
  <PendencyCard
    role="observer"
    pendencyId={ID_DA_PENDENCIA}
    question={PERGUNTA}
    askedBy={AUTOR}
    texts={TEXTOS_COMUNS}
    {...props}
  />
);

const paraODestinatario = (props: PropsDaPergunta & Partial<Pick<PropsDoDestinatario, 'onAnswer'>> = {}) => (
  <PendencyCard
    role="addressee"
    pendencyId={ID_DA_PENDENCIA}
    question={PERGUNTA}
    askedBy={AUTOR}
    texts={TEXTOS_DO_DESTINATARIO}
    onAnswer={() => undefined}
    {...props}
  />
);

const paraQuemConferiu = (props: PropsDaPergunta & Partial<Pick<PropsDeQuemConferiu, 'onReopen'>> = {}) => (
  <PendencyCard
    role="reviewer"
    pendencyId={ID_DA_PENDENCIA}
    question={PERGUNTA}
    askedBy={AUTOR}
    texts={TEXTOS_DE_QUEM_CONFERIU}
    onReopen={() => undefined}
    {...props}
  />
);

const PAPEIS: readonly [string, (props?: PropsDaPergunta) => ReactElement][] = [
  ['destinatário', paraODestinatario],
  ['quem conferiu', paraQuemConferiu],
  ['outro leitor', paraOOutroLeitor],
];

const caixaDeResposta = (origem: ParentNode) => elemento<HTMLTextAreaElement>(origem, 'textarea');
const controlesDeEntrada = (origem: ParentNode) => origem.querySelectorAll('textarea, input, select, button');
const botaoDeEnviar = (origem: ParentNode) => botaoComTexto(origem, TEXTOS_DO_DESTINATARIO.submitLabel);
const botaoDeReabrir = (origem: ParentNode) => botaoComTexto(origem, TEXTOS_DE_QUEM_CONFERIU.reopenLabel);
const nomeDoGrupo = (grupo: Element) => document.getElementById(grupo.getAttribute('aria-labelledby') ?? '')?.textContent;

const RESPOSTAS_EM_BRANCO: readonly [string, string][] = [
  ['vazia', ''],
  ['só com espaços', '   '],
  ['só com quebras de linha e tabulação', ' \t\n '],
];

async function digitarNaCaixa(caixa: HTMLTextAreaElement, valor: string) {
  const definirValor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  await act(async () => {
    definirValor?.call(caixa, valor);
    caixa.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('PendencyCard: a pergunta', () => {
  it('mostra a pergunta', async () => {
    const { container } = await montar(paraOOutroLeitor());
    expect(folhaComTexto(container, 'p', PERGUNTA)).toBeTruthy();
  });

  it.each(PAPEIS)('para %s, o cabeçalho de pendência aberta é o texto recebido', async (_papel, pendencia) => {
    const { container } = await montar(pendencia());
    expect(folhaComTexto(container, 'span', TEXTOS_COMUNS.openHeading)).toBeTruthy();
  });

  it('com data, junta quem perguntou e quando por um ponto médio', async () => {
    const { container } = await montar(paraOOutroLeitor({ askedAt: '12/03 às 14:20' }));
    expect(folhaComTexto(container, 'p', `${AUTOR} · 12/03 às 14:20`)).toBeTruthy();
  });

  it.each([
    ['ausente', undefined],
    ['vazia', ''],
  ])('com data %s, mostra só quem perguntou, sem separador', async (_rotulo, askedAt) => {
    const { container } = await montar(paraOOutroLeitor({ askedAt }));
    expect(folhaComTexto(container, 'p', AUTOR)).toBeTruthy();
  });

  it.each(PAPEIS)('para %s, o cartão é um grupo nomeado pelo cabeçalho', async (_papel, pendencia) => {
    const { container } = await montar(pendencia());
    expect(nomeDoGrupo(elemento(container, '[role="group"]'))).toBe(TEXTOS_COMUNS.openHeading);
  });

  it('com dois cartões no mesmo container, cada grupo é nomeado pelo seu próprio cabeçalho', async () => {
    const { container } = await montar(
      <>
        {paraOOutroLeitor({ pendencyId: 'pendencia-1' })}
        {paraOOutroLeitor({ pendencyId: 'pendencia-2', answer: RESPOSTA })}
      </>,
    );
    const nomes = todos(container, '[role="group"]').map(nomeDoGrupo);
    expect(nomes).toEqual([TEXTOS_COMUNS.openHeading, TEXTOS_COMUNS.answeredHeading]);
  });
});

describe('PendencyCard: pendência já respondida', () => {
  it('mostra a resposta sob o rótulo recebido', async () => {
    const { container } = await montar(paraOOutroLeitor({ answer: RESPOSTA }));
    const rotulo = folhaComTexto(container, 'span', TEXTOS_COMUNS.answerLabel);
    const resposta = folhaComTexto(container, 'p', RESPOSTA);
    expect(rotulo.compareDocumentPosition(resposta)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it.each(PAPEIS)(
    'para %s, a pergunta e quem perguntou continuam visíveis ao lado da resposta',
    async (_papel, pendencia) => {
      const { container } = await montar(pendencia({ answer: RESPOSTA }));
      expect(folhaComTexto(container, 'p', PERGUNTA)).toBeTruthy();
      expect(folhaComTexto(container, 'p', AUTOR)).toBeTruthy();
    },
  );

  it.each(PAPEIS)(
    'para %s, o cabeçalho passa a ser o de pendência respondida',
    async (_papel, pendencia) => {
      const { container } = await montar(pendencia({ answer: RESPOSTA }));
      expect(folhaComTexto(container, 'span', TEXTOS_COMUNS.answeredHeading)).toBeTruthy();
      expect(container.textContent).not.toContain(TEXTOS_COMUNS.openHeading);
    },
  );

  it.each(PAPEIS)(
    'para %s, o grupo passa a ser nomeado pelo cabeçalho de respondida',
    async (_papel, pendencia) => {
      const { container } = await montar(pendencia({ answer: RESPOSTA }));
      expect(nomeDoGrupo(elemento(container, '[role="group"]'))).toBe(TEXTOS_COMUNS.answeredHeading);
    },
  );

  it.each([
    ['destinatário', paraODestinatario],
    ['outro leitor', paraOOutroLeitor],
  ])('para %s, não oferece campo nem botão e não repete razão alguma', async (_papel, pendencia) => {
    const { container } = await montar(pendencia({ answer: RESPOSTA }));
    expect(controlesDeEntrada(container)).toHaveLength(0);
    expect(container.textContent).not.toContain(TEXTOS_DE_QUEM_CONFERIU.reviewerReason);
    expect(container.textContent).not.toContain(TEXTOS_DO_DESTINATARIO.emptyDraftReason);
  });

  describe.each(RESPOSTAS_EM_BRANCO)('com a resposta %s', (_rotulo, resposta) => {
    it.each(PAPEIS)(
      'para %s, conta como sem resposta: cabeçalho de aberta e nenhum bloco de resposta',
      async (_papel, pendencia) => {
        const { container } = await montar(pendencia({ answer: resposta }));
        expect(folhaComTexto(container, 'span', TEXTOS_COMUNS.openHeading)).toBeTruthy();
        expect(nomeDoGrupo(elemento(container, '[role="group"]'))).toBe(TEXTOS_COMUNS.openHeading);
        expect(container.textContent).not.toContain(TEXTOS_COMUNS.answerLabel);
        expect(container.textContent).not.toContain(TEXTOS_COMUNS.answeredHeading);
      },
    );

    it('devolve a caixa ao destinatário', async () => {
      const { container } = await montar(paraODestinatario({ answer: resposta }));
      expect(caixaDeResposta(container)).toBeTruthy();
    });

    it('mostra a quem conferiu a razão, não o botão de reabrir', async () => {
      const { container } = await montar(paraQuemConferiu({ answer: resposta }));
      expect(folhaComTexto(container, 'p', TEXTOS_DE_QUEM_CONFERIU.reviewerReason)).toBeTruthy();
      expect(controlesDeEntrada(container)).toHaveLength(0);
    });
  });

  it('a resposta que chega depois troca a caixa pelo texto respondido', async () => {
    const montado = await montar(paraODestinatario());
    await montado.atualizar(paraODestinatario({ answer: RESPOSTA }));
    expect(montado.container.querySelector('textarea')).toBeNull();
    expect(folhaComTexto(montado.container, 'p', RESPOSTA)).toBeTruthy();
  });
});

describe('PendencyCard: para o destinatário', () => {
  it('oferece a caixa de resposta com rótulo ligado e o botão de enviar', async () => {
    const { container } = await montar(paraODestinatario());
    const caixa = caixaDeResposta(container);
    const rotulo = elemento<HTMLLabelElement>(container, 'label');
    expect(rotulo.textContent).toBe(TEXTOS_DO_DESTINATARIO.draftLabel);
    expect(rotulo.htmlFor).toBe(caixa.id);
    expect(botaoDeEnviar(container)).toBeTruthy();
  });

  it('a caixa nasce vazia, com a dica recebida como placeholder', async () => {
    const { container } = await montar(paraODestinatario());
    const caixa = caixaDeResposta(container);
    expect(caixa.value).toBe('');
    expect(caixa.placeholder).toBe(TEXTOS_DO_DESTINATARIO.draftPlaceholder);
  });

  it('não mostra a razão de quem conferiu nem oferece reabrir', async () => {
    const { container } = await montar(paraODestinatario());
    expect(container.textContent).not.toContain(TEXTOS_DE_QUEM_CONFERIU.reviewerReason);
    expect(container.textContent).not.toContain(TEXTOS_DE_QUEM_CONFERIU.reopenLabel);
  });

  it('o botão de enviar fica disponível quando há texto', async () => {
    const { container } = await montar(paraODestinatario());
    await digitarNaCaixa(caixaDeResposta(container), RESPOSTA);
    expect(botaoDeEnviar(container).disabled).toBe(false);
  });

  it('Responder entrega o texto digitado', async () => {
    const aoResponder = vi.fn();
    const { container } = await montar(paraODestinatario({ onAnswer: aoResponder }));
    await digitarNaCaixa(caixaDeResposta(container), RESPOSTA);
    await clicar(botaoDeEnviar(container));
    expect(aoResponder).toHaveBeenCalledExactlyOnceWith(RESPOSTA);
  });

  it('Responder entrega o texto sem os espaços das pontas', async () => {
    const aoResponder = vi.fn();
    const { container } = await montar(paraODestinatario({ onAnswer: aoResponder }));
    await digitarNaCaixa(caixaDeResposta(container), '  Gás \n e extintor  \n');
    await clicar(botaoDeEnviar(container));
    expect(aoResponder).toHaveBeenCalledExactlyOnceWith('Gás \n e extintor');
  });

  it('com a caixa vazia, o botão fica indisponível e o clique não entrega nada', async () => {
    const aoResponder = vi.fn();
    const { container } = await montar(paraODestinatario({ onAnswer: aoResponder }));
    expect(botaoDeEnviar(container).disabled).toBe(true);
    await clicar(botaoDeEnviar(container));
    expect(aoResponder).not.toHaveBeenCalled();
  });

  it.each([
    ['espaços', '   '],
    ['quebras de linha', '\n\n'],
    ['espaços, tabulação e quebras de linha', ' \t \n '],
  ])('com só %s na caixa, o botão fica indisponível e o clique não entrega nada', async (_rotulo, rascunho) => {
    const aoResponder = vi.fn();
    const { container } = await montar(paraODestinatario({ onAnswer: aoResponder }));
    await digitarNaCaixa(caixaDeResposta(container), rascunho);
    expect(botaoDeEnviar(container).disabled).toBe(true);
    await clicar(botaoDeEnviar(container));
    expect(aoResponder).not.toHaveBeenCalled();
  });

  it('o botão indisponível mostra o motivo recebido logo abaixo e o motivo some quando há texto', async () => {
    const { container } = await montar(paraODestinatario());
    const botao = botaoDeEnviar(container);
    expect(botao.nextElementSibling?.textContent).toBe(TEXTOS_DO_DESTINATARIO.emptyDraftReason);
    expect(botao.title).toBe(TEXTOS_DO_DESTINATARIO.emptyDraftReason);
    await digitarNaCaixa(caixaDeResposta(container), RESPOSTA);
    expect(container.textContent).not.toContain(TEXTOS_DO_DESTINATARIO.emptyDraftReason);
  });

  it('apagar o texto digitado volta a bloquear o botão', async () => {
    const { container } = await montar(paraODestinatario());
    await digitarNaCaixa(caixaDeResposta(container), RESPOSTA);
    await digitarNaCaixa(caixaDeResposta(container), '');
    expect(botaoDeEnviar(container).disabled).toBe(true);
  });

  it('a caixa mostra exatamente o que é digitado, inclusive os espaços das pontas', async () => {
    const { container } = await montar(paraODestinatario());
    await digitarNaCaixa(caixaDeResposta(container), ' Gás ');
    expect(caixaDeResposta(container).value).toBe(' Gás ');
    await digitarNaCaixa(caixaDeResposta(container), ' Gás e');
    expect(caixaDeResposta(container).value).toBe(' Gás e');
  });

  it('Responder esvazia a caixa e bloqueia o botão: um segundo clique não entrega de novo', async () => {
    const aoResponder = vi.fn();
    const { container } = await montar(paraODestinatario({ onAnswer: aoResponder }));
    await digitarNaCaixa(caixaDeResposta(container), RESPOSTA);
    await clicar(botaoDeEnviar(container));
    await clicar(botaoDeEnviar(container));
    expect(aoResponder.mock.calls).toEqual([[RESPOSTA]]);
    expect(caixaDeResposta(container).value).toBe('');
    expect(botaoDeEnviar(container).disabled).toBe(true);
  });

  it('depois de responder, um texto novo na caixa pode ser entregue', async () => {
    const aoResponder = vi.fn();
    const { container } = await montar(paraODestinatario({ onAnswer: aoResponder }));
    await digitarNaCaixa(caixaDeResposta(container), RESPOSTA);
    await clicar(botaoDeEnviar(container));
    await digitarNaCaixa(caixaDeResposta(container), 'Só o gás.');
    await clicar(botaoDeEnviar(container));
    expect(aoResponder.mock.calls).toEqual([[RESPOSTA], ['Só o gás.']]);
  });

  it('depois de Responder, o foco vai para a caixa de resposta', async () => {
    const { container } = await montar(paraODestinatario());
    await digitarNaCaixa(caixaDeResposta(container), RESPOSTA);
    botaoDeEnviar(container).focus();
    expect(document.activeElement).toBe(botaoDeEnviar(container));
    await clicar(botaoDeEnviar(container));
    expect(document.activeElement).toBe(caixaDeResposta(container));
  });

  it('o rascunho reinicia quando a pendência é trocada por outra, mesmo com a mesma pergunta', async () => {
    const montado = await montar(paraODestinatario({ pendencyId: 'pendencia-1' }));
    await digitarNaCaixa(caixaDeResposta(montado.container), RESPOSTA);
    await montado.atualizar(paraODestinatario({ pendencyId: 'pendencia-2' }));
    expect(caixaDeResposta(montado.container).value).toBe('');
    expect(botaoDeEnviar(montado.container).disabled).toBe(true);
  });

  it('o rascunho é mantido quando a pergunta é corrigida na mesma pendência', async () => {
    const montado = await montar(paraODestinatario());
    await digitarNaCaixa(caixaDeResposta(montado.container), RESPOSTA);
    await montado.atualizar(paraODestinatario({ question: 'Outra pergunta?' }));
    expect(caixaDeResposta(montado.container).value).toBe(RESPOSTA);
  });

  it('o rascunho é mantido quando só mudam quem perguntou e quando', async () => {
    const montado = await montar(paraODestinatario());
    await digitarNaCaixa(caixaDeResposta(montado.container), RESPOSTA);
    await montado.atualizar(paraODestinatario({ askedBy: 'Outra pessoa', askedAt: '13/03 às 09:00' }));
    expect(caixaDeResposta(montado.container).value).toBe(RESPOSTA);
  });

  it('a caixa volta vazia quando a resposta é retirada depois de ter chegado', async () => {
    const montado = await montar(paraODestinatario());
    await digitarNaCaixa(caixaDeResposta(montado.container), RESPOSTA);
    await montado.atualizar(paraODestinatario({ answer: RESPOSTA }));
    await montado.atualizar(paraODestinatario());
    expect(caixaDeResposta(montado.container).value).toBe('');
  });
});

describe('PendencyCard: para quem conferiu', () => {
  it('com a pergunta aberta, o campo de resposta está ausente: nem caixa, nem botão', async () => {
    const { container } = await montar(paraQuemConferiu());
    expect(controlesDeEntrada(container)).toHaveLength(0);
  });

  it('nada no cartão aparece desabilitado', async () => {
    const { container } = await montar(paraQuemConferiu());
    expect(container.querySelector('[disabled], [aria-disabled]')).toBeNull();
  });

  it('com a pergunta aberta, explica em texto por que a resposta não é sua', async () => {
    const { container } = await montar(paraQuemConferiu());
    expect(folhaComTexto(container, 'p', TEXTOS_DE_QUEM_CONFERIU.reviewerReason)).toBeTruthy();
  });

  it('com a pergunta aberta, não oferece reabrir', async () => {
    const { container } = await montar(paraQuemConferiu());
    expect(container.textContent).not.toContain(TEXTOS_DE_QUEM_CONFERIU.reopenLabel);
  });

  it('com resposta, oferece reabrir a pergunta, e só isso: um botão, sem caixa', async () => {
    const { container } = await montar(paraQuemConferiu({ answer: RESPOSTA }));
    const controles = Array.from(controlesDeEntrada(container));
    expect(controles).toHaveLength(1);
    expect(controles[0]).toBe(botaoDeReabrir(container));
    expect(todos(container, 'textarea, input')).toHaveLength(0);
  });

  it('com resposta, o botão de reabrir está disponível e a razão não se repete', async () => {
    const { container } = await montar(paraQuemConferiu({ answer: RESPOSTA }));
    expect(botaoDeReabrir(container).disabled).toBe(false);
    expect(container.textContent).not.toContain(TEXTOS_DE_QUEM_CONFERIU.reviewerReason);
  });

  it('reabrir chama onReopen uma vez, sem argumentos', async () => {
    const aoReabrir = vi.fn();
    const { container } = await montar(paraQuemConferiu({ answer: RESPOSTA, onReopen: aoReabrir }));
    await clicar(botaoDeReabrir(container));
    expect(aoReabrir).toHaveBeenCalledExactlyOnceWith();
  });

  it('reabrir bloqueia o botão: dois cliques, uma chamada', async () => {
    const aoReabrir = vi.fn();
    const { container } = await montar(paraQuemConferiu({ answer: RESPOSTA, onReopen: aoReabrir }));
    await clicar(botaoDeReabrir(container));
    await clicar(botaoDeReabrir(container));
    expect(aoReabrir).toHaveBeenCalledTimes(1);
    expect(botaoDeReabrir(container).disabled).toBe(true);
  });

  it('quando a resposta muda, o botão de reabrir volta a ficar disponível', async () => {
    const montado = await montar(paraQuemConferiu({ answer: RESPOSTA }));
    await clicar(botaoDeReabrir(montado.container));
    await montado.atualizar(paraQuemConferiu({ answer: 'Só o gás.' }));
    expect(botaoDeReabrir(montado.container).disabled).toBe(false);
  });

  it('trocada a pendência, o botão de reabrir está disponível mesmo com a mesma resposta', async () => {
    const montado = await montar(paraQuemConferiu({ pendencyId: 'pendencia-1', answer: RESPOSTA }));
    await clicar(botaoDeReabrir(montado.container));
    await montado.atualizar(paraQuemConferiu({ pendencyId: 'pendencia-2', answer: RESPOSTA }));
    expect(botaoDeReabrir(montado.container).disabled).toBe(false);
  });

  it('quando o consumidor reabre e retira a resposta, o cartão volta a ser o da pergunta aberta', async () => {
    const montado = await montar(paraQuemConferiu({ answer: RESPOSTA }));
    await montado.atualizar(paraQuemConferiu());
    expect(folhaComTexto(montado.container, 'span', TEXTOS_COMUNS.openHeading)).toBeTruthy();
    expect(folhaComTexto(montado.container, 'p', TEXTOS_DE_QUEM_CONFERIU.reviewerReason)).toBeTruthy();
    expect(controlesDeEntrada(montado.container)).toHaveLength(0);
  });
});

describe('PendencyCard: para outro leitor', () => {
  it('com a pergunta aberta, só lê: nem campo, nem botão, nem razão de quem conferiu', async () => {
    const { container } = await montar(paraOOutroLeitor());
    expect(controlesDeEntrada(container)).toHaveLength(0);
    expect(container.textContent).not.toContain(TEXTOS_DE_QUEM_CONFERIU.reviewerReason);
  });

  it('com resposta, só lê: a resposta aparece sem ação alguma', async () => {
    const { container } = await montar(paraOOutroLeitor({ answer: RESPOSTA }));
    expect(folhaComTexto(container, 'p', RESPOSTA)).toBeTruthy();
    expect(controlesDeEntrada(container)).toHaveLength(0);
  });
});

describe('PendencyCard: o texto vem todo do consumidor', () => {
  const QUANDO = '12/03 às 14:20';
  const AUTORIA = `${AUTOR} · ${QUANDO}`;

  const CASOS: readonly [string, ReactElement, readonly string[]][] = [
    [
      'destinatário, pergunta aberta',
      paraODestinatario({ askedAt: QUANDO }),
      [
        TEXTOS_COMUNS.openHeading,
        PERGUNTA,
        AUTORIA,
        TEXTOS_DO_DESTINATARIO.draftLabel,
        TEXTOS_DO_DESTINATARIO.submitLabel,
        TEXTOS_DO_DESTINATARIO.emptyDraftReason,
      ],
    ],
    [
      'destinatário, pergunta respondida',
      paraODestinatario({ askedAt: QUANDO, answer: RESPOSTA }),
      [TEXTOS_COMUNS.answeredHeading, PERGUNTA, AUTORIA, TEXTOS_COMUNS.answerLabel, RESPOSTA],
    ],
    [
      'quem conferiu, pergunta aberta',
      paraQuemConferiu({ askedAt: QUANDO }),
      [TEXTOS_COMUNS.openHeading, PERGUNTA, AUTORIA, TEXTOS_DE_QUEM_CONFERIU.reviewerReason],
    ],
    [
      'quem conferiu, pergunta respondida',
      paraQuemConferiu({ askedAt: QUANDO, answer: RESPOSTA }),
      [
        TEXTOS_COMUNS.answeredHeading,
        PERGUNTA,
        AUTORIA,
        TEXTOS_COMUNS.answerLabel,
        RESPOSTA,
        TEXTOS_DE_QUEM_CONFERIU.reopenLabel,
      ],
    ],
    ['outro leitor, pergunta aberta', paraOOutroLeitor({ askedAt: QUANDO }), [TEXTOS_COMUNS.openHeading, PERGUNTA, AUTORIA]],
    [
      'outro leitor, pergunta respondida',
      paraOOutroLeitor({ askedAt: QUANDO, answer: RESPOSTA }),
      [TEXTOS_COMUNS.answeredHeading, PERGUNTA, AUTORIA, TEXTOS_COMUNS.answerLabel, RESPOSTA],
    ],
  ];

  it.each(CASOS)('%s: o texto visível é exatamente o recebido, na ordem', async (_caso, pendencia, esperado) => {
    const { container } = await montar(pendencia);
    expect(container.textContent).toBe(esperado.join(''));
  });

  it('com rascunho, o destinatário vê o texto recebido mais o que digitou, sem a razão do botão', async () => {
    const { container } = await montar(paraODestinatario({ askedAt: QUANDO }));
    await digitarNaCaixa(caixaDeResposta(container), RESPOSTA);
    expect(container.textContent).toBe(
      [
        TEXTOS_COMUNS.openHeading,
        PERGUNTA,
        AUTORIA,
        TEXTOS_DO_DESTINATARIO.draftLabel,
        RESPOSTA,
        TEXTOS_DO_DESTINATARIO.submitLabel,
      ].join(''),
    );
  });
});

describe('PendencyCard: style', () => {
  it('o style recebido prevalece sobre o do próprio cartão', async () => {
    const { container } = await montar(paraOOutroLeitor({ style: { padding: '0px', marginTop: 20 } }));
    const raiz = container.firstElementChild as HTMLElement;
    expect(raiz.style.padding).toBe('0px');
    expect(raiz.style.marginTop).toBe('20px');
  });
});
