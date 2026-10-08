import { z } from 'zod';
import type { GrupoId, UsuarioId } from '../kernel.js';
import type { SituacaoUsuario } from './tipos.js';

export const ParametrosDoUsuario = z.object({
  id: z.uuid().transform((valor) => valor as UsuarioId),
});

export type ParametrosDoUsuario = z.infer<typeof ParametrosDoUsuario>;

export interface SituacaoDoUsuarioAlterada {
  readonly situacao: SituacaoUsuario;
  readonly versao: number;
}

export interface GruposDoUsuarioDefinidos {
  readonly grupos: readonly GrupoId[];
  readonly versao: number;
}
