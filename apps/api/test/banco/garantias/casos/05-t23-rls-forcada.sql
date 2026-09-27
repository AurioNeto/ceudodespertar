-- T23 (Doc 3 §11.4, Documento 7 §15/§22): toda tabela com `instituicao_id`
-- em `shared` e `identidade` tem RLS habilitada e FORÇADA, e a política
-- `isolamento_por_instituicao` com a expressão certa — exceto `shared.outbox`,
-- a única exceção documentada no B0. Roda como dono, porque lê o catálogo.

SELECT verif.confere('T23 · nenhuma tabela com instituicao_id fica sem RLS forçada',
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND n.nspname IN ('shared','identidade','pessoas','financeiro','eventos','estoque')
      AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = c.oid AND a.attname = 'instituicao_id')
      AND NOT (c.relrowsecurity AND c.relforcerowsecurity)
      AND (n.nspname, c.relname) <> ('shared','outbox')), 0::bigint);

SELECT verif.confere('T23 · shared.outbox é a única tabela com instituicao_id sem RLS',
  (SELECT c.relrowsecurity OR c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'shared' AND c.relname = 'outbox'), false);

-- Cada tabela do B0, nomeada, com RLS+FORCE e a política certa (não só a
-- existência dela pelo nome — a expressão do USING/WITH CHECK também).
SELECT verif.confere('T23 · identidade.usuario tem RLS forçada e a política de isolamento',
  (SELECT count(*) FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'identidade' AND c.relname = 'usuario' AND p.polname = 'isolamento_por_instituicao'
      AND pg_get_expr(p.polqual, p.polrelid) = '(instituicao_id = shared.instituicao_atual())'), 1::bigint);

SELECT verif.confere('T23 · identidade.grupo tem RLS forçada e a política de isolamento',
  (SELECT count(*) FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'identidade' AND c.relname = 'grupo' AND p.polname = 'isolamento_por_instituicao'
      AND pg_get_expr(p.polqual, p.polrelid) = '(instituicao_id = shared.instituicao_atual())'), 1::bigint);

SELECT verif.confere('T23 · identidade.convite tem RLS forçada e a política de isolamento',
  (SELECT count(*) FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'identidade' AND c.relname = 'convite' AND p.polname = 'isolamento_por_instituicao'
      AND pg_get_expr(p.polqual, p.polrelid) = '(instituicao_id = shared.instituicao_atual())'), 1::bigint);

SELECT verif.confere('T23 · identidade.registro_de_auditoria tem RLS forçada e a política de isolamento',
  (SELECT count(*) FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'identidade' AND c.relname = 'registro_de_auditoria' AND p.polname = 'isolamento_por_instituicao'
      AND pg_get_expr(p.polqual, p.polrelid) = '(instituicao_id = shared.instituicao_atual())'), 1::bigint);

SELECT verif.confere('T23 · shared.chave_de_idempotencia tem RLS forçada e a política de isolamento',
  (SELECT count(*) FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'shared' AND c.relname = 'chave_de_idempotencia' AND p.polname = 'isolamento_por_instituicao'
      AND pg_get_expr(p.polqual, p.polrelid) = '(instituicao_id = shared.instituicao_atual())'), 1::bigint);

-- Idempotência da varredura (Documento 7 §22): uma segunda chamada, sobre o
-- esquema inteiro, não falha, não duplica a política e não pega
-- ACCESS EXCLUSIVE em nada — senão uma migration de etapa posterior travaria
-- o esquema à toa.
BEGIN;
SELECT verif.espera_ok('varredura de RLS é idempotente · segunda chamada não falha',
  'SELECT shared.aplicar_isolamento_por_instituicao()');
SELECT verif.confere('varredura de RLS é idempotente · nada a mudar, sem ACCESS EXCLUSIVE',
  (SELECT count(*) FROM pg_locks WHERE pid = pg_backend_pid() AND locktype = 'relation' AND mode = 'AccessExclusiveLock'),
  0::bigint);
COMMIT;

-- A varredura alcança tabela criada depois, não só repete sobre o que já viu.
BEGIN;
CREATE TABLE identidade.tabela_da_proxima_etapa (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id uuid NOT NULL
);
SELECT shared.aplicar_isolamento_por_instituicao();
SELECT verif.confere('varredura de RLS alcança tabela criada entre etapas · RLS forçada',
  (SELECT c.relrowsecurity AND c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'identidade' AND c.relname = 'tabela_da_proxima_etapa'), true);
SELECT verif.confere('varredura de RLS alcança tabela criada entre etapas · política criada',
  (SELECT count(*) FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'identidade' AND c.relname = 'tabela_da_proxima_etapa' AND p.polname = 'isolamento_por_instituicao'),
  1::bigint);
ROLLBACK;
