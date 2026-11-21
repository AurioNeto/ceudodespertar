import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';

const PASTA = join(dirname(fileURLToPath(import.meta.url)), '../../src/banco/migracoes/b1-003-pessoa-minima');
const APLICAR = readFileSync(join(PASTA, 'pessoa.sql'), 'utf8');
const DESFAZER = readFileSync(join(PASTA, 'desfazer.sql'), 'utf8');

describe('migração da pessoa mínima', () => {
  let banco: BancoDeTeste;
  beforeEach(async () => { banco = await criarBancoDeTeste(); });
  afterEach(async () => { await derrubarBancoDeTeste(banco); });

  it('tem a estrutura completa de perfil com colunas futuras nulas, sem dados de saúde', async () => {
    const { rows } = await banco.owner.query("select column_name, is_nullable from information_schema.columns where table_schema = 'pessoas' and table_name = 'pessoa' order by ordinal_position");
    expect(rows.map(({ column_name }) => column_name)).toEqual([
      'id', 'instituicao_id', 'tipo', 'nome', 'apelido', 'documento', 'telefone', 'email', 'cidade', 'nascimento', 'foto_anexo_id',
      'relacao_com_a_casa', 'contato_emergencia_nome', 'contato_emergencia_tel', 'cadastrada_por_link', 'anonimizada_em', 'ativa', 'versao', 'criada_em',
    ]);
    expect(rows.filter(({ column_name }) => ['apelido', 'telefone', 'email', 'cidade', 'nascimento', 'foto_anexo_id', 'relacao_com_a_casa', 'contato_emergencia_nome', 'contato_emergencia_tel', 'anonimizada_em'].includes(column_name))
      .every(({ is_nullable }) => is_nullable === 'YES')).toBe(true);
  });

  it('desfaz e reaplica sem remover os schemas existentes e restaura RLS forçada', async () => {
    await banco.owner.query(DESFAZER);
    const removida = await banco.owner.query("select to_regclass('pessoas.pessoa') as pessoa, to_regclass('financeiro.conta') as conta, to_regclass('identidade.usuario') as usuario");
    expect(removida.rows).toEqual([{ pessoa: null, conta: 'financeiro.conta', usuario: 'identidade.usuario' }]);
    await banco.owner.query(APLICAR);
    const rls = await banco.owner.query("select relrowsecurity, relforcerowsecurity from pg_class where oid = 'pessoas.pessoa'::regclass");
    expect(rls.rows).toEqual([{ relrowsecurity: true, relforcerowsecurity: true }]);
  });
});
