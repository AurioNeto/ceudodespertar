-- verificacoes: 8
-- Pessoa mínima: RLS forçada inclusive no owner, fail-closed e documento único por instituição.
INSERT INTO shared.instituicao (id, nome) VALUES
  ('a0000000-0000-0000-0000-000000000000', 'Casa A'),
  ('b0000000-0000-0000-0000-000000000000', 'Casa B');
SET ROLE cdd_app;
SELECT set_config('app.instituicao_id', 'b0000000-0000-0000-0000-000000000000', false);
INSERT INTO pessoas.pessoa (instituicao_id, tipo, nome, documento)
  VALUES ('b0000000-0000-0000-0000-000000000000', 'FISICA', 'Pessoa B', '12345678901');
SELECT set_config('app.instituicao_id', 'a0000000-0000-0000-0000-000000000000', false);
INSERT INTO pessoas.pessoa (instituicao_id, tipo, nome, documento)
  VALUES ('a0000000-0000-0000-0000-000000000000', 'FISICA', 'Pessoa A', '12345678901');
SELECT verif.confere('pessoas · A só lê uma pessoa e pode repetir documento de B', (SELECT count(*) FROM pessoas.pessoa), 1::bigint);
SELECT verif.espera_erro('pessoas · A não grava em nome de B', $$
  INSERT INTO pessoas.pessoa (instituicao_id, tipo, nome) VALUES ('b0000000-0000-0000-0000-000000000000', 'FISICA', 'Invasora')
$$, '42501');
SELECT verif.espera_erro('pessoas · documento duplicado na própria casa é recusado', $$
  INSERT INTO pessoas.pessoa (instituicao_id, tipo, nome, documento) VALUES ('a0000000-0000-0000-0000-000000000000', 'FISICA', 'Duplicada', '12345678901')
$$, '23505');
SELECT set_config('app.instituicao_id', '', false);
SELECT verif.confere('pessoas · sem contexto a leitura é vazia', (SELECT count(*) FROM pessoas.pessoa), 0::bigint);
SELECT verif.espera_erro('pessoas · sem contexto a escrita é recusada', $$
  INSERT INTO pessoas.pessoa (instituicao_id, tipo, nome) VALUES ('a0000000-0000-0000-0000-000000000000', 'FISICA', 'Sem contexto')
$$, '42501');
RESET ROLE;
SELECT verif.confere('pessoas · RLS também é forçada no dono', (SELECT count(*) FROM pessoas.pessoa), 0::bigint);
SELECT verif.confere('pessoas · a aplicação tem só SELECT, INSERT e UPDATE', verif.privilegios_de_tabela('cdd_app', 'pessoas.pessoa'), ARRAY['INSERT','SELECT','UPDATE']);
SELECT verif.confere('pessoas · índice único de documento é parcial',
  (SELECT indisunique AND indpred IS NOT NULL FROM pg_index WHERE indexrelid = 'pessoas.pessoa_documento_unico'::regclass), true);
