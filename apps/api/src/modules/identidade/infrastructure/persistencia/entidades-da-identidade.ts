import type { EntitySchema } from '@mikro-orm/postgresql';
import { GrupoEntidade, GrupoPermissaoEntidade } from './entidades-de-grupo.js';
import { ConviteEntidade, UsuarioEntidade, UsuarioGrupoEntidade } from './entidades-de-usuario.js';

export const ENTIDADES_DA_IDENTIDADE: EntitySchema[] = [
  UsuarioEntidade,
  ConviteEntidade,
  UsuarioGrupoEntidade,
  GrupoEntidade,
  GrupoPermissaoEntidade,
];
