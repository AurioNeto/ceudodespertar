export interface Pendencia {
  chave: string;
  titulo: string;
  detalhe: string;
  invariante: string;
  acao?: { rotulo: string; ao: () => void };
}
