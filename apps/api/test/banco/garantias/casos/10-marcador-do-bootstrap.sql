-- verificacoes: 9
-- B0 · marcador do bootstrap da identidade: fora do isolamento por instituição
-- (sem RLS e sem coluna instituicao_id), linha única e privilégio mínimo.

SELECT verif.confere('marcador do bootstrap · não tem coluna instituicao_id',
  EXISTS (SELECT 1 FROM pg_attribute
           WHERE attrelid = 'identidade.bootstrap_executado'::regclass
             AND attname = 'instituicao_id' AND NOT attisdropped), false);

SELECT verif.confere('marcador do bootstrap · não tem RLS',
  (SELECT relrowsecurity OR relforcerowsecurity FROM pg_class WHERE oid = 'identidade.bootstrap_executado'::regclass),
  false);

SELECT verif.confere('marcador do bootstrap · cdd_app é só SELECT, INSERT',
  verif.privilegios_de_tabela('cdd_app', 'identidade.bootstrap_executado'),
  ARRAY['INSERT','SELECT']);

SET ROLE cdd_app;

SELECT verif.espera_erro('marcador do bootstrap · id falso é recusado pelo CHECK', $$
  INSERT INTO identidade.bootstrap_executado (id, criado_em, admin_usuario_id)
    VALUES (false, now(), gen_random_uuid())
$$, '23514');

SELECT verif.espera_ok('marcador do bootstrap · cdd_app grava a linha única', $$
  INSERT INTO identidade.bootstrap_executado (criado_em, admin_usuario_id) VALUES (now(), gen_random_uuid())
$$);

SELECT verif.espera_erro('marcador do bootstrap · segunda linha é recusada pela chave primária', $$
  INSERT INTO identidade.bootstrap_executado (criado_em, admin_usuario_id) VALUES (now(), gen_random_uuid())
$$, '23505');

SELECT verif.espera_erro('marcador do bootstrap · UPDATE como cdd_app é negado', $$
  UPDATE identidade.bootstrap_executado SET admin_usuario_id = gen_random_uuid()
$$, '42501');

SELECT verif.espera_erro('marcador do bootstrap · DELETE como cdd_app é negado', $$
  DELETE FROM identidade.bootstrap_executado
$$, '42501');

SELECT verif.confere('marcador do bootstrap · cdd_app sem contexto de instituição enxerga a linha única',
  (SELECT count(*) FROM identidade.bootstrap_executado), 1::bigint);

RESET ROLE;
