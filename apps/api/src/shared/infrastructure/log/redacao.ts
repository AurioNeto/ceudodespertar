import { stdSerializers } from 'pino';

export const VALOR_REDIGIDO = '[REDIGIDO]';
export const CPF_REDIGIDO = '[CPF-REDIGIDO]';
export const VALOR_BINARIO_OMITIDO = '[BINARIO]';
export const REFERENCIA_CIRCULAR = '[CICLO]';
export const PROFUNDIDADE_EXCEDIDA = '[PROFUNDO-DEMAIS]';
export const PROFUNDIDADE_MAXIMA = 12;

export const FRAGMENTOS_DE_CHAVE_PROIBIDA = [
  'authorization',
  'cookie',
  'body',
  'corpo',
  'senha',
  'password',
  'passwd',
  'pwd',
  'pass',
  'token',
  'jwt',
  'bearer',
  'sessionid',
  'sessao',
  'segredo',
  'secret',
  'apikey',
  'credencial',
  'credential',
  'cpf',
  'documento',
  'anamnese',
  'saude',
  'diagnostico',
  'medicamento',
  'queixa',
  'alergia',
  'restric',
] as const;

const FORMATO_DE_CPF_FORA_DE_IDENTIFICADOR = /(?<![\p{L}\p{N}])\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}(?![\p{L}\p{N}])/gu;
const MENOR_NUMERO_DE_ONZE_DIGITOS = 10_000_000_000;
const MAIOR_NUMERO_DE_ONZE_DIGITOS = 99_999_999_999;

function normalizarChave(chave: string): string {
  return chave
    .normalize('NFD')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function ehChaveProibida(chave: string): boolean {
  const normalizada = normalizarChave(chave);
  return FRAGMENTOS_DE_CHAVE_PROIBIDA.some((fragmento) => normalizada.includes(fragmento));
}

export function mascararCpf(texto: string): string {
  return texto.replace(FORMATO_DE_CPF_FORA_DE_IDENTIFICADOR, CPF_REDIGIDO);
}

function podeSerCpf(numero: number): boolean {
  const absoluto = Math.abs(numero);
  return Number.isInteger(numero) && absoluto >= MENOR_NUMERO_DE_ONZE_DIGITOS && absoluto <= MAIOR_NUMERO_DE_ONZE_DIGITOS;
}

function redigirComVistos(valor: unknown, vistos: WeakSet<object>, profundidade: number): unknown {
  if (typeof valor === 'string') {
    return mascararCpf(valor);
  }
  if (typeof valor === 'number' && podeSerCpf(valor)) {
    return CPF_REDIGIDO;
  }
  if (valor === null || typeof valor !== 'object') {
    return valor;
  }
  if (valor instanceof Date) {
    return valor;
  }
  if (ArrayBuffer.isView(valor) || valor instanceof ArrayBuffer) {
    return VALOR_BINARIO_OMITIDO;
  }
  if (vistos.has(valor)) {
    return REFERENCIA_CIRCULAR;
  }
  if (profundidade >= PROFUNDIDADE_MAXIMA) {
    return PROFUNDIDADE_EXCEDIDA;
  }
  vistos.add(valor);

  const alvo: object = valor instanceof Error ? stdSerializers.err(valor) : valor;
  if (Array.isArray(alvo)) {
    return alvo.map((item) => redigirComVistos(item, vistos, profundidade + 1));
  }

  const redigido: Record<string, unknown> = {};
  for (const [chave, conteudo] of Object.entries(alvo)) {
    redigido[chave] = ehChaveProibida(chave)
      ? VALOR_REDIGIDO
      : redigirComVistos(conteudo, vistos, profundidade + 1);
  }
  return redigido;
}

export function redigir(valor: unknown): unknown {
  return redigirComVistos(valor, new WeakSet(), 0);
}

export const LINHA_DE_LOG_ILEGIVEL = `${JSON.stringify({ level: 'error', msg: 'linha de log descartada: não era JSON' })}\n`;

export function redigirLinhaDeLog(linha: string): string {
  let objeto: unknown;
  try {
    objeto = JSON.parse(linha);
  } catch {
    return LINHA_DE_LOG_ILEGIVEL;
  }
  return `${JSON.stringify(redigir(objeto))}\n`;
}
