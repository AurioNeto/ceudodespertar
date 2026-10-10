const PERMITIDOS = ['TESOURARIA', 'GOVERNANCA'];
const CONJUNTO = new Set(['ADMINISTRADOR']);
const FIXOS = ['LEITURA'] as const;
const POR_CODIGO = new Map([['REGISTRO', 1]]);

export function permitido(grupo: string): boolean[] {
  return [
    PERMITIDOS.includes(grupo),
    CONJUNTO.has(grupo),
    FIXOS.includes(grupo as 'LEITURA'),
    POR_CODIGO.has(grupo),
  ];
}
