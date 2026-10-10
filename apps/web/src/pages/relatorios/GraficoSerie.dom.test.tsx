import { afterEach, describe, expect, it } from 'vitest';
import { desmontarTudo, elemento, montar, passarMouseSobre, tirarMouseDe, todos } from '@/testes/montagem';
import { GraficoSerie, type GraficoSerieProps } from './GraficoSerie';

afterEach(desmontarTudo);

const COR_DA_ENTRADA = 'var(--color-confirmed)';
const COR_DA_SAIDA = 'var(--color-attention)';

const PROPS_BASE: GraficoSerieProps = {
  serie: [
    { rotulo: 'jun/26', entrada: 50, saida: 25 },
    { rotulo: 'jul/26', entrada: 100, saida: 0 },
  ],
  acumulados: [25, -50],
  escala: 100,
  rotuloPeriodo: 'jun/26 — jul/26',
};

const barrasDaCor = (container: HTMLElement, cor: string) =>
  todos<HTMLDivElement>(container, 'div').filter((d) => d.style.background === cor && d.style.height.endsWith('%'));

const colunaDoMes = (container: HTMLElement, indice: number) => {
  const barra = barrasDaCor(container, COR_DA_ENTRADA)[indice];
  if (!barra?.parentElement?.parentElement) throw new Error(`coluna ${indice} não encontrada`);
  return barra.parentElement.parentElement;
};

const textoDaDica = (container: HTMLElement) => {
  const dica = todos<HTMLElement>(container, 'span').find((s) => s.textContent?.startsWith('entradas ') && s.parentElement?.style.pointerEvents === 'none');
  return dica?.parentElement?.textContent ?? null;
};

describe('GraficoSerie: cabeçalho e legenda', () => {
  it('mostra o título, o período e a legenda dos três elementos do gráfico', async () => {
    const { container } = await montar(<GraficoSerie {...PROPS_BASE} />);

    expect(container.textContent).toContain('Entradas e saídas ao longo do tempo');
    expect(container.textContent).toContain('jun/26 — jul/26');
    expect(container.textContent).toContain('entradas');
    expect(container.textContent).toContain('saídas');
    expect(container.textContent).toContain('resultado acumulado');
  });

  it('um rótulo de mês embaixo de cada coluna, na ordem da série', async () => {
    const { container } = await montar(<GraficoSerie {...PROPS_BASE} />);

    const rotulos = todos<HTMLSpanElement>(container, 'span').filter((s) => s.style.textAlign === 'center');

    expect(rotulos.map((s) => s.textContent)).toEqual(['jun/26', 'jul/26']);
  });
});

describe('GraficoSerie: altura das barras', () => {
  it('cada barra tem a altura da fração do valor sobre a escala, entradas e saídas', async () => {
    const { container } = await montar(<GraficoSerie {...PROPS_BASE} />);

    expect(barrasDaCor(container, COR_DA_ENTRADA).map((b) => b.style.height)).toEqual(['50%', '100%']);
    expect(barrasDaCor(container, COR_DA_SAIDA).map((b) => b.style.height)).toEqual(['25%', '2%']);
  });

  it('valor zero — a barra ainda aparece, com o piso de 2%', async () => {
    const { container } = await montar(
      <GraficoSerie {...PROPS_BASE} serie={[{ rotulo: 'jun/26', entrada: 0, saida: 0 }]} acumulados={[0]} />,
    );

    expect(barrasDaCor(container, COR_DA_ENTRADA)[0]?.style.height).toBe('2%');
    expect(barrasDaCor(container, COR_DA_SAIDA)[0]?.style.height).toBe('2%');
  });

  it('valor acima da escala — a altura passa de 100%, sem limite', async () => {
    const { container } = await montar(
      <GraficoSerie {...PROPS_BASE} serie={[{ rotulo: 'jun/26', entrada: 150, saida: 0 }]} acumulados={[150]} />,
    );

    expect(barrasDaCor(container, COR_DA_ENTRADA)[0]?.style.height).toBe('150%');
  });
});

describe('GraficoSerie: linha do acumulado', () => {
  it('os pontos ficam no meio de cada coluna e o zero é a linha do meio do gráfico', async () => {
    const { container } = await montar(<GraficoSerie {...PROPS_BASE} />);

    expect(elemento(container, 'polyline').getAttribute('points')).toBe('25.00,37.50 75.00,75.00');
  });

  it('uma só coluna — o ponto fica no centro', async () => {
    const { container } = await montar(
      <GraficoSerie {...PROPS_BASE} serie={[{ rotulo: 'jun/26', entrada: 100, saida: 0 }]} acumulados={[100]} />,
    );

    expect(elemento(container, 'polyline').getAttribute('points')).toBe('50.00,0.00');
  });

  it('série vazia — nenhuma coluna e a linha sem pontos', async () => {
    const { container } = await montar(<GraficoSerie {...PROPS_BASE} serie={[]} acumulados={[]} escala={1} />);

    expect(barrasDaCor(container, COR_DA_ENTRADA)).toHaveLength(0);
    expect(elemento(container, 'polyline').getAttribute('points')).toBe('');
  });
});

describe('GraficoSerie: dica ao passar o mouse', () => {
  it('sem o mouse em cima — não há dica nem barra apagada', async () => {
    const { container } = await montar(<GraficoSerie {...PROPS_BASE} />);

    expect(textoDaDica(container)).toBeNull();
    expect(barrasDaCor(container, COR_DA_ENTRADA).map((b) => b.style.opacity)).toEqual(['1', '1']);
  });

  it('mouse sobre a coluna — mostra o mês, as entradas, as saídas e o acumulado dela', async () => {
    const { container } = await montar(<GraficoSerie {...PROPS_BASE} />);

    await passarMouseSobre(colunaDoMes(container, 1));

    expect(textoDaDica(container)).toBe('jul/26entradas 100,00saídas 0,00acumulado -50,00');
  });

  it('mouse sobre a coluna — apaga as barras das outras colunas e mantém as dela', async () => {
    const { container } = await montar(<GraficoSerie {...PROPS_BASE} />);

    await passarMouseSobre(colunaDoMes(container, 0));

    expect(barrasDaCor(container, COR_DA_ENTRADA).map((b) => b.style.opacity)).toEqual(['1', '0.45']);
    expect(barrasDaCor(container, COR_DA_SAIDA).map((b) => b.style.opacity)).toEqual(['1', '0.45']);
  });

  it('mouse sai da coluna — a dica some e as barras voltam ao normal', async () => {
    const { container } = await montar(<GraficoSerie {...PROPS_BASE} />);
    await passarMouseSobre(colunaDoMes(container, 0));

    await tirarMouseDe(colunaDoMes(container, 0));

    expect(textoDaDica(container)).toBeNull();
    expect(barrasDaCor(container, COR_DA_ENTRADA).map((b) => b.style.opacity)).toEqual(['1', '1']);
  });

  it('acumulados mais curto que a série — o acumulado da dica cai para zero', async () => {
    const { container } = await montar(<GraficoSerie {...PROPS_BASE} acumulados={[25]} />);

    await passarMouseSobre(colunaDoMes(container, 1));

    expect(textoDaDica(container)).toContain('acumulado 0,00');
  });
});

describe('GraficoSerie: densidade', () => {
  it('escritório — barras de 14px e área de 182px', async () => {
    const { container } = await montar(<GraficoSerie {...PROPS_BASE} />);

    expect(barrasDaCor(container, COR_DA_ENTRADA).map((b) => b.style.width)).toEqual(['14px', '14px']);
    expect(colunaDoMes(container, 0).parentElement?.style.height).toBe('182px');
  });

  it('campo — barras de 9px e área de 132px', async () => {
    const { container } = await montar(<GraficoSerie {...PROPS_BASE} campo />);

    expect(barrasDaCor(container, COR_DA_ENTRADA).map((b) => b.style.width)).toEqual(['9px', '9px']);
    expect(colunaDoMes(container, 0).parentElement?.style.height).toBe('132px');
  });
});
