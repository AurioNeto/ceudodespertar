import type { CategoriaId } from '@cdd/contracts';
import type { Categoria } from './categoria.js';

export abstract class RepositorioDeCategoria {
  abstract porId(id: CategoriaId): Promise<Categoria | undefined>;
  abstract listar(): Promise<readonly Categoria[]>;
  abstract adicionar(categoria: Categoria): Promise<void>;
  abstract salvar(categoria: Categoria): Promise<number>;
}
