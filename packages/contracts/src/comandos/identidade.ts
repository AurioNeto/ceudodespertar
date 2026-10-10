import { z } from 'zod';
import type { GrupoId } from '../kernel.js';

const MAXIMO_DE_GRUPOS_POR_USUARIO = 100;

const grupoIdSchema = z.uuid().transform((valor) => valor as GrupoId);

export const ConvidarUsuario = z.object({
  nome: z.string().trim().min(1).max(200),
  email: z.string().trim().toLowerCase().max(320).pipe(z.email()),
});

export type ConvidarUsuario = z.infer<typeof ConvidarUsuario>;

export const AlterarGruposDoUsuario = z.object({
  grupos: z
    .array(grupoIdSchema)
    .max(MAXIMO_DE_GRUPOS_POR_USUARIO)
    .refine((grupos) => new Set(grupos).size === grupos.length, {
      message: 'grupos não pode conter itens duplicados',
    }),
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

const TOKEN_DE_CONVITE_EM_BASE64URL = /^[A-Za-z0-9_-]{43}$/;

export const AtivarConvite = z.object({
  convite: z.string().regex(TOKEN_DE_CONVITE_EM_BASE64URL),
});

export type AtivarConvite = z.infer<typeof AtivarConvite>;
