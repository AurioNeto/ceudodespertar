-- verificacoes: 22
-- B0 · isolamento entre instituições (Documento 7 §15, T23) e fail-closed
-- sem contexto, nas cinco tabelas de shared/identidade que já existem no B0:
-- usuario, grupo, convite, registro_de_auditoria (trilha) e chave_de_idempotencia.

-- Cadastro mínimo, como dono: shared.instituicao não tem RLS (Doc 7 §16).
INSERT INTO shared.instituicao (id, nome) VALUES
  ('a0000000-0000-0000-0000-000000000000', 'Casa A'),
  ('b0000000-0000-0000-0000-000000000000', 'Casa B');

SET ROLE cdd_app;

-- Cadastro de B, para A tentar enxergar/referenciar.
SELECT set_config('app.instituicao_id', 'b0000000-0000-0000-0000-000000000000', false);
INSERT INTO identidade.usuario (id, instituicao_id, nome, email, situacao)
  VALUES ('b1000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000000',
          'Usuário B', 'usuario@casab.example', 'ATIVO');
-- Um segundo usuário de B, sem convite vigente — a prova de escrita em nome
-- de B usa este, para que só a RLS do próprio convite entre em jogo (o
-- primeiro já tem convite_vigente_unico ocupado por causa do setup acima).
INSERT INTO identidade.usuario (id, instituicao_id, nome, email, situacao)
  VALUES ('b1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000000',
          'Usuário B (sem convite)', 'usuario2@casab.example', 'ATIVO');
INSERT INTO identidade.grupo (id, instituicao_id, nome)
  VALUES ('b2000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000000', 'Grupo B');
INSERT INTO identidade.convite (instituicao_id, usuario_id, token_sha256, expira_em, criado_por)
  VALUES ('b0000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000000',
          '\xb0b0b0', now() + interval '2 days', gen_random_uuid());
INSERT INTO identidade.registro_de_auditoria (instituicao_id, autor_usuario_id, autor_grupos, operacao, agregado_tipo, agregado_id)
  VALUES ('b0000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000000',
          ARRAY['ADMINISTRADOR'], 'USUARIO_ATIVADO', 'Usuario', 'b1000000-0000-0000-0000-000000000000');
INSERT INTO shared.chave_de_idempotencia (instituicao_id, chave, rota, status_http, resposta)
  VALUES ('b0000000-0000-0000-0000-000000000000', 'chave-b', '/qualquer', 200, '{}'::jsonb);
INSERT INTO identidade.grupo_permissao (instituicao_id, grupo_id, permissao)
  VALUES ('b0000000-0000-0000-0000-000000000000', 'b2000000-0000-0000-0000-000000000000', 'sistema.usuario.gerenciar');
INSERT INTO identidade.usuario_grupo (instituicao_id, usuario_id, grupo_id, atribuido_por)
  VALUES ('b0000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000000',
          'b2000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000000');

-- Cadastro de A.
SELECT set_config('app.instituicao_id', 'a0000000-0000-0000-0000-000000000000', false);
INSERT INTO identidade.usuario (id, instituicao_id, nome, email, situacao)
  VALUES ('a1000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000',
          'Usuário A', 'usuario@casaa.example', 'ATIVO');
INSERT INTO identidade.grupo (id, instituicao_id, nome)
  VALUES ('a2000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'Grupo A');
INSERT INTO identidade.convite (instituicao_id, usuario_id, token_sha256, expira_em, criado_por)
  VALUES ('a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000',
          '\xa0a0a0', now() + interval '2 days', gen_random_uuid());
INSERT INTO identidade.registro_de_auditoria (instituicao_id, autor_usuario_id, autor_grupos, operacao, agregado_tipo, agregado_id)
  VALUES ('a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000',
          ARRAY['ADMINISTRADOR'], 'USUARIO_ATIVADO', 'Usuario', 'a1000000-0000-0000-0000-000000000000');
INSERT INTO shared.chave_de_idempotencia (instituicao_id, chave, rota, status_http, resposta)
  VALUES ('a0000000-0000-0000-0000-000000000000', 'chave-a', '/qualquer', 200, '{}'::jsonb);
INSERT INTO identidade.grupo_permissao (instituicao_id, grupo_id, permissao)
  VALUES ('a0000000-0000-0000-0000-000000000000', 'a2000000-0000-0000-0000-000000000000', 'sistema.usuario.gerenciar');
INSERT INTO identidade.usuario_grupo (instituicao_id, usuario_id, grupo_id, atribuido_por)
  VALUES ('a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000',
          'a2000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000');

-- ---------------------------------------------------------------------------
-- A enxerga só o próprio cadastro.
-- ---------------------------------------------------------------------------

SELECT verif.confere('isolamento · A enxerga só o próprio usuario', (SELECT count(*) FROM identidade.usuario), 1::bigint);
SELECT verif.confere('isolamento · A enxerga só o próprio grupo', (SELECT count(*) FROM identidade.grupo), 1::bigint);
SELECT verif.confere('isolamento · A enxerga só o próprio convite', (SELECT count(*) FROM identidade.convite), 1::bigint);
SELECT verif.confere('isolamento · A enxerga só a própria trilha de auditoria',
  (SELECT count(*) FROM identidade.registro_de_auditoria), 1::bigint);
SELECT verif.confere('isolamento · A enxerga só a própria chave de idempotência',
  (SELECT count(*) FROM shared.chave_de_idempotencia), 1::bigint);
SELECT verif.confere('isolamento · A enxerga só a própria grupo_permissao', (SELECT count(*) FROM identidade.grupo_permissao), 1::bigint);
SELECT verif.confere('isolamento · A enxerga só o próprio usuario_grupo', (SELECT count(*) FROM identidade.usuario_grupo), 1::bigint);

-- ---------------------------------------------------------------------------
-- Fail-closed: sem app.instituicao_id, nenhuma linha de tabela nenhuma.
-- ---------------------------------------------------------------------------

SELECT set_config('app.instituicao_id', '', false);

SELECT verif.confere('fail-closed · sem contexto, usuario fechado', (SELECT count(*) FROM identidade.usuario), 0::bigint);
SELECT verif.confere('fail-closed · sem contexto, grupo fechado', (SELECT count(*) FROM identidade.grupo), 0::bigint);
SELECT verif.confere('fail-closed · sem contexto, convite fechado', (SELECT count(*) FROM identidade.convite), 0::bigint);
SELECT verif.confere('fail-closed · sem contexto, trilha de auditoria fechada',
  (SELECT count(*) FROM identidade.registro_de_auditoria), 0::bigint);
SELECT verif.confere('fail-closed · sem contexto, chave de idempotência fechada',
  (SELECT count(*) FROM shared.chave_de_idempotencia), 0::bigint);
SELECT verif.confere('fail-closed · sem contexto, grupo_permissao fechada', (SELECT count(*) FROM identidade.grupo_permissao), 0::bigint);
SELECT verif.confere('fail-closed · sem contexto, usuario_grupo fechado', (SELECT count(*) FROM identidade.usuario_grupo), 0::bigint);

SELECT set_config('app.instituicao_id', 'a0000000-0000-0000-0000-000000000000', false);

-- ---------------------------------------------------------------------------
-- A não grava linha em nome de B, mesmo sabendo o id de B.
-- ---------------------------------------------------------------------------

SELECT verif.espera_erro('isolamento · A não grava usuario em nome de B', $$
  INSERT INTO identidade.usuario (instituicao_id, nome, email, situacao)
    VALUES ('b0000000-0000-0000-0000-000000000000', 'Invasor', 'invasor@casaa.example', 'ATIVO')
$$, '42501');

SELECT verif.espera_erro('isolamento · A não grava grupo em nome de B', $$
  INSERT INTO identidade.grupo (instituicao_id, nome)
    VALUES ('b0000000-0000-0000-0000-000000000000', 'Grupo invasor')
$$, '42501');

SELECT verif.espera_erro('isolamento · A não grava chave de idempotência em nome de B', $$
  INSERT INTO shared.chave_de_idempotencia (instituicao_id, chave, rota, status_http, resposta)
    VALUES ('b0000000-0000-0000-0000-000000000000', 'chave-invasora', '/x', 200, '{}'::jsonb)
$$, '42501');

-- As quatro a seguir referenciam tuplas REAIS de B (grupo_id/usuario_id que
-- existem de verdade em B) para que só a RLS da própria tabela impeça a
-- escrita — nenhuma FK entra no caminho para explicar o bloqueio.
SELECT verif.espera_erro('isolamento · A não grava grupo_permissao em nome de B', $$
  INSERT INTO identidade.grupo_permissao (instituicao_id, grupo_id, permissao)
    VALUES ('b0000000-0000-0000-0000-000000000000', 'b2000000-0000-0000-0000-000000000000', 'sistema.grupo.gerenciar')
$$, '42501');

-- Usa o segundo usuário de B (sem linha de usuario_grupo no setup): com o
-- primeiro, a tupla (usuario_id, grupo_id) repetiria a PK do setup (linhas
-- 35-37), e a violação de 23505 apareceria antes da RLS entrar em jogo — o
-- ataque reprovaria por PK duplicada, não pela política.
SELECT verif.espera_erro('isolamento · A não grava usuario_grupo em nome de B', $$
  INSERT INTO identidade.usuario_grupo (instituicao_id, usuario_id, grupo_id, atribuido_por)
    VALUES ('b0000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000002',
            'b2000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000000')
$$, '42501');

SELECT verif.espera_erro('isolamento · A não grava convite em nome de B (mesmo referenciando usuário real de B, sem convite vigente)', $$
  INSERT INTO identidade.convite (instituicao_id, usuario_id, token_sha256, expira_em, criado_por)
    VALUES ('b0000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000002',
            '\xc1c1c1', now() + interval '2 days', gen_random_uuid())
$$, '42501');

SELECT verif.espera_erro('isolamento · A não grava trilha de auditoria em nome de B', $$
  INSERT INTO identidade.registro_de_auditoria (instituicao_id, autor_usuario_id, autor_grupos, operacao, agregado_tipo, agregado_id)
    VALUES ('b0000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000000',
            ARRAY['ADMINISTRADOR'], 'USUARIO_ATIVADO', 'Usuario', 'b1000000-0000-0000-0000-000000000000')
$$, '42501');

-- FK composta: convite.usuario_id aponta para (instituicao_id, id) de
-- identidade.usuario — A não referencia o usuário de B, mesmo declarando o
-- convite como sendo de A (não é sequer questão de RLS: a tupla não existe).
SELECT verif.espera_erro('isolamento · convite não referencia usuário de outra casa (FK composta)', $$
  INSERT INTO identidade.convite (instituicao_id, usuario_id, token_sha256, expira_em, criado_por)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000000',
            '\xc0c0c0', now() + interval '2 days', gen_random_uuid())
$$, 'convite_instituicao_id_fkey|violates foreign key constraint');

RESET ROLE;
