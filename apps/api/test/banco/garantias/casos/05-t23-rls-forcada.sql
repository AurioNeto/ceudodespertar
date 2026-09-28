-- verificacoes: 11
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

-- A partir daqui, a lista de tabelas-alvo vem do catálogo
-- (verif.tabelas_com_instituicao_id(), que lê pg_class/pg_attribute), não de
-- nomes escritos à mão — senão uma tabela nova que ganhasse `instituicao_id`
-- e ficasse fora da varredura, ou uma tabela do B0 que o caso simplesmente
-- não citasse, passaria batida.

-- Evita vácuo silencioso: a varredura tem que achar as sete tabelas do B0
-- que têm `instituicao_id` (usuario, grupo, grupo_permissao, usuario_grupo,
-- convite, registro_de_auditoria e shared.chave_de_idempotencia) — não zero.
SELECT verif.confere('T23 · a varredura de tabelas-alvo não está vazia',
  (SELECT count(*) FROM verif.tabelas_com_instituicao_id()), 7::bigint);

-- Cada tabela-alvo tem a política isolamento_por_instituicao com a expressão
-- certa no USING, o comando certo (ALL) e os papéis certos (PUBLIC — sem TO,
-- então polroles = {0}).
SELECT verif.confere('T23 · toda tabela-alvo tem a política isolamento_por_instituicao com USING, comando e papéis corretos',
  (SELECT count(*) FROM verif.tabelas_com_instituicao_id() t
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_policy p
       WHERE p.polrelid = t.relid
         AND p.polname = 'isolamento_por_instituicao'
         AND pg_get_expr(p.polqual, p.polrelid) = '(instituicao_id = shared.instituicao_atual())'
         AND p.polcmd = '*'
         AND p.polpermissive
         AND p.polroles = ARRAY[0]::oid[]
    )), 0::bigint);

-- A mesma política também precisa do WITH CHECK — assertiva à parte, para
-- que apagar só esta condição derrube a contagem de OKs do arquivo (e não
-- fique escondida dentro do AND de uma verificação maior): senão a leitura
-- fica isolada, mas a escrita em nome de outra instituição passa.
SELECT verif.confere('T23 · toda tabela-alvo tem WITH CHECK da política isolamento_por_instituicao com a expressão certa',
  (SELECT count(*) FROM verif.tabelas_com_instituicao_id() t
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_policy p
       WHERE p.polrelid = t.relid
         AND p.polname = 'isolamento_por_instituicao'
         AND pg_get_expr(p.polwithcheck, p.polrelid) = '(instituicao_id = shared.instituicao_atual())'
    )), 0::bigint);

-- Nenhuma tabela-alvo tem política a mais que abra uma fresta — em
-- identidade.usuario, a única exceção documentada é resolucao_do_sujeito
-- (Documento 7 §7.1/§8: o resolvedor de identidade lê antes de haver
-- instituição no contexto).
SELECT verif.confere('T23 · nenhuma tabela-alvo tem política além da esperada (isolamento_por_instituicao; em usuario, também resolucao_do_sujeito)',
  (SELECT count(*) FROM verif.tabelas_com_instituicao_id() t
    WHERE EXISTS (
      SELECT 1 FROM pg_policy p
       WHERE p.polrelid = t.relid
         AND p.polname <> 'isolamento_por_instituicao'
         AND NOT (t.nspname = 'identidade' AND t.relname = 'usuario' AND p.polname = 'resolucao_do_sujeito')
    )), 0::bigint);

-- A exceção anterior só confere o NOME da política — recriar
-- resolucao_do_sujeito com um papel a mais (ex.: cdd_owner) continua
-- casando pelo nome e passaria batido, abrindo identidade.usuario para quem
-- não devia ler sem contexto. Conferência à parte, pela definição exata.
SELECT verif.confere('T23 · resolucao_do_sujeito é exatamente FOR SELECT TO cdd_resolvedor_identidade USING (true) — sem papel, comando ou expressão a mais',
  (SELECT p.polroles = ARRAY['cdd_resolvedor_identidade'::regrole]::oid[]
      AND p.polcmd = 'r'
      AND p.polpermissive
      AND pg_get_expr(p.polqual, p.polrelid) = 'true'
     FROM pg_policy p
    WHERE p.polrelid = 'identidade.usuario'::regclass AND p.polname = 'resolucao_do_sujeito'),
  true);

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
