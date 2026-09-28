import type { GrupoId } from '../kernel.js';
import type { Permissao } from './permissoes.js';

export const CODIGOS_DE_GRUPO_DE_SISTEMA = [
  'ADMINISTRADOR',
  'GOVERNANCA',
  'TESOURARIA',
  'ACOLHIMENTO',
  'REGISTRO',
  'LEITURA',
] as const;

export type CodigoGrupo = (typeof CODIGOS_DE_GRUPO_DE_SISTEMA)[number];

export interface Grupo {
  readonly id: GrupoId;
  readonly codigoSistema: CodigoGrupo;
  readonly nome: string;
  readonly descricao: string;
  readonly permissoes: readonly Permissao[];
  readonly protegido: boolean;
  readonly usuarios: number;
}

export interface GrupoDeAcesso {
  readonly id: GrupoId;
  readonly codigoSistema: CodigoGrupo | null;
  readonly nome: string;
  readonly descricao: string;
  readonly permissoes: readonly Permissao[];
  readonly protegido: boolean;
}
