import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { desmontarTudo, montar } from '@/testes/montagem';
import { useRelatorio } from './useRelatorio';

afterEach(desmontarTudo);

type Relatorio = ReturnType<typeof useRelatorio>;
type Periodo = Relatorio['periodo'];
type Comparacao = Relatorio['comparar'];

async function montarRelatorio() {
  const captura: { atual: Relatorio | null } = { atual: null };
  function Sonda() {
    captura.atual = useRelatorio();
    return null;
  }
  await montar(<Sonda />);
  const ler = (): Relatorio => {
    if (!captura.atual) throw new Error('hook não montado');
    return captura.atual;
  };
  const agir = (acao: (relatorio: Relatorio) => void) =>
    act(async () => {
      acao(ler());
    });
  return { ler, agir };
}

const personalizado = (de: string, ate: string) => (relatorio: Relatorio) => {
  relatorio.setPeriodo('personalizado');
  relatorio.setDe(de);
  relatorio.setAte(ate);
};

const pares = (itens: readonly { nome: string; valor: number }[]) => itens.map((i) => [i.nome, i.valor] as const);

const arredondar = (valores: readonly number[]) => valores.map((v) => Math.round(v * 100) / 100);

describe('useRelatorio: estado inicial', () => {
  it('começa no mês, comparando com o período anterior, com as duas unidades e sem filtro', async () => {
    const { ler } = await montarRelatorio();

    const r = ler();
    expect([r.periodo, r.comparar, r.unidades, r.de, r.ate]).toEqual([
      'mes',
      'anterior',
      ['CDD', 'Munay'],
      '03/2026',
      '08/2026',
    ]);
    expect(r.filtros).toEqual({
      grupo: 'todos',
      categoria: 'todas',
      conta: 'todas',
      tipo: 'todos',
      cerimonia: 'todas',
      situacao: 'todas',
    });
  });
});

describe('useRelatorio: totais por período (a base termina em agosto de 2026)', () => {
  it.each<{
    periodo: Periodo;
    rotulo: string;
    entradas: number;
    saidas: number;
    transferencias: number;
    movimentos: number;
    lancamentos: number;
  }>([
    { periodo: 'mes', rotulo: 'ago/26', entradas: 4747.9, saidas: 4159.06, transferencias: 605.68, movimentos: 1, lancamentos: 7 },
    { periodo: 'trimestre', rotulo: 'jun/26 — ago/26', entradas: 12236.08, saidas: 11443.13, transferencias: 2980.79, movimentos: 3, lancamentos: 21 },
    { periodo: 'ano', rotulo: 'jan/26 — ago/26', entradas: 29275.53, saidas: 27536.18, transferencias: 8603.2, movimentos: 8, lancamentos: 56 },
    { periodo: 'personalizado', rotulo: 'mar/26 — ago/26', entradas: 19921.89, saidas: 20408.48, transferencias: 6838.89, movimentos: 6, lancamentos: 42 },
  ])('período $periodo — soma entradas, saídas e transferências do recorte', async (esperado) => {
    const { ler, agir } = await montarRelatorio();

    await agir((r) => r.setPeriodo(esperado.periodo));

    const r = ler();
    expect(r.rotuloPeriodo).toBe(esperado.rotulo);
    expect(r.entradas).toBeCloseTo(esperado.entradas, 2);
    expect(r.saidas).toBeCloseTo(esperado.saidas, 2);
    expect(r.transferencias).toBeCloseTo(esperado.transferencias, 2);
    expect(r.transferenciasQtd).toBe(esperado.movimentos);
    expect(r.atual).toHaveLength(esperado.lancamentos);
  });

  it('resultado — é entradas menos saídas e não conta transferência', async () => {
    const { ler } = await montarRelatorio();

    expect(ler().resultado).toBeCloseTo(588.84, 2);
  });

  it('lançamento a conferir — entra no total e é contado à parte com o valor somado', async () => {
    const { ler } = await montarRelatorio();

    const r = ler();
    expect(r.aConferir.map((l) => [l.id, l.situacao])).toEqual([[134, 'a conferir']]);
    expect(r.valorAConferir).toBeCloseTo(1543.68, 2);
    expect(r.saidas).toBeCloseTo(4159.06, 2);
  });
});

describe('useRelatorio: janela de comparação', () => {
  it.each<{ comparar: Comparacao; janela: string; entradas: number; saidas: number; resultado: number }>([
    { comparar: 'anterior', janela: 'julho de 2026', entradas: 3038.69, saidas: 4628.7, resultado: -1590.01 },
    { comparar: 'ano_passado', janela: 'agosto de 2025', entradas: 1570.27, saidas: 2284.93, resultado: -714.66 },
  ])('mês com comparação $comparar — compara com $janela', async ({ comparar, entradas, saidas, resultado }) => {
    const { ler, agir } = await montarRelatorio();

    await agir((r) => r.setComparar(comparar));

    const comparados = ler().comparados;
    expect(comparados?.entradas).toBeCloseTo(entradas, 2);
    expect(comparados?.saidas).toBeCloseTo(saidas, 2);
    expect(comparados?.resultado).toBeCloseTo(resultado, 2);
  });

  it('sem comparação — não calcula janela nenhuma', async () => {
    const { ler, agir } = await montarRelatorio();

    await agir((r) => r.setComparar('nenhum'));

    expect(ler().comparados).toBeNull();
  });

  it('trimestre com comparação anterior — a janela anda a quantidade de meses do período, março a maio', async () => {
    const { ler, agir } = await montarRelatorio();

    await agir((r) => {
      r.setPeriodo('trimestre');
    });

    const comparados = ler().comparados;
    expect(comparados?.entradas).toBeCloseTo(7685.81, 2);
    expect(comparados?.saidas).toBeCloseTo(8965.35, 2);
  });

  it('ano com comparação anterior — a janela de oito meses recua para maio a dezembro de 2025', async () => {
    const { ler, agir } = await montarRelatorio();

    await agir((r) => r.setPeriodo('ano'));

    const comparados = ler().comparados;
    expect(comparados?.entradas).toBeCloseTo(19286.44, 2);
    expect(comparados?.saidas).toBeCloseTo(22758.2, 2);
  });

  it('o filtro de unidade vale também para a janela comparada', async () => {
    const { ler, agir } = await montarRelatorio();

    await agir((r) => r.alternarUnidade('CDD'));

    const r = ler();
    expect(r.unidades).toEqual(['Munay']);
    expect(r.comparados?.entradas).toBeCloseTo(1922.25, 2);
    expect(r.comparados?.saidas).toBe(0);
  });
});

describe('useRelatorio: série mensal e escala do gráfico', () => {
  it('trimestre — uma entrada por mês, com rótulo, entradas e saídas do mês', async () => {
    const { ler, agir } = await montarRelatorio();

    await agir((r) => r.setPeriodo('trimestre'));

    const { serie } = ler();
    expect(serie.map((s) => s.rotulo)).toEqual(['jun/26', 'jul/26', 'ago/26']);
    expect(arredondar(serie.map((s) => s.entrada))).toEqual([4449.49, 3038.69, 4747.9]);
    expect(arredondar(serie.map((s) => s.saida))).toEqual([2655.37, 4628.7, 4159.06]);
  });

  it('trimestre — o acumulado soma entradas menos saídas mês a mês', async () => {
    const { ler, agir } = await montarRelatorio();

    await agir((r) => r.setPeriodo('trimestre'));

    expect(arredondar(ler().acumulados)).toEqual([1794.12, 204.11, 792.95]);
  });

  it('escala — é a maior barra quando o acumulado não a ultrapassa', async () => {
    const { ler, agir } = await montarRelatorio();

    await agir((r) => r.setPeriodo('ano'));

    expect(ler().escala).toBeCloseTo(5490.21, 2);
  });

  it('escala — é o módulo do maior acumulado quando ele passa da maior barra', async () => {
    const { ler, agir } = await montarRelatorio();

    await agir((r) => {
      r.setPeriodo('ano');
      r.setFiltro('categoria', 'Manutenção');
    });

    const r = ler();
    expect(Math.max(...r.serie.map((s) => Math.max(s.entrada, s.saida)))).toBeCloseTo(3231.27, 2);
    expect(r.acumulados.at(-1)).toBeCloseTo(-10258.18, 2);
    expect(r.escala).toBeCloseTo(10258.18, 2);
  });

  it('janela sem nenhum mês — a série fica vazia e a escala não cai abaixo de 1', async () => {
    const { ler, agir } = await montarRelatorio();

    await agir(personalizado('08/2026', '03/2026'));

    const r = ler();
    expect(r.serie).toEqual([]);
    expect(r.escala).toBe(1);
  });
});

describe('useRelatorio: quebras das saídas', () => {
  it('trimestre — saídas por grupo, da maior para a menor, sem transferência e sem entrada', async () => {
    const { ler, agir } = await montarRelatorio();

    await agir((r) => r.setPeriodo('trimestre'));

    expect(arredondar(ler().porGrupo.map((g) => g.valor))).toEqual([4442.48, 3120.72, 2656.14, 1122.97, 100.82]);
    expect(ler().porGrupo.map((g) => g.nome)).toEqual(['CDD', 'Cozinha', 'Chácara (Infraestrutura)', 'Dormitório', 'Secretaria']);
  });

  it('trimestre — saídas por categoria, da maior para a menor', async () => {
    const { ler, agir } = await montarRelatorio();

    await agir((r) => r.setPeriodo('trimestre'));

    expect(pares(ler().porCategoria).map(([nome, valor]) => [nome, Math.round(valor * 100) / 100])).toEqual([
      ['Manutenção', 5728.81],
      ['Insumos de feitio', 2644.87],
      ['Alimentação de cerimônia', 1716.87],
      ['Administrativo', 1112.46],
      ['Transporte', 240.12],
    ]);
  });

  it('trimestre — saídas por cerimônia deixam de fora o que não é de cerimônia nenhuma', async () => {
    const { ler, agir } = await montarRelatorio();

    await agir((r) => r.setPeriodo('trimestre'));

    expect(ler().porCerimonia.map((c) => c.nome)).toEqual([
      'São João · junho',
      'Mãe Divina · setembro',
      'São Miguel · julho',
      'Mãe Divina · agosto',
    ]);
  });

  it('mês — saídas sem cerimônia não aparecem na quebra por cerimônia, mas contam no grupo', async () => {
    const { ler } = await montarRelatorio();

    const r = ler();
    expect(r.porCerimonia.map((c) => c.nome)).toEqual(['São Miguel · julho', 'Mãe Divina · setembro']);
    expect(r.porGrupo.map((g) => g.nome)).toEqual(['Chácara (Infraestrutura)', 'Dormitório', 'CDD', 'Cozinha']);
  });

  it('movimento por conta — lista as quatro contas na ordem fixa, com entradas, saídas e resultado', async () => {
    const { ler, agir } = await montarRelatorio();

    await agir((r) => r.setPeriodo('trimestre'));

    const nomes = ler().porConta.map((c) => c.nome);
    const valores = ler().porConta.map((c) => arredondar([c.entradas, c.saidas, c.resultado]));
    expect(nomes).toEqual(['Cora PJ', 'Espécie', 'Nubank Paty', 'Itaú Munay']);
    expect(valores).toEqual([
      [2586.84, 4252.93, -1666.09],
      [2161.06, 1486.78, 674.28],
      [4489.25, 5105.86, -616.61],
      [2998.93, 597.56, 2401.37],
    ]);
  });

  it('movimento por conta — conta sem entrada nem saída no recorte aparece zerada', async () => {
    const { ler } = await montarRelatorio();

    const itau = ler().porConta.find((c) => c.nome === 'Itaú Munay');
    expect(itau).toEqual({ nome: 'Itaú Munay', entradas: 0, saidas: 0, resultado: 0 });
  });
});

describe('useRelatorio: unidades', () => {
  it('desligar o CDD — deixa só a Munay e o recorte encolhe', async () => {
    const { ler, agir } = await montarRelatorio();

    await agir((r) => {
      r.setPeriodo('ano');
      r.alternarUnidade('CDD');
    });

    const r = ler();
    expect(r.unidades).toEqual(['Munay']);
    expect(r.entradas).toBeCloseTo(3804.74, 2);
    expect(r.saidas).toBeCloseTo(6218.28, 2);
    expect(r.atual).toHaveLength(10);
  });

  it('desligar a última unidade ligada — não faz nada: sempre sobra uma', async () => {
    const { ler, agir } = await montarRelatorio();

    await agir((r) => r.alternarUnidade('CDD'));
    await agir((r) => r.alternarUnidade('Munay'));

    expect(ler().unidades).toEqual(['Munay']);
  });

  it('religar uma unidade — a recém-ligada entra no fim da lista', async () => {
    const { ler, agir } = await montarRelatorio();

    await agir((r) => r.alternarUnidade('CDD'));
    await agir((r) => r.alternarUnidade('CDD'));

    expect(ler().unidades).toEqual(['Munay', 'CDD']);
  });
});

describe('useRelatorio: filtros', () => {
  it.each<{
    nome: string;
    campo: 'grupo' | 'categoria' | 'conta' | 'tipo' | 'cerimonia' | 'situacao';
    valor: string;
    entradas: number;
    saidas: number;
    lancamentos: number;
  }>([
    { nome: 'tipo saída', campo: 'tipo', valor: 'saida', entradas: 0, saidas: 27536.18, lancamentos: 32 },
    { nome: 'categoria Manutenção', campo: 'categoria', valor: 'Manutenção', entradas: 0, saidas: 10258.18, lancamentos: 8 },
    { nome: 'conta Espécie', campo: 'conta', valor: 'Espécie', entradas: 12965.86, saidas: 6503.18, lancamentos: 14 },
    { nome: 'cerimônia São João · junho', campo: 'cerimonia', valor: 'São João · junho', entradas: 9623.94, saidas: 4653.18, lancamentos: 11 },
    { nome: 'situação a conferir', campo: 'situacao', valor: 'a conferir', entradas: 0, saidas: 1543.68, lancamentos: 1 },
  ])('filtro de $nome no ano — restringe o recorte', async ({ campo, valor, entradas, saidas, lancamentos }) => {
    const { ler, agir } = await montarRelatorio();

    await agir((r) => {
      r.setPeriodo('ano');
      r.setFiltro(campo, valor);
    });

    const r = ler();
    expect(r.entradas).toBeCloseTo(entradas, 2);
    expect(r.saidas).toBeCloseTo(saidas, 2);
    expect(r.atual).toHaveLength(lancamentos);
  });

  it('filtro de grupo — vale no trimestre e deixa só lançamentos do grupo', async () => {
    const { ler, agir } = await montarRelatorio();

    await agir((r) => {
      r.setPeriodo('trimestre');
      r.setFiltro('grupo', 'Cozinha');
    });

    const r = ler();
    expect(r.atual.every((l) => l.grupo === 'Cozinha')).toBe(true);
    expect(r.entradas).toBeCloseTo(4469.33, 2);
    expect(r.saidas).toBeCloseTo(3120.72, 2);
    expect(r.transferencias).toBe(0);
  });

  it('dois filtros juntos — valem ao mesmo tempo', async () => {
    const { ler, agir } = await montarRelatorio();

    await agir((r) => {
      r.setFiltro('conta', 'Cora PJ');
      r.setFiltro('tipo', 'entrada');
    });

    const r = ler();
    expect(r.atual.map((l) => [l.conta, l.tipo])).toEqual([['Cora PJ', 'entrada']]);
    expect(r.entradas).toBeCloseTo(2586.84, 2);
  });

  it('limpar filtros — volta os seis para o valor de todos e devolve o recorte inteiro', async () => {
    const { ler, agir } = await montarRelatorio();
    await agir((r) => {
      r.setFiltro('conta', 'Cora PJ');
      r.setFiltro('tipo', 'entrada');
    });

    await agir((r) => r.limparFiltros());

    const r = ler();
    expect(r.filtros).toEqual({
      grupo: 'todos',
      categoria: 'todas',
      conta: 'todas',
      tipo: 'todos',
      cerimonia: 'todas',
      situacao: 'todas',
    });
    expect(r.atual).toHaveLength(7);
  });

  it('limpar filtros — não mexe no período, na comparação nem nas unidades', async () => {
    const { ler, agir } = await montarRelatorio();
    await agir((r) => {
      r.setPeriodo('trimestre');
      r.setComparar('nenhum');
      r.alternarUnidade('CDD');
      r.setFiltro('tipo', 'saida');
    });

    await agir((r) => r.limparFiltros());

    const r = ler();
    expect([r.periodo, r.comparar, r.unidades]).toEqual(['trimestre', 'nenhum', ['Munay']]);
  });
});

describe('useRelatorio: período personalizado, como o texto De e Até é lido', () => {
  it.each<{ nome: string; de: string; ate: string; rotulo: string; meses: number }>([
    { nome: 'mês e ano completos', de: '12/2025', ate: '01/2026', rotulo: 'dez/25 — jan/26', meses: 2 },
    { nome: 'mês sem o ano (assume 2026)', de: '3', ate: '3', rotulo: 'mar/26', meses: 1 },
    { nome: 'mês acima de 12 (vira dezembro)', de: '13/2026', ate: '13/2026', rotulo: 'dez/26', meses: 1 },
    { nome: 'mês zero (vira janeiro)', de: '0/2026', ate: '0/2026', rotulo: 'jan/26', meses: 1 },
    { nome: 'texto que não é número (vira janeiro de 2026)', de: 'abc', ate: 'xyz', rotulo: 'jan/26', meses: 1 },
    { nome: 'campo vazio (vira janeiro de 2026)', de: '', ate: '', rotulo: 'jan/26', meses: 1 },
    { nome: 'ano que não é número (assume 2026)', de: '03/abc', ate: '03/abc', rotulo: 'mar/26', meses: 1 },
  ])('$nome — lê $de a $ate como $rotulo', async ({ de, ate, rotulo, meses }) => {
    const { ler, agir } = await montarRelatorio();

    await agir(personalizado(de, ate));

    const r = ler();
    expect(r.rotuloPeriodo).toBe(rotulo);
    expect(r.serie).toHaveLength(meses);
  });

  it('ano com dois dígitos — é lido como o ano 25 depois de Cristo: rótulo sem ano e nenhum lançamento', async () => {
    const { ler, agir } = await montarRelatorio();

    await agir(personalizado('03/25', '03/25'));

    const r = ler();
    expect(r.rotuloPeriodo).toBe('mar/');
    expect(r.atual).toHaveLength(0);
  });

  it('De depois de Até — o rótulo mostra os dois lados como foram escritos e nada é somado', async () => {
    const { ler, agir } = await montarRelatorio();

    await agir(personalizado('08/2026', '03/2026'));

    const r = ler();
    expect(r.rotuloPeriodo).toBe('ago/26 — mar/26');
    expect([r.entradas, r.saidas, r.transferencias, r.atual.length]).toEqual([0, 0, 0, 0]);
  });

  it('dois anos de janela — a série tem 20 meses e a comparação anterior cai antes da base', async () => {
    const { ler, agir } = await montarRelatorio();

    await agir(personalizado('01/2025', '08/2026'));

    const r = ler();
    expect(r.serie).toHaveLength(20);
    expect(r.comparados).toEqual({ entradas: 0, saidas: 0, resultado: 0 });
  });

  it('mês de agosto de 2026 contra o ano passado — personalizado dá o mesmo que o mês', async () => {
    const { ler, agir } = await montarRelatorio();

    await agir((r) => {
      personalizado('08/2026', '08/2026')(r);
      r.setComparar('ano_passado');
    });

    const r = ler();
    expect(r.entradas).toBeCloseTo(4747.9, 2);
    expect(r.comparados?.saidas).toBeCloseTo(2284.93, 2);
  });
});
