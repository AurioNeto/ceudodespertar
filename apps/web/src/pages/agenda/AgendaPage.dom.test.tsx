import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { botaoComTexto, clicar, desmontarTudo, digitar, elemento, escolherOpcao, montar, todos } from '@/testes/montagem';
import { AgendaPage } from './AgendaPage';
import {
  AGORA_FIXO,
  ID_DO_TRABALHO_CRIADO_NO_AGORA_FIXO,
  botaoPeloRotuloAcessivel,
  campoDoRotulo,
  chipDoCalendario,
  chipsDoCalendario,
  clicarVezes,
  diasDaGrade,
  diasDestacadosComoHoje,
  fixarDensidade,
  formularioAberto,
  nomesPorDiaNoCalendario,
  textoDoNumero,
} from './apoioDeTeste';

beforeEach(() => {
  fixarDensidade('office');
  vi.setSystemTime(AGORA_FIXO);
});

afterEach(async () => {
  await desmontarTudo();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const cabecalho = (container: HTMLElement) => elemento(container, 'header').textContent;
const textoDaFolhaQueCasaCom = (container: HTMLElement, padrao: RegExp) =>
  todos<HTMLSpanElement>(container, 'span').find((span) => span.childElementCount === 0 && padrao.test(span.textContent ?? ''))
    ?.textContent;
const mesNaTela = (container: HTMLElement) => textoDaFolhaQueCasaCom(container, /^\p{L}* de \d+$/u);
const contagemDoMes = (container: HTMLElement) =>
  textoDaFolhaQueCasaCom(container, /^(nenhuma cerimônia|\d+ cerimônias? no mês)$/);
const avisoDaAgenda = (container: HTMLElement) =>
  container.querySelector('button[aria-label="fechar aviso"]')?.parentElement?.textContent ?? null;
const itensDaLista = (container: HTMLElement) =>
  todos<HTMLButtonElement>(container, 'button').filter((botao) => /^\d{2}\/\d{2}/.test(botao.textContent ?? ''));
const textosDaLista = (container: HTMLElement) => itensDaLista(container).map((item) => item.textContent);
const abrirLista = (container: HTMLElement) => clicar(botaoComTexto(container, 'Lista'));
const abrirDetalhe = (container: HTMLElement, nome: string) => clicar(chipDoCalendario(container, nome));
const mesAnterior = (container: HTMLElement) => botaoPeloRotuloAcessivel(container, 'Mês anterior');
const proximoMes = (container: HTMLElement) => botaoPeloRotuloAcessivel(container, 'Próximo mês');

interface DadosDaCerimonia {
  nome: string;
  data?: string;
  previstos?: string;
  litros?: string;
  contribuicoes?: string;
  dirigente?: string;
}

async function preencherEEnviarNovaCerimonia(container: HTMLElement, dados: DadosDaCerimonia) {
  await clicar(botaoComTexto(container, 'Nova cerimônia'));
  const formulario = formularioAberto(container);
  await digitar(campoDoRotulo(formulario, 'Nome'), dados.nome);
  if (dados.data !== undefined) await digitar(campoDoRotulo(formulario, 'Data'), dados.data);
  if (dados.previstos !== undefined) await digitar(campoDoRotulo(formulario, 'Previstos'), dados.previstos);
  if (dados.litros !== undefined) await digitar(campoDoRotulo(formulario, 'Litros previstos'), dados.litros);
  if (dados.contribuicoes !== undefined) {
    await digitar(campoDoRotulo(formulario, 'Contribuições sugeridas'), dados.contribuicoes);
  }
  if (dados.dirigente !== undefined) await digitar(campoDoRotulo(formulario, 'Dirigente'), dados.dirigente);
  await clicar(botaoComTexto(formulario, 'Salvar cerimônia'));
}

async function criarEAbrirDetalhe(container: HTMLElement, dados: DadosDaCerimonia) {
  await preencherEEnviarNovaCerimonia(container, dados);
  await abrirDetalhe(container, dados.nome);
}

describe('AgendaPage: calendário do mês', () => {
  it('ao abrir — mostra setembro de 2026 e conta as 4 cerimônias do mês', async () => {
    const { container } = await montar(<AgendaPage />);

    expect(mesNaTela(container)).toBe('setembro de 2026');
    expect(contagemDoMes(container)).toBe('4 cerimônias no mês');
  });

  it('setembro de 2026 — começa na terça: duas células vazias antes do dia 1 e três depois do 30', async () => {
    const { container } = await montar(<AgendaPage />);

    expect(diasDaGrade(container)).toEqual([
      '', '', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
      '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '', '', '',
    ]);
  });

  it('setembro de 2026 — cada cerimônia aparece como chip no seu dia, com o nome', async () => {
    const { container } = await montar(<AgendaPage />);

    expect(nomesPorDiaNoCalendario(container)).toEqual({
      '5': ['Mãe Divina'],
      '12': ['Reunião do corpo instrutivo'],
      '19': ['Trabalho de cura'],
      '27': ['Bailado de São Miguel'],
    });
  });

  it('chip — o title é o nome, um ponto e o horário', async () => {
    const { container } = await montar(<AgendaPage />);

    expect(chipDoCalendario(container, 'Mãe Divina').title).toBe('Mãe Divina · 20:00 às 04:00');
  });

  it('chip de concentração — usa a cor do tipo, com texto branco', async () => {
    const { container } = await montar(<AgendaPage />);

    const chip = chipDoCalendario(container, 'Mãe Divina');

    expect([chip.style.background, chip.style.color]).toEqual(['oklch(0.52 0.13 265)', 'rgb(255, 255, 255)']);
  });

  it('hoje (02/09/2026, do relógio da demonstração) — só o dia 2 vem destacado', async () => {
    const { container } = await montar(<AgendaPage />);

    expect(diasDestacadosComoHoje(container)).toEqual(['2']);
  });

  it('legenda — lista os cinco tipos de trabalho abaixo do calendário', async () => {
    const { container } = await montar(<AgendaPage />);

    const texto = container.textContent ?? '';

    expect(texto.endsWith('ConcentraçãoTrabalho de curaFeitioBailadoReunião do corpo')).toBe(true);
  });

  it('mês anterior — vai para agosto, com uma cerimônia (singular) e sem destaque de hoje', async () => {
    const { container } = await montar(<AgendaPage />);

    await clicar(mesAnterior(container));

    expect(mesNaTela(container)).toBe('agosto de 2026');
    expect(contagemDoMes(container)).toBe('1 cerimônia no mês');
    expect(nomesPorDiaNoCalendario(container)).toEqual({ '22': ['Mãe Divina'] });
    expect(diasDestacadosComoHoje(container)).toEqual([]);
  });

  it('agosto de 2026 — começa no sábado: seis células vazias antes do dia 1 e seis semanas na grade', async () => {
    const { container } = await montar(<AgendaPage />);

    await clicar(mesAnterior(container));

    const grade = diasDaGrade(container);
    expect(grade).toHaveLength(42);
    expect(grade.slice(0, 7)).toEqual(['', '', '', '', '', '', '1']);
    expect(grade.slice(-6)).toEqual(['31', '', '', '', '', '']);
  });

  it('próximo mês — vai para outubro, com o feitio no dia 3', async () => {
    const { container } = await montar(<AgendaPage />);

    await clicar(proximoMes(container));

    expect(mesNaTela(container)).toBe('outubro de 2026');
    expect(contagemDoMes(container)).toBe('1 cerimônia no mês');
    expect(nomesPorDiaNoCalendario(container)).toEqual({ '3': ['Feitio de dezembro — preparação'] });
  });

  it('mês sem cerimônia — diz nenhuma cerimônia e não mostra chip', async () => {
    const { container } = await montar(<AgendaPage />);

    await clicarVezes(proximoMes(container), 2);

    expect(mesNaTela(container)).toBe('novembro de 2026');
    expect(contagemDoMes(container)).toBe('nenhuma cerimônia');
    expect(chipsDoCalendario(container)).toHaveLength(0);
  });

  it.each([
    { botao: 'anterior', cliques: 8, esperado: 'janeiro de 2026' },
    { botao: 'anterior', cliques: 9, esperado: 'dezembro de 2025' },
    { botao: 'próximo', cliques: 3, esperado: 'dezembro de 2026' },
    { botao: 'próximo', cliques: 4, esperado: 'janeiro de 2027' },
  ])('virada de ano — mês $botao × $cliques cliques a partir de setembro de 2026 chega a $esperado', async ({ botao, cliques, esperado }) => {
    const { container } = await montar(<AgendaPage />);
    const alvo = botao === 'anterior' ? mesAnterior(container) : proximoMes(container);

    await clicarVezes(alvo, cliques);

    expect(mesNaTela(container)).toBe(esperado);
  });

  it('clicar no chip — abre o detalhe da cerimônia e esconde a navegação do calendário', async () => {
    const { container } = await montar(<AgendaPage />);

    await abrirDetalhe(container, 'Trabalho de cura');

    expect(container.textContent).toContain('19/09 · Trabalho de cura');
    expect(container.querySelector('button[aria-label="Próximo mês"]')).toBeNull();
    expect(cabecalho(container)).toBe('E-01 · AgendaCerimônia');
  });

  it('voltar do detalhe — retorna ao calendário no mês em que estava', async () => {
    const { container } = await montar(<AgendaPage />);
    await clicar(proximoMes(container));
    await abrirDetalhe(container, 'Feitio de dezembro — preparação');

    await clicar(botaoComTexto(container, 'Voltar para a agenda'));

    expect(mesNaTela(container)).toBe('outubro de 2026');
    expect(nomesPorDiaNoCalendario(container)).toEqual({ '3': ['Feitio de dezembro — preparação'] });
  });
});

describe('AgendaPage: lista', () => {
  it('vista em lista — ordena todas as cerimônias por data, de todos os meses, com litros e situação', async () => {
    const { container } = await montar(<AgendaPage />);

    await abrirLista(container);

    expect(textosDaLista(container)).toEqual([
      '22/08Mãe Divina20:00 às 04:00 · Salão principal · Aurio Neto8 LRealizada',
      '05/09Mãe Divina20:00 às 04:00 · Salão principal · Aurio Neto9 LConfirmada',
      '12/09Reunião do corpo instrutivo19:00 às 21:00 · Secretaria · Lucia PradoPlanejada',
      '19/09Trabalho de cura20:00 às 02:00 · Salão principal · Aurio Neto6 LPlanejada',
      '27/09Bailado de São Miguel19:00 às 05:00 · Salão principal · Aurio Neto14 LPlanejada',
      '03/10Feitio de dezembro — preparação07:00 às 18:00 · Casa de feitio · Chico AguiarPlanejada',
    ]);
  });

  it('vista em lista — marca Lista como a vista ativa, esconde mês, setas e legenda', async () => {
    const { container } = await montar(<AgendaPage />);

    await abrirLista(container);

    expect(botaoComTexto(container, 'Lista').getAttribute('aria-pressed')).toBe('true');
    expect(botaoComTexto(container, 'Calendário').getAttribute('aria-pressed')).toBe('false');
    expect(container.querySelector('button[aria-label="Mês anterior"]')).toBeNull();
    expect(container.textContent).not.toContain('cerimônias no mês');
    expect(container.textContent).not.toContain('ConcentraçãoTrabalho de curaFeitioBailadoReunião do corpo');
  });

  it('item da lista — abre o detalhe daquela cerimônia, também a de outro mês', async () => {
    const { container } = await montar(<AgendaPage />);
    await abrirLista(container);

    await clicar(itensDaLista(container)[0]!);

    expect(container.textContent).toContain('22/08 · Mãe Divina');
    expect(container.textContent).toContain('Realizada');
  });

  it('voltar à vista em calendário — retoma o mês que estava aberto', async () => {
    const { container } = await montar(<AgendaPage />);
    await clicar(mesAnterior(container));
    await abrirLista(container);

    await clicar(botaoComTexto(container, 'Calendário'));

    expect(mesNaTela(container)).toBe('agosto de 2026');
  });
});

describe('AgendaPage: detalhe e lista de preparo', () => {
  it.each([
    { tarefa: 0, origem: 'marcado pelo link, hoje 14:02' },
    { tarefa: 1, origem: 'marcado por webhook, ontem 18:40' },
    { tarefa: 2, origem: 'marcado no sistema por Lucia Prado' },
    { tarefa: 3, origem: 'marcado pelo link, hoje 14:02' },
  ])('tarefa $tarefa marcada — passa a mostrar a origem da marcação: $origem', async ({ tarefa, origem }) => {
    const { container } = await montar(<AgendaPage />);
    await abrirDetalhe(container, 'Mãe Divina');

    await clicar(todos<HTMLInputElement>(container, 'input[type="checkbox"]')[tarefa]!);

    const marcada = todos<HTMLLabelElement>(container, 'label')[tarefa]!;
    expect(marcada.textContent).toContain(` · ${origem}`);
  });

  it('marcar uma tarefa — a lista passa a dizer 1 de 5 prontos, e desmarcar volta a 0 de 5', async () => {
    const { container } = await montar(<AgendaPage />);
    await abrirDetalhe(container, 'Mãe Divina');
    const caixa = todos<HTMLInputElement>(container, 'input[type="checkbox"]')[0]!;

    await clicar(caixa);
    const depoisDeMarcar = container.textContent?.includes('1 de 5 prontos');
    await clicar(caixa);

    expect(depoisDeMarcar).toBe(true);
    expect(container.textContent).toContain('0 de 5 prontos');
  });

  it('marcação de tarefa — fica guardada por cerimônia ao sair e voltar, e não vaza para outra', async () => {
    const { container } = await montar(<AgendaPage />);
    await abrirDetalhe(container, 'Mãe Divina');
    await clicar(todos<HTMLInputElement>(container, 'input[type="checkbox"]')[0]!);
    await clicar(botaoComTexto(container, 'Voltar para a agenda'));

    await abrirDetalhe(container, 'Mãe Divina');
    const mesmaCerimonia = container.textContent?.includes('1 de 5 prontos');
    await clicar(botaoComTexto(container, 'Voltar para a agenda'));
    await abrirDetalhe(container, 'Trabalho de cura');

    expect(mesmaCerimonia).toBe(true);
    expect(container.textContent).toContain('0 de 3 prontos');
  });

  it('webhook ligado — mostra a última atualização e o interruptor marcado', async () => {
    const { container } = await montar(<AgendaPage />);
    await abrirDetalhe(container, 'Mãe Divina');

    const interruptor = elemento(container, 'button[role="switch"]');

    expect(interruptor.getAttribute('aria-label')).toBe('Atualização do preparo por webhook');
    expect(interruptor.getAttribute('aria-checked')).toBe('true');
    expect(container.textContent).toContain('POST /preparo/{id}/tarefas · última atualização hoje, 14:02');
  });

  it('desligar o webhook — avisa que a lista só muda por aqui e pelo link; ligar de novo avisa o contrário', async () => {
    const { container } = await montar(<AgendaPage />);
    await abrirDetalhe(container, 'Mãe Divina');
    const interruptor = elemento(container, 'button[role="switch"]');

    await clicar(interruptor);
    const aoDesligar = [avisoDaAgenda(container), interruptor.getAttribute('aria-checked')];
    await clicar(interruptor);

    expect(aoDesligar).toEqual(['Webhook desligado — a lista só muda por aqui e pelo link.', 'false']);
    expect(avisoDaAgenda(container)).toBe('Webhook ligado: POST /preparo/{id}/tarefas atualiza a lista.');
  });

  it('webhook desligado — o texto passa a ser desligado e vale também para as outras cerimônias', async () => {
    const { container } = await montar(<AgendaPage />);
    await abrirDetalhe(container, 'Mãe Divina');
    await clicar(elemento(container, 'button[role="switch"]'));
    await clicar(botaoComTexto(container, 'Voltar para a agenda'));

    await abrirDetalhe(container, 'Trabalho de cura');

    expect(container.textContent).toContain('Webhookdesligado');
    expect(elemento(container, 'button[role="switch"]').getAttribute('aria-checked')).toBe('false');
  });

  it('copiar o link do preparo — avisa que o link foi copiado, sem tocar a área de transferência', async () => {
    const { container } = await montar(<AgendaPage />);
    await abrirDetalhe(container, 'Mãe Divina');

    await clicar(botaoComTexto(container, 'Copiar'));

    expect(container.textContent).toContain('cdd.app/preparo/1-05set');
    expect(avisoDaAgenda(container)).toBe(
      'Link do preparo copiado. Quem abrir entra com o próprio login para marcar as tarefas.',
    );
  });

  it('cobrar quem está pendente — avisa que o convite de anamnese foi enviado', async () => {
    const { container } = await montar(<AgendaPage />);
    await abrirDetalhe(container, 'Mãe Divina');

    await clicar(botaoComTexto(container, 'Cobrar quem está pendente'));

    expect(avisoDaAgenda(container)).toBe(
      'Convite de anamnese enviado a quem está sem resposta ou com resposta vencida.',
    );
  });

  it('clicar num participante — avisa que a ficha fica na tela Pessoas', async () => {
    const { container } = await montar(<AgendaPage />);
    await abrirDetalhe(container, 'Mãe Divina');

    await clicar(todos<HTMLButtonElement>(container, 'button').find((b) => b.textContent?.startsWith('Eduardo Menezes'))!);

    expect(avisoDaAgenda(container)).toBe('Ficha de Eduardo Menezes — cadastro e anamneses ficam na tela Pessoas.');
  });

  it('aviso — o x de fechar aviso o dispensa', async () => {
    const { container } = await montar(<AgendaPage />);
    await abrirDetalhe(container, 'Mãe Divina');
    await clicar(botaoComTexto(container, 'Copiar'));

    await clicar(botaoPeloRotuloAcessivel(container, 'fechar aviso'));

    expect(avisoDaAgenda(container)).toBeNull();
  });

  it('aviso — continua na tela ao voltar do detalhe para o calendário', async () => {
    const { container } = await montar(<AgendaPage />);
    await abrirDetalhe(container, 'Mãe Divina');
    await clicar(botaoComTexto(container, 'Copiar'));

    await clicar(botaoComTexto(container, 'Voltar para a agenda'));

    expect(avisoDaAgenda(container)).toBe(
      'Link do preparo copiado. Quem abrir entra com o próprio login para marcar as tarefas.',
    );
  });

  it('aviso da agenda — é uma caixa sem role de status, com o x chamado fechar aviso (o Recado das outras telas é status e diz fechar recado)', async () => {
    const { container } = await montar(<AgendaPage />);
    await abrirDetalhe(container, 'Mãe Divina');

    await clicar(botaoComTexto(container, 'Copiar'));

    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.querySelector('button[aria-label="fechar recado"]')).toBeNull();
  });
});

describe('AgendaPage: duplicar e cancelar', () => {
  it('duplicar — abre a cópia como planejada, sem confirmados, e avisa para ajustar a data', async () => {
    const { container } = await montar(<AgendaPage />);
    await abrirDetalhe(container, 'Mãe Divina');

    await clicar(botaoComTexto(container, 'Duplicar'));

    expect(avisoDaAgenda(container)).toBe('Cerimônia duplicada como planejada — ajuste a data.');
    expect(container.textContent).toContain('05/09 · Mãe Divina');
    expect(container.textContent).toContain('Planejada');
    expect(textoDoNumero(container, 'Confirmados')).toBe('Confirmados0de 84 previstos');
    expect(container.textContent).toContain(`cdd.app/preparo/${ID_DO_TRABALHO_CRIADO_NO_AGORA_FIXO}-05set`);
  });

  it('duplicar — a cópia fica na mesma data da original: o calendário mostra dois chips no dia 5', async () => {
    const { container } = await montar(<AgendaPage />);
    await abrirDetalhe(container, 'Mãe Divina');
    await clicar(botaoComTexto(container, 'Duplicar'));

    await clicar(botaoComTexto(container, 'Voltar para a agenda'));

    expect(nomesPorDiaNoCalendario(container)['5']).toEqual(['Mãe Divina', 'Mãe Divina']);
    expect(contagemDoMes(container)).toBe('5 cerimônias no mês');
  });

  it('cancelar — marca como cancelada, avisa que fica no histórico e bloqueia o botão com o motivo', async () => {
    const { container } = await montar(<AgendaPage />);
    await abrirDetalhe(container, 'Mãe Divina');

    await clicar(botaoComTexto(container, 'Cancelar'));

    const cancelar = botaoComTexto(container, 'Cancelar');
    expect(avisoDaAgenda(container)).toBe('Cerimônia marcada como cancelada. Ela continua no histórico.');
    expect(container.textContent).toContain('Cancelada');
    expect(cancelar.disabled).toBe(true);
    expect(cancelar.title).toBe('Esta cerimônia já está cancelada.');
    expect(container.textContent).toContain('Esta cerimônia já está cancelada.');
  });

  it('cancelar — o título do detalhe fica riscado', async () => {
    const { container } = await montar(<AgendaPage />);
    await abrirDetalhe(container, 'Mãe Divina');

    await clicar(botaoComTexto(container, 'Cancelar'));

    expect(elemento(container, 'h2').style.textDecoration).toBe('line-through');
  });

  it('cerimônia cancelada — o chip no calendário fica riscado, com fundo neutro e texto de meta', async () => {
    const { container } = await montar(<AgendaPage />);
    await abrirDetalhe(container, 'Mãe Divina');
    await clicar(botaoComTexto(container, 'Cancelar'));
    await clicar(botaoComTexto(container, 'Voltar para a agenda'));

    const chip = chipDoCalendario(container, 'Mãe Divina');

    expect([chip.style.textDecoration, chip.style.background, chip.style.color]).toEqual([
      'line-through',
      'var(--color-neutral-soft)',
      'var(--text-meta)',
    ]);
  });

  it('cerimônia cancelada — na lista o nome fica riscado e a situação diz Cancelada', async () => {
    const { container } = await montar(<AgendaPage />);
    await abrirDetalhe(container, 'Mãe Divina');
    await clicar(botaoComTexto(container, 'Cancelar'));
    await clicar(botaoComTexto(container, 'Voltar para a agenda'));
    await abrirLista(container);

    const item = itensDaLista(container)[1]!;
    const nome = todos<HTMLSpanElement>(item, 'span').find((span) => span.textContent === 'Mãe Divina')!;

    expect(nome.style.textDecoration).toBe('line-through');
    expect(item.textContent).toBe(
      '05/09Mãe Divina20:00 às 04:00 · Salão principal · Aurio Neto9 LCancelada',
    );
  });
});

describe('AgendaPage: nova cerimônia', () => {
  it('Nova cerimônia — abre o formulário com os padrões do rascunho vazio', async () => {
    const { container } = await montar(<AgendaPage />);

    await clicar(botaoComTexto(container, 'Nova cerimônia'));

    const formulario = formularioAberto(container);
    expect(campoDoRotulo(formulario, 'Nome').value).toBe('');
    expect(campoDoRotulo<HTMLSelectElement>(formulario, 'Tipo').value).toBe('Concentração');
    expect(campoDoRotulo(formulario, 'Horário').value).toBe('20:00 às 04:00');
    expect(campoDoRotulo(formulario, 'Local').value).toBe('Salão principal');
  });

  it('formulário — fechar sem salvar não cria nada e não avisa', async () => {
    const { container } = await montar(<AgendaPage />);
    await clicar(botaoComTexto(container, 'Nova cerimônia'));
    await digitar(campoDoRotulo(formularioAberto(container), 'Nome'), 'Rascunho abandonado');

    await clicar(botaoComTexto(formularioAberto(container), 'Cancelar'));

    expect(container.querySelector('div[style*="position: fixed"]')).toBeNull();
    expect(avisoDaAgenda(container)).toBeNull();
    expect(contagemDoMes(container)).toBe('4 cerimônias no mês');
  });

  it('salvar sem data — cai no dia 1 do mês que está na tela e avisa que foi criada como planejada', async () => {
    const { container } = await montar(<AgendaPage />);

    await preencherEEnviarNovaCerimonia(container, { nome: 'Cerimônia de teste' });

    expect(avisoDaAgenda(container)).toBe('Cerimônia criada como planejada.');
    expect(contagemDoMes(container)).toBe('5 cerimônias no mês');
    expect(nomesPorDiaNoCalendario(container)['1']).toEqual(['Cerimônia de teste']);
    expect(container.querySelector('div[style*="position: fixed"]')).toBeNull();
  });

  it('salvar sem data com o calendário em agosto — cai no dia 1 de agosto', async () => {
    const { container } = await montar(<AgendaPage />);
    await clicar(mesAnterior(container));

    await preencherEEnviarNovaCerimonia(container, { nome: 'Cerimônia de agosto' });

    expect(mesNaTela(container)).toBe('agosto de 2026');
    expect(nomesPorDiaNoCalendario(container)['1']).toEqual(['Cerimônia de agosto']);
  });

  it('salvar com data em outro mês — o calendário pula para o mês da nova cerimônia', async () => {
    const { container } = await montar(<AgendaPage />);

    await preencherEEnviarNovaCerimonia(container, { nome: 'Cerimônia de novembro', data: '10/11/2026' });

    expect(mesNaTela(container)).toBe('novembro de 2026');
    expect(nomesPorDiaNoCalendario(container)).toEqual({ '10': ['Cerimônia de novembro'] });
  });

  it('data de 31/02 — é aceita sem validar: o mês conta uma cerimônia, mas nenhum chip aparece no calendário', async () => {
    const { container } = await montar(<AgendaPage />);

    await preencherEEnviarNovaCerimonia(container, { nome: 'Cerimônia impossível', data: '31/02/2026' });

    expect(mesNaTela(container)).toBe('fevereiro de 2026');
    expect(contagemDoMes(container)).toBe('1 cerimônia no mês');
    expect(chipsDoCalendario(container)).toHaveLength(0);
  });

  it('data sem barras — vira dia 1 do mês e do ano que estão na tela', async () => {
    const { container } = await montar(<AgendaPage />);

    await preencherEEnviarNovaCerimonia(container, { nome: 'Cerimônia sem data certa', data: 'em breve' });

    expect(mesNaTela(container)).toBe('setembro de 2026');
    expect(nomesPorDiaNoCalendario(container)['1']).toEqual(['Cerimônia sem data certa']);
  });

  it('cerimônia criada — abre como planejada, com dirigente a definir e equipe só com o dirigente', async () => {
    const { container } = await montar(<AgendaPage />);

    await criarEAbrirDetalhe(container, { nome: 'Cerimônia de teste' });

    const texto = container.textContent ?? '';
    expect(texto).toContain('01/09 · Cerimônia de teste');
    expect(texto).toContain('Planejada');
    expect(texto).toContain('Quem conduzDirigentea definirLista de preparo');
    expect(textoDoNumero(container, 'Confirmados')).toBe('Confirmados0de 0 previstos');
  });

  it('cerimônia criada com as tarefas padrão — responsável vazio vira a definir', async () => {
    const { container } = await montar(<AgendaPage />);

    await criarEAbrirDetalhe(container, { nome: 'Cerimônia de teste' });

    const tarefas = todos<HTMLLabelElement>(container, 'label').map((tarefa) => tarefa.textContent);
    expect(tarefas).toEqual(['Limpeza do salãoa definir', 'Compra de mantimentosa definir']);
  });

  it('dirigente preenchido — aparece no detalhe e na equipe', async () => {
    const { container } = await montar(<AgendaPage />);

    await criarEAbrirDetalhe(container, { nome: 'Cerimônia de teste', dirigente: 'Lucia Prado' });

    expect(container.textContent).toContain('Quem conduzDirigenteLucia PradoLista de preparo');
  });

  it.each([
    { digitado: '40, 60, 90', numero: 'Contribuição40 · 60 · 90opções sugeridas' },
    { digitado: '45,50', numero: 'Contribuição45 · 50opções sugeridas' },
    { digitado: '40', numero: 'Contribuição40sem contribuição' },
    { digitado: 'quarenta', numero: 'Contribuição—sem contribuição' },
    { digitado: '', numero: 'Contribuição—sem contribuição' },
  ])('contribuições digitadas como "$digitado" — o detalhe mostra $numero', async ({ digitado, numero }) => {
    const { container } = await montar(<AgendaPage />);

    await criarEAbrirDetalhe(container, { nome: 'Cerimônia de teste', contribuicoes: digitado });

    expect(textoDoNumero(container, 'Contribuição')).toBe(numero);
  });

  it.each([
    { digitado: '9,5', litros: '9.5' },
    { digitado: '1.500,00', litros: '1.5' },
    { digitado: '12', litros: '12' },
  ])('litros digitados como "$digitado" — o detalhe mostra $litros L, com ponto como separador decimal', async ({ digitado, litros }) => {
    const { container } = await montar(<AgendaPage />);

    await criarEAbrirDetalhe(container, { nome: 'Cerimônia de teste', litros: digitado });

    expect(textoDoNumero(container, 'Litros previstos')).toBe(`Litros previstos${litros}reserva no estoque`);
    expect(container.textContent).toContain(`${litros} L previstos`);
  });

  it('litros que não são número — viram 0 e a linha de litros previstos some do resumo', async () => {
    const { container } = await montar(<AgendaPage />);

    await criarEAbrirDetalhe(container, { nome: 'Cerimônia de teste', litros: 'muito' });

    expect(textoDoNumero(container, 'Litros previstos')).toBe('Litros previstos0reserva no estoque');
    expect(container.textContent).not.toContain('L previstos');
  });

  it.each([
    { digitado: '30', esperado: 'de 30 previstos' },
    { digitado: '12,7', esperado: 'de 12 previstos' },
    { digitado: 'muitos', esperado: 'de 0 previstos' },
  ])('previstos digitados como "$digitado" — o detalhe mostra $esperado', async ({ digitado, esperado }) => {
    const { container } = await montar(<AgendaPage />);

    await criarEAbrirDetalhe(container, { nome: 'Cerimônia de teste', previstos: digitado });

    expect(textoDoNumero(container, 'Confirmados')).toBe(`Confirmados0${esperado}`);
  });

  it('tarefas do formulário — tarefa em branco é descartada, o título e o responsável são aparados', async () => {
    const { container } = await montar(<AgendaPage />);
    await clicar(botaoComTexto(container, 'Nova cerimônia'));
    const formulario = formularioAberto(container);
    await digitar(campoDoRotulo(formulario, 'Nome'), 'Cerimônia de teste');
    await digitar(elemento<HTMLInputElement>(formulario, 'input[aria-label="tarefa 1"]'), '  Varrer o pátio  ');
    await digitar(elemento<HTMLInputElement>(formulario, 'input[aria-label="responsável pela tarefa 1"]'), '  Dona Rosa ');
    await digitar(elemento<HTMLInputElement>(formulario, 'input[aria-label="tarefa 2"]'), '   ');
    await clicar(botaoComTexto(formulario, 'Salvar cerimônia'));

    await abrirDetalhe(container, 'Cerimônia de teste');

    expect(todos<HTMLLabelElement>(container, 'label').map((tarefa) => tarefa.textContent)).toEqual(['Varrer o pátioDona Rosa']);
    expect(container.textContent).toContain('0 de 1 prontos');
  });

  it('nome com espaços nas pontas — é guardado como foi digitado, ao contrário dos títulos das tarefas que são aparados', async () => {
    const { container } = await montar(<AgendaPage />);

    await preencherEEnviarNovaCerimonia(container, { nome: '  Nome com folga  ' });

    expect(nomesPorDiaNoCalendario(container)['1']).toEqual(['  Nome com folga  ']);
  });

  it('cerimônia com todas as tarefas em branco — salva sem tarefas e a lista de preparo diz sem tarefas', async () => {
    const { container } = await montar(<AgendaPage />);
    await clicar(botaoComTexto(container, 'Nova cerimônia'));
    const formulario = formularioAberto(container);
    await digitar(campoDoRotulo(formulario, 'Nome'), 'Cerimônia de teste');
    await digitar(elemento<HTMLInputElement>(formulario, 'input[aria-label="tarefa 1"]'), '');
    await digitar(elemento<HTMLInputElement>(formulario, 'input[aria-label="tarefa 2"]'), '');
    await clicar(botaoComTexto(formulario, 'Salvar cerimônia'));

    await abrirDetalhe(container, 'Cerimônia de teste');

    expect(container.textContent).toContain('Lista de preparosem tarefas');
  });

  it('tipo escolhido no formulário — vale para o chip e para o selo do detalhe', async () => {
    const { container } = await montar(<AgendaPage />);
    await clicar(botaoComTexto(container, 'Nova cerimônia'));
    const formulario = formularioAberto(container);
    await digitar(campoDoRotulo(formulario, 'Nome'), 'Bailado novo');
    await escolherOpcao(campoDoRotulo<HTMLSelectElement>(formulario, 'Tipo'), 'Bailado');
    await clicar(botaoComTexto(formulario, 'Salvar cerimônia'));

    const chip = chipDoCalendario(container, 'Bailado novo');

    expect(chip.style.background).toBe('oklch(0.58 0.15 25)');
  });
});

describe('AgendaPage: editar', () => {
  it('Editar — abre o formulário preenchido com o que o trabalho tem, a data em dd/mm/aaaa e as contribuições em lista', async () => {
    const { container } = await montar(<AgendaPage />);
    await abrirDetalhe(container, 'Mãe Divina');

    await clicar(botaoComTexto(container, 'Editar'));

    const formulario = formularioAberto(container);
    const valores = ['Nome', 'Data', 'Horário', 'Local', 'Dirigente', 'Previstos', 'Litros previstos', 'Contribuições sugeridas'].map(
      (rotulo) => campoDoRotulo(formulario, rotulo).value,
    );
    expect(valores).toEqual(['Mãe Divina', '05/09/2026', '20:00 às 04:00', 'Salão principal', 'Aurio Neto', '84', '9', '40, 60, 90']);
    expect(formulario.textContent).toContain('Editar cerimônia');
  });

  it('salvar a edição — avisa que foi atualizada, fecha o formulário e mantém a situação e os confirmados', async () => {
    const { container } = await montar(<AgendaPage />);
    await abrirDetalhe(container, 'Mãe Divina');
    await clicar(botaoComTexto(container, 'Editar'));
    await digitar(campoDoRotulo(formularioAberto(container), 'Nome'), 'Mãe Divina — edição');

    await clicar(botaoComTexto(formularioAberto(container), 'Salvar cerimônia'));

    expect(avisoDaAgenda(container)).toBe('Cerimônia atualizada.');
    expect(container.querySelector('div[style*="position: fixed"]')).toBeNull();
    expect(container.textContent).toContain('05/09 · Mãe Divina — edição');
    expect(container.textContent).toContain('Confirmada');
    expect(textoDoNumero(container, 'Confirmados')).toBe('Confirmados61de 84 previstos');
  });

  it('editar o dirigente — o cabeçalho muda, mas Quem conduz continua com o dirigente antigo', async () => {
    const { container } = await montar(<AgendaPage />);
    await abrirDetalhe(container, 'Mãe Divina');
    await clicar(botaoComTexto(container, 'Editar'));
    await digitar(campoDoRotulo(formularioAberto(container), 'Dirigente'), 'Lucia Prado');

    await clicar(botaoComTexto(formularioAberto(container), 'Salvar cerimônia'));

    const texto = container.textContent ?? '';
    expect(texto).toContain('Salão principalLucia Prado9 L previstos');
    expect(texto).toContain('Quem conduzDirigenteAurio NetoFiscal do salão');
  });

  it('editar a data — o chip muda de dia no calendário', async () => {
    const { container } = await montar(<AgendaPage />);
    await abrirDetalhe(container, 'Mãe Divina');
    await clicar(botaoComTexto(container, 'Editar'));
    await digitar(campoDoRotulo(formularioAberto(container), 'Data'), '06/09/2026');
    await clicar(botaoComTexto(formularioAberto(container), 'Salvar cerimônia'));

    await clicar(botaoComTexto(container, 'Voltar para a agenda'));

    expect(nomesPorDiaNoCalendario(container)['6']).toEqual(['Mãe Divina']);
    expect(nomesPorDiaNoCalendario(container)['5']).toBeUndefined();
  });

  it('editar as contribuições para 45,50 — vira duas opções, 45 e 50 (divergência do Documento 8, seção 14)', async () => {
    const { container } = await montar(<AgendaPage />);
    await abrirDetalhe(container, 'Mãe Divina');
    await clicar(botaoComTexto(container, 'Editar'));
    await digitar(campoDoRotulo(formularioAberto(container), 'Contribuições sugeridas'), '45,50');

    await clicar(botaoComTexto(formularioAberto(container), 'Salvar cerimônia'));

    expect(textoDoNumero(container, 'Contribuição')).toBe('Contribuição45 · 50opções sugeridas');
  });

  it('editar as tarefas — a marcação de pronto fica na posição, não na tarefa: trocar a ordem passa a marcação para outra', async () => {
    const { container } = await montar(<AgendaPage />);
    await abrirDetalhe(container, 'Mãe Divina');
    await clicar(todos<HTMLInputElement>(container, 'input[type="checkbox"]')[0]!);
    await clicar(botaoComTexto(container, 'Editar'));
    await clicar(todos<HTMLButtonElement>(formularioAberto(container), 'button[aria-label="descer"]')[0]!);
    await clicar(botaoComTexto(formularioAberto(container), 'Salvar cerimônia'));

    const tarefas = todos<HTMLLabelElement>(container, 'label');
    expect(tarefas[0]!.textContent).toBe('Compra de mantimentosDona Rosa · marcado pelo link, hoje 14:02');
    expect(tarefas[1]!.textContent).toBe('Limpeza do salãoChico Aguiar');
  });
});

describe('AgendaPage: densidade', () => {
  it.each([
    {
      densidade: 'office' as const,
      cabecalho: 'E-01 · AgendaAgendaOs trabalhos do centro, no calendário ou em lista · CDDNova cerimônia',
      espacamento: '18px 24px 30px',
      larguraMaxima: '1080px',
    },
    { densidade: 'field' as const, cabecalho: 'E-01AgendaNova cerimônia', espacamento: '14px 16px 24px', larguraMaxima: '' },
  ])('densidade $densidade — cabeçalho, respiro e largura máxima da tela', async ({ densidade, cabecalho: esperado, espacamento, larguraMaxima }) => {
    fixarDensidade(densidade);

    const { container } = await montar(<AgendaPage />);

    const corpo = elemento<HTMLDivElement>(container, 'header').nextElementSibling as HTMLElement;
    expect(cabecalho(container)).toBe(esperado);
    expect([corpo.style.padding, corpo.style.maxWidth]).toEqual([espacamento, larguraMaxima]);
  });

  it.each([
    { densidade: 'office' as const, colunas: 'repeat(auto-fit,minmax(150px,1fr))' },
    { densidade: 'field' as const, colunas: 'repeat(2,minmax(0,1fr))' },
  ])('densidade $densidade — os números do detalhe usam a grade $colunas', async ({ densidade, colunas }) => {
    fixarDensidade(densidade);
    const { container } = await montar(<AgendaPage />);

    await abrirDetalhe(container, 'Mãe Divina');

    const grade = elemento<HTMLDivElement>(container, 'div[style*="grid-template-columns"]');
    expect(grade.style.gridTemplateColumns).toBe(colunas);
  });

  it.each([
    { densidade: 'office' as const, margem: 'auto' },
    { densidade: 'field' as const, margem: '0px' },
  ])('densidade $densidade — a navegação do mês fica com margem à esquerda $margem', async ({ densidade, margem }) => {
    fixarDensidade(densidade);
    const { container } = await montar(<AgendaPage />);

    const navegacao = mesAnterior(container).parentElement as HTMLElement;

    expect(navegacao.style.marginLeft).toBe(margem);
  });

  it('densidade de campo — o seletor de vista divide a largura entre Calendário e Lista', async () => {
    fixarDensidade('field');

    const { container } = await montar(<AgendaPage />);

    expect(botaoComTexto(container, 'Calendário').style.flex).toBe('1 1 0%');
    expect(botaoComTexto(container, 'Lista').style.flex).toBe('1 1 0%');
  });
});
