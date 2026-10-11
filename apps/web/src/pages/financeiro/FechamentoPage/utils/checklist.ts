import type { Conta, LancamentoNaLista } from '@cdd/contracts';
import { pluralizar } from '@/pages/utils/formato';
import type { ItemDoChecklist } from '../components/ItemDoChecklist';

export function checklistDoFechamento(
  naFila: number,
  contasAtivas: readonly Conta[],
  doMes: readonly LancamentoNaLista[],
) {
  const semConciliacao = contasAtivas.filter((c) => c.conciliacao === 'PENDENTE');
  const caixa = contasAtivas.find((c) => c.tipo === 'DINHEIRO');
  const caixaContado = caixa?.alerta === null;
  const semComprovante = doMes.filter((l) => l.comprovante === null);
  const transferenciasDoMes = doMes.filter((l) => l.tipo === 'TRANSFERENCIA');
  const transferenciasSemOutroLado = transferenciasDoMes.filter((l) => !l.contaDestino || l.contaDestino === l.conta);

  const checklist: readonly ItemDoChecklist[] = [
    {
      id: 'fila',
      titulo: 'Fila de verificação zerada',
      bloqueia: true,
      ok: naFila === 0,
      detalhe: naFila === 0 ? 'nada pendente na fila' : `${pluralizar(naFila, 'lançamento')} ainda esperando conferência`,
      acao: { rotulo: 'Ir para a fila', rota: 'lote' },
    },
    {
      id: 'conciliacao',
      titulo: 'Contas conciliadas com o extrato',
      bloqueia: true,
      ok: semConciliacao.length === 0,
      detalhe:
        semConciliacao.length === 0
          ? `${pluralizar(contasAtivas.length, 'conta conciliada', 'contas conciliadas')} em 31/08`
          : `${semConciliacao.map((c) => c.nome).join(' e ')} sem conciliação de agosto`,
      acao: { rotulo: 'Abrir contas', rota: 'contas' },
    },
    {
      id: 'contagem',
      titulo: 'Contagem do caixa em espécie',
      bloqueia: true,
      ok: caixaContado,
      detalhe: caixaContado
        ? `contada por ${caixa?.responsavel ?? 'quem cuida do caixa'}, sem diferença`
        : 'última contagem foi em 31/07',
      acao: { rotulo: 'Registrar contagem', rota: 'contas' },
    },
    {
      id: 'comprovantes',
      titulo: 'Comprovantes anexados',
      bloqueia: false,
      ok: semComprovante.length === 0,
      detalhe: `${pluralizar(semComprovante.length, 'lançamento')} sem anexo — não impede o fechamento, mas fica registrado assim`,
      acao: { rotulo: 'Ver lançamentos', rota: 'lancamentos' },
    },
    {
      id: 'transferencias',
      titulo: 'Transferências com os dois lados',
      bloqueia: true,
      ok: transferenciasSemOutroLado.length === 0,
      detalhe:
        transferenciasSemOutroLado.length === 0
          ? `${pluralizar(transferenciasDoMes.length, 'transferência do mês bate', 'transferências do mês batem')} origem e destino`
          : `${pluralizar(transferenciasSemOutroLado.length, 'transferência', 'transferências')} sem conta de destino, ou com a mesma conta nos dois lados`,
      acao: transferenciasSemOutroLado.length === 0 ? null : { rotulo: 'Ver lançamentos', rota: 'lancamentos' },
    },
  ];

  const bloqueios = checklist.filter((i) => i.bloqueia && !i.ok);
  const avisos = checklist.filter((i) => !i.bloqueia && !i.ok);
  return { checklist, bloqueios, avisos };
}

export function totaisDoFechamento(doMes: readonly LancamentoNaLista[], contasAtivas: readonly Conta[]) {
  const entradas = doMes.filter((l) => l.tipo === 'ENTRADA').reduce((a, l) => a + l.valor, 0);
  const saidas = doMes.filter((l) => l.tipo === 'SAIDA' && l.status !== 'ESTORNADO').reduce((a, l) => a + l.valor, 0);
  const resultado = entradas - saidas;
  const totalSaldos = contasAtivas.reduce((a, c) => a + c.saldo, 0);
  return { entradas, saidas, resultado, totalSaldos };
}
