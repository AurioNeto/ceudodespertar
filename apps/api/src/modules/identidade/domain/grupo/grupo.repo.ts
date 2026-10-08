import type { GrupoId } from '@cdd/contracts';
import type { Grupo } from './grupo.js';

export interface RepositorioDeGrupo {
  porId(id: GrupoId): Promise<Grupo | undefined>;
  adicionar(grupo: Grupo): Promise<void>;
  salvar(grupo: Grupo): Promise<void>;
}
