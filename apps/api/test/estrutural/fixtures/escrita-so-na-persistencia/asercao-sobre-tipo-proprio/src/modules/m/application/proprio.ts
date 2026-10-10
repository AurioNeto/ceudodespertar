interface Repositorio {
  buscar(): void;
}

export function proprio(valor: object) {
  const repositorio = valor as unknown as Repositorio;
  const texto = 'a' as string;
  return [repositorio, texto, [1] as const];
}
