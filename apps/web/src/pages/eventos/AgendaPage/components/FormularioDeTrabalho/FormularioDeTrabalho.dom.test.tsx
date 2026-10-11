import { afterEach, describe, expect, it, vi } from 'vitest';
import { botaoComTexto, clicar, desmontarTudo, digitar, elemento, escolherOpcao, montar, todos } from '@/testes/montagem';
import { FormularioDeTrabalho } from './FormularioDeTrabalho';
import { rascunhoDe, rascunhoVazio, type RascunhoDeTrabalho } from '../../utils/rascunhoDeTrabalho';
import { botaoPeloRotuloAcessivel, campoDoRotulo, digitarEmTextarea, umTrabalho } from '../../apoioDeTeste';

afterEach(desmontarTudo);

const montarFormulario = async (inicial: RascunhoDeTrabalho = rascunhoVazio()) => {
  const props = { inicial, onCancelar: vi.fn(), onSalvar: vi.fn<(rascunho: RascunhoDeTrabalho) => void>() };
  const montado = await montar(<FormularioDeTrabalho {...props} />);
  return { ...montado, props };
};

const entradaDaTarefa = (container: HTMLElement, posicao: number) =>
  elemento<HTMLInputElement>(container, `input[aria-label="tarefa ${posicao}"]`);
const responsavelDaTarefa = (container: HTMLElement, posicao: number) =>
  elemento<HTMLInputElement>(container, `input[aria-label="responsável pela tarefa ${posicao}"]`);
const titulosDasTarefas = (container: HTMLElement) =>
  todos<HTMLInputElement>(container, 'input[aria-label^="tarefa "]').map((entrada) => entrada.value);
const botoesDaTarefa = (container: HTMLElement, rotulo: 'subir' | 'descer' | 'remover') =>
  todos<HTMLButtonElement>(container, `button[aria-label="${rotulo}"]`);
const contadorDeTarefas = (container: HTMLElement) =>
  todos<HTMLSpanElement>(container, 'span').find((span) => /^(nenhuma tarefa|\d+ tarefas?)$/.test(span.textContent ?? ''))
    ?.textContent;
const salvar = (container: HTMLElement) => botaoComTexto(container, 'Salvar cerimônia');

const TRABALHO_EXISTENTE = umTrabalho({
  id: 42,
  nome: 'Mãe Divina',
  tipo: 'Trabalho de cura',
  dia: 5,
  mes: 9,
  ano: 2026,
  horario: '20:00 às 04:00',
  local: 'Salão principal',
  dirigente: 'Aurio Neto',
  previstos: 84,
  litros: 9.5,
  contribuicoes: [40, 60, 90],
  observacoes: 'Chegada até 19h30.',
  preparo: [
    { titulo: 'Limpeza do salão', responsavel: 'Chico Aguiar' },
    { titulo: 'Compra de mantimentos', responsavel: 'Dona Rosa' },
  ],
});

describe('FormularioDeTrabalho: campos', () => {
  it('rascunho novo — o título é Nova cerimônia e o fechar tem nome acessível', async () => {
    const { container } = await montarFormulario();

    expect(container.textContent).toContain('Nova cerimônia');
    expect(botaoPeloRotuloAcessivel(container, 'fechar')).toBeDefined();
  });

  it('rascunho de um trabalho existente — o título é Editar cerimônia', async () => {
    const { container } = await montarFormulario(rascunhoDe(TRABALHO_EXISTENTE));

    expect(container.textContent).toContain('Editar cerimônia');
    expect(container.textContent).not.toContain('Nova cerimônia');
  });

  it('rascunho novo — mostra os campos na ordem, com os valores padrão', async () => {
    const { container } = await montarFormulario();

    const rotulos = todos<HTMLLabelElement>(container, 'label').map((rotulo) => rotulo.textContent);
    expect(rotulos).toEqual([
      'Nome',
      'Tipo',
      'Data',
      'Horário',
      'Local',
      'Dirigente',
      'Previstos',
      'Litros previstos',
      'Contribuições sugeridas',
      'Observações',
    ]);
    expect(
      ['Nome', 'Data', 'Horário', 'Local', 'Dirigente', 'Previstos', 'Litros previstos', 'Contribuições sugeridas'].map(
        (rotulo) => campoDoRotulo(container, rotulo).value,
      ),
    ).toEqual(['', '', '20:00 às 04:00', 'Salão principal', '', '', '', '']);
  });

  it('placeholders e dica — Mãe Divina, 05/09/2026, 40, 60, 90 e a dica das contribuições separadas por vírgula', async () => {
    const { container } = await montarFormulario();

    expect(campoDoRotulo(container, 'Nome').placeholder).toBe('Mãe Divina');
    expect(campoDoRotulo(container, 'Data').placeholder).toBe('05/09/2026');
    expect(campoDoRotulo(container, 'Contribuições sugeridas').placeholder).toBe('40, 60, 90');
    expect(container.textContent).toContain('uma ou mais opções, separadas por vírgula');
  });

  it('teclado do celular — Previstos pede teclado numérico e Litros previstos o decimal', async () => {
    const { container } = await montarFormulario();

    expect(campoDoRotulo(container, 'Previstos').inputMode).toBe('numeric');
    expect(campoDoRotulo(container, 'Litros previstos').inputMode).toBe('decimal');
  });

  it('Observações — é uma caixa de várias linhas', async () => {
    const { container } = await montarFormulario();

    expect(campoDoRotulo(container, 'Observações').tagName).toBe('TEXTAREA');
  });

  it('Tipo — oferece os cinco tipos de trabalho, na ordem do mapa de cores', async () => {
    const { container } = await montarFormulario();

    const opcoes = todos<HTMLOptionElement>(campoDoRotulo<HTMLSelectElement>(container, 'Tipo'), 'option').map(
      (opcao) => opcao.textContent,
    );

    expect(opcoes).toEqual(['Concentração', 'Trabalho de cura', 'Feitio', 'Bailado', 'Reunião do corpo']);
  });

  it('rascunho de um trabalho existente — preenche os campos com o que o trabalho tem', async () => {
    const { container } = await montarFormulario(rascunhoDe(TRABALHO_EXISTENTE));

    expect(
      ['Nome', 'Data', 'Horário', 'Local', 'Dirigente', 'Previstos', 'Litros previstos', 'Contribuições sugeridas'].map(
        (rotulo) => campoDoRotulo(container, rotulo).value,
      ),
    ).toEqual(['Mãe Divina', '05/09/2026', '20:00 às 04:00', 'Salão principal', 'Aurio Neto', '84', '9.5', '40, 60, 90']);
    expect(campoDoRotulo<HTMLSelectElement>(container, 'Tipo').value).toBe('Trabalho de cura');
    expect(campoDoRotulo<HTMLTextAreaElement>(container, 'Observações').value).toBe('Chegada até 19h30.');
  });
});

describe('FormularioDeTrabalho: salvar e fechar', () => {
  it('sem nome — Salvar cerimônia fica bloqueado, com o motivo no title e à vista', async () => {
    const { container, props } = await montarFormulario();

    await clicar(salvar(container));

    expect([salvar(container).disabled, salvar(container).title]).toEqual([true, 'A cerimônia precisa de um nome.']);
    expect(container.textContent).toContain('A cerimônia precisa de um nome.');
    expect(props.onSalvar).not.toHaveBeenCalled();
  });

  it('nome só com espaços — continua bloqueado', async () => {
    const { container } = await montarFormulario();

    await digitar(campoDoRotulo(container, 'Nome'), '   ');

    expect(salvar(container).disabled).toBe(true);
  });

  it('nome preenchido — libera o botão e tira o aviso de motivo', async () => {
    const { container } = await montarFormulario();

    await digitar(campoDoRotulo(container, 'Nome'), 'Mãe Divina');

    expect([salvar(container).disabled, salvar(container).title]).toEqual([false, '']);
    expect(container.textContent).not.toContain('A cerimônia precisa de um nome.');
  });

  it('Salvar cerimônia — entrega tudo o que foi digitado, como texto e sem aparar, numa única chamada', async () => {
    const { container, props } = await montarFormulario();
    await digitar(campoDoRotulo(container, 'Nome'), '  Bailado novo ');
    await escolherOpcao(campoDoRotulo<HTMLSelectElement>(container, 'Tipo'), 'Bailado');
    await digitar(campoDoRotulo(container, 'Data'), '10/11/2026');
    await digitar(campoDoRotulo(container, 'Horário'), '19:00 às 05:00');
    await digitar(campoDoRotulo(container, 'Local'), 'Casa de feitio');
    await digitar(campoDoRotulo(container, 'Dirigente'), 'Chico Aguiar');
    await digitar(campoDoRotulo(container, 'Previstos'), '120');
    await digitar(campoDoRotulo(container, 'Litros previstos'), '14,5');
    await digitar(campoDoRotulo(container, 'Contribuições sugeridas'), '50, 80');
    await digitarEmTextarea(campoDoRotulo<HTMLTextAreaElement>(container, 'Observações'), 'Maior do trimestre.');

    await clicar(salvar(container));

    expect(props.onSalvar).toHaveBeenCalledExactlyOnceWith({
      editId: null,
      nome: '  Bailado novo ',
      tipo: 'Bailado',
      data: '10/11/2026',
      horario: '19:00 às 05:00',
      local: 'Casa de feitio',
      dirigente: 'Chico Aguiar',
      previstos: '120',
      litros: '14,5',
      contribuicoes: '50, 80',
      observacoes: 'Maior do trimestre.',
      preparo: [
        { titulo: 'Limpeza do salão', responsavel: '' },
        { titulo: 'Compra de mantimentos', responsavel: '' },
      ],
    });
  });

  it('Salvar numa edição — o rascunho entregue leva o id do trabalho', async () => {
    const { container, props } = await montarFormulario(rascunhoDe(TRABALHO_EXISTENTE));

    await clicar(salvar(container));

    expect(props.onSalvar.mock.calls[0]![0]).toMatchObject({ editId: 42, nome: 'Mãe Divina', tipo: 'Trabalho de cura' });
  });

  it('botão Cancelar — chama onCancelar uma vez e não salva', async () => {
    const { container, props } = await montarFormulario();

    await clicar(botaoComTexto(container, 'Cancelar'));

    expect(props.onCancelar).toHaveBeenCalledTimes(1);
    expect(props.onSalvar).not.toHaveBeenCalled();
  });

  it('x do cabeçalho — chama onCancelar uma vez', async () => {
    const { container, props } = await montarFormulario();

    await clicar(botaoPeloRotuloAcessivel(container, 'fechar'));

    expect(props.onCancelar).toHaveBeenCalledTimes(1);
  });

  it('clique no fundo escurecido — chama onCancelar', async () => {
    const { container, props } = await montarFormulario();

    await clicar(container.firstElementChild as HTMLElement);

    expect(props.onCancelar).toHaveBeenCalledTimes(1);
  });

  it('clique dentro do painel — não propaga ao fundo e não fecha', async () => {
    const { container, props } = await montarFormulario();

    await clicar(campoDoRotulo(container, 'Nome'));
    await clicar(elemento(container, 'span'));

    expect(props.onCancelar).not.toHaveBeenCalled();
  });

  it('props novas de rascunho — não reiniciam o que já foi digitado, o inicial só vale na montagem', async () => {
    const { container, atualizar, props } = await montarFormulario();
    await digitar(campoDoRotulo(container, 'Nome'), 'Digitado');

    await atualizar(<FormularioDeTrabalho {...props} inicial={rascunhoDe(TRABALHO_EXISTENTE)} />);

    expect(campoDoRotulo(container, 'Nome').value).toBe('Digitado');
  });
});

describe('FormularioDeTrabalho: lista de preparo', () => {
  it('rascunho novo — duas tarefas padrão e o contador diz 2 tarefas', async () => {
    const { container } = await montarFormulario();

    expect(titulosDasTarefas(container)).toEqual(['Limpeza do salão', 'Compra de mantimentos']);
    expect(contadorDeTarefas(container)).toBe('2 tarefas');
  });

  it('cada tarefa — tem campo de título e de responsável com placeholder e nome acessível pela posição', async () => {
    const { container } = await montarFormulario();

    expect(entradaDaTarefa(container, 1).placeholder).toBe('o que precisa ser feito');
    expect(responsavelDaTarefa(container, 2).placeholder).toBe('responsável');
  });

  it('regra do salvar — a nota explica que tarefa em branco é descartada e responsável vazio vira a definir', async () => {
    const { container } = await montarFormulario();

    expect(container.textContent).toContain('Tarefa em branco é descartada ao salvar; responsável vazio vira "a definir".');
  });

  it('Adicionar tarefa — acrescenta uma tarefa em branco no fim e o contador sobe', async () => {
    const { container } = await montarFormulario();

    await clicar(botaoComTexto(container, 'Adicionar tarefa'));

    expect(titulosDasTarefas(container)).toEqual(['Limpeza do salão', 'Compra de mantimentos', '']);
    expect(contadorDeTarefas(container)).toBe('3 tarefas');
  });

  it('com uma tarefa — o contador diz 1 tarefa, no singular', async () => {
    const { container } = await montarFormulario();

    await clicar(botoesDaTarefa(container, 'remover')[0]!);

    expect(contadorDeTarefas(container)).toBe('1 tarefa');
  });

  it('sem tarefa nenhuma — o contador diz nenhuma tarefa', async () => {
    const { container } = await montarFormulario();

    await clicar(botoesDaTarefa(container, 'remover')[0]!);
    await clicar(botoesDaTarefa(container, 'remover')[0]!);

    expect(contadorDeTarefas(container)).toBe('nenhuma tarefa');
  });

  it('remover — tira só aquela tarefa e mantém as outras na ordem', async () => {
    const { container } = await montarFormulario();
    await clicar(botaoComTexto(container, 'Adicionar tarefa'));
    await digitar(entradaDaTarefa(container, 3), 'Terceira');

    await clicar(botoesDaTarefa(container, 'remover')[1]!);

    expect(titulosDasTarefas(container)).toEqual(['Limpeza do salão', 'Terceira']);
  });

  it('digitar no título e no responsável — muda só aquela tarefa', async () => {
    const { container } = await montarFormulario();

    await digitar(entradaDaTarefa(container, 2), 'Comprar lenha');
    await digitar(responsavelDaTarefa(container, 2), 'Chico Aguiar');

    expect(titulosDasTarefas(container)).toEqual(['Limpeza do salão', 'Comprar lenha']);
    expect([responsavelDaTarefa(container, 1).value, responsavelDaTarefa(container, 2).value]).toEqual(['', 'Chico Aguiar']);
  });

  it('descer a primeira tarefa — troca com a segunda, levando o responsável junto', async () => {
    const { container } = await montarFormulario();
    await digitar(responsavelDaTarefa(container, 1), 'Dona Rosa');

    await clicar(botoesDaTarefa(container, 'descer')[0]!);

    expect(titulosDasTarefas(container)).toEqual(['Compra de mantimentos', 'Limpeza do salão']);
    expect([responsavelDaTarefa(container, 1).value, responsavelDaTarefa(container, 2).value]).toEqual(['', 'Dona Rosa']);
  });

  it('subir a segunda tarefa — troca com a primeira', async () => {
    const { container } = await montarFormulario();

    await clicar(botoesDaTarefa(container, 'subir')[1]!);

    expect(titulosDasTarefas(container)).toEqual(['Compra de mantimentos', 'Limpeza do salão']);
  });

  it('subir a primeira e descer a última — não fazem nada', async () => {
    const { container } = await montarFormulario();

    await clicar(botoesDaTarefa(container, 'subir')[0]!);
    await clicar(botoesDaTarefa(container, 'descer')[1]!);

    expect(titulosDasTarefas(container)).toEqual(['Limpeza do salão', 'Compra de mantimentos']);
  });

  it('botões de mover e remover — usam as setas e o x como texto e o nome acessível pela ação', async () => {
    const { container } = await montarFormulario();

    expect([
      botoesDaTarefa(container, 'subir')[0]!.textContent,
      botoesDaTarefa(container, 'descer')[0]!.textContent,
      botoesDaTarefa(container, 'remover')[0]!.textContent,
    ]).toEqual(['↑', '↓', '×']);
  });

  it('editar a lista — não altera as tarefas do rascunho recebido', async () => {
    const inicial = rascunhoDe(TRABALHO_EXISTENTE);
    const { container } = await montarFormulario(inicial);

    await digitar(entradaDaTarefa(container, 1), 'Outro título');
    await clicar(botoesDaTarefa(container, 'descer')[0]!);

    expect(inicial.preparo.map((tarefa) => tarefa.titulo)).toEqual(['Limpeza do salão', 'Compra de mantimentos']);
  });

  it('Salvar depois de mexer nas tarefas — entrega a lista como está no formulário, inclusive as em branco', async () => {
    const { container, props } = await montarFormulario();
    await digitar(campoDoRotulo(container, 'Nome'), 'Mãe Divina');
    await clicar(botaoComTexto(container, 'Adicionar tarefa'));
    await clicar(botoesDaTarefa(container, 'descer')[0]!);

    await clicar(salvar(container));

    expect(props.onSalvar.mock.calls[0]![0].preparo).toEqual([
      { titulo: 'Compra de mantimentos', responsavel: '' },
      { titulo: 'Limpeza do salão', responsavel: '' },
      { titulo: '', responsavel: '' },
    ]);
  });
});
