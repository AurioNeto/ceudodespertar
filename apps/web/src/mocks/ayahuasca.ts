/** Estoque de daime por lote — Doc 2 §5. Medido em litros. */

export type SituacaoDoLote = 'em uso' | 'lacrado' | 'quarentena' | 'esgotado';
export type TipoDeMovimento = 'entrada' | 'saida' | 'transferencia' | 'perda';

export interface LoteDeDaime {
  id: number;
  codigo: string;
  origem: string;
  data: string;
  forca: string;
  litros: number;
  restante: number;
  local: string;
  guardiao: string;
  situacao: SituacaoDoLote;
  analise: string;
  garrafas: string;
}

export interface MovimentoDeDaime {
  id: number;
  data: string;
  tipo: TipoDeMovimento;
  loteId: number;
  litros: number;
  destino: string;
  responsavel: string;
}

export interface ReservaDeTrabalho {
  id: number;
  nome: string;
  dia: number;
  mes: string;
  litros: number;
}

export const lotesIniciais: readonly LoteDeDaime[] = [
  { id: 1, codigo: 'Lote 12/2025', origem: 'Feitio de dezembro · CDD', data: '18/12/2025', forca: 'Força 2', litros: 42, restante: 23.5, local: 'Despensa do salão', guardiao: 'Chico Aguiar', situacao: 'em uso', analise: 'aprovada em 20/12/2025', garrafas: '47 garrafas de 500 ml' },
  { id: 2, codigo: 'Lote 06/2026', origem: 'Feitio de junho · CDD', data: '22/06/2026', forca: 'Força 1', litros: 30, restante: 27, local: 'Casa de feitio', guardiao: 'Chico Aguiar', situacao: 'lacrado', analise: 'aprovada em 25/06/2026', garrafas: '54 garrafas de 500 ml' },
  { id: 3, codigo: 'Lote 03/2026', origem: 'Recebido do Céu do Mar', data: '14/03/2026', forca: 'Força 3', litros: 12, restante: 4, local: 'Despensa do salão', guardiao: 'Lucia Prado', situacao: 'em uso', analise: 'laudo da unidade de origem', garrafas: '8 garrafas de 500 ml' },
  { id: 4, codigo: 'Lote 09/2025', origem: 'Feitio de setembro · CDD', data: '09/09/2025', forca: 'Força 2', litros: 36, restante: 0, local: 'Despensa do salão', guardiao: 'Chico Aguiar', situacao: 'esgotado', analise: 'aprovada em 12/09/2025', garrafas: '—' },
];

export const movimentosIniciais: readonly MovimentoDeDaime[] = [
  { id: 1, data: '22/08/2026', tipo: 'saida', loteId: 1, litros: 8, destino: 'Mãe Divina · agosto', responsavel: 'Chico Aguiar' },
  { id: 2, data: '25/07/2026', tipo: 'saida', loteId: 1, litros: 7.5, destino: 'São Miguel · julho', responsavel: 'Chico Aguiar' },
  { id: 3, data: '22/06/2026', tipo: 'entrada', loteId: 2, litros: 30, destino: 'Feitio de junho', responsavel: 'Chico Aguiar' },
  { id: 4, data: '20/06/2026', tipo: 'saida', loteId: 3, litros: 5, destino: 'São João · junho', responsavel: 'Lucia Prado' },
  { id: 5, data: '02/06/2026', tipo: 'transferencia', loteId: 3, litros: 3, destino: 'Repasse ao Céu do Vale', responsavel: 'Aurio Neto' },
  { id: 6, data: '14/03/2026', tipo: 'entrada', loteId: 3, litros: 12, destino: 'Recebido do Céu do Mar', responsavel: 'Lucia Prado' },
  { id: 7, data: '18/12/2025', tipo: 'entrada', loteId: 1, litros: 42, destino: 'Feitio de dezembro', responsavel: 'Chico Aguiar' },
  { id: 8, data: '10/11/2025', tipo: 'perda', loteId: 4, litros: 1.5, destino: 'Garrafa quebrada no transporte', responsavel: 'Chico Aguiar' },
];

export const reservasIniciais: readonly ReservaDeTrabalho[] = [
  { id: 1, nome: 'Mãe Divina', dia: 5, mes: 'set', litros: 9 },
  { id: 2, nome: 'Trabalho de cura', dia: 19, mes: 'set', litros: 6 },
  { id: 3, nome: 'Bailado de São Miguel', dia: 27, mes: 'set', litros: 14 },
];

export const reservadoInicial: Readonly<Record<number, boolean>> = { 1: true, 2: false, 3: false };

export const rotuloDoMovimento: Record<TipoDeMovimento, string> = {
  entrada: 'Entrada',
  saida: 'Saída para trabalho',
  transferencia: 'Transferência',
  perda: 'Perda',
};
