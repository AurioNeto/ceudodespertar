import type { LancamentoNaLista } from '@cdd/contracts';
import type { ReceiptLine, ReceiptTone, RecordStatus } from '../ds';
import type { NaturezaVisual } from '../ds';
import { formatarData } from './formato';
import { rotuloDaSituacao, rotuloDoTipo } from '../mocks/lancamentos';

export const tomDoRecibo = (tipo: LancamentoNaLista['tipo']): ReceiptTone =>
  tipo === 'ENTRADA' ? 'entrada' : tipo === 'TRANSFERENCIA' ? 'transferencia' : 'saida';

export const naturezaDoTipo = (tipo: LancamentoNaLista['tipo']): NaturezaVisual =>
  tipo === 'ENTRADA' ? 'receita' : tipo === 'SAIDA' ? 'despesa' : 'neutral';

export const estadoDaLinha = (status: LancamentoNaLista['status']): RecordStatus =>
  status === 'A_CONFERIR' ? 'pending' : status === 'ESTORNADO' ? 'reversed' : 'confirmed';

/**
 * As linhas do cartão de recibo. A transferência troca grupo e categoria por
 * "saiu de / entrou em" — ela não é despesa nem receita.
 */
export function linhasDoRecibo(
  r: LancamentoNaLista,
  { mostrarQuemLancou = false }: { mostrarQuemLancou?: boolean } = {},
): readonly ReceiptLine[] {
  const data = formatarData(r.data);

  if (r.tipo === 'TRANSFERENCIA') {
    return [
      { label: 'Tipo', value: 'Transferência entre contas' },
      { label: 'Motivo', value: r.motivo },
      { label: 'Data', value: data },
      { label: 'Saiu de', value: r.conta },
      { label: 'Entrou em', value: r.contaDestino ?? '—' },
      ...(mostrarQuemLancou
        ? [
            { label: 'Quem lançou', value: r.registradoPor },
            { label: 'Situação', value: rotuloDaSituacao(r.status) },
          ]
        : [{ label: 'Comprovante', value: r.comprovante ?? 'sem anexo' }]),
    ];
  }

  const ehEntrada = r.tipo === 'ENTRADA';
  return [
    { label: 'Tipo', value: rotuloDoTipo(r.tipo) },
    { label: ehEntrada ? 'De onde veio' : 'O que foi', value: r.motivo },
    { label: 'Data', value: data },
    { label: 'Grupo', value: r.grupo ?? '—' },
    { label: 'Categoria', value: r.categorias.join(', ') || 'não classificado' },
    { label: ehEntrada ? 'Conta de entrada' : 'Conta de saída', value: `${r.conta} · ${r.formaPagamento}` },
    ...(mostrarQuemLancou
      ? [{ label: 'Quem lançou', value: r.registradoPor }]
      : [{ label: 'Cerimônia', value: r.cerimonia ?? 'Nenhuma — gasto da casa' }]),
    { label: 'Comprovante', value: r.comprovante ?? 'sem anexo' },
  ];
}

export function rodapeDoRecibo(r: LancamentoNaLista, consolidadaPor = 'Aurio Neto'): string {
  if (r.status === 'ESTORNADO') return 'Estornado — o lançamento fica no histórico com a marca de estorno.';
  if (r.status === 'A_CONFERIR')
    return `A conferir: lançado por ${r.registradoPor}, ainda sem consolidação da tesouraria.`;
  return `Consolidado por ${consolidadaPor}. Alteração só por estorno, com motivo registrado.`;
}
