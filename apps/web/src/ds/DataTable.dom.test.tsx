import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { desmontarTudo, elemento, montar, todos } from '@/testes/montagem';
import { DataTable, type Column } from './DataTable';

afterEach(desmontarTudo);

interface Lancamento extends Record<string, ReactNode> {
  descricao: string;
  conta: string;
  valor: ReactNode;
}

const COLUNAS: readonly Column<Lancamento>[] = [
  { key: 'descricao', label: 'Descrição' },
  { key: 'conta', label: 'Conta' },
  { key: 'valor', label: 'Valor', numeric: true },
];

const LINHAS: readonly Lancamento[] = [
  { descricao: 'Mensalidade', conta: 'Cora PJ', valor: '120,00' },
  { descricao: 'Material', conta: 'Caixa', valor: '45,50' },
  { descricao: 'Doação', conta: 'Cofre', valor: '300,00' },
];

const tabela = (container: HTMLElement) => elemento<HTMLTableElement>(container, 'table');
const cabecalhos = (container: HTMLElement) => todos<HTMLTableCellElement>(container, 'thead th');
const linhasDoCorpo = (container: HTMLElement) => todos<HTMLTableRowElement>(container, 'tbody tr');
const celulasDe = (linha: HTMLTableRowElement) => todos<HTMLTableCellElement>(linha, 'td');
const textosDaLinha = (linha: HTMLTableRowElement) => celulasDe(linha).map((celula) => celula.textContent);

describe('DataTable: colunas', () => {
  it('cada coluna vira um cabeçalho de coluna, na ordem recebida', async () => {
    const { container } = await montar(<DataTable columns={COLUNAS} rows={LINHAS} />);
    expect(cabecalhos(container).map((th) => th.textContent)).toEqual(['Descrição', 'Conta', 'Valor']);
  });

  it('os cabeçalhos declaram escopo de coluna', async () => {
    const { container } = await montar(<DataTable columns={COLUNAS} rows={LINHAS} />);
    expect(cabecalhos(container).map((th) => th.getAttribute('scope'))).toEqual(['col', 'col', 'col']);
  });

  it('a ordem das colunas manda na ordem das células, não a ordem das chaves da linha', async () => {
    const invertidas: readonly Column<Lancamento>[] = [COLUNAS[2] as Column<Lancamento>, COLUNAS[0] as Column<Lancamento>];
    const { container } = await montar(<DataTable columns={invertidas} rows={LINHAS} />);
    expect(textosDaLinha(linhasDoCorpo(container)[0] as HTMLTableRowElement)).toEqual(['120,00', 'Mensalidade']);
  });

  it('coluna fora da lista não aparece na linha', async () => {
    const soDescricao: readonly Column<Lancamento>[] = [COLUNAS[0] as Column<Lancamento>];
    const { container } = await montar(<DataTable columns={soDescricao} rows={LINHAS} />);
    expect(textosDaLinha(linhasDoCorpo(container)[1] as HTMLTableRowElement)).toEqual(['Material']);
  });

  it('sem colunas a tabela não tem células', async () => {
    const { container } = await montar(<DataTable columns={[]} rows={LINHAS} />);
    expect(cabecalhos(container)).toHaveLength(0);
    expect(todos(container, 'td')).toHaveLength(0);
  });
});

describe('DataTable: linhas', () => {
  it('cada linha vira uma linha do corpo com uma célula por coluna', async () => {
    const { container } = await montar(<DataTable columns={COLUNAS} rows={LINHAS} />);
    expect(linhasDoCorpo(container).map(textosDaLinha)).toEqual([
      ['Mensalidade', 'Cora PJ', '120,00'],
      ['Material', 'Caixa', '45,50'],
      ['Doação', 'Cofre', '300,00'],
    ]);
  });

  it('a célula aceita elemento React, não só texto', async () => {
    const comElemento: readonly Lancamento[] = [
      { descricao: 'Mensalidade', conta: 'Cora PJ', valor: <strong>120,00</strong> },
    ];
    const { container } = await montar(<DataTable columns={COLUNAS} rows={comElemento} />);
    expect(elemento(container, 'tbody td strong').textContent).toBe('120,00');
  });

  it('zero é mostrado como 0 e nulo, indefinido ou falso deixam a célula vazia', async () => {
    const linhas: readonly Lancamento[] = [
      { descricao: 'Saldo', conta: 'Cofre', valor: 0 },
      { descricao: 'Estorno', conta: 'Cofre', valor: null },
      { descricao: 'Ajuste', conta: 'Cofre', valor: undefined },
      { descricao: 'Revisão', conta: 'Cofre', valor: false },
    ];
    const { container } = await montar(<DataTable columns={COLUNAS} rows={linhas} />);
    const valores = linhasDoCorpo(container).map((linha) => (celulasDe(linha)[2] as HTMLElement).textContent);
    expect(valores).toEqual(['0', '', '', '']);
  });

  it('trocar as linhas troca o conteúdo mostrado', async () => {
    const montado = await montar(<DataTable columns={COLUNAS} rows={LINHAS} />);
    await montado.atualizar(<DataTable columns={COLUNAS} rows={[LINHAS[2] as Lancamento]} />);
    expect(linhasDoCorpo(montado.container).map(textosDaLinha)).toEqual([['Doação', 'Cofre', '300,00']]);
  });
});

describe('DataTable: sem linhas', () => {
  it('mostra só o cabeçalho e um corpo sem linhas, sem mensagem de vazio', async () => {
    const { container } = await montar(<DataTable columns={COLUNAS} rows={[]} />);
    expect(cabecalhos(container)).toHaveLength(3);
    expect(linhasDoCorpo(container)).toHaveLength(0);
    expect(container.textContent).toBe('DescriçãoContaValor');
  });
});

describe('DataTable: legenda', () => {
  it('a legenda é um caption no topo da tabela', async () => {
    const { container } = await montar(<DataTable columns={COLUNAS} rows={LINHAS} caption="Lançamentos de setembro" />);
    const legenda = elemento(container, 'caption');
    expect(legenda.textContent).toBe('Lançamentos de setembro');
    expect(tabela(container).firstElementChild).toBe(legenda);
  });

  it('sem legenda a tabela começa no cabeçalho', async () => {
    const { container } = await montar(<DataTable columns={COLUNAS} rows={LINHAS} />);
    expect(todos(container, 'caption')).toHaveLength(0);
    expect(tabela(container).firstElementChild?.tagName).toBe('THEAD');
  });

  it('legenda vazia não ocupa lugar', async () => {
    const { container } = await montar(<DataTable columns={COLUNAS} rows={LINHAS} caption="" />);
    expect(todos(container, 'caption')).toHaveLength(0);
  });
});

describe('DataTable: alinhamento numérico', () => {
  it('coluna numérica alinha cabeçalho e células à direita, as outras à esquerda', async () => {
    const { container } = await montar(<DataTable columns={COLUNAS} rows={LINHAS} />);
    const primeira = linhasDoCorpo(container)[0] as HTMLTableRowElement;
    expect(cabecalhos(container).map((th) => th.style.textAlign)).toEqual(['left', 'left', 'right']);
    expect(celulasDe(primeira).map((td) => td.style.textAlign)).toEqual(['left', 'left', 'right']);
  });

  it('só a célula numérica leva a marca data-numeric, o algarismo tabular e a quebra proibida', async () => {
    const { container } = await montar(<DataTable columns={COLUNAS} rows={LINHAS} />);
    const celulas = celulasDe(linhasDoCorpo(container)[0] as HTMLTableRowElement);
    expect(celulas.map((td) => td.hasAttribute('data-numeric'))).toEqual([false, false, true]);
    expect(celulas.map((td) => td.style.fontVariantNumeric)).toEqual(['', '', 'tabular-nums']);
    expect(celulas.map((td) => td.style.whiteSpace)).toEqual(['', '', 'nowrap']);
  });

  it('a célula numérica usa a fonte de valores e as outras a fonte pequena', async () => {
    const { container } = await montar(<DataTable columns={COLUNAS} rows={LINHAS} />);
    const celulas = celulasDe(linhasDoCorpo(container)[0] as HTMLTableRowElement);
    expect(celulas.map((td) => td.style.font)).toEqual(['var(--text-small)', 'var(--text-small)', 'var(--text-amount)']);
  });

  it('numeric falso explícito vale como coluna de texto', async () => {
    const colunas: readonly Column<Lancamento>[] = [{ key: 'valor', label: 'Valor', numeric: false }];
    const { container } = await montar(<DataTable columns={colunas} rows={LINHAS} />);
    const celula = celulasDe(linhasDoCorpo(container)[0] as HTMLTableRowElement)[0] as HTMLElement;
    expect(celula.hasAttribute('data-numeric')).toBe(false);
    expect(celula.style.textAlign).toBe('left');
  });
});

describe('DataTable: acabamento', () => {
  it('a última linha não tem fio embaixo e as outras têm', async () => {
    const { container } = await montar(<DataTable columns={COLUNAS} rows={LINHAS} />);
    const fios = linhasDoCorpo(container).map((linha) => (celulasDe(linha)[0] as HTMLElement).style.borderBottom);
    expect(fios).toEqual(['var(--border-hairline)', 'var(--border-hairline)', '0px']);
  });

  it('com uma linha só ela é a última e fica sem fio', async () => {
    const { container } = await montar(<DataTable columns={COLUNAS} rows={[LINHAS[0] as Lancamento]} />);
    expect((celulasDe(linhasDoCorpo(container)[0] as HTMLTableRowElement)[0] as HTMLElement).style.borderBottom).toBe('0px');
  });

  it('o style recebido vai para o quadro externo e vence o padrão', async () => {
    const { container } = await montar(<DataTable columns={COLUNAS} rows={LINHAS} style={{ overflow: 'visible' }} />);
    const quadro = container.firstElementChild as HTMLElement;
    expect(quadro.style.overflow).toBe('visible');
    expect(quadro.contains(tabela(container))).toBe(true);
  });
});
