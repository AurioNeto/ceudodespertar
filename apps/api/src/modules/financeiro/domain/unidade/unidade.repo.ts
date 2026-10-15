import type { UnidadeId } from '@cdd/contracts';
import type { Unidade } from './unidade.js';

export abstract class RepositorioDeUnidade {
  abstract porId(id: UnidadeId): Promise<Unidade | undefined>;
  abstract listar(): Promise<readonly Unidade[]>;
  abstract adicionar(unidade: Unidade): Promise<void>;
  abstract salvar(unidade: Unidade): Promise<number>;
}
