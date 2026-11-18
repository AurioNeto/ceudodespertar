import type { ChaveDoPeriodo } from '../../domain/periodo/periodo-contabil.repo.js';
import type { Competencia, UnidadeId } from '@cdd/contracts';

export abstract class SituacaoDoPeriodo {
  abstract proteger(periodos: readonly ChaveDoPeriodo[]): Promise<void>;
  abstract estaAberto(unidadeId: UnidadeId, competencia: Competencia): Promise<boolean>;
}
