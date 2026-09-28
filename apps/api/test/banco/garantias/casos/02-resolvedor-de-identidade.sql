-- verificacoes: 14
-- B0 · resolvedor do sujeito autenticado (Documento 7 §7.1, §8):
-- identidade.resolver_sujeito(subject_id) resolve o `sub` do Keycloak sem
-- instituição no contexto ainda, e só isso.

-- -----------------------------------------------------------------------------
-- Estrutural — como dono, porque lê o catálogo.
-- -----------------------------------------------------------------------------

SELECT verif.confere('resolvedor de identidade · o dono não é superusuário nem ignora RLS',
  (SELECT r.rolsuper OR r.rolbypassrls FROM pg_proc p JOIN pg_roles r ON r.oid = p.proowner
    WHERE p.oid = 'identidade.resolver_sujeito(text)'::regprocedure), false);

SELECT verif.confere('resolvedor de identidade · roda com search_path fixo (sem sequestro por schema hostil)',
  (SELECT proconfig FROM pg_proc WHERE oid = 'identidade.resolver_sujeito(text)'::regprocedure),
  ARRAY['search_path=pg_catalog']);

SELECT verif.confere('resolvedor de identidade · função sem EXECUTE para PUBLIC',
  has_function_privilege('public', 'identidade.resolver_sujeito(text)', 'EXECUTE'), false);

SELECT verif.confere('resolvedor de identidade · só lê as três colunas liberadas de identidade.usuario',
  (SELECT count(*) FROM pg_attribute a
    WHERE a.attrelid = 'identidade.usuario'::regclass
      AND a.attnum > 0 AND NOT a.attisdropped
      AND a.attname NOT IN ('id', 'instituicao_id', 'subject_id')
      AND has_column_privilege('cdd_resolvedor_identidade', 'identidade.usuario', a.attname, 'SELECT')),
  0::bigint);

-- cdd_app não pode assumir o resolvedor por SET ROLE — nem direto, nem por
-- uma ponte de papel intermediário (Documento 7 §8).
SELECT verif.confere('resolvedor de identidade · cdd_app não é membro do papel, nem por ponte',
  pg_has_role('cdd_app', 'cdd_resolvedor_identidade', 'MEMBER'), false);

-- cdd_owner é membro dos três papéis (para rodar migration, inclusive o
-- ALTER FUNCTION ... OWNER TO), mas com INHERIT FALSE (infra/postgres/
-- papeis.sql): sem SET ROLE explícito, cdd_owner não herda o privilégio de
-- ler o `sub`/o link de qualquer instituição. pg_has_role(...,'USAGE') dá
-- true se a herança valeria automaticamente — é o que INHERIT TRUE ligaria.
SELECT verif.confere('resolvedor de identidade · cdd_owner não herda automaticamente cdd_resolvedor_identidade (INHERIT FALSE)',
  pg_has_role('cdd_owner', 'cdd_resolvedor_identidade', 'USAGE'), false);

SELECT verif.confere('resolvedor de identidade · cdd_owner não herda automaticamente cdd_resolvedor_link (INHERIT FALSE)',
  pg_has_role('cdd_owner', 'cdd_resolvedor_link', 'USAGE'), false);

SELECT verif.confere('resolvedor de identidade · cdd_owner não herda automaticamente cdd_app (INHERIT FALSE)',
  pg_has_role('cdd_owner', 'cdd_app', 'USAGE'), false);

-- -----------------------------------------------------------------------------
-- Comportamental — como cdd_app, sem contexto de instituição nenhum.
-- -----------------------------------------------------------------------------

SET ROLE cdd_app;

INSERT INTO shared.instituicao (id, nome) VALUES ('a0000000-0000-0000-0000-000000000000', 'Casa A');

SELECT set_config('app.instituicao_id', 'a0000000-0000-0000-0000-000000000000', false);
INSERT INTO identidade.usuario (id, instituicao_id, subject_id, nome, email, situacao)
  VALUES ('a1000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000',
          'kc-sub-aline', 'Aline', 'aline@casaa.example', 'ATIVO');

-- Sem instituição no contexto — é assim que o resolvedor é chamado de verdade
-- (o sub chega antes de se saber a casa).
SELECT set_config('app.instituicao_id', '', false);

SELECT verif.confere('resolvedor de identidade · sem contexto, identidade.usuario continua fechada',
  (SELECT count(*) FROM identidade.usuario), 0::bigint);

SELECT verif.confere('resolvedor de identidade · resolve exatamente uma linha para o sub conhecido',
  (SELECT count(*) FROM identidade.resolver_sujeito('kc-sub-aline')), 1::bigint);

SELECT verif.confere('resolvedor de identidade · devolve a instituição certa',
  (SELECT instituicao_id FROM identidade.resolver_sujeito('kc-sub-aline')),
  'a0000000-0000-0000-0000-000000000000'::uuid);

SELECT verif.confere('resolvedor de identidade · devolve o usuário certo',
  (SELECT usuario_id FROM identidade.resolver_sujeito('kc-sub-aline')),
  'a1000000-0000-0000-0000-000000000000'::uuid);

SELECT verif.confere('resolvedor de identidade · sub desconhecido não resolve (zero linhas)',
  (SELECT count(*) FROM identidade.resolver_sujeito('sub-que-nao-existe')), 0::bigint);

RESET ROLE;

-- O mesmo sub não existe em duas casas (UNIQUE (subject_id), sem qualificar
-- por instituição — é uma coluna global, não um índice composto).
-- Contexto em B (não vazio): senão o próprio fail-closed da RLS barraria o
-- INSERT antes de chegar à constraint única que este caso quer provar.
INSERT INTO shared.instituicao (id, nome) VALUES ('b0000000-0000-0000-0000-000000000000', 'Casa B');
SELECT set_config('app.instituicao_id', 'b0000000-0000-0000-0000-000000000000', false);
SELECT verif.espera_erro('identidade.usuario · o mesmo sub não existe em duas casas', $$
  INSERT INTO identidade.usuario (instituicao_id, subject_id, nome, email, situacao)
    VALUES ('b0000000-0000-0000-0000-000000000000', 'kc-sub-aline', 'Aline 2', 'aline2@casab.example', 'ATIVO')
$$, 'usuario_subject_id_key|duplicate key');
