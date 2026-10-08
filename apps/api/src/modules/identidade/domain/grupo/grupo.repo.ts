import type { GrupoId } from '@cdd/contracts';
import type { Grupo } from './grupo.js';

export abstract class RepositorioDeGrupo {
  abstract porId(id: GrupoId): Promise<Grupo | undefined>;
  abstract adicionar(grupo: Grupo): Promise<void>;
  abstract salvar(grupo: Grupo): Promise<number>;
}
