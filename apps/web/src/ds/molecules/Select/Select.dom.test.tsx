import { afterEach, describe, expect, it, vi } from 'vitest';
import { Select } from './Select';
import { desmontarTudo, elemento, escolherOpcao, montar, todos } from '@/testes/montagem';

afterEach(desmontarTudo);

const OPCOES = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gama' },
];

const textosDe = (itens: readonly Element[]) => itens.map((i) => i.textContent);

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
