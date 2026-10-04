import { CODIGOS_DE_ERRO } from '@cdd/contracts';
import type { CodigoDeErro } from '@cdd/contracts';

const STATUS_DE_INDISPONIBILIDADE: ReadonlySet<number> = new Set([502, 503, 504]);
const STATUS_DE_SERVICO_INDISPONIVEL = 503;
const STATUS_DE_NAO_AUTORIZADO = 401;

export class ErroDaApi extends Error {
  readonly status: number;
  readonly codigo: CodigoDeErro;
  readonly detalhes: Record<string, unknown> | undefined;
  readonly correlacaoId: string | null;

  constructor(entrada: {
    status: number;
    codigo: CodigoDeErro;
    detalhes?: Record<string, unknown> | undefined;
    correlacaoId?: string | null;
  }) {
    super(`${entrada.codigo} (HTTP ${entrada.status})`);
    this.name = 'ErroDaApi';
    this.status = entrada.status;
    this.codigo = entrada.codigo;
    this.detalhes = entrada.detalhes;
    this.correlacaoId = entrada.correlacaoId ?? null;
  }

  get ehFalhaDeAutenticacao(): boolean {
    return this.status === STATUS_DE_NAO_AUTORIZADO && this.codigo === 'NAO_AUTENTICADO';
  }

  get ehIndisponibilidadeTemporaria(): boolean {
    return this.status === STATUS_DE_SERVICO_INDISPONIVEL;
  }
}

export class ErroDeRede extends Error {
  override readonly cause: unknown;

  constructor(causa: unknown) {
    super('Falha de rede ao chamar a API');
    this.name = 'ErroDeRede';
    this.cause = causa;
  }
}

const CODIGOS_CONHECIDOS: ReadonlySet<string> = new Set(CODIGOS_DE_ERRO);

function ehRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function ehCodigoDeErro(valor: unknown): valor is CodigoDeErro {
  return typeof valor === 'string' && CODIGOS_CONHECIDOS.has(valor);
}

export function codigoDeFallback(status: number): CodigoDeErro {
  return STATUS_DE_INDISPONIBILIDADE.has(status) ? 'SERVICO_INDISPONIVEL' : 'ERRO_INTERNO';
}

function lerJson(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return undefined;
  }
}

export function erroDaResposta(status: number, texto: string): ErroDaApi {
  const corpo = lerJson(texto);
  if (!ehRegistro(corpo) || !ehCodigoDeErro(corpo['erro'])) {
    return new ErroDaApi({ status, codigo: codigoDeFallback(status) });
  }
  const { detalhes, correlacaoId } = corpo;
  return new ErroDaApi({
    status,
    codigo: corpo['erro'],
    detalhes: ehRegistro(detalhes) ? detalhes : undefined,
    correlacaoId: typeof correlacaoId === 'string' ? correlacaoId : null,
  });
}
