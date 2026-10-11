import { useState } from 'react';
import type { LancamentoAConciliar, LinhaExtrato, LinhaExtratoId, SugestaoDeCasamento } from '@cdd/contracts';
import { formatarData } from '@/pages/utils/formato';
import {
  contasComExtrato,
  importacao,
  lancamentosSozinhos as lancamentosIniciais,
  linhasSozinhas as linhasIniciais,
  motivosDeIgnorar,
  sugestoes as sugestoesIniciais,
} from '../mocks/conciliacao';

export function useConciliacao() {
  const [importado, setImportado] = useState(true);
  const [conta, setConta] = useState<string>(contasComExtrato[0]!.id);
  const [sugestoes, setSugestoes] = useState<readonly SugestaoDeCasamento[]>(sugestoesIniciais);
  const [linhas, setLinhas] = useState<readonly LinhaExtrato[]>(linhasIniciais);
  const [lancamentos, setLancamentos] = useState<readonly LancamentoAConciliar[]>(lancamentosIniciais);
  const [ignorando, setIgnorando] = useState<LinhaExtratoId | null>(null);
  const [motivo, setMotivo] = useState(motivosDeIgnorar[0]!);
  const [recado, setRecado] = useState<string | null>(null);
  const [conciliadas, setConciliadas] = useState(0);
  const [ignoradas, setIgnoradas] = useState(0);

  const casar = (s: SugestaoDeCasamento) => {
    setSugestoes((lista) => lista.filter((x) => x.linha.id !== s.linha.id));
    setConciliadas((n) => n + 1);
    setRecado(
      `Casado. A data de caixa do lançamento “${s.lancamento.motivo}” passou a ser ${formatarData(s.linha.data)}, vinda do extrato — nunca o contrário.`,
    );
  };

  const recusarSugestao = (s: SugestaoDeCasamento) => {
    setSugestoes((lista) => lista.filter((x) => x.linha.id !== s.linha.id));
    setLinhas((lista) => [s.linha, ...lista]);
    setLancamentos((lista) => [s.lancamento, ...lista]);
    setRecado('Sugestão recusada. Os dois voltaram para as colunas de quem está sem par.');
  };

  const ignorar = (l: LinhaExtrato) => {
    setLinhas((lista) => lista.filter((x) => x.id !== l.id));
    setIgnorando(null);
    setIgnoradas((n) => n + 1);
    setRecado(`Linha ignorada com o motivo registrado: “${motivo}”.`);
  };

  const importar = () => {
    setImportado(true);
    setRecado(
      `${importacao.linhasLidas} linhas lidas. ${importacao.linhasJaConhecidas} já existiam pelo identificador do banco e não entraram de novo — reimportar o mesmo arquivo não duplica nada.`,
    );
  };

  const fecharRecado = () => setRecado(null);

  const abrirIgnorar = (id: LinhaExtratoId) => setIgnorando(id);

  const cancelarIgnorar = () => setIgnorando(null);

  const totalPendente = linhas.length + sugestoes.length;

  return {
    importado,
    conta,
    setConta,
    sugestoes,
    linhas,
    lancamentos,
    ignorando,
    motivo,
    setMotivo,
    recado,
    conciliadas,
    ignoradas,
    totalPendente,
    casar,
    recusarSugestao,
    ignorar,
    importar,
    fecharRecado,
    abrirIgnorar,
    cancelarIgnorar,
  };
}
