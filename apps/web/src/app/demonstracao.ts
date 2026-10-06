export const VALOR_QUE_LIGA_A_DEMONSTRACAO = '1';

export interface PedidoDeDemonstracao<Modulo> {
  readonly desenvolvimento: boolean;
  readonly flag: string | undefined;
  readonly importar: () => Promise<Modulo>;
}

export function demonstracaoLigada(desenvolvimento: boolean, flag: string | undefined): boolean {
  return desenvolvimento && flag === VALOR_QUE_LIGA_A_DEMONSTRACAO;
}

export async function carregarDemonstracao<Modulo>(pedido: PedidoDeDemonstracao<Modulo>): Promise<Modulo | null> {
  if (!demonstracaoLigada(pedido.desenvolvimento, pedido.flag)) return null;
  return pedido.importar();
}
