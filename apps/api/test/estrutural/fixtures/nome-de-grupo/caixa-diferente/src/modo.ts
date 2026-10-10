export function modoDeLeitura(modo: string, nome: string): boolean {
  return modo !== 'leitura' && nome === 'tesouraria';
}
