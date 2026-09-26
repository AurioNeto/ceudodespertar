import { z } from 'zod';
import type { GrupoId } from '../kernel.js';

const grupoIdSchema = z
  .string()
  .trim()
  .min(1)
  .transform((valor) => valor as GrupoId);

export const ConvidarUsuario = z.object({
  nome: z.string().trim().min(1).max(200),
  email: z.string().trim().toLowerCase().email().max(320),
});

export type ConvidarUsuario = z.infer<typeof ConvidarUsuario>;

export const AlterarGruposDoUsuario = z.object({
  grupos: z.array(grupoIdSchema),
});

export type AlterarGruposDoUsuario = z.infer<typeof AlterarGruposDoUsuario>;

const motivoSchema = z.string().trim().min(1).max(500);

export const DesativarUsuario = z.object({
  motivo: motivoSchema,
});

export type DesativarUsuario = z.infer<typeof DesativarUsuario>;

export const ReativarUsuario = z.object({
  motivo: motivoSchema,
});

export type ReativarUsuario = z.infer<typeof ReativarUsuario>;

export const AtivarConvite = z.object({
  token: z.string().trim().min(1),
});

export type AtivarConvite = z.infer<typeof AtivarConvite>;
