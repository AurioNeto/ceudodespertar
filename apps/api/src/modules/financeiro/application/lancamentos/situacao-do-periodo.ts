import type { Competencia, UnidadeId } from '@cdd/contracts';

export abstract class SituacaoDoPeriodo {
  abstract estaAberto(unidadeId: UnidadeId, competencia: Competencia): Promise<boolean>;
}
