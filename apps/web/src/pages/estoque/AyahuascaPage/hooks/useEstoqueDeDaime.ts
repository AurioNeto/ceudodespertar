import { useState } from 'react';
import {
  lotesIniciais,
  movimentosIniciais,
  reservadoInicial,
  reservasIniciais,
  type LoteDeDaime,
  type MovimentoDeDaime,
  type ReservaDeTrabalho,
} from '../mocks/ayahuasca';
import type { Aba, ModoDoFormulario, RascunhoDeMovimento } from '../tipos';
import { litros } from '../utils/litros';
import { paraNumero } from '../utils/paraNumero';
import { rascunhoDeMovimento } from '../utils/rascunhoDeMovimento';
import { saldos } from '../utils/saldos';
import { erroDoFormulario } from '../utils/validarMovimento';

export function useEstoqueDeDaime() {
  const [aba, setAba] = useState<Aba>('lotes');
  const [lotes, setLotes] = useState<readonly LoteDeDaime[]>(lotesIniciais);
  const [movimentos, setMovimentos] = useState<readonly MovimentoDeDaime[]>(movimentosIniciais);
  const [reservado, setReservado] = useState<Record<number, boolean>>({ ...reservadoInicial });
  const [detalheId, setDetalheId] = useState<number | null>(null);
  const [form, setForm] = useState<RascunhoDeMovimento | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const { emEstoque, emQuarentena, reservadoTotal, livre, previsto } = saldos(lotes, reservasIniciais, reservado);

  const detalhe = lotes.find((l) => l.id === detalheId) ?? null;

  const movimentosDoDetalhe = detalhe ? movimentos.filter((m) => m.loteId === detalhe.id) : [];

  const erro = erroDoFormulario(form, lotes);

  const salvar = () => {
    if (!form || erro) return;
    const quantidade = paraNumero(form.litros);

    if (form.modo === 'feitio') {
      const novo: LoteDeDaime = {
        id: Date.now(),
        codigo: form.codigo.trim(),
        origem: form.origem.trim() || 'Feitio · CDD',
        data: '02/09/2026',
        forca: form.forca || 'Força 2',
        litros: quantidade,
        restante: quantidade,
        local: 'Casa de feitio',
        guardiao: 'Chico Aguiar',
        situacao: 'lacrado',
        analise: 'aguardando análise',
        garrafas: `${Math.round(quantidade * 2)} garrafas de 500 ml`,
      };
      setLotes((lista) => [novo, ...lista]);
      setMovimentos((lista) => [
        {
          id: Date.now(),
          data: '02/09/2026',
          tipo: 'entrada',
          loteId: novo.id,
          litros: quantidade,
          destino: novo.origem,
          responsavel: 'Chico Aguiar',
        },
        ...lista,
      ]);
      setMensagem(`${novo.codigo} criado com ${litros(quantidade)}.`);
    } else {
      const lote = lotes.find((l) => String(l.id) === form.loteId)!;
      const restante = +(lote.restante - quantidade).toFixed(1);
      setLotes((lista) =>
        lista.map((l) =>
          l.id === lote.id ? { ...l, restante, situacao: restante === 0 ? 'esgotado' : l.situacao } : l,
        ),
      );
      setMovimentos((lista) => [
        {
          id: Date.now(),
          data: '02/09/2026',
          tipo: form.modo === 'saida' ? 'saida' : 'transferencia',
          loteId: lote.id,
          litros: quantidade,
          destino: form.destino.trim() || (form.modo === 'saida' ? 'trabalho' : 'outra unidade'),
          responsavel: 'Aurio Neto',
        },
        ...lista,
      ]);
      setMensagem(
        form.modo === 'saida'
          ? `Baixa de ${litros(quantidade)} em ${lote.codigo}.`
          : `Transferência de ${litros(quantidade)} de ${lote.codigo}.`,
      );
    }
    setForm(null);
  };

  const disponiveis = lotes.filter((l) => l.restante > 0 && l.situacao !== 'quarentena');

  const abrirFormulario = (modo: ModoDoFormulario) => setForm(rascunhoDeMovimento(modo, disponiveis));

  const cancelarFormulario = () => setForm(null);

  const fecharMensagem = () => setMensagem(null);

  const fecharDetalhe = () => setDetalheId(null);

  const alternarReserva = (r: ReservaDeTrabalho) => {
    setReservado((atual) => ({ ...atual, [r.id]: !atual[r.id] }));
    setMensagem(
      reservado[r.id]
        ? `Reserva liberada: ${litros(r.litros)} voltam para o livre.`
        : `${litros(r.litros)} reservados para ${r.nome}.`,
    );
  };

  const alternarQuarentena = () => {
    if (!detalhe) return;
    const emQuarentenaAgora = detalhe.situacao === 'quarentena';
    setLotes((lista) =>
      lista.map((l) =>
        l.id === detalhe.id
          ? { ...l, situacao: emQuarentenaAgora ? (l.restante > 0 ? 'em uso' : 'esgotado') : 'quarentena' }
          : l,
      ),
    );
    setMensagem(
      emQuarentenaAgora
        ? `${detalhe.codigo} saiu da quarentena.`
        : `${detalhe.codigo} posto em quarentena — fora do estoque disponível.`,
    );
  };

  return {
    aba,
    lotes,
    movimentos,
    reservas: reservasIniciais,
    reservado,
    detalhe,
    movimentosDoDetalhe,
    form,
    mensagem,
    erro,
    disponiveis,
    emEstoque,
    emQuarentena,
    reservadoTotal,
    livre,
    previsto,
    setAba,
    setDetalheId,
    setForm,
    salvar,
    abrirFormulario,
    cancelarFormulario,
    fecharMensagem,
    fecharDetalhe,
    alternarReserva,
    alternarQuarentena,
  };
}
