import { afterEach, describe, expect, it, vi } from 'vitest';
import { botaoComTexto, clicar, desmontarTudo, elemento, montar, todos } from '@/testes/montagem';
import { DetalheDoTrabalho, type DetalheDoTrabalhoProps } from './DetalheDoTrabalho';
import { textoDoNumero, umTrabalho } from '../../apoioDeTeste';

afterEach(async () => {
  await desmontarTudo();
  vi.restoreAllMocks();
});

const novasChamadas = () => ({
  onVoltar: vi.fn(),
  onAlternarTarefa: vi.fn(),
  onAlternarWebhook: vi.fn(),
  onEditar: vi.fn(),
  onDuplicar: vi.fn(),
  onCancelar: vi.fn(),
  onAviso: vi.fn(),
});

type EntradasDoDetalhe = Partial<Pick<DetalheDoTrabalhoProps, 'trabalho' | 'feitos' | 'webhookAtivo' | 'campo'>>;

const montarDetalhe = async (entradas: EntradasDoDetalhe = {}) => {
  const props = novasChamadas();
  const montado = await montar(
    <DetalheDoTrabalho trabalho={umTrabalho()} feitos={{}} webhookAtivo={true} campo={false} {...entradas} {...props} />,
  );
  return { ...montado, props };
};

const folhaComTextoExato = (container: HTMLElement, texto: string) =>
  todos<HTMLSpanElement>(container, 'span').find((span) => span.childElementCount === 0 && span.textContent === texto);
const tarefasDaLista = (container: HTMLElement) => todos<HTMLLabelElement>(container, 'label');
const linhasDeParticipantes = (container: HTMLElement) =>
  todos<HTMLButtonElement>(container, 'button').filter((botao) => /Anamnese|Sem anamnese/.test(botao.textContent ?? ''));
const quantosSelos = (container: HTMLElement, texto: string) =>
  todos<HTMLSpanElement>(container, 'span').filter((span) => span.childElementCount === 0 && span.textContent === texto).length;

const COM_PARTICIPANTES = {
  trabalho: umTrabalho({ id: 9, confirmados: 10, visitantes: 2, previstos: 60, contribuicoes: [40, 60, 90] }),
};

describe('DetalheDoTrabalho: cabeçalho', () => {
  it.each([
    { dia: 5, mes: 9, titulo: '05/09 · Trabalho de teste' },
    { dia: 15, mes: 11, titulo: '15/11 · Trabalho de teste' },
    { dia: 1, mes: 1, titulo: '01/01 · Trabalho de teste' },
  ])('data $dia/$mes — o título leva dia e mês com dois dígitos, um ponto e o nome', async ({ dia, mes, titulo }) => {
    const { container } = await montarDetalhe({ trabalho: umTrabalho({ dia, mes }) });

    expect(elemento(container, 'h2').textContent).toBe(titulo);
  });

  it('título — fica sem risco quando a cerimônia não está cancelada', async () => {
    const { container } = await montarDetalhe();

    expect(elemento(container, 'h2').style.textDecoration).toBe('none');
  });

  it('cerimônia cancelada — o título fica riscado', async () => {
    const { container } = await montarDetalhe({ trabalho: umTrabalho({ situacao: 'cancelada' }) });

    expect(elemento(container, 'h2').style.textDecoration).toBe('line-through');
  });

  it('tipo — aparece como selo com a cor do tipo e texto branco', async () => {
    const { container } = await montarDetalhe({ trabalho: umTrabalho({ tipo: 'Feitio' }) });

    const selo = folhaComTextoExato(container, 'Feitio')!;

    expect([selo.style.background, selo.style.color]).toEqual(['oklch(0.72 0.13 90)', 'rgb(255, 255, 255)']);
  });

  it.each([
    { situacao: 'planejada' as const, texto: 'Planejada', cor: 'var(--color-pending)' },
    { situacao: 'confirmada' as const, texto: 'Confirmada', cor: 'var(--color-royal-ink)' },
    { situacao: 'realizada' as const, texto: 'Realizada', cor: 'var(--color-confirmed)' },
    { situacao: 'cancelada' as const, texto: 'Cancelada', cor: 'var(--color-neutral)' },
  ])('situação $situacao — o selo diz $texto no tom $cor', async ({ situacao, texto, cor }) => {
    const { container } = await montarDetalhe({ trabalho: umTrabalho({ situacao }) });

    const selo = folhaComTextoExato(container, texto)!;

    expect(selo.style.color).toBe(cor);
  });

  it('metadados — horário, local e dirigente, nesta ordem', async () => {
    const { container } = await montarDetalhe();

    const metadados = elemento(container, 'h2').nextElementSibling!.textContent;

    expect(metadados).toBe('20:00 às 04:00Salão principalAurio Neto');
  });

  it('litros maiores que zero — entram nos metadados como N L previstos', async () => {
    const { container } = await montarDetalhe({ trabalho: umTrabalho({ litros: 9 }) });

    expect(elemento(container, 'h2').nextElementSibling!.textContent).toBe('20:00 às 04:00Salão principalAurio Neto9 L previstos');
  });

  it('cartaz — sempre o espaço vazio marcado com a palavra cartaz', async () => {
    const { container } = await montarDetalhe();

    expect(folhaComTextoExato(container, 'cartaz')).toBeDefined();
  });
});

describe('DetalheDoTrabalho: ações', () => {
  it('Voltar para a agenda — chama onVoltar uma vez', async () => {
    const { container, props } = await montarDetalhe();

    await clicar(botaoComTexto(container, 'Voltar para a agenda'));

    expect(props.onVoltar).toHaveBeenCalledTimes(1);
  });

  it.each([
    { botao: 'Editar', chamada: 'onEditar' as const },
    { botao: 'Duplicar', chamada: 'onDuplicar' as const },
    { botao: 'Cancelar', chamada: 'onCancelar' as const },
  ])('$botao — chama $chamada uma vez', async ({ botao, chamada }) => {
    const { container, props } = await montarDetalhe();

    await clicar(botaoComTexto(container, botao));

    expect(props[chamada]).toHaveBeenCalledTimes(1);
  });

  it('cerimônia ativa — Cancelar não vem bloqueado e não mostra motivo', async () => {
    const { container } = await montarDetalhe();

    const cancelar = botaoComTexto(container, 'Cancelar');

    expect([cancelar.disabled, cancelar.title]).toEqual([false, '']);
    expect(container.textContent).not.toContain('Esta cerimônia já está cancelada.');
  });

  it('cerimônia cancelada — Cancelar vem bloqueado, com o motivo no title e à vista, e o clique não chama nada', async () => {
    const { container, props } = await montarDetalhe({ trabalho: umTrabalho({ situacao: 'cancelada' }) });

    const cancelar = botaoComTexto(container, 'Cancelar');
    await clicar(cancelar);

    expect([cancelar.disabled, cancelar.title]).toEqual([true, 'Esta cerimônia já está cancelada.']);
    expect(container.textContent).toContain('Esta cerimônia já está cancelada.');
    expect(props.onCancelar).not.toHaveBeenCalled();
  });

  it('cerimônia cancelada — Editar e Duplicar seguem disponíveis', async () => {
    const { container, props } = await montarDetalhe({ trabalho: umTrabalho({ situacao: 'cancelada' }) });

    await clicar(botaoComTexto(container, 'Editar'));
    await clicar(botaoComTexto(container, 'Duplicar'));

    expect([props.onEditar.mock.calls.length, props.onDuplicar.mock.calls.length]).toEqual([1, 1]);
  });
});

describe('DetalheDoTrabalho: números', () => {
  it('trabalho sem inscritos — Confirmados 0 com os previstos, Visitantes 0 e Litros previstos 0', async () => {
    const { container } = await montarDetalhe({ trabalho: umTrabalho({ previstos: 40 }) });

    expect(textoDoNumero(container, 'Confirmados')).toBe('Confirmados0de 40 previstos');
    expect(textoDoNumero(container, 'Visitantes')).toBe('Visitantes0primeira vez ou convidados');
    expect(textoDoNumero(container, 'Litros previstos')).toBe('Litros previstos0reserva no estoque');
  });

  it('com inscritos — Confirmados e Visitantes contam a lista de participantes, não os campos do trabalho', async () => {
    const { container } = await montarDetalhe({
      trabalho: umTrabalho({ id: 7, confirmados: 3, visitantes: 5, previstos: 40 }),
    });

    expect(textoDoNumero(container, 'Confirmados')).toBe('Confirmados3de 40 previstos');
    expect(textoDoNumero(container, 'Visitantes')).toBe('Visitantes3primeira vez ou convidados');
  });

  it('trabalho com confirmados negativos — o número mostra 0, porque conta a lista de participantes e não o campo', async () => {
    const { container } = await montarDetalhe({ trabalho: umTrabalho({ confirmados: -2, previstos: 40 }) });

    expect(textoDoNumero(container, 'Confirmados')).toBe('Confirmados0de 40 previstos');
  });

  it.each([
    { contribuicoes: [] as number[], numero: 'Contribuição—sem contribuição' },
    { contribuicoes: [40], numero: 'Contribuição40sem contribuição' },
    { contribuicoes: [40, 60, 90], numero: 'Contribuição40 · 60 · 90opções sugeridas' },
    { contribuicoes: [1200, 80], numero: 'Contribuição1.200 · 80opções sugeridas' },
    { contribuicoes: [45.5, 60], numero: 'Contribuição45,50 · 60opções sugeridas' },
  ])('contribuições $contribuicoes — o número mostra $numero', async ({ contribuicoes, numero }) => {
    const { container } = await montarDetalhe({ trabalho: umTrabalho({ contribuicoes }) });

    expect(textoDoNumero(container, 'Contribuição')).toBe(numero);
  });

  it('litros — o número mostra o valor do trabalho sem formatação (ponto decimal)', async () => {
    const { container } = await montarDetalhe({ trabalho: umTrabalho({ litros: 9.5 }) });

    expect(textoDoNumero(container, 'Litros previstos')).toBe('Litros previstos9.5reserva no estoque');
  });
});

describe('DetalheDoTrabalho: quem conduz', () => {
  it('equipe — uma coluna por função, com a pessoa embaixo, na ordem do trabalho', async () => {
    const equipe = [
      ['Dirigente', 'Aurio Neto'],
      ['Cantoria', 'Paty Munay'],
    ] as const;

    const { container } = await montarDetalhe({ trabalho: umTrabalho({ equipe }) });

    expect(container.textContent).toContain('Quem conduzDirigenteAurio NetoCantoriaPaty MunayLista de preparo');
  });

  it('equipe vazia — o bloco existe e fica sem colunas', async () => {
    const { container } = await montarDetalhe();

    expect(container.textContent).toContain('Quem conduzLista de preparo');
  });
});

describe('DetalheDoTrabalho: lista de preparo', () => {
  const preparo = [
    { titulo: 'Limpeza do salão', responsavel: 'Chico Aguiar' },
    { titulo: 'Compra de mantimentos', responsavel: 'Dona Rosa' },
    { titulo: 'Separar litros', responsavel: 'Lucia Prado' },
  ];

  it('sem tarefas — a nota diz sem tarefas', async () => {
    const { container } = await montarDetalhe();

    expect(container.textContent).toContain('Lista de preparosem tarefas');
  });

  it('com tarefas e nenhuma pronta — a nota diz 0 de N prontos e cada tarefa mostra título e responsável', async () => {
    const { container } = await montarDetalhe({ trabalho: umTrabalho({ preparo }) });

    expect(container.textContent).toContain('Lista de preparo0 de 3 prontos');
    expect(tarefasDaLista(container).map((tarefa) => tarefa.textContent)).toEqual([
      'Limpeza do salãoChico Aguiar',
      'Compra de mantimentosDona Rosa',
      'Separar litrosLucia Prado',
    ]);
  });

  it('tarefas feitas — contam pela chave id:posição, ficam marcadas e riscadas, com a origem da marcação', async () => {
    const { container } = await montarDetalhe({ trabalho: umTrabalho({ id: 7, preparo }), feitos: { '7:0': true, '7:2': true } });

    const caixas = todos<HTMLInputElement>(container, 'input[type="checkbox"]').map((caixa) => caixa.checked);
    const titulo = folhaComTextoExato(container, 'Limpeza do salão')!;
    expect(caixas).toEqual([true, false, true]);
    expect(container.textContent).toContain('Lista de preparo2 de 3 prontos');
    expect(titulo.style.textDecoration).toBe('line-through');
    expect(tarefasDaLista(container)[0]!.textContent).toBe('Limpeza do salãoChico Aguiar · marcado pelo link, hoje 14:02');
    expect(tarefasDaLista(container)[2]!.textContent).toBe('Separar litrosLucia Prado · marcado no sistema por Lucia Prado');
  });

  it('duas tarefas com o mesmo título — as duas aparecem, e o React avisa de chave repetida porque o título é a key', async () => {
    const aviso = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const repetidas = [
      { titulo: 'Varrer', responsavel: 'Dona Rosa' },
      { titulo: 'Varrer', responsavel: 'Chico Aguiar' },
    ];

    const { container } = await montarDetalhe({ trabalho: umTrabalho({ preparo: repetidas }) });

    expect(tarefasDaLista(container).map((tarefa) => tarefa.textContent)).toEqual(['VarrerDona Rosa', 'VarrerChico Aguiar']);
    expect(aviso.mock.calls.some(([mensagem]) => String(mensagem).includes('same key'))).toBe(true);
  });

  it('marcação de outro trabalho — não conta para este', async () => {
    const { container } = await montarDetalhe({ trabalho: umTrabalho({ id: 7, preparo }), feitos: { '8:0': true, '7:1': false } });

    expect(container.textContent).toContain('Lista de preparo0 de 3 prontos');
  });

  it('marcar a caixa — chama onAlternarTarefa com a posição da tarefa', async () => {
    const { container, props } = await montarDetalhe({ trabalho: umTrabalho({ preparo }) });

    await clicar(todos<HTMLInputElement>(container, 'input[type="checkbox"]')[1]!);

    expect(props.onAlternarTarefa).toHaveBeenCalledExactlyOnceWith(1);
  });

  it.each([
    { dia: 5, mes: 1, link: 'cdd.app/preparo/7-05jan' },
    { dia: 27, mes: 9, link: 'cdd.app/preparo/7-27set' },
    { dia: 12, mes: 12, link: 'cdd.app/preparo/7-12dez' },
  ])('data $dia/$mes — o link do preparo é $link', async ({ dia, mes, link }) => {
    const { container } = await montarDetalhe({ trabalho: umTrabalho({ id: 7, dia, mes }) });

    expect(elemento(container, 'code').textContent).toBe(link);
  });

  it('Copiar — avisa que o link foi copiado e quem abrir entra com o próprio login', async () => {
    const { container, props } = await montarDetalhe();

    await clicar(botaoComTexto(container, 'Copiar'));

    expect(props.onAviso).toHaveBeenCalledExactlyOnceWith(
      'Link do preparo copiado. Quem abrir entra com o próprio login para marcar as tarefas.',
    );
  });

  it('webhook ativo — o interruptor vem marcado e o texto mostra o POST e a última atualização', async () => {
    const { container } = await montarDetalhe({ webhookAtivo: true });

    expect(elemento(container, 'button[role="switch"]').getAttribute('aria-checked')).toBe('true');
    expect(textoDoNumero(container, 'Webhook')).toBe('WebhookPOST /preparo/{id}/tarefas · última atualização hoje, 14:02');
  });

  it('webhook desligado — o interruptor vem desmarcado e o texto diz desligado', async () => {
    const { container } = await montarDetalhe({ webhookAtivo: false });

    expect(elemento(container, 'button[role="switch"]').getAttribute('aria-checked')).toBe('false');
    expect(textoDoNumero(container, 'Webhook')).toBe('Webhookdesligado');
  });

  it('interruptor do webhook — chama onAlternarWebhook uma vez', async () => {
    const { container, props } = await montarDetalhe();

    await clicar(elemento(container, 'button[role="switch"]'));

    expect(props.onAlternarWebhook).toHaveBeenCalledTimes(1);
  });
});

describe('DetalheDoTrabalho: anamnese e participantes', () => {
  it('sem participantes — a nota diz que todos estão em dia, os quatro números zeram e não há caixa de atenção', async () => {
    const { container } = await montarDetalhe();

    expect(container.textContent).toContain('Anamnese do trabalhotodos com anamnese em dia');
    expect(['Em dia', 'Vencidas', 'Sem resposta', 'Pontos de atenção'].map((rotulo) => textoDoNumero(container, rotulo))).toEqual([
      'Em dia0',
      'Vencidas0',
      'Sem resposta0',
      'Pontos de atenção0',
    ]);
    expect(container.textContent).toContain('Participantes0 confirmados · 0 em espera · 0 visitantes');
  });

  it('com participantes — os números da anamnese batem com os selos de cada linha', async () => {
    const { container } = await montarDetalhe(COM_PARTICIPANTES);

    const selos = ['Anamnese em dia', 'Anamnese vencida', 'Sem anamnese'].map((texto) => quantosSelos(container, texto));
    const numeros = ['Em dia', 'Vencidas', 'Sem resposta'].map((rotulo) => textoDoNumero(container, rotulo));

    expect(selos).toEqual([10, 1, 1]);
    expect(numeros).toEqual(['Em dia10', 'Vencidas1', 'Sem resposta1']);
  });

  it('com resposta vencida ou ausente — a nota conta sem resposta e vencidas', async () => {
    const { container } = await montarDetalhe(COM_PARTICIPANTES);

    expect(container.textContent).toContain('Anamnese do trabalho1 sem resposta · 1 vencidas');
  });

  it('só respostas vencidas — a nota usa o mesmo formato, com 0 sem resposta', async () => {
    const { container } = await montarDetalhe({ trabalho: umTrabalho({ id: 8, confirmados: 1 }) });

    expect(container.textContent).toContain('Anamnese do trabalho0 sem resposta · 1 vencidas');
  });

  it('formulário em uso — diz a versão 3 publicada em 12/06/2026 e Cobrar avisa o envio do convite', async () => {
    const { container, props } = await montarDetalhe();

    await clicar(botaoComTexto(container, 'Cobrar quem está pendente'));

    expect(container.textContent).toContain('Formulário em uso: versão 3, publicada em 12/06/2026.');
    expect(props.onAviso).toHaveBeenCalledExactlyOnceWith(
      'Convite de anamnese enviado a quem está sem resposta ou com resposta vencida.',
    );
  });

  it('pontos de atenção — contam as pessoas com atenção e listam nome e condição na caixa de atenção', async () => {
    const { container } = await montarDetalhe(COM_PARTICIPANTES);

    const caixa = todos<HTMLDivElement>(container, 'div[style*="color-attention-soft"]')[0]!;

    expect(textoDoNumero(container, 'Pontos de atenção')).toBe('Pontos de atenção2');
    expect(caixa.children).toHaveLength(2);
    expect(caixa.textContent).toBe('Marina Tavares— uso de medicação contínuaLúcia Munay— histórico de crise de ansiedade');
  });

  it('trabalho grande, como a Mãe Divina de 05/09 (65 inscritos) — soma os números da anamnese, as atenções e as contribuições esperadas', async () => {
    const grande = umTrabalho({ id: 1, confirmados: 61, visitantes: 12, previstos: 84, contribuicoes: [40, 60, 90] });

    const { container } = await montarDetalhe({ trabalho: grande });

    const caixa = todos<HTMLDivElement>(container, 'div[style*="color-attention-soft"]')[0]!;
    expect(['Em dia', 'Vencidas', 'Sem resposta', 'Pontos de atenção'].map((rotulo) => textoDoNumero(container, rotulo))).toEqual([
      'Em dia50',
      'Vencidas11',
      'Sem resposta4',
      'Pontos de atenção3',
    ]);
    expect(container.textContent).toContain('Anamnese do trabalho4 sem resposta · 11 vencidas');
    expect(caixa.textContent).toBe(
      'Sofia Camargo— uso de medicação contínuaTobias Monteiro— histórico de crise de ansiedadeSérgio Bittencourt— cirurgia cardíaca em 2023',
    );
    expect(container.textContent).toContain('Participantes61 confirmados · 4 em espera · 12 visitantes · mostrando 12 de 65');
    expect(textoDoNumero(container, 'Contribuições esperadas')).toBe('Contribuições esperadas3.690,00');
  });

  it('nota dos participantes — conta confirmados, em espera e visitantes, sem o aviso de corte até 12', async () => {
    const { container } = await montarDetalhe(COM_PARTICIPANTES);

    expect(container.textContent).toContain('Participantes10 confirmados · 2 em espera · 2 visitantes');
    expect(container.textContent).not.toContain('mostrando');
    expect(linhasDeParticipantes(container)).toHaveLength(12);
  });

  it.each([
    { confirmados: 11, total: 13 },
    { confirmados: 13, total: 15 },
  ])('$total participantes — mostra 12 linhas e a nota diz mostrando 12 de $total', async ({ confirmados, total }) => {
    const { container } = await montarDetalhe({ trabalho: umTrabalho({ id: 9, confirmados }) });

    expect(linhasDeParticipantes(container)).toHaveLength(12);
    expect(container.textContent).toContain(`· mostrando 12 de ${total}`);
  });

  it('participantes em espera — a lista só os põe depois dos confirmados e os marca como Em espera', async () => {
    const { container } = await montarDetalhe(COM_PARTICIPANTES);

    const situacoes = linhasDeParticipantes(container).map((linha) =>
      linha.textContent?.includes('Em espera') ? 'espera' : 'confirmado',
    );

    expect(situacoes).toEqual([...Array(10).fill('confirmado'), 'espera', 'espera']);
  });

  it('linha de participante — mostra o contato, o selo de anamnese, a situação e a contribuição formatada', async () => {
    const { container } = await montarDetalhe({ trabalho: umTrabalho({ id: 9, confirmados: 1, contribuicoes: [60] }) });

    expect(linhasDeParticipantes(container)[0]!.textContent).toBe(
      'Eduardo Munayfardado desde 2008Anamnese em diaConfirmado60,00',
    );
  });

  it('linha de participante — a borda da esquerda é verde para confirmado e de pendente para quem está em espera', async () => {
    const { container } = await montarDetalhe(COM_PARTICIPANTES);

    const linhas = linhasDeParticipantes(container);

    expect([linhas[0]!.style.borderLeft, linhas[11]!.style.borderLeft]).toEqual([
      '3px solid var(--color-confirmed)',
      '3px solid var(--color-pending)',
    ]);
  });

  it('participante sem contribuição sugerida — não mostra valor na linha', async () => {
    const { container } = await montarDetalhe({ trabalho: umTrabalho({ id: 9, confirmados: 1, contribuicoes: [] }) });

    expect(linhasDeParticipantes(container)[0]!.textContent).not.toMatch(/\d,\d{2}$/);
  });

  it('clicar na linha de um participante — avisa que a ficha fica na tela Pessoas', async () => {
    const { container, props } = await montarDetalhe(COM_PARTICIPANTES);

    await clicar(linhasDeParticipantes(container)[0]!);

    expect(props.onAviso).toHaveBeenCalledExactlyOnceWith(
      'Ficha de Eduardo Munay — cadastro e anamneses ficam na tela Pessoas.',
    );
  });
});

describe('DetalheDoTrabalho: dinheiro e observações', () => {
  it('dinheiro da cerimônia — custo previsto, custo lançado e recebido formatados sem símbolo de moeda', async () => {
    const { container } = await montarDetalhe({
      trabalho: umTrabalho({ previstoGasto: 1400, realizadoGasto: 187.4, arrecadado: 940 }),
    });

    expect(textoDoNumero(container, 'Custo previsto')).toBe('Custo previsto1.400,00');
    expect(textoDoNumero(container, 'Custo lançado')).toBe('Custo lançado187,40');
    expect(textoDoNumero(container, 'Contribuições recebidas')).toBe('Contribuições recebidas940,00');
  });

  it('contribuições esperadas — somam só as dos confirmados, sem as dos que estão em espera', async () => {
    const { container } = await montarDetalhe(COM_PARTICIPANTES);

    const linhas = linhasDeParticipantes(container);
    const somaDasLinhas = (aEspera: boolean) =>
      linhas
        .filter((linha) => linha.textContent?.includes('Em espera') === aEspera)
        .reduce((soma, linha) => soma + Number((/(\d+),00$/.exec(linha.textContent ?? '') ?? [])[1] ?? 0), 0);
    expect(textoDoNumero(container, 'Contribuições esperadas')).toBe('Contribuições esperadas610,00');
    expect(somaDasLinhas(false)).toBe(610);
    expect(somaDasLinhas(true)).toBeGreaterThan(0);
  });

  it('sem participantes — as contribuições esperadas ficam em 0,00', async () => {
    const { container } = await montarDetalhe();

    expect(textoDoNumero(container, 'Contribuições esperadas')).toBe('Contribuições esperadas0,00');
  });

  it('observações — o bloco aparece com o texto quando existe', async () => {
    const { container } = await montarDetalhe({ trabalho: umTrabalho({ observacoes: 'Chegada até 19h30.' }) });

    expect(container.textContent).toContain('ObservaçõesChegada até 19h30.');
  });

  it('sem observações — o bloco Observações não é renderizado', async () => {
    const { container } = await montarDetalhe({ trabalho: umTrabalho({ observacoes: '' }) });

    expect(folhaComTextoExato(container, 'Observações')).toBeUndefined();
  });
});

describe('DetalheDoTrabalho: densidade', () => {
  it.each([
    { campo: false, colunas: 'repeat(auto-fit,minmax(150px,1fr))', espacamento: '18px' },
    { campo: true, colunas: 'repeat(2,minmax(0,1fr))', espacamento: '14px' },
  ])('campo=$campo — grade de números $colunas e espaço entre blocos $espacamento', async ({ campo, colunas, espacamento }) => {
    const { container } = await montarDetalhe({ campo });

    const raiz = container.firstElementChild as HTMLElement;
    const grade = elemento<HTMLDivElement>(container, 'div[style*="grid-template-columns"]');
    expect([grade.style.gridTemplateColumns, raiz.style.gap]).toEqual([colunas, espacamento]);
  });
});
