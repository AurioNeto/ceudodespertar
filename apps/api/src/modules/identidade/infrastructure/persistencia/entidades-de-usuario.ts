import { defineEntity } from '@mikro-orm/postgresql';

export const UsuarioEntidade = defineEntity({
  name: 'UsuarioEntidade',
  schema: 'identidade',
  tableName: 'usuario',
  properties: (p) => ({
    id: p.uuid().primary(),
    instituicaoId: p.uuid(),
    subjectId: p.string().nullable(),
    pessoaId: p.uuid().nullable(),
    nome: p.string(),
    email: p.string(),
    situacao: p.string(),
    ativadoEm: p.datetime().nullable(),
    suspensoEm: p.datetime().nullable(),
    ultimoAcessoEm: p.datetime().nullable(),
    versao: p.integer(),
  }),
});

export const ConviteEntidade = defineEntity({
  name: 'ConviteEntidade',
  schema: 'identidade',
  tableName: 'convite',
  properties: (p) => ({
    id: p.uuid().primary(),
    instituicaoId: p.uuid(),
    usuarioId: p.uuid(),
    tokenSha256: p.blob().fieldName('token_sha256'),
    expiraEm: p.datetime(),
    usadoEm: p.datetime().nullable(),
    revogadoEm: p.datetime().nullable(),
    criadoPor: p.uuid(),
    criadoEm: p.datetime(),
  }),
});

export const UsuarioGrupoEntidade = defineEntity({
  name: 'UsuarioGrupoEntidade',
  schema: 'identidade',
  tableName: 'usuario_grupo',
  properties: (p) => ({
    usuarioId: p.uuid().primary(),
    grupoId: p.uuid().primary(),
    instituicaoId: p.uuid(),
    atribuidoPor: p.uuid(),
    atribuidoEm: p.datetime(),
  }),
});
