import { types } from 'pg';
import { parse as analisarArrayDoPg } from 'postgres-array';

const OID_INT8 = 20;
const OID_ARRAY_DE_INT8: number = 1016;
const OID_DATE = 1082;

const LIMITE_SEGURO = BigInt(Number.MAX_SAFE_INTEGER);

export class ErroDeInt8ForaDoLimiteSeguro extends Error {
  constructor(readonly valorBruto: string) {
    super(`int8 fora do limite seguro de Number.MAX_SAFE_INTEGER: ${valorBruto}`);
    this.name = 'ErroDeInt8ForaDoLimiteSeguro';
  }
}

export function analisarInt8(valorBruto: string): number {
  const valor = BigInt(valorBruto);
  if (valor > LIMITE_SEGURO || valor < -LIMITE_SEGURO) {
    throw new ErroDeInt8ForaDoLimiteSeguro(valorBruto);
  }
  return Number(valor);
}

export function analisarArrayDeInt8(valorBruto: string): (number | null)[] {
  return analisarArrayDoPg(valorBruto, analisarInt8);
}

function manterComoTexto(valorBruto: string): string {
  return valorBruto;
}

let parsersInstalados = false;

export function instalarParsersDoPg(): void {
  if (parsersInstalados) {
    return;
  }
  types.setTypeParser(OID_INT8, analisarInt8);
  types.setTypeParser(OID_ARRAY_DE_INT8, analisarArrayDeInt8);
  types.setTypeParser(OID_DATE, manterComoTexto);
  parsersInstalados = true;
}
