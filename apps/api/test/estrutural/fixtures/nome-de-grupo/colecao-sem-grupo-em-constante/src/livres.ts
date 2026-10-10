const ESTADOS = ['ATIVO', 'INATIVO'];
let MUTAVEL = ['LEITURA'];
const POR_ID = new Map([['a', 1]]);

export function livre(valor: string): boolean[] {
  return [ESTADOS.includes(valor), MUTAVEL.includes(valor), POR_ID.has(valor)];
}
