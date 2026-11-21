import type { ConnectionOptions } from 'node:tls';
import { z } from 'zod';

export const CamposDoTlsDoBanco = {
  BANCO_TLS: z.enum(['desabilitado', 'verificar']).optional(),
  BANCO_TLS_CA: z.string().min(1).optional(),
};

interface AmbienteDeTls {
  readonly BANCO_TLS?: 'desabilitado' | 'verificar';
  readonly BANCO_TLS_CA?: string;
}

export function construirTlsDoBanco(ambiente: AmbienteDeTls): ConnectionOptions | false {
  if (ambiente.BANCO_TLS !== 'verificar') return false;
  return {
    rejectUnauthorized: true,
    ...(ambiente.BANCO_TLS_CA ? { ca: ambiente.BANCO_TLS_CA } : {}),
  };
}
