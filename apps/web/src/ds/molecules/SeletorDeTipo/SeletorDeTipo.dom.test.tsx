import { afterEach, describe, expect, it, vi } from 'vitest';
import { SeletorDeTipo } from './SeletorDeTipo';
import { botaoComTexto, clicar, desmontarTudo, elemento, montar, todos } from '@/testes/montagem';

afterEach(desmontarTudo);

const textosDe = (itens: readonly Element[]) => itens.map((i) => i.textContent);

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
