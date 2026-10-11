import { useState } from 'react';
import {
  gerarHash,
  historico as historicoInicial,
  periodos,
  unidades,
  type NivelDeDetalhe,
  type PrestacaoGerada,
} from '../mocks/prestacao';
import { soma } from '../utils/totais';

export function usePrestacao() {
  const [periodoChave, setPeriodoChave] = useState(periodos[0]!.chave);
  const [unidade, setUnidade] = useState(unidades[0]!.chave);
  const [nivel, setNivel] = useState<NivelDeDetalhe>('RESUMO');
  const [historico, setHistorico] = useState<readonly PrestacaoGerada[]>(historicoInicial);
  const [recado, setRecado] = useState<string | null>(null);

  const periodo = periodos.find((p) => p.chave === periodoChave)!;
  const dados = periodo.dados;
  const unidadeRotulo = unidades.find((u) => u.chave === unidade)!.rotulo;

  const totalReceitas = soma(dados.receitas);
  const totalDespesas = soma(dados.despesas);
  const resultado = totalReceitas - totalDespesas;

  /** Quantas linhas o resumo suprime — o número que justifica os dois níveis. */
  const linhasNominais = [...dados.receitas, ...dados.despesas, ...dados.patrimonial].filter((l) => l.nominal).length;

  const gerar = (formato: 'PDF' | 'Planilha') => {
    const hash = gerarHash();
    setHistorico((lista) => [
      {
        id: `p-${Date.now()}`,
        periodo: periodo.chave as PrestacaoGerada['periodo'],
        periodoRotulo: periodo.rotulo,
        unidade: unidade === 'consolidado' ? 'Consolidado' : unidade,
        nivel,
        geradaPor: 'Aurio Neto',
        geradaEm: '10/09/2026, 14:22',
        formato,
        hash,
      },
      ...lista,
    ]);
    setRecado(
      `Prestação de ${periodo.rotulo} gerada em ${formato.toLowerCase()}, nível ${nivel === 'RESUMO' ? 'resumo' : 'detalhado'}. Ficou registrada com o hash ${hash} — é por ele que dois pedidos se conferem entre si.`,
    );
  };

  const fecharRecado = () => setRecado(null);

  return {
    periodos,
    unidades,
    periodoChave,
    setPeriodoChave,
    unidade,
    setUnidade,
    nivel,
    setNivel,
    historico,
    recado,
    fecharRecado,
    dados,
    unidadeRotulo,
    totalReceitas,
    totalDespesas,
    resultado,
    linhasNominais,
    gerar,
  };
}
