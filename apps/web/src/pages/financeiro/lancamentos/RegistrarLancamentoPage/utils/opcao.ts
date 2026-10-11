import type { SheetOption } from '@/ds';

export const rotuloDaOpcao = (opcoes: readonly SheetOption[], value: string): string =>
  opcoes.find((o) => o.value === value)?.label ?? value;

export const metaDaOpcao = (opcoes: readonly SheetOption[], value: string): string =>
  opcoes.find((o) => o.value === value)?.meta ?? '';
