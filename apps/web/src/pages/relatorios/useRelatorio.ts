import { useMemo, useState } from 'react';
import {
  CONTAS,
  MESES_CURTOS,
  baseDoRelatorio,
  type LinhaDoRelatorio,
  type TipoNoRelatorio,
} from '../../mocks/relatorios';

export type Periodo = 'mes' | 'trimestre' | 'ano' | 'personalizado';
export type Comparacao = 'anterior' | 'ano_passado' | 'nenhum';
export type Unidade = 'CDD' | 'Munay';

export interface Filtros {
  grupo: string;
  categoria: string;
  conta: string;
  tipo: string;
  cerimonia: string;
  situacao: string;
}

export const FILTROS_LIMPOS: Filtros = {
  grupo: 'todos',
  categoria: 'todas',
  conta: 'todas',
  tipo: 'todos',
  cerimonia: 'todas',
  situacao: 'todas',
};

interface Ponto {
  ano: number;
  mes: number;
}

const indice = (p: Ponto) => p.ano * 12 + p.mes;
const doIndice = (i: number): Ponto => ({ ano: Math.floor((i - 1) / 12), mes: ((i - 1) % 12) + 1 });

const analisar = (texto: string): Ponto => {
  const [m, a] = texto.split('/').map((n) => parseInt(n, 10));
  return {
    mes: Number.isNaN(m) ? 1 : Math.min(12, Math.max(1, m ?? 1)),
    ano: Number.isNaN(a) ? 2026 : (a ?? 2026),
  };
};

/** O "hoje" da base é agosto de 2026 — o último mês com lançamentos. */
const intervaloDe = (periodo: Periodo, de: string, ate: string) => {
  if (periodo === 'mes') return { inicio: { mes: 8, ano: 2026 }, fim: { mes: 8, ano: 2026 } };
  if (periodo === 'trimestre') return { inicio: { mes: 6, ano: 2026 }, fim: { mes: 8, ano: 2026 } };
  if (periodo === 'ano') return { inicio: { mes: 1, ano: 2026 }, fim: { mes: 8, ano: 2026 } };
  return { inicio: analisar(de), fim: analisar(ate) };
};

const deslocar = (intv: { inicio: Ponto; fim: Ponto }, passos: number) => ({
  inicio: doIndice(indice(intv.inicio) + passos),
  fim: doIndice(indice(intv.fim) + passos),
});

const somar = (linhas: readonly LinhaDoRelatorio[], tipo: TipoNoRelatorio) =>
  linhas.filter((l) => l.tipo === tipo).reduce((a, l) => a + l.valor, 0);

const agrupar = (linhas: readonly LinhaDoRelatorio[], campo: 'grupo' | 'categoria' | 'cerimonia', tipo?: TipoNoRelatorio) => {
  const mapa = new Map<string, number>();
  for (const l of linhas) {
    if (tipo && l.tipo !== tipo) continue;
    const chave = l[campo];
    if (!chave) continue;
    mapa.set(chave, (mapa.get(chave) ?? 0) + l.valor);
  }
  return [...mapa.entries()].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
};

const rotuloDoPonto = (p: Ponto) => `${MESES_CURTOS[p.mes - 1]}/${String(p.ano).slice(2)}`;

export function useRelatorio() {
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [de, setDe] = useState('03/2026');
  const [ate, setAte] = useState('08/2026');
  const [comparar, setComparar] = useState<Comparacao>('anterior');
  const [unidades, setUnidades] = useState<readonly Unidade[]>(['CDD', 'Munay']);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_LIMPOS);

  const derivado = useMemo(() => {
    const intv = intervaloDe(periodo, de, ate);
    const passos = indice(intv.fim) - indice(intv.inicio) + 1;
    const intvComparado =
      comparar === 'anterior' ? deslocar(intv, -passos) : comparar === 'ano_passado' ? deslocar(intv, -12) : null;

    const recortar = (janela: { inicio: Ponto; fim: Ponto }) => {
      const ini = indice(janela.inicio);
      const fim = indice(janela.fim);
      return baseDoRelatorio.filter((l) => {
        const i = l.ano * 12 + l.mes;
        if (i < ini || i > fim) return false;
        if (!unidades.includes(l.unidade)) return false;
        if (filtros.grupo !== 'todos' && l.grupo !== filtros.grupo) return false;
        if (filtros.categoria !== 'todas' && l.categoria !== filtros.categoria) return false;
        if (filtros.conta !== 'todas' && l.conta !== filtros.conta) return false;
        if (filtros.tipo !== 'todos' && l.tipo !== filtros.tipo) return false;
        if (filtros.cerimonia !== 'todas' && l.cerimonia !== filtros.cerimonia) return false;
        if (filtros.situacao !== 'todas' && l.situacao !== filtros.situacao) return false;
        return true;
      });
    };

    const atual = recortar(intv);
    const comparado = intvComparado ? recortar(intvComparado) : null;

    const entradas = somar(atual, 'entrada');
    const saidas = somar(atual, 'saida');
    const transferencias = somar(atual, 'transferencia');
    const aConferir = atual.filter((l) => l.situacao === 'a conferir');

    const meses: Ponto[] = [];
    for (let i = indice(intv.inicio); i <= indice(intv.fim); i++) meses.push(doIndice(i));

    const serie = meses.map((m) => {
      const doMes = atual.filter((l) => l.ano === m.ano && l.mes === m.mes);
      return { ponto: m, rotulo: rotuloDoPonto(m), entrada: somar(doMes, 'entrada'), saida: somar(doMes, 'saida') };
    });

    let corrente = 0;
    const acumulados = serie.map((d) => {
      corrente += d.entrada - d.saida;
      return corrente;
    });

    const maxSerie = Math.max(1, ...serie.map((d) => Math.max(d.entrada, d.saida)));
    const escala = Math.max(maxSerie, ...acumulados.map((v) => Math.abs(v)), 1);

    const porGrupo = agrupar(atual, 'grupo', 'saida');
    const porCategoria = agrupar(atual, 'categoria', 'saida');
    const porCerimonia = agrupar(
      atual.filter((l) => l.cerimonia !== 'Sem cerimônia'),
      'cerimonia',
      'saida',
    );

    const porConta = CONTAS.map((nome) => {
      const daConta = atual.filter((l) => l.conta === nome);
      const e = somar(daConta, 'entrada');
      const s = somar(daConta, 'saida');
      return { nome, entradas: e, saidas: s, resultado: e - s };
    });

    const rotuloPeriodo =
      rotuloDoPonto(intv.inicio) === rotuloDoPonto(intv.fim)
        ? rotuloDoPonto(intv.inicio)
        : `${rotuloDoPonto(intv.inicio)} — ${rotuloDoPonto(intv.fim)}`;

    return {
      atual,
      entradas,
      saidas,
      transferencias,
      resultado: entradas - saidas,
      transferenciasQtd: atual.filter((l) => l.tipo === 'transferencia').length,
      aConferir,
      valorAConferir: aConferir.reduce((a, l) => a + l.valor, 0),
      comparados: comparado
        ? {
            entradas: somar(comparado, 'entrada'),
            saidas: somar(comparado, 'saida'),
            resultado: somar(comparado, 'entrada') - somar(comparado, 'saida'),
          }
        : null,
      serie,
      acumulados,
      escala,
      porGrupo,
      porCategoria,
      porCerimonia,
      porConta,
      rotuloPeriodo,
    };
  }, [periodo, de, ate, comparar, unidades, filtros]);

  const alternarUnidade = (u: Unidade) =>
    setUnidades((atuais) =>
      atuais.includes(u) ? (atuais.length > 1 ? atuais.filter((x) => x !== u) : atuais) : [...atuais, u],
    );

  return {
    periodo,
    setPeriodo,
    de,
    setDe,
    ate,
    setAte,
    comparar,
    setComparar,
    unidades,
    alternarUnidade,
    filtros,
    setFiltro: (campo: keyof Filtros, valor: string) => setFiltros((f) => ({ ...f, [campo]: valor })),
    limparFiltros: () => setFiltros(FILTROS_LIMPOS),
    ...derivado,
  };
}

/** Texto do delta contra a base de comparação. */
export function textoDoDelta(atual: number, base: number | null, comparar: Comparacao): string {
  if (comparar === 'nenhum') return '';
  if (base == null || base === 0) return 'sem base de comparação';
  const p = ((atual - base) / Math.abs(base)) * 100;
  return `${p >= 0 ? '+' : ''}${p.toFixed(0)}% vs ${comparar === 'anterior' ? 'período anterior' : 'ano passado'}`;
}

export function corDoDelta(atual: number, base: number | null, bomSeSobe: boolean, comparar: Comparacao): string {
  if (comparar === 'nenhum' || base == null || base === 0) return 'var(--text-meta)';
  return atual >= base === bomSeSobe ? 'var(--color-confirmed)' : 'var(--color-attention)';
}
