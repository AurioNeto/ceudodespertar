import type { FundoId } from '@cdd/contracts';
import type { Fundo } from './fundo.js';

export abstract class RepositorioDeFundo {
  abstract porId(id: FundoId): Promise<Fundo | undefined>;
  abstract listar(): Promise<readonly Fundo[]>;
  abstract adicionar(fundo: Fundo): Promise<void>;
  abstract salvar(fundo: Fundo): Promise<number>;
}
