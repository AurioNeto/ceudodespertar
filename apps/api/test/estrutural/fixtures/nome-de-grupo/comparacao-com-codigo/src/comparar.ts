export function comparar(x: string): boolean[] {
  return [
    x === 'TESOURARIA',
    x !== 'TESOURARIA',
    x == 'TESOURARIA',
    x != 'TESOURARIA',
  ];
}
