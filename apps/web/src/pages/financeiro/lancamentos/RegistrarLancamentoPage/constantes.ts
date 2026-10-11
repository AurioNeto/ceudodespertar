import type { TipoLancamento } from '@cdd/contracts';
import type { ReceiptTone, SheetOption } from '@/ds';
import {
  opcoesDeCategoria,
  opcoesDeCerimonia,
  opcoesDeCompetencia,
  opcoesDeConta,
  opcoesDeContaDestino,
  opcoesDeGrupo,
  opcoesDePagamento,
  opcoesDePessoa,
  opcoesDeUnidade,
} from './mocks/opcoes';
import type { CampoComPicker } from './hooks/useFormularioDeLancamento';

export const TIPOS: readonly { valor: TipoLancamento; label: string }[] = [
  { valor: 'SAIDA', label: 'Saída' },
  { valor: 'ENTRADA', label: 'Entrada' },
  { valor: 'TRANSFERENCIA', label: 'Transferência' },
];

export const TEXTOS_DA_SOMA = {
  sumLabel: 'Soma reconhecida:',
  sumNote: 'o valor composto vira pendência na conferência.',
} as const;

export const TOM_DO_RECIBO: Record<TipoLancamento, ReceiptTone> = {
  ENTRADA: 'entrada',
  SAIDA: 'saida',
  TRANSFERENCIA: 'transferencia',
};

export const LISTAS: Record<CampoComPicker, { titulo: string; opcoes: readonly SheetOption[] }> = {
  conta: { titulo: 'Conta', opcoes: opcoesDeConta },
  contaDestino: { titulo: 'Conta de destino', opcoes: opcoesDeContaDestino },
  grupo: { titulo: 'Grupo', opcoes: opcoesDeGrupo },
  categoria: { titulo: 'Categoria — pode marcar mais de uma', opcoes: opcoesDeCategoria },
  pagamento: { titulo: 'Forma', opcoes: opcoesDePagamento },
  cerimonia: { titulo: 'Cerimônia vinculada', opcoes: opcoesDeCerimonia },
  competencia: { titulo: 'Competência', opcoes: opcoesDeCompetencia },
  pessoa: { titulo: 'Quem adiantou o dinheiro', opcoes: opcoesDePessoa },
  unidade: { titulo: 'Unidade', opcoes: opcoesDeUnidade },
};

export const rotuloLabel = {
  font: 'var(--text-label)',
  textTransform: 'uppercase',
  letterSpacing: 'var(--tracking-label)',
  color: 'var(--text-field-label)',
} as const;
