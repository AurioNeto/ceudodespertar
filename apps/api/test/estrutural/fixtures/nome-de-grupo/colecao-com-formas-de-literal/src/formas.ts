export function formas(x: string): boolean[] {
  return [
    [('TESOURARIA')].includes(x),
    [`TESOURARIA`].includes(x),
    (['TESOURARIA'] as string[]).includes(x),
  ];
}
