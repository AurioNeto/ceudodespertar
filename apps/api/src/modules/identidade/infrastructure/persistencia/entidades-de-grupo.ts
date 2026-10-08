import { defineEntity } from '@mikro-orm/postgresql';

export const GrupoEntidade = defineEntity({
  name: 'GrupoEntidade',
  schema: 'identidade',
  tableName: 'grupo',
  properties: (p) => ({
    id: p.uuid().primary(),
    instituicaoId: p.uuid(),
    codigoSistema: p.string().nullable(),
    nome: p.string(),
    descricao: p.string(),
    protegido: p.boolean(),
    ativo: p.boolean(),
    versao: p.integer(),
  }),
});

export const GrupoPermissaoEntidade = defineEntity({
  name: 'GrupoPermissaoEntidade',
  schema: 'identidade',
  tableName: 'grupo_permissao',
  properties: (p) => ({
    grupoId: p.uuid().primary(),
    permissao: p.string().primary(),
    instituicaoId: p.uuid(),
  }),
});
