import { filaDeVerificacaoInicial } from '@/mocks/verificacao';

export function useContagemDoLote(): number {
  return filaDeVerificacaoInicial.length;
}
