import type { Competencia, UnidadeId } from '@cdd/contracts';
import type { PeriodoContabil } from './periodo-contabil.js';
import type { MovimentosDoPeriodo } from './hash-do-periodo.js';
export interface ChaveDoPeriodo { readonly unidadeId: UnidadeId; readonly competencia: Competencia; }
export interface SituacaoDosMovimentos { readonly movimentos: MovimentosDoPeriodo; readonly pendentes: number; }
export abstract class RepositorioDePeriodo {
  abstract travar(chave: ChaveDoPeriodo, incluirAnterior: boolean): Promise<void>;
  abstract porChave(chave: ChaveDoPeriodo): Promise<PeriodoContabil | undefined>;
  abstract movimentos(chave: ChaveDoPeriodo): Promise<SituacaoDosMovimentos>;
  abstract anteriorFechado(chave: ChaveDoPeriodo): Promise<boolean>;
  abstract adicionar(periodo: PeriodoContabil): Promise<void>;
  abstract salvar(periodo: PeriodoContabil): Promise<number>;
}
