import { afterEach, describe, expect, it, vi } from 'vitest';
import { CampoDeTags, Interruptor, RotuloDeCampo, Select, SeletorDeTipo } from './Campo';
import {
  botaoComTexto,
  clicar,
  desmontarTudo,
  elemento,
  escolherOpcao,
  montar,
  todos,
} from '../testes/montagem';

afterEach(desmontarTudo);

const OPCOES = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gama' },
];

const textosDe = (itens: readonly Element[]) => itens.map((i) => i.textContent);

describe('RotuloDeCampo', () => {
  it('mostra o texto num label ligado ao campo pelo htmlFor', async () => {
    const tela = await montar(<RotuloDeCampo htmlFor="campo-1">Valor</RotuloDeCampo>);

    const rotulo = elemento<HTMLLabelElement>(tela.container, 'label');
    expect(rotulo.textContent).toBe('Valor');
    expect(rotulo.htmlFor).toBe('campo-1');
  });

  it('sem htmlFor o label não aponta para campo nenhum', async () => {
    const tela = await montar(<RotuloDeCampo>Valor</RotuloDeCampo>);

    expect(elemento(tela.container, 'label').hasAttribute('for')).toBe(false);
  });

  it('escreve o texto em caixa alta pelo estilo', async () => {
    const tela = await montar(<RotuloDeCampo>Valor</RotuloDeCampo>);

    expect(elemento(tela.container, 'label').style.textTransform).toBe('uppercase');
  });

  it('aceita elementos como conteúdo', async () => {
    const tela = await montar(
      <RotuloDeCampo>
        Valor <strong>obrigatório</strong>
      </RotuloDeCampo>,
    );

    expect(elemento(tela.container, 'label strong').textContent).toBe('obrigatório');
  });
});

describe('Select', () => {
  const montarSelect = (props: Partial<Parameters<typeof Select>[0]> = {}) =>
    montar(<Select label="Conta" value="a" options={OPCOES} onChange={() => undefined} {...props} />);

  it('liga o rótulo ao select', async () => {
    const tela = await montarSelect();

    const select = elemento<HTMLSelectElement>(tela.container, 'select');
    expect(select.labels?.[0]?.textContent).toBe('Conta');
  });

  it('dois selects na mesma tela têm rótulos e ids próprios', async () => {
    const tela = await montar(
      <>
        <Select label="Conta" value="a" options={OPCOES} onChange={() => undefined} />
        <Select label="Grupo" value="b" options={OPCOES} onChange={() => undefined} />
      </>,
    );

    const [primeiro, segundo] = todos<HTMLSelectElement>(tela.container, 'select');
    expect(primeiro?.id).not.toBe(segundo?.id);
    expect(segundo?.labels?.[0]?.textContent).toBe('Grupo');
  });

  it('cria uma opção por item, na ordem, com o texto do rótulo e o código como valor', async () => {
    const tela = await montarSelect();

    const opcoes = todos<HTMLOptionElement>(tela.container, 'option');
    expect(textosDe(opcoes)).toEqual(['Alpha', 'Beta', 'Gama']);
    expect(opcoes.map((o) => o.value)).toEqual(['a', 'b', 'c']);
  });

  it('mostra selecionada a opção do value', async () => {
    const tela = await montarSelect({ value: 'b' });

    expect(elemento<HTMLSelectElement>(tela.container, 'select').value).toBe('b');
  });

  it('acompanha o value quando ele muda por fora', async () => {
    const tela = await montarSelect({ value: 'a' });

    await tela.atualizar(<Select label="Conta" value="c" options={OPCOES} onChange={() => undefined} />);

    expect(elemento<HTMLSelectElement>(tela.container, 'select').value).toBe('c');
  });

  it('value fora das opções deixa a primeira opção à mostra', async () => {
    const tela = await montarSelect({ value: 'inexistente' });

    expect(elemento<HTMLSelectElement>(tela.container, 'select').value).toBe('a');
  });

  it('escolher uma opção chama onChange com o código dela, não com o rótulo', async () => {
    const onChange = vi.fn();
    const tela = await montarSelect({ onChange });

    await escolherOpcao(elemento<HTMLSelectElement>(tela.container, 'select'), 'c');

    expect(onChange).toHaveBeenCalledExactlyOnceWith('c');
  });

  it('não chama onChange ao montar', async () => {
    const onChange = vi.fn();
    await montarSelect({ onChange });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('sem opções o select fica vazio', async () => {
    const tela = await montarSelect({ options: [] });

    expect(todos(tela.container, 'option')).toHaveLength(0);
  });

  it('ignora a meta da opção', async () => {
    const tela = await montarSelect({ options: [{ value: 'a', label: 'Alpha', meta: 'saldo R$ 10,00' }] });

    expect(tela.container.textContent).not.toContain('saldo R$ 10,00');
  });

  it('mostra a dica abaixo do select quando ela vem', async () => {
    const tela = await montarSelect({ hint: 'Só contas ativas' });

    expect(tela.container.textContent).toBe('ContaAlphaBetaGamaSó contas ativas');
  });

  it('com dica o campo tem rótulo, select e dica', async () => {
    const tela = await montarSelect({ hint: 'Só contas ativas' });

    expect(tela.container.firstElementChild?.children).toHaveLength(3);
  });

  it('sem dica o campo tem só rótulo e select', async () => {
    const tela = await montarSelect();

    expect(tela.container.textContent).toBe('ContaAlphaBetaGama');
    expect(tela.container.firstElementChild?.children).toHaveLength(2);
  });

  it('dica vazia não ocupa lugar', async () => {
    const tela = await montarSelect({ hint: '' });

    expect(tela.container.firstElementChild?.children).toHaveLength(2);
  });

  it('com erro a borda usa o tom de atenção', async () => {
    const tela = await montarSelect({ erro: true });

    expect(elemento(tela.container, 'select').style.border).toBe('1px solid var(--color-attention)');
  });

  it('sem erro a borda usa o tom de linha forte', async () => {
    const tela = await montarSelect();

    expect(elemento(tela.container, 'select').style.border).toBe('1px solid var(--color-line-strong)');
  });
});

describe('SeletorDeTipo', () => {
  const TIPOS = [
    { valor: 'ENTRADA', label: 'Entrada' },
    { valor: 'SAIDA', label: 'Saída' },
    { valor: 'TRANSFERENCIA', label: 'Transferência' },
  ] as const;

  const montarSeletor = (props: Partial<Parameters<typeof SeletorDeTipo>[0]> = {}) =>
    montar(<SeletorDeTipo opcoes={TIPOS} valor="SAIDA" onEscolher={() => undefined} {...props} />);

  it('cria um botão por opção, na ordem, com o texto do rótulo', async () => {
    const tela = await montarSeletor();

    expect(textosDe(todos(tela.container, 'button'))).toEqual(['Entrada', 'Saída', 'Transferência']);
  });

  it('os botões não enviam formulário', async () => {
    const tela = await montarSeletor();

    expect(todos<HTMLButtonElement>(tela.container, 'button').map((b) => b.type)).toEqual([
      'button',
      'button',
      'button',
    ]);
  });

  it('marca como pressionada só a opção do valor', async () => {
    const tela = await montarSeletor({ valor: 'SAIDA' });

    expect(todos(tela.container, 'button').map((b) => b.getAttribute('aria-pressed'))).toEqual([
      'false',
      'true',
      'false',
    ]);
  });

  it('valor fora das opções deixa todas despressionadas', async () => {
    const tela = await montarSeletor({ valor: 'OUTRO' });

    expect(todos(tela.container, 'button').map((b) => b.getAttribute('aria-pressed'))).toEqual([
      'false',
      'false',
      'false',
    ]);
  });

  it('acompanha o valor quando ele muda por fora', async () => {
    const tela = await montarSeletor({ valor: 'SAIDA' });

    await tela.atualizar(<SeletorDeTipo opcoes={TIPOS} valor="ENTRADA" onEscolher={() => undefined} />);

    expect(botaoComTexto(tela.container, 'Entrada').getAttribute('aria-pressed')).toBe('true');
    expect(botaoComTexto(tela.container, 'Saída').getAttribute('aria-pressed')).toBe('false');
  });

  it('clicar numa opção chama onEscolher com o valor dela', async () => {
    const onEscolher = vi.fn();
    const tela = await montarSeletor({ onEscolher });

    await clicar(botaoComTexto(tela.container, 'Transferência'));

    expect(onEscolher).toHaveBeenCalledExactlyOnceWith('TRANSFERENCIA');
  });

  it('clicar na opção já escolhida chama onEscolher do mesmo jeito', async () => {
    const onEscolher = vi.fn();
    const tela = await montarSeletor({ onEscolher, valor: 'SAIDA' });

    await clicar(botaoComTexto(tela.container, 'Saída'));

    expect(onEscolher).toHaveBeenCalledExactlyOnceWith('SAIDA');
  });

  it('não escolhe sozinho: sem novo valor por fora o pressionado continua o mesmo', async () => {
    const tela = await montarSeletor({ valor: 'SAIDA' });

    await clicar(botaoComTexto(tela.container, 'Entrada'));

    expect(botaoComTexto(tela.container, 'Saída').getAttribute('aria-pressed')).toBe('true');
  });

  it('sem opções não cria botão', async () => {
    const tela = await montarSeletor({ opcoes: [] });

    expect(todos(tela.container, 'button')).toHaveLength(0);
  });

  it('a opção pressionada usa o tom royal e as demais o tom neutro', async () => {
    const tela = await montarSeletor({ valor: 'SAIDA' });

    expect(botaoComTexto(tela.container, 'Saída').style.background).toBe('var(--color-royal-soft)');
    expect(botaoComTexto(tela.container, 'Entrada').style.background).toBe('var(--bg-card)');
  });

  it('no escritório as opções quebram de linha e mantêm a largura do conteúdo', async () => {
    const tela = await montarSeletor();

    expect(elemento(tela.container, 'div').style.flexWrap).toBe('wrap');
    expect(botaoComTexto(tela.container, 'Entrada').style.flex).toBe('');
  });

  it('em campo as opções ficam numa linha só, repartindo a largura', async () => {
    const tela = await montarSeletor({ densidade: 'field' });

    expect(elemento(tela.container, 'div').style.flexWrap).toBe('nowrap');
    expect(botaoComTexto(tela.container, 'Entrada').style.flex).toBe('1 1 0%');
  });
});

describe('Interruptor', () => {
  const montarInterruptor = (props: Partial<Parameters<typeof Interruptor>[0]> = {}) =>
    montar(<Interruptor ligado={false} onAlternar={() => undefined} rotuloAcessivel="Receber avisos" {...props} />);

  it('é um botão com papel de interruptor e o rótulo acessível', async () => {
    const tela = await montarInterruptor();

    const interruptor = elemento<HTMLButtonElement>(tela.container, '[role="switch"]');
    expect(interruptor.tagName).toBe('BUTTON');
    expect(interruptor.type).toBe('button');
    expect(interruptor.getAttribute('aria-label')).toBe('Receber avisos');
  });

  it('desligado marca aria-checked como false', async () => {
    const tela = await montarInterruptor({ ligado: false });

    expect(elemento(tela.container, '[role="switch"]').getAttribute('aria-checked')).toBe('false');
  });

  it('ligado marca aria-checked como true', async () => {
    const tela = await montarInterruptor({ ligado: true });

    expect(elemento(tela.container, '[role="switch"]').getAttribute('aria-checked')).toBe('true');
  });

  it('clicar chama onAlternar uma vez', async () => {
    const onAlternar = vi.fn();
    const tela = await montarInterruptor({ onAlternar });

    await clicar(elemento(tela.container, '[role="switch"]'));

    expect(onAlternar).toHaveBeenCalledTimes(1);
  });

  it('cada clique chama onAlternar de novo, mesmo sem o valor mudar por fora', async () => {
    const onAlternar = vi.fn();
    const tela = await montarInterruptor({ onAlternar });

    await clicar(elemento(tela.container, '[role="switch"]'));
    await clicar(elemento(tela.container, '[role="switch"]'));

    expect(onAlternar).toHaveBeenCalledTimes(2);
  });

  it('não alterna sozinho: aria-checked só muda quando o prop muda', async () => {
    const tela = await montarInterruptor({ ligado: false });

    await clicar(elemento(tela.container, '[role="switch"]'));

    expect(elemento(tela.container, '[role="switch"]').getAttribute('aria-checked')).toBe('false');
  });

  it('acompanha o prop quando ele vira ligado', async () => {
    const tela = await montarInterruptor({ ligado: false });

    await tela.atualizar(<Interruptor ligado onAlternar={() => undefined} rotuloAcessivel="Receber avisos" />);

    expect(elemento(tela.container, '[role="switch"]').getAttribute('aria-checked')).toBe('true');
  });

  it('desligado a bolinha fica à esquerda e a trilha no tom neutro', async () => {
    const tela = await montarInterruptor({ ligado: false });

    const interruptor = elemento(tela.container, '[role="switch"]');
    expect(interruptor.style.justifyContent).toBe('flex-start');
    expect(interruptor.style.background).toBe('var(--color-line-strong)');
  });

  it('ligado a bolinha vai para a direita e a trilha no tom royal', async () => {
    const tela = await montarInterruptor({ ligado: true });

    const interruptor = elemento(tela.container, '[role="switch"]');
    expect(interruptor.style.justifyContent).toBe('flex-end');
    expect(interruptor.style.background).toBe('var(--color-royal)');
  });

  it('não mostra texto, só a bolinha', async () => {
    const tela = await montarInterruptor();

    expect(tela.container.textContent).toBe('');
  });
});

describe('CampoDeTags', () => {
  const montarTags = (props: Partial<Parameters<typeof CampoDeTags>[0]> = {}) =>
    montar(
      <CampoDeTags
        label="Categoria"
        escolhidas={['a']}
        disponiveis={OPCOES}
        onAdicionar={() => undefined}
        onRemover={() => undefined}
        {...props}
      />,
    );

  const botoesDeRemover = (origem: ParentNode) =>
    todos<HTMLButtonElement>(origem, 'button[aria-label^="remover categoria"]');

  const botoesDeAdicionar = (origem: ParentNode) =>
    todos<HTMLButtonElement>(origem, 'button').filter((b) => b.textContent?.startsWith('+ '));

  it('mostra o rótulo do campo num label sem ligação com controle', async () => {
    const tela = await montarTags();

    const rotulo = elemento<HTMLLabelElement>(tela.container, 'label');
    expect(rotulo.textContent).toBe('Categoria');
    expect(rotulo.hasAttribute('for')).toBe(false);
  });

  it('mostra cada escolhida como etiqueta com botão de remover nomeado por ela', async () => {
    const tela = await montarTags({ escolhidas: ['Alimentação', 'Limpeza'] });

    expect(botoesDeRemover(tela.container).map((b) => b.getAttribute('aria-label'))).toEqual([
      'remover categoria Alimentação',
      'remover categoria Limpeza',
    ]);
    expect(tela.container.textContent).toContain('Alimentação×');
    expect(tela.container.textContent).toContain('Limpeza×');
  });

  it('o botão de remover mostra o sinal ×', async () => {
    const tela = await montarTags({ escolhidas: ['Alimentação'] });

    expect(textosDe(botoesDeRemover(tela.container))).toEqual(['×']);
  });

  it('mostra a escolhida como veio, sem trocar pelo rótulo da opção', async () => {
    const tela = await montarTags({ escolhidas: ['a'] });

    expect(tela.container.textContent).toContain('a×');
    expect(tela.container.textContent).not.toContain('Alpha×');
  });

  it('remover chama onRemover com o texto da escolhida', async () => {
    const onRemover = vi.fn();
    const tela = await montarTags({ escolhidas: ['Alimentação', 'Limpeza'], onRemover });

    await clicar(elemento(tela.container, 'button[aria-label="remover categoria Limpeza"]'));

    expect(onRemover).toHaveBeenCalledExactlyOnceWith('Limpeza');
  });

  it('os botões de remover e de adicionar não enviam formulário', async () => {
    const tela = await montarTags({ escolhidas: ['a'] });

    expect(todos<HTMLButtonElement>(tela.container, 'button').map((b) => b.type)).toEqual([
      'button',
      'button',
      'button',
    ]);
  });

  it('remover não chama onAdicionar', async () => {
    const onAdicionar = vi.fn();
    const tela = await montarTags({ onAdicionar });

    await clicar(botoesDeRemover(tela.container)[0] as HTMLButtonElement);

    expect(onAdicionar).not.toHaveBeenCalled();
  });

  it('sem escolhidas mostra o aviso padrão e nenhum botão de remover', async () => {
    const tela = await montarTags({ escolhidas: [] });

    expect(tela.container.textContent).toContain('nenhuma escolhida');
    expect(botoesDeRemover(tela.container)).toHaveLength(0);
  });

  it('sem escolhidas mostra o aviso informado no lugar do padrão', async () => {
    const tela = await montarTags({ escolhidas: [], vazio: 'escolha ao menos uma' });

    expect(tela.container.textContent).toContain('escolha ao menos uma');
    expect(tela.container.textContent).not.toContain('nenhuma escolhida');
  });

  it('com escolhidas não mostra o aviso de vazio', async () => {
    const tela = await montarTags({ escolhidas: ['a'] });

    expect(tela.container.textContent).not.toContain('nenhuma escolhida');
  });

  it('oferece as disponíveis ainda não escolhidas, na ordem, com o sinal de mais', async () => {
    const tela = await montarTags({ escolhidas: ['b'] });

    expect(tela.container.textContent).toContain('Existentes:');
    expect(textosDe(botoesDeAdicionar(tela.container))).toEqual(['+ Alpha', '+ Gama']);
  });

  it('adicionar chama onAdicionar com o código da opção, não com o rótulo', async () => {
    const onAdicionar = vi.fn();
    const tela = await montarTags({ escolhidas: [], onAdicionar });

    await clicar(botaoComTexto(tela.container, '+ Gama'));

    expect(onAdicionar).toHaveBeenCalledExactlyOnceWith('c');
  });

  it('adicionar não chama onRemover', async () => {
    const onRemover = vi.fn();
    const tela = await montarTags({ escolhidas: [], onRemover });

    await clicar(botaoComTexto(tela.container, '+ Alpha'));

    expect(onRemover).not.toHaveBeenCalled();
  });

  it('compara as escolhidas com o código da opção: escolhida igual ao rótulo não a esconde', async () => {
    const tela = await montarTags({ escolhidas: ['Alpha'] });

    expect(textosDe(botoesDeAdicionar(tela.container))).toEqual(['+ Alpha', '+ Beta', '+ Gama']);
  });

  it('com todas as disponíveis escolhidas não mostra a lista de existentes', async () => {
    const tela = await montarTags({ escolhidas: ['a', 'b', 'c'] });

    expect(tela.container.textContent).not.toContain('Existentes:');
    expect(botoesDeAdicionar(tela.container)).toHaveLength(0);
  });

  it('sem disponíveis não mostra a lista de existentes', async () => {
    const tela = await montarTags({ escolhidas: ['a'], disponiveis: [] });

    expect(tela.container.textContent).not.toContain('Existentes:');
  });

  it('escolhida que não está entre as disponíveis aparece mesmo assim', async () => {
    const tela = await montarTags({ escolhidas: ['fora da lista'] });

    expect(botoesDeRemover(tela.container).map((b) => b.getAttribute('aria-label'))).toEqual([
      'remover categoria fora da lista',
    ]);
    expect(botoesDeAdicionar(tela.container)).toHaveLength(3);
  });

  it('não chama nenhum callback ao montar', async () => {
    const onAdicionar = vi.fn();
    const onRemover = vi.fn();
    await montarTags({ onAdicionar, onRemover });

    expect(onAdicionar).not.toHaveBeenCalled();
    expect(onRemover).not.toHaveBeenCalled();
  });

  it('acompanha as escolhidas quando elas mudam por fora', async () => {
    const tela = await montarTags({ escolhidas: [] });

    await tela.atualizar(
      <CampoDeTags
        label="Categoria"
        escolhidas={['c']}
        disponiveis={OPCOES}
        onAdicionar={() => undefined}
        onRemover={() => undefined}
      />,
    );

    expect(textosDe(botoesDeAdicionar(tela.container))).toEqual(['+ Alpha', '+ Beta']);
    expect(tela.container.textContent).not.toContain('nenhuma escolhida');
  });
});
