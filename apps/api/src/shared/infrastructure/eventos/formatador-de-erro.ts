const TAMANHO_MAXIMO_DO_ULTIMO_ERRO = 500;
const PADRAO_DE_CPF = /\d{3}\.\d{3}\.\d{3}-\d{2}/g;
const MASCARA_DE_CPF = '***.***.***-**';

function mascararCpf(mensagem: string): string {
  return mensagem.replace(PADRAO_DE_CPF, MASCARA_DE_CPF);
}

function codigoDoErro(erro: Error): string {
  const possivelCodigo = (erro as { code?: unknown }).code;
  return typeof possivelCodigo === 'string' ? possivelCodigo : erro.name;
}

export function formatarUltimoErro(erro: Error): string {
  const identificador = `${erro.constructor.name}: ${codigoDoErro(erro)}`;
  const mensagemMascarada = mascararCpf(erro.message);
  const linha = mensagemMascarada.length > 0 ? `${identificador} - ${mensagemMascarada}` : identificador;
  return linha.slice(0, TAMANHO_MAXIMO_DO_ULTIMO_ERRO);
}
