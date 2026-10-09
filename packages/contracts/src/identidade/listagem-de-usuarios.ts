import { z } from 'zod';
import type { DataHora, GrupoId, UsuarioId } from '../kernel.js';
import type { GrupoResumido, SituacaoUsuario } from './tipos.js';

export const LIMITE_PADRAO_DA_LISTAGEM_DE_USUARIOS = 50;
export const LIMITE_MAXIMO_DA_LISTAGEM_DE_USUARIOS = 100;
const TAMANHO_MAXIMO_DO_CURSOR = 512;
const TAMANHO_MAXIMO_DA_BUSCA = 200;

export const SITUACOES_DE_USUARIO = ['ATIVO', 'CONVITE_PENDENTE', 'SUSPENSO', 'REVOGADO'] as const satisfies readonly SituacaoUsuario[];

export const FiltroDeUsuarios = z.object({
  situacao: z.enum(SITUACOES_DE_USUARIO).optional(),
  grupoId: z
    .uuid()
    .transform((valor) => valor as GrupoId)
    .optional(),
  busca: z.string().trim().min(1).max(TAMANHO_MAXIMO_DA_BUSCA).optional(),
  depois: z.string().min(1).max(TAMANHO_MAXIMO_DO_CURSOR).optional(),
  limite: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIMITE_MAXIMO_DA_LISTAGEM_DE_USUARIOS)
    .default(LIMITE_PADRAO_DA_LISTAGEM_DE_USUARIOS),
});

export type FiltroDeUsuarios = z.infer<typeof FiltroDeUsuarios>;

export interface UsuarioListado {
  readonly id: UsuarioId;
  readonly nome: string;
  readonly email: string;
  readonly situacao: SituacaoUsuario;
  readonly grupos: readonly GrupoResumido[];
  readonly versao: number;
  readonly ultimoAcessoEm: DataHora | null;
}

export interface PaginaDeUsuarios {
  readonly itens: readonly UsuarioListado[];
  readonly proxima: string | null;
}
