import type { GrupoDeCustoId } from '@cdd/contracts';
import type { GrupoDeCusto } from './grupo-de-custo.js';

export abstract class RepositorioDeGrupoDeCusto {
  abstract porId(id: GrupoDeCustoId): Promise<GrupoDeCusto | undefined>;
  abstract listar(): Promise<readonly GrupoDeCusto[]>;
  abstract adicionar(grupo: GrupoDeCusto): Promise<void>;
  abstract salvar(grupo: GrupoDeCusto): Promise<number>;
}
