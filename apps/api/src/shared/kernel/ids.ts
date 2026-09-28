import { randomBytes } from 'node:crypto';

const NIBBLE_DE_VERSAO_7 = 0x70;
const MASCARA_DE_4_BITS = 0x0f;
const BIT_ALTO_DE_VARIANTE_10 = 0x80;
const MASCARA_DE_6_BITS = 0x3f;
const TAMANHO_DO_TIMESTAMP_EM_BYTES = 6;

export interface Relogio {
  agora(): number;
}

export const RELOGIO_DO_SISTEMA: Relogio = {
  agora: () => Date.now(),
};

export function gerarUuidV7(relogio: Relogio = RELOGIO_DO_SISTEMA): string {
  const timestampEmMs = relogio.agora();
  const aleatorio = randomBytes(10);
  const bytes = Buffer.alloc(16);

  bytes.writeUIntBE(timestampEmMs, 0, TAMANHO_DO_TIMESTAMP_EM_BYTES);
  bytes[6] = NIBBLE_DE_VERSAO_7 | (aleatorio[0]! & MASCARA_DE_4_BITS);
  bytes[7] = aleatorio[1]!;
  bytes[8] = BIT_ALTO_DE_VARIANTE_10 | (aleatorio[2]! & MASCARA_DE_6_BITS);
  aleatorio.copy(bytes, 9, 3, 10);

  return formatarComoUuid(bytes);
}

function formatarComoUuid(bytes: Buffer): string {
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
