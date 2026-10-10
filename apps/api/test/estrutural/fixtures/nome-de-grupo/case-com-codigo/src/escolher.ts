export function escolher(x: string): number {
  switch (x) {
    case 'REGISTRO':
      return 1;
    default:
      return 0;
  }
}
