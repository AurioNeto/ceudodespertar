import { z } from 'zod';
import { OPERACOES_AUDITADAS } from './tipos.js';
import type { RegistroDeAuditoria } from './tipos.js';

export const LIMITE_PADRAO_DA_AUDITORIA = 50;
export const LIMITE_MAXIMO_DA_AUDITORIA = 100;
const TAMANHO_MAXIMO_DO_CURSOR = 256;

const instante = z.iso.datetime({ offset: true });

export const FiltroDeAuditoria = z
  .object({
    de: instante.optional(),
    ate: instante.optional(),
    operacao: z.enum(OPERACOES_AUDITADAS).optional(),
    depois: z.string().min(1).max(TAMANHO_MAXIMO_DO_CURSOR).optional(),
    limite: z.coerce.number().int().min(1).max(LIMITE_MAXIMO_DA_AUDITORIA).default(LIMITE_PADRAO_DA_AUDITORIA),
  })
  .refine(({ de, ate }) => de === undefined || ate === undefined || Date.parse(de) <= Date.parse(ate), {
    message: 'de não pode ser posterior a ate',
    path: ['de'],
  });

export type FiltroDeAuditoria = z.infer<typeof FiltroDeAuditoria>;

export interface PaginaDeAuditoria {
  readonly itens: readonly RegistroDeAuditoria[];
  readonly proxima: string | null;
}
