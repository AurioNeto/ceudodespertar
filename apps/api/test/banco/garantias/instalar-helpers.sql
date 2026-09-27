-- Helpers da verificação de garantias (Documento 7 §15/§22, §26), copiados de
-- docs/sql/cdd-07-verificacao.sql (branch feat/b0-f08-resolvedor-identidade) e
-- adaptados para instalar no schema `verif` de um banco de teste, e não no
-- esquema de referência congelado.

SET client_min_messages = notice;

CREATE SCHEMA verif;
GRANT USAGE ON SCHEMA verif TO cdd_app;

-- Executa `p_sql` e exige que falhe com SQLSTATE ou mensagem casando `p_padrao`.
-- Força os gatilhos DEFERRED a rodarem ali mesmo, dentro do subbloco.
CREATE FUNCTION verif.espera_erro(p_nome text, p_sql text, p_padrao text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
    SET CONSTRAINTS ALL IMMEDIATE;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE ~ ('^(' || p_padrao || ')$') OR SQLERRM ~ p_padrao THEN
      RAISE NOTICE 'OK    %  ← %', p_nome, left(SQLERRM, 90);
      RETURN;
    END IF;
    RAISE EXCEPTION 'FALHA % — erro inesperado: [%] %', p_nome, SQLSTATE, SQLERRM;
  END;
  RAISE EXCEPTION 'FALHA % — passou sem erro', p_nome;
END $$;

CREATE FUNCTION verif.espera_ok(p_nome text, p_sql text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE p_sql;
  SET CONSTRAINTS ALL IMMEDIATE;
  RAISE NOTICE 'OK    %', p_nome;
END $$;

CREATE FUNCTION verif.confere(p_nome text, p_obtido anyelement, p_esperado anyelement) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF p_obtido IS DISTINCT FROM p_esperado THEN
    RAISE EXCEPTION 'FALHA % — obtido %, esperado %', p_nome, p_obtido, p_esperado;
  END IF;
  RAISE NOTICE 'OK    %', p_nome;
END $$;

-- Privilégios EXATOS (Documento 7 §15, item f do plano da F10): não usa
-- information_schema.role_table_grants (só mostra o que o papel corrente
-- concedeu ou de que é membro) — has_table_privilege/has_sequence_privilege
-- avalia a ACL de verdade, então qualquer GRANT a mais ou a menos aparece.
-- has_table_privilege sozinho é cego a GRANT por coluna (ex.: GRANT UPDATE
-- (col) ON tabela TO papel não aparece nele — só na ACL da coluna), então
-- para os quatro privilégios que também existem por coluna
-- (SELECT/INSERT/UPDATE/REFERENCES) somamos has_any_column_privilege.
CREATE FUNCTION verif.privilegios_de_tabela(p_papel text, p_tabela regclass) RETURNS text[]
LANGUAGE sql STABLE AS $$
  SELECT array_agg(p ORDER BY p) FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p
   WHERE has_table_privilege(p_papel, p_tabela, p)
      OR (p IN ('SELECT','INSERT','UPDATE','REFERENCES') AND has_any_column_privilege(p_papel, p_tabela, p))
$$;

CREATE FUNCTION verif.privilegios_de_sequencia(p_papel text, p_sequencia regclass) RETURNS text[]
LANGUAGE sql STABLE AS $$
  SELECT array_agg(p ORDER BY p) FROM unnest(ARRAY['SELECT','UPDATE','USAGE']) p
   WHERE has_sequence_privilege(p_papel, p_sequencia, p)
$$;

-- Tabelas-alvo da varredura de RLS (T23, Documento 7 §15/§22), pelo
-- catálogo — não por uma lista escrita à mão. É uma FUNÇÃO, e não uma VIEW
-- temporária, de propósito: CREATE/DROP VIEW pega ACCESS EXCLUSIVE na view
-- em si, e esse lock sobrevive até o fim da transação — o que atrapalharia
-- o próprio caso 05, que confere que não sobra ACCESS EXCLUSIVE em nada.
CREATE FUNCTION verif.tabelas_com_instituicao_id() RETURNS TABLE (relid oid, nspname name, relname name)
LANGUAGE sql STABLE AS $$
  SELECT c.oid, n.nspname, c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE c.relkind = 'r'
     AND n.nspname IN ('shared','identidade','pessoas','financeiro','eventos','estoque')
     AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = c.oid AND a.attname = 'instituicao_id' AND NOT a.attisdropped)
     AND (n.nspname, c.relname) <> ('shared','outbox')
$$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA verif TO cdd_app;
