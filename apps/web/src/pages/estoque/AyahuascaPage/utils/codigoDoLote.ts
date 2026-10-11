export const codigoDoLote = (texto: string): string => texto.trim().replace(/\s+/g, ' ');

export const mesmoCodigo = (a: string, b: string): boolean =>
  codigoDoLote(a).toLocaleLowerCase('pt-BR') === codigoDoLote(b).toLocaleLowerCase('pt-BR');
