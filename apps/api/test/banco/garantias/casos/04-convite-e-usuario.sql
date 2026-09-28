-- verificacoes: 18
-- B0 · guardas mínimas de forma em identidade.usuario, identidade.convite e
-- identidade.registro_de_auditoria (Documento 7 §15): US2, convite de uso
-- único (com reenvio), convite não usado-e-revogado ao mesmo tempo, e ator
-- coerente da trilha.

INSERT INTO shared.instituicao (id, nome) VALUES ('a0000000-0000-0000-0000-000000000000', 'Casa A');

SET ROLE cdd_app;
SELECT set_config('app.instituicao_id', 'a0000000-0000-0000-0000-000000000000', false);

-- ---------------------------------------------------------------------------
-- usuario_email_unico: e-mail é único por instituição, sem diferenciar caixa.
-- ---------------------------------------------------------------------------

INSERT INTO identidade.usuario (id, instituicao_id, nome, email, situacao)
  VALUES ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000',
          'Aline', 'aline@casaa.example', 'ATIVO');

SELECT verif.espera_erro('usuario_email_unico · mesmo e-mail, outra caixa, mesma instituição', $$
  INSERT INTO identidade.usuario (instituicao_id, nome, email, situacao)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'Aline (duplicada)', 'ALINE@CASAA.EXAMPLE', 'CONVITE_PENDENTE')
$$, 'usuario_email_unico');

-- ---------------------------------------------------------------------------
-- US2 (usuario_pessoa_unica): a mesma pessoa não é duas contas na mesma casa.
-- Índice parcial: pessoa_id NULL não colide (convite ainda sem vínculo).
-- ---------------------------------------------------------------------------

INSERT INTO identidade.usuario (id, instituicao_id, pessoa_id, nome, email, situacao)
  VALUES ('a1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000',
          'd1000000-0000-0000-0000-000000000001', 'Bruno', 'bruno@casaa.example', 'ATIVO');

SELECT verif.espera_erro('US2 · a mesma pessoa não é duas contas na mesma casa', $$
  INSERT INTO identidade.usuario (instituicao_id, pessoa_id, nome, email, situacao)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'd1000000-0000-0000-0000-000000000001',
            'Bruno (duplicado)', 'bruno2@casaa.example', 'CONVITE_PENDENTE')
$$, 'usuario_pessoa_unica');

SELECT verif.espera_ok('US2 · dois usuários com pessoa_id NULL não colidem (índice parcial)', $$
  INSERT INTO identidade.usuario (instituicao_id, nome, email, situacao)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'Carla', 'carla@casaa.example', 'CONVITE_PENDENTE')
$$);

-- ---------------------------------------------------------------------------
-- grupo_nome_unico: nome de grupo é único por instituição, sem diferenciar
-- caixa (mesmo padrão de usuario_email_unico).
-- ---------------------------------------------------------------------------

INSERT INTO identidade.grupo (id, instituicao_id, nome)
  VALUES ('a3000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'Tesouraria');

SELECT verif.espera_erro('grupo_nome_unico · mesmo nome, outra caixa, mesma instituição', $$
  INSERT INTO identidade.grupo (instituicao_id, nome)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'TESOURARIA')
$$, 'grupo_nome_unico');

-- ---------------------------------------------------------------------------
-- chave_de_idempotencia (PK): a chave (Idempotency-Key) é única por
-- instituição.
-- ---------------------------------------------------------------------------

INSERT INTO shared.chave_de_idempotencia (instituicao_id, chave, rota, status_http, resposta)
  VALUES ('a0000000-0000-0000-0000-000000000000', 'chave-repetida', '/x', 200, '{}'::jsonb);

SELECT verif.espera_erro('chave_de_idempotencia (PK) · mesma chave, mesma instituição, não duplica', $$
  INSERT INTO shared.chave_de_idempotencia (instituicao_id, chave, rota, status_http, resposta)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'chave-repetida', '/y', 200, '{}'::jsonb)
$$, 'chave_de_idempotencia_pkey|duplicate key');

-- ---------------------------------------------------------------------------
-- Convite de uso único: no máximo um convite vigente por usuário; reenvio é
-- revogar o antigo e criar outro — nunca os dois vigentes ao mesmo tempo.
-- ---------------------------------------------------------------------------

INSERT INTO identidade.convite (id, instituicao_id, usuario_id, token_sha256, expira_em, criado_por)
  VALUES ('c1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000',
          'a1000000-0000-0000-0000-000000000002', '\xc00001', now() + interval '2 days', gen_random_uuid());

SELECT verif.espera_erro('convite_vigente_unico · não cria um segundo convite vigente sem revogar o primeiro', $$
  INSERT INTO identidade.convite (instituicao_id, usuario_id, token_sha256, expira_em, criado_por)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000002',
            '\xc00002', now() + interval '2 days', gen_random_uuid())
$$, 'convite_vigente_unico');

-- Reenvio de verdade: revoga o vigente, e só então o segundo cabe.
UPDATE identidade.convite SET revogado_em = now() WHERE id = 'c1000000-0000-0000-0000-000000000001';

SELECT verif.espera_ok('convite_vigente_unico · reenvio (revoga o antigo, cria outro) é permitido', $$
  INSERT INTO identidade.convite (id, instituicao_id, usuario_id, token_sha256, expira_em, criado_por)
    VALUES ('c1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000',
            'a1000000-0000-0000-0000-000000000002', '\xc00002', now() + interval '2 days', gen_random_uuid())
$$);

-- convite_nao_usado_e_revogado: usado e revogado nunca ao mesmo tempo.
SELECT verif.espera_erro('convite_nao_usado_e_revogado · usado e revogado não coexistem', $$
  UPDATE identidade.convite SET usado_em = now(), revogado_em = now()
    WHERE id = 'c1000000-0000-0000-0000-000000000002'
$$, 'convite_nao_usado_e_revogado');

-- Convite usado (sem revogar) resolve normalmente.
SELECT verif.espera_ok('convite usado (sem revogado_em) é uma escrita válida', $$
  UPDATE identidade.convite SET usado_em = now() WHERE id = 'c1000000-0000-0000-0000-000000000002'
$$);

-- convite_vigente_unico exclui usado_em, não só revogado_em: um convite já
-- usado (mas não revogado) não é "vigente", e não bloqueia um novo convite
-- para o mesmo usuário — sem precisar revogar o que já foi usado.
SELECT verif.espera_ok('convite_vigente_unico · convite usado (não revogado) não bloqueia um novo convite para o mesmo usuário', $$
  INSERT INTO identidade.convite (instituicao_id, usuario_id, token_sha256, expira_em, criado_por)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000002',
            '\xc00004', now() + interval '2 days', gen_random_uuid())
$$);

-- Convite revogado (sem uso) — outro convite, para não colidir com o já usado.
INSERT INTO identidade.convite (id, instituicao_id, usuario_id, token_sha256, expira_em, criado_por)
  VALUES ('c1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000000',
          'a1000000-0000-0000-0000-000000000001', '\xc00003', now() + interval '2 days', gen_random_uuid());
SELECT verif.espera_ok('convite revogado (sem usado_em) é uma escrita válida', $$
  UPDATE identidade.convite SET revogado_em = now() WHERE id = 'c1000000-0000-0000-0000-000000000003'
$$);

-- ---------------------------------------------------------------------------
-- autor_coerente: autor_tipo = 'USUARIO' ⇔ autor_usuario_id preenchido.
-- ---------------------------------------------------------------------------

SELECT verif.espera_erro('autor_coerente · SISTEMA com autor_usuario_id preenchido é incoerente', $$
  INSERT INTO identidade.registro_de_auditoria (instituicao_id, autor_tipo, autor_usuario_id, autor_grupos, operacao, agregado_tipo, agregado_id)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'SISTEMA', 'a1000000-0000-0000-0000-000000000001',
            ARRAY[]::text[], 'PERIODO_FECHADO', 'PeriodoContabil', gen_random_uuid())
$$, 'autor_coerente');

SELECT verif.espera_erro('autor_coerente · USUARIO sem autor_usuario_id é incoerente', $$
  INSERT INTO identidade.registro_de_auditoria (instituicao_id, autor_tipo, autor_grupos, operacao, agregado_tipo, agregado_id)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'USUARIO',
            ARRAY['ADMINISTRADOR'], 'USUARIO_ATIVADO', 'Usuario', gen_random_uuid())
$$, 'autor_coerente');

SELECT verif.espera_ok('autor_coerente · SISTEMA sem autor_usuario_id é coerente (despachante audita assim)', $$
  INSERT INTO identidade.registro_de_auditoria (instituicao_id, autor_tipo, autor_grupos, operacao, agregado_tipo, agregado_id)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'SISTEMA',
            ARRAY[]::text[], 'PERIODO_FECHADO', 'PeriodoContabil', gen_random_uuid())
$$);

-- ---------------------------------------------------------------------------
-- Unicidade é por casa, não global: o MESMO valor, em outra instituição, não
-- colide — senão a chave estaria faltando instituicao_id (não teria índice
-- de sobra para examinar, teria índice de menos).
-- ---------------------------------------------------------------------------

INSERT INTO shared.instituicao (id, nome) VALUES ('b0000000-0000-0000-0000-000000000000', 'Casa B');
SELECT set_config('app.instituicao_id', 'b0000000-0000-0000-0000-000000000000', false);

SELECT verif.espera_ok('usuario_email_unico · o mesmo e-mail em outra instituição não colide', $$
  INSERT INTO identidade.usuario (instituicao_id, nome, email, situacao)
    VALUES ('b0000000-0000-0000-0000-000000000000', 'Aline (Casa B)', 'aline@casaa.example', 'ATIVO')
$$);

SELECT verif.espera_ok('usuario_pessoa_unica · a mesma pessoa em outra instituição não colide', $$
  INSERT INTO identidade.usuario (instituicao_id, pessoa_id, nome, email, situacao)
    VALUES ('b0000000-0000-0000-0000-000000000000', 'd1000000-0000-0000-0000-000000000001',
            'Bruno (Casa B)', 'bruno@casab.example', 'ATIVO')
$$);

SELECT verif.espera_ok('grupo_nome_unico · o mesmo nome em outra instituição não colide', $$
  INSERT INTO identidade.grupo (instituicao_id, nome)
    VALUES ('b0000000-0000-0000-0000-000000000000', 'Tesouraria')
$$);

SELECT verif.espera_ok('chave_de_idempotencia (PK) · a mesma chave em outra instituição não colide', $$
  INSERT INTO shared.chave_de_idempotencia (instituicao_id, chave, rota, status_http, resposta)
    VALUES ('b0000000-0000-0000-0000-000000000000', 'chave-repetida', '/z', 200, '{}'::jsonb)
$$);

RESET ROLE;
