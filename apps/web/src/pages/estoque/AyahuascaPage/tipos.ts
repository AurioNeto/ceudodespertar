export type Aba = 'lotes' | 'movimentos' | 'reservas';
export type ModoDoFormulario = 'feitio' | 'saida' | 'transferencia';

export interface RascunhoDeMovimento {
  modo: ModoDoFormulario;
  codigo: string;
  origem: string;
  forca: string;
  loteId: string;
  litros: string;
  destino: string;
}
