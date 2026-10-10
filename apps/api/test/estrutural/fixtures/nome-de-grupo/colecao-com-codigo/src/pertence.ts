export function pertence(g: string, conjunto: Set<string>, lista: string[]): boolean[] {
  return [
    ['ADMINISTRADOR'].includes(g),
    conjunto.has('GOVERNANCA'),
    lista.indexOf('ACOLHIMENTO') >= 0,
  ];
}
