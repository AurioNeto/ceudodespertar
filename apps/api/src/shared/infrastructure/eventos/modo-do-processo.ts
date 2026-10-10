export const MODO_DO_PROCESSO = Symbol('MODO_DO_PROCESSO');

const MODOS_DO_PROCESSO = ['api', 'cli'] as const;

export type ModoDoProcesso = (typeof MODOS_DO_PROCESSO)[number];

export class ErroDeModoDoProcessoInvalido extends Error {
  constructor(valor: string) {
    super(`CDD_PROCESSO inválido: "${valor}"; use ${MODOS_DO_PROCESSO.join(' ou ')}`);
    this.name = 'ErroDeModoDoProcessoInvalido';
  }
}

function ehModoDoProcesso(valor: string): valor is ModoDoProcesso {
  return (MODOS_DO_PROCESSO as readonly string[]).includes(valor);
}

export function lerModoDoProcesso(ambiente: NodeJS.ProcessEnv = process.env): ModoDoProcesso {
  const bruto = ambiente.CDD_PROCESSO;
  if (bruto === undefined) return 'api';
  if (!ehModoDoProcesso(bruto)) throw new ErroDeModoDoProcessoInvalido(bruto);
  return bruto;
}
