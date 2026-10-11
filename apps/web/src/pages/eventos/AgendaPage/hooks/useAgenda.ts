import { useState } from 'react';
import { trabalhosIniciais } from '../mocks/agenda';
import type { Trabalho } from '../tipos';
import { mesDeslocado } from '../utils/mes';
import { rascunhoDe, rascunhoVazio, type RascunhoDeTrabalho } from '../utils/rascunhoDeTrabalho';
import { trabalhoDoRascunho } from '../utils/trabalhoDoRascunho';

export function useAgenda() {
  const [trabalhos, setTrabalhos] = useState<readonly Trabalho[]>(trabalhosIniciais);
  const [vista, setVista] = useState<'calendario' | 'lista'>('calendario');
  const [ano, setAno] = useState(2026);
  const [mes, setMes] = useState(9);
  const [detalheId, setDetalheId] = useState<number | null>(null);
  const [form, setForm] = useState<RascunhoDeTrabalho | null>(null);
  const [feitos, setFeitos] = useState<Record<string, boolean>>({});
  const [webhookAtivo, setWebhookAtivo] = useState(true);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const emDetalhe = trabalhos.find((t) => t.id === detalheId) ?? null;
  const doMes = trabalhos.filter((t) => t.ano === ano && t.mes === mes);
  const ordenados = [...trabalhos].sort((a, b) => a.ano - b.ano || a.mes - b.mes || a.dia - b.dia);

  const navegarMes = (delta: number) => {
    const destino = mesDeslocado(ano, mes, delta);
    setAno(destino.ano);
    setMes(destino.mes);
  };

  const salvar = (f: RascunhoDeTrabalho) => {
    const base = trabalhoDoRascunho(f, mes, ano);

    if (f.editId != null) {
      setTrabalhos((lista) => lista.map((t) => (t.id === f.editId ? { ...t, ...base } : t)));
      setMensagem('Cerimônia atualizada.');
    } else {
      const novo: Trabalho = {
        id: Date.now(),
        ...base,
        confirmados: 0,
        visitantes: 0,
        situacao: 'planejada',
        equipe: [['Dirigente', base.dirigente]],
        previstoGasto: 0,
        realizadoGasto: 0,
        arrecadado: 0,
      };
      setTrabalhos((lista) => [...lista, novo]);
      setMes(novo.mes);
      setAno(novo.ano);
      setMensagem('Cerimônia criada como planejada.');
    }
    setForm(null);
  };

  const duplicar = () => {
    if (!emDetalhe) return;
    const novo: Trabalho = {
      ...emDetalhe,
      id: Date.now(),
      situacao: 'planejada',
      confirmados: 0,
      realizadoGasto: 0,
      arrecadado: 0,
    };
    setTrabalhos((lista) => [...lista, novo]);
    setDetalheId(novo.id);
    setMensagem('Cerimônia duplicada como planejada — ajuste a data.');
  };

  const cancelar = () => {
    if (!emDetalhe) return;
    setTrabalhos((lista) => lista.map((t) => (t.id === emDetalhe.id ? { ...t, situacao: 'cancelada' } : t)));
    setMensagem('Cerimônia marcada como cancelada. Ela continua no histórico.');
  };

  const voltar = () => setDetalheId(null);

  const alternarTarefa = (i: number) => {
    if (!emDetalhe) return;
    setFeitos((f) => ({ ...f, [`${emDetalhe.id}:${i}`]: !f[`${emDetalhe.id}:${i}`] }));
  };

  const alternarWebhook = () => {
    setWebhookAtivo((a) => !a);
    setMensagem(
      webhookAtivo
        ? 'Webhook desligado — a lista só muda por aqui e pelo link.'
        : 'Webhook ligado: POST /preparo/{id}/tarefas atualiza a lista.',
    );
  };

  const editar = () => {
    if (!emDetalhe) return;
    setForm(rascunhoDe(emDetalhe));
  };

  const novaCerimonia = () => setForm(rascunhoVazio());

  const fecharFormulario = () => setForm(null);

  const fecharMensagem = () => setMensagem(null);

  return {
    trabalhos,
    vista,
    setVista,
    ano,
    mes,
    setDetalheId,
    form,
    feitos,
    webhookAtivo,
    mensagem,
    setMensagem,
    fecharMensagem,
    emDetalhe,
    doMes,
    ordenados,
    navegarMes,
    salvar,
    duplicar,
    cancelar,
    voltar,
    alternarTarefa,
    alternarWebhook,
    editar,
    novaCerimonia,
    fecharFormulario,
  };
}
