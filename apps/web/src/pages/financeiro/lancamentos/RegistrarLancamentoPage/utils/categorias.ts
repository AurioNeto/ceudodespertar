export const comCategoria = (categorias: readonly string[], categoria: string): readonly string[] =>
  categorias.includes(categoria) ? categorias : [...categorias, categoria];
