export const NOME_DO_CABECALHO_DE_IDEMPOTENCIA = 'Idempotency-Key';

export const JANELA_DE_RETENCAO_EM_HORAS = 24;

const TAMANHO_MAXIMO_DA_CHAVE = 255;
const PADRAO_DE_CHAVE_VALIDA = new RegExp(`^[\\x21-\\x7E]{1,${TAMANHO_MAXIMO_DA_CHAVE}}$`);

export function chaveDeIdempotenciaEhValida(chave: string): boolean {
  return PADRAO_DE_CHAVE_VALIDA.test(chave);
}
