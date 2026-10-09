-- verificacoes: 27
-- B0 · resolvedor do convite (Documento 7 §8): identidade.resolver_convite(hash)
-- descobre a instituição e o usuário do convite sem instituição no contexto,
-- e só isso. Molde de 02-resolvedor-de-identidade.sql.

-- -----------------------------------------------------------------------------
-- Estrutural — como dono, porque lê o catálogo.
-- -----------------------------------------------------------------------------

SELECT verif.confere('resolvedor de convite · o dono é cdd_resolvedor_identidade',
  (SELECT r.rolname FROM pg_proc p JOIN pg_roles r ON r.oid = p.proowner
    WHERE p.oid = 'identidade.resolver_convite(bytea)'::regprocedure), 'cdd_resolvedor_identidade'::name);

SELECT verif.confere('resolvedor de convite · o dono não é superusuário nem ignora RLS',
  (SELECT r.rolsuper OR r.rolbypassrls FROM pg_proc p JOIN pg_roles r ON r.oid = p.proowner
    WHERE p.oid = 'identidade.resolver_convite(bytea)'::regprocedure), false);

SELECT verif.confere('resolvedor de convite · é SECURITY DEFINER',
  (SELECT prosecdef FROM pg_proc WHERE oid = 'identidade.resolver_convite(bytea)'::regprocedure), true);

SELECT verif.confere('resolvedor de convite · roda com search_path fixo (sem sequestro por schema hostil)',
  (SELECT proconfig FROM pg_proc WHERE oid = 'identidade.resolver_convite(bytea)'::regprocedure),
  ARRAY['search_path=pg_catalog']);

SELECT verif.confere('resolvedor de convite · função sem EXECUTE para PUBLIC',
  has_function_privilege('public', 'identidade.resolver_convite(bytea)', 'EXECUTE'), false);

SELECT verif.confere('resolvedor de convite · cdd_app executa a função',
  has_function_privilege('cdd_app', 'identidade.resolver_convite(bytea)', 'EXECUTE'), true);

SELECT verif.confere('resolvedor de convite · só lê as três colunas liberadas de identidade.convite',
  (SELECT array_agg(a.attname ORDER BY a.attname) FROM pg_attribute a
    WHERE a.attrelid = 'identidade.convite'::regclass
      AND a.attnum > 0 AND NOT a.attisdropped
      AND has_column_privilege('cdd_resolvedor_identidade', 'identidade.convite', a.attname, 'SELECT')),
  ARRAY['instituicao_id', 'token_sha256', 'usuario_id']::name[]);

SELECT verif.confere('resolvedor de convite · o papel não escreve em identidade.convite',
  (SELECT count(*) FROM unnest(ARRAY['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) AS p(privilegio)
    WHERE has_table_privilege('cdd_resolvedor_identidade', 'identidade.convite', p.privilegio)),
  0::bigint);

SELECT verif.confere('resolvedor de convite · o papel não cria objeto no schema identidade',
  has_schema_privilege('cdd_resolvedor_identidade', 'identidade', 'CREATE'), false);

SELECT verif.confere('resolvedor de convite · a política de leitura total é só do resolvedor',
  (SELECT array_agg(r.rolname) FROM pg_policy p JOIN pg_roles r ON r.oid = ANY (p.polroles)
    WHERE p.polrelid = 'identidade.convite'::regclass AND p.polname = 'resolucao_do_convite'),
  ARRAY['cdd_resolvedor_identidade']::name[]);

SELECT verif.confere('resolvedor de convite · a política é de SELECT',
  (SELECT polcmd FROM pg_policy
    WHERE polrelid = 'identidade.convite'::regclass AND polname = 'resolucao_do_convite'),
  'r'::"char");

SELECT verif.confere('resolvedor de convite · cdd_app não é membro do papel, nem por ponte',
  pg_has_role('cdd_app', 'cdd_resolvedor_identidade', 'MEMBER'), false);

SELECT verif.confere('resolvedor de convite · cdd_app não ganhou privilégio novo em identidade.convite',
  (SELECT string_agg(p.privilegio, ',' ORDER BY p.privilegio)
     FROM unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) AS p(privilegio)
    WHERE has_table_privilege('cdd_app', 'identidade.convite', p.privilegio)),
  'DELETE,INSERT,SELECT,UPDATE');

-- -----------------------------------------------------------------------------
-- Comportamental — como cdd_app.
-- -----------------------------------------------------------------------------

SET ROLE cdd_app;

INSERT INTO shared.instituicao (id, nome) VALUES
  ('a0000000-0000-0000-0000-000000000000', 'Casa A'),
  ('b0000000-0000-0000-0000-000000000000', 'Casa B');

SELECT set_config('app.instituicao_id', 'a0000000-0000-0000-0000-000000000000', false);
INSERT INTO identidade.usuario (id, instituicao_id, nome, email, situacao) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'Aline', 'aline@casaa.example', 'CONVITE_PENDENTE'),
  ('a1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000', 'Bruno', 'bruno@casaa.example', 'CONVITE_PENDENTE'),
  ('a1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000000', 'Carla', 'carla@casaa.example', 'CONVITE_PENDENTE');
INSERT INTO identidade.convite (usuario_id, instituicao_id, token_sha256, expira_em, usado_em, revogado_em, criado_por) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', sha256('vigente'),
   now() + interval '72 hours', NULL, NULL, 'a1000000-0000-0000-0000-000000000001'),
  ('a1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000', sha256('expirado'),
   now() - interval '1 hour', NULL, NULL, 'a1000000-0000-0000-0000-000000000001'),
  ('a1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000000', sha256('usado'),
   now() + interval '72 hours', now(), NULL, 'a1000000-0000-0000-0000-000000000001');

SELECT set_config('app.instituicao_id', 'b0000000-0000-0000-0000-000000000000', false);
INSERT INTO identidade.usuario (id, instituicao_id, nome, email, situacao) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000000', 'Diego', 'diego@casab.example', 'CONVITE_PENDENTE');
INSERT INTO identidade.convite (usuario_id, instituicao_id, token_sha256, expira_em, criado_por) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000000', sha256('da-casa-b'),
   now() + interval '72 hours', 'b1000000-0000-0000-0000-000000000001');

SELECT set_config('app.instituicao_id', '', false);

SELECT verif.confere('resolvedor de convite · sem contexto, identidade.convite continua fechada para cdd_app',
  (SELECT count(*) FROM identidade.convite), 0::bigint);

SELECT verif.confere('resolvedor de convite · resolve exatamente uma linha para o hash vigente',
  (SELECT count(*) FROM identidade.resolver_convite(sha256('vigente'))), 1::bigint);

SELECT verif.confere('resolvedor de convite · devolve a instituição certa',
  (SELECT instituicao_id FROM identidade.resolver_convite(sha256('vigente'))),
  'a0000000-0000-0000-0000-000000000000'::uuid);

SELECT verif.confere('resolvedor de convite · devolve o usuário certo',
  (SELECT usuario_id FROM identidade.resolver_convite(sha256('vigente'))),
  'a1000000-0000-0000-0000-000000000001'::uuid);

SELECT verif.confere('resolvedor de convite · devolve só instituição e usuário, nenhuma coluna a mais',
  pg_get_function_result('identidade.resolver_convite(bytea)'::regprocedure),
  'TABLE(instituicao_id uuid, usuario_id uuid)');

SELECT verif.confere('resolvedor de convite · hash inexistente não resolve (zero linhas)',
  (SELECT count(*) FROM identidade.resolver_convite(sha256('nao-existe'))), 0::bigint);

SELECT verif.confere('resolvedor de convite · hash nulo não resolve',
  (SELECT count(*) FROM identidade.resolver_convite(NULL)), 0::bigint);

SELECT verif.confere('resolvedor de convite · hash vazio não resolve',
  (SELECT count(*) FROM identidade.resolver_convite('\x'::bytea)), 0::bigint);

SELECT verif.confere('resolvedor de convite · prefixo do hash não resolve (sem busca parcial)',
  (SELECT count(*) FROM identidade.resolver_convite(substring(sha256('vigente') FROM 1 FOR 16))), 0::bigint);

SELECT verif.confere('resolvedor de convite · convite expirado só devolve o dono; a validade é do domínio',
  (SELECT usuario_id FROM identidade.resolver_convite(sha256('expirado'))),
  'a1000000-0000-0000-0000-000000000002'::uuid);

SELECT verif.confere('resolvedor de convite · convite usado só devolve o dono; a validade é do domínio',
  (SELECT usuario_id FROM identidade.resolver_convite(sha256('usado'))),
  'a1000000-0000-0000-0000-000000000003'::uuid);

-- Com a casa B no contexto (outra casa autenticada), o hash da casa A segue
-- devolvendo só a casa A, e a tabela continua mostrando só as linhas de B.
SELECT set_config('app.instituicao_id', 'b0000000-0000-0000-0000-000000000000', false);

SELECT verif.confere('resolvedor de convite · hash da casa A, com a casa B no contexto, devolve a casa A',
  (SELECT instituicao_id FROM identidade.resolver_convite(sha256('vigente'))),
  'a0000000-0000-0000-0000-000000000000'::uuid);

SELECT verif.confere('resolvedor de convite · com a casa B no contexto, a tabela mostra só o convite de B',
  (SELECT count(*) FROM identidade.convite), 1::bigint);

SELECT verif.confere('resolvedor de convite · hash da casa B, com a casa B no contexto, devolve a casa B',
  (SELECT instituicao_id FROM identidade.resolver_convite(sha256('da-casa-b'))),
  'b0000000-0000-0000-0000-000000000000'::uuid);

RESET ROLE;
