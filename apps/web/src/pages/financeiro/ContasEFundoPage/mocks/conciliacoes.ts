import type { ContaId, DataLocal } from '@cdd/contracts';
import { dataLocal } from '@cdd/contracts';
import { id } from '@/mocks/ids';

export const ultimaConciliacaoPorConta: ReadonlyMap<ContaId, DataLocal> = new Map([
  [id<ContaId>('cora'), dataLocal('2026-09-01')],
  [id<ContaId>('itau'), dataLocal('2026-08-31')],
]);
