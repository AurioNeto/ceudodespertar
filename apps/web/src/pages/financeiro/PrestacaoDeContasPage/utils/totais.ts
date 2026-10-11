import type { LinhaDePrestacao } from '../mocks/prestacao';

export const soma = (linhas: readonly LinhaDePrestacao[]): number => linhas.reduce((s, l) => s + l.valor, 0);
