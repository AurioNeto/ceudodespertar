import { z } from 'zod';
import type { GrupoId } from '../kernel.js';
import type { CodigoGrupo, Grupo } from './grupos.js';
import type { Permissao } from './permissoes.js';

const TAMANHO_MAXIMO_DO_CODIGO_DE_PERMISSAO = 100;
const TAMANHO_MAXIMO_DO_NOME_DO_GRUPO = 100;
const TAMANHO_MAXIMO_DA_DESCRICAO_DO_GRUPO = 500;

const grupoIdSchema = z.uuid().transform((valor) => valor as GrupoId);

export const ParametrosDoGrupo = z.object({
  id: grupoIdSchema,
});

export type ParametrosDoGrupo = z.infer<typeof ParametrosDoGrupo>;

export const ParametrosDaPermissaoDoGrupo = z.object({
  id: grupoIdSchema,
  codigo: z.string().min(1).max(TAMANHO_MAXIMO_DO_CODIGO_DE_PERMISSAO),
});

export type ParametrosDaPermissaoDoGrupo = z.infer<typeof ParametrosDaPermissaoDoGrupo>;

export const RenomearGrupo = z.object({
  nome: z.string().trim().min(1).max(TAMANHO_MAXIMO_DO_NOME_DO_GRUPO),
  descricao: z.string().trim().max(TAMANHO_MAXIMO_DA_DESCRICAO_DO_GRUPO),
});

export type RenomearGrupo = z.infer<typeof RenomearGrupo>;

export interface GrupoDaGestao extends Omit<Grupo, 'codigoSistema'> {
  readonly codigoSistema: CodigoGrupo | null;
  readonly versao: number;
}

export interface GruposDaGestao {
  readonly itens: readonly GrupoDaGestao[];
}

export interface PermissoesDoGrupoAlteradas {
  readonly permissoes: readonly Permissao[];
  readonly versao: number;
}

export type DadosDoGrupoRenomeado = Omit<GrupoDaGestao, 'usuarios'>;
