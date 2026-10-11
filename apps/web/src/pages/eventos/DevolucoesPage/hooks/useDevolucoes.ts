import { useState } from 'react';
import { formatarBRL, formatarCompetencia } from '@/pages/utils/formato';
import { contas } from '@/pages/mocks/contas';
import { useDataDeCaixa } from '@/pages/eventos/hooks/useDataDeCaixa';
import { contaPadraoDoEvento } from '@/pages/eventos/utils/contaPadraoDoEvento';
import { fila as filaInicial, pagas as pagasIniciais, type DevolucaoNaFila } from '../mocks/devolucoes';
import { ID_DO_CAMPO_DA_DATA_DA_SAIDA } from '../constantes';
import type { Paga } from '../tipos';
import { competenciaDaSaida } from '../utils/competenciaDaSaida';
import { diasEsperando } from '../utils/diasEsperando';

const HOJE = '11/09/2026';

export function useDevolucoes() {
  const [fila, setFila] = useState<readonly DevolucaoNaFila[]>(filaInicial);
  const [pagas, setPagas] = useState<readonly Paga[]>(
    // oxlint-disable-next-line oxc/no-map-spread
    pagasIniciais.map((p) => ({ ...p, id: p.id as string, valor: p.valor as number })),
  );
  const [pagando, setPagando] = useState<string | null>(null);
  const [conta, setConta] = useState(contaPadraoDoEvento);
  const dataDaSaida = useDataDeCaixa(HOJE, ID_DO_CAMPO_DA_DATA_DA_SAIDA);
  const [motivo, setMotivo] = useState('');
  const [recado, setRecado] = useState<string | null>(null);

  const total = fila.reduce((s, d) => s + d.valor, 0);
  const maisAntiga = fila.toSorted((a, b) => diasEsperando(b.solicitadaEm) - diasEsperando(a.solicitadaEm))[0];

  const pagar = (d: DevolucaoNaFila) => {
    if (!dataDaSaida.exigirValida()) return;
    const nomeDaConta = contas.find((c) => (c.id as string) === conta)?.nome ?? '';
    const destino = competenciaDaSaida(d);
    setFila((lista) => lista.filter((x) => x.id !== d.id));
    setPagas((lista) => [
      {
        id: d.id as string,
        nome: d.nome,
        evento: `${d.evento} · ${d.dataDoEvento.slice(0, 5)}`,
        valor: d.valor,
        pagaEm: dataDaSaida.data,
        conta: nomeDaConta,
        lancamentoDeSaida: `sai-${String(d.lancamentoOriginal).replace('lanc-', '')}`,
      },
      ...lista,
    ]);
    setPagando(null);
    setRecado(
      `${formatarBRL(d.valor)} devolvidos a ${d.nome} por ${nomeDaConta}. A saída entrou na competência ${formatarCompetencia(destino)}, vinculada ao evento ${d.evento}; ${d.lancamentoOriginal} não foi alterado.${d.competenciaFechada ? ` Motivo registrado: “${motivo.trim()}”` : ''}`,
    );
  };

  const abrir = (d: DevolucaoNaFila) => {
    setPagando(d.id as string);
    dataDaSaida.recomecar();
    setMotivo('');
    setRecado(null);
  };

  const cancelarPagamento = () => setPagando(null);

  const fecharRecado = () => setRecado(null);

  return {
    fila,
    pagas,
    pagando,
    conta,
    data: dataDaSaida.data,
    erroDaData: dataDaSaida.erro,
    motivo,
    recado,
    total,
    maisAntiga,
    setConta,
    setData: dataDaSaida.setData,
    setMotivo,
    pagar,
    abrir,
    cancelarPagamento,
    fecharRecado,
  };
}
