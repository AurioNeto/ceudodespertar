import type { Dinheiro } from '@cdd/contracts';
import { analisarInt8 } from '../../../../shared/infrastructure/banco/parsers-do-pg.js';

export function centavos(total: bigint): Dinheiro {
  return analisarInt8(total.toString()) as Dinheiro;
}
