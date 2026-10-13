import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AlterarGruposDoUsuario,
  ConvidarUsuario,
  DesativarUsuario,
  FiltroDeAuditoria,
  FiltroDeUsuarios,
  ParametrosDaPermissaoDoGrupo,
  ParametrosDoGrupo,
  ParametrosDoUsuario,
  PedidoDeConvite,
  ReativarUsuario,
  RenomearGrupo,
} from '../dist/index.js';

const NUL = '\u0000';
const UUID_EM_MINUSCULAS = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const UUID_EM_MAIUSCULAS = UUID_EM_MINUSCULAS.toUpperCase();

const CAMPOS_DE_TEXTO = [
  { esquema: 'FiltroDeUsuarios.busca', schema: FiltroDeUsuarios, base: {}, campo: 'busca' },
  { esquema: 'FiltroDeUsuarios.depois', schema: FiltroDeUsuarios, base: {}, campo: 'depois' },
  { esquema: 'FiltroDeAuditoria.depois', schema: FiltroDeAuditoria, base: {}, campo: 'depois' },
  { esquema: 'ConvidarUsuario.nome', schema: ConvidarUsuario, base: { email: 'a@b.org' }, campo: 'nome' },
  { esquema: 'PedidoDeConvite.nome', schema: PedidoDeConvite, base: { email: 'a@b.org' }, campo: 'nome' },
  { esquema: 'DesativarUsuario.motivo', schema: DesativarUsuario, base: {}, campo: 'motivo' },
  { esquema: 'ReativarUsuario.motivo', schema: ReativarUsuario, base: {}, campo: 'motivo' },
  { esquema: 'RenomearGrupo.nome', schema: RenomearGrupo, base: { descricao: '' }, campo: 'nome' },
  { esquema: 'RenomearGrupo.descricao', schema: RenomearGrupo, base: { nome: 'Grupo' }, campo: 'descricao' },
  {
    esquema: 'ParametrosDaPermissaoDoGrupo.codigo',
    schema: ParametrosDaPermissaoDoGrupo,
    base: { id: UUID_EM_MINUSCULAS },
    campo: 'codigo',
  },
];

for (const { esquema, schema, base, campo } of CAMPOS_DE_TEXTO) {
  test(`${esquema} — texto com NUL — é recusado no próprio campo`, () => {
    const resultado = schema.safeParse({ ...base, [campo]: `a${NUL}b` });

    assert.equal(resultado.success, false);
    assert.deepEqual(resultado.error.issues.map((problema) => problema.path.join('.')), [campo]);
  });

  test(`${esquema} — texto sem NUL — é aceito`, () => {
    const resultado = schema.safeParse({ ...base, [campo]: 'texto comum' });

    assert.equal(resultado.success, true);
  });
}

test('ConvidarUsuario.email — e-mail com NUL — é recusado', () => {
  const resultado = ConvidarUsuario.safeParse({ nome: 'Pessoa', email: `a${NUL}@b.org` });

  assert.equal(resultado.success, false);
});

const CAMPOS_DE_UUID = [
  { esquema: 'ParametrosDoUsuario.id', parse: (id) => ParametrosDoUsuario.parse({ id }).id },
  { esquema: 'ParametrosDoGrupo.id', parse: (id) => ParametrosDoGrupo.parse({ id }).id },
  {
    esquema: 'ParametrosDaPermissaoDoGrupo.id',
    parse: (id) => ParametrosDaPermissaoDoGrupo.parse({ id, codigo: 'sistema.grupo.gerenciar' }).id,
  },
  { esquema: 'FiltroDeUsuarios.grupoId', parse: (id) => FiltroDeUsuarios.parse({ grupoId: id }).grupoId },
  { esquema: 'AlterarGruposDoUsuario.grupos', parse: (id) => AlterarGruposDoUsuario.parse({ grupos: [id] }).grupos[0] },
  {
    esquema: 'PedidoDeConvite.grupos',
    parse: (id) => PedidoDeConvite.parse({ nome: 'Pessoa', email: 'a@b.org', grupos: [id] }).grupos[0],
  },
];

for (const { esquema, parse } of CAMPOS_DE_UUID) {
  test(`${esquema} — UUID em maiúsculas — sai em minúsculas`, () => {
    assert.equal(parse(UUID_EM_MAIUSCULAS), UUID_EM_MINUSCULAS);
  });
}

test('AlterarGruposDoUsuario.grupos — o mesmo UUID em maiúsculas e em minúsculas — é recusado como duplicado', () => {
  const resultado = AlterarGruposDoUsuario.safeParse({ grupos: [UUID_EM_MINUSCULAS, UUID_EM_MAIUSCULAS] });

  assert.equal(resultado.success, false);
  assert.match(resultado.error.issues[0].message, /duplicados/);
});
