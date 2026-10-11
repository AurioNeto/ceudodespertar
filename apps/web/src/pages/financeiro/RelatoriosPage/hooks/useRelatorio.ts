import { useMemo, useState } from 'react';
import { FILTROS_LIMPOS } from '../constantes';
import { CONTAS, baseDoRelatorio } from '../mocks/relatorios';
import type { Comparacao, Filtros, Periodo, Ponto } from '../tipos';
import { agrupar, somar } from '../utils/agregacao';
import { deslocar, doIndice, indice, intervaloDe, rotuloDoPonto } from '../utils/periodo';

export type Unidade = 'CDD' | 'Munay';

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
