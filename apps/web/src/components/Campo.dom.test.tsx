import { afterEach, describe, expect, it, vi } from 'vitest';
import { CampoDeTags } from './Campo';
import {
  botaoComTexto,
  clicar,
  desmontarTudo,
  elemento,
  montar,
  todos,
} from '@/testes/montagem';

afterEach(desmontarTudo);

const OPCOES = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gama' },
];

const textosDe = (itens: readonly Element[]) => itens.map((i) => i.textContent);

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
