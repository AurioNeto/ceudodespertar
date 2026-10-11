import { useState } from 'react';
import { formatarBRL, formatarLitros } from '@/pages/utils/formato';
import { emAndamento, type FeitioNaTela } from '../mocks/feitio';
import { custoConfirmado, custoDaMateriaPrima, custoPorLitro, custoTotal } from '../utils/custoDoFeitio';

const HOJE = '11/09/2026';

export function useFeitio() {
  const [feitio, setFeitio] = useState<FeitioNaTela>(emAndamento);
  const [concluindo, setConcluindo] = useState(false);
  const [litros, setLitros] = useState('');
  const [forca, setForca] = useState('Força 2');
  const [dataFim, setDataFim] = useState(HOJE);
  const [recado, setRecado] = useState<string | null>(null);

  const concluido = feitio.dataFim !== null;
  const total = custoTotal(feitio);
  const confirmado = custoConfirmado(feitio);
  const pendentes = feitio.custos.filter((c) => !c.confirmado);

  const litrosNum = Number(litros.replace(',', '.')) || 0;

  const materiaPrima = custoDaMateriaPrima(feitio);
  const porLitro = concluido ? custoPorLitro(total, feitio.litrosProduzidos) : null;

  const concluir = () => {
    const codigo = `Lote 09/2026`;
    setFeitio((f) => ({
      ...f,
      dataFim,
      litrosProduzidos: litrosNum,
      forca,
      loteProduzido: codigo,
    }));
    setConcluindo(false);
    setRecado(
      `${feitio.nome} concluído: ${formatarLitros(litrosNum)} L de ${forca.toLowerCase()} entraram no estoque como ${codigo}. Custo apurado de ${formatarBRL(total / litrosNum)} por litro.`,
    );
  };

  const abrirConclusao = () => {
    setConcluindo(true);
    setRecado(null);
  };

  const cancelarConclusao = () => setConcluindo(false);

  const fecharRecado = () => setRecado(null);

  return {
    feitio,
    concluindo,
    litros,
    forca,
    dataFim,
    recado,
    concluido,
    total,
    confirmado,
    pendentes,
    materiaPrima,
    porLitro,
    setLitros,
    setForca,
    setDataFim,
    concluir,
    abrirConclusao,
    cancelarConclusao,
    fecharRecado,
  };
}
