/**
 * Tipos de base compartilhados por todos os contextos.
 * Doc 1 §4.6 — IDs são branded types; dinheiro nunca é float.
 */

declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type InstituicaoId = Brand<string, 'InstituicaoId'>;
export type UnidadeId = Brand<string, 'UnidadeId'>;
export type CategoriaId = Brand<string, 'CategoriaId'>;
export type ContaId = Brand<string, 'ContaId'>;
export type FundoId = Brand<string, 'FundoId'>;
export type LancamentoId = Brand<string, 'LancamentoId'>;
export type TransferenciaId = Brand<string, 'TransferenciaId'>;
export type EventoId = Brand<string, 'EventoId'>;
export type InscricaoId = Brand<string, 'InscricaoId'>;
export type PessoaId = Brand<string, 'PessoaId'>;
export type UsuarioId = Brand<string, 'UsuarioId'>;
export type GrupoId = Brand<string, 'GrupoId'>;
export type FormularioId = Brand<string, 'FormularioId'>;
export type PerguntaId = Brand<string, 'PerguntaId'>;
export type RespostaId = Brand<string, 'RespostaId'>;
export type LoteId = Brand<string, 'LoteId'>;
export type MovimentoId = Brand<string, 'MovimentoId'>;
export type AnexoId = Brand<string, 'AnexoId'>;
export type TarefaId = Brand<string, 'TarefaId'>;

/** Dinheiro em centavos. Nunca float — Doc 1 §4.7. */
export type Dinheiro = Brand<number, 'Dinheiro'>;

export const dinheiro = (centavos: number): Dinheiro => Math.round(centavos) as Dinheiro;
export const reais = (valor: number): Dinheiro => dinheiro(valor * 100);

/** Data sem hora, ISO `YYYY-MM-DD`, fuso America/Sao_Paulo. */
export type DataLocal = Brand<string, 'DataLocal'>;
/** Instante ISO 8601 completo. */
export type DataHora = Brand<string, 'DataHora'>;
/** Competência contábil `YYYY-MM`. */
export type Competencia = Brand<string, 'Competencia'>;

export const dataLocal = (iso: string): DataLocal => iso as DataLocal;
export const dataHora = (iso: string): DataHora => iso as DataHora;
export const competencia = (iso: string): Competencia => iso as Competencia;

export interface IntervaloDeData {
  readonly de: DataLocal;
  readonly ate: DataLocal;
}

export interface Anexo {
  readonly id: AnexoId;
  readonly nome: string;
  readonly tipo: string;
  readonly tamanhoBytes: number;
  /** URL assinada de curta duração — nunca link público (Doc 1 §5.6). */
  readonly url: string;
}
