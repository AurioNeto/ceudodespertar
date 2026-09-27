-- b0-001-shared
--
-- Funções e tabelas de `shared` que sobrevivem ao corte de banco x domínio
-- (issue #11, Doc 7 §15/§21/anexo): a função de contexto, a guarda de
-- só-inserção, as duas varreduras idempotentes que toda migration seguinte
-- chama de novo (Doc 7 §22), e as tabelas de infraestrutura cross-módulo.
-- `shared.anexo` NÃO entra aqui — é do B1, com o comprovante.
--
-- Roda como cdd_owner, depois de b0-000-esquemas (schemas já existem).

-- Fail-closed: sem `app.instituicao_id` na transação, devolve NULL e nenhuma
-- política casa. Esquecer o contexto produz tela vazia, nunca vazamento.
CREATE FUNCTION shared.instituicao_atual() RETURNS uuid
  LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('app.instituicao_id', true), '')::uuid $$;

CREATE TABLE IF NOT EXISTS shared.instituicao (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL,
  criada_em   timestamptz NOT NULL DEFAULT now()
);

-- Outbox: gravado na mesma transação do agregado. Sem RLS de propósito — o
-- despachante lê de todas as instituições e restabelece o contexto de cada
-- evento antes de entregá-lo (Documento 7 §9).
CREATE TABLE IF NOT EXISTS shared.outbox (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  evento_id             uuid NOT NULL UNIQUE,
  instituicao_id        uuid NOT NULL,
  tipo                  text NOT NULL,              -- 'financeiro.LancamentoConfirmado'
  agregado_tipo         text NOT NULL,
  agregado_id           uuid NOT NULL,
  payload               jsonb NOT NULL,
  ocorrido_em           timestamptz NOT NULL DEFAULT now(),
  publicado_em          timestamptz,
  tentativas            integer NOT NULL DEFAULT 0,
  ultimo_erro           text,
  proxima_tentativa_em  timestamptz                 -- backoff; nulo = pronto desde a gravação
);
-- Serve a consulta do despachante (Documento 7 §9): pendente, sob o teto de
-- tentativas, ordenado por `id`. `id` é ordem global de inserção, não ordem
-- por agregado — manter os eventos de um mesmo agregado em ordem é dever do
-- despachante (§9), não deste índice. O backoff
-- (`coalesce(proxima_tentativa_em,'-infinity') <= now()`) é filtro de
-- execução, não predicado do índice — depende do relógio, não é imutável. O
-- teto (10) tem que ir literal na consulta do despachante, não como
-- parâmetro: com plano genérico o planner deixa de enxergar que o índice
-- parcial cobre o predicado e cai para full scan.
CREATE INDEX IF NOT EXISTS outbox_pendentes ON shared.outbox (id) WHERE publicado_em IS NULL AND tentativas < 10;

-- Idempotência dos consumidores: cada handler registra o que já processou.
CREATE TABLE IF NOT EXISTS shared.evento_processado (
  consumidor    text NOT NULL,
  evento_id     uuid NOT NULL,
  processado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (consumidor, evento_id)
);

-- Idempotência de comando HTTP (cabeçalho Idempotency-Key).
CREATE TABLE IF NOT EXISTS shared.chave_de_idempotencia (
  instituicao_id  uuid NOT NULL,
  chave           text NOT NULL,
  usuario_id      uuid,
  rota            text NOT NULL,
  status_http     smallint NOT NULL,
  resposta        jsonb NOT NULL,
  criada_em       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (instituicao_id, chave)
);

CREATE FUNCTION shared.somente_insercao() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'REGISTRO_IMUTAVEL: % não aceita %', TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'P0001';
END $$;

-- -----------------------------------------------------------------------------
-- TRUNCATE passa por fora dos gatilhos de linha. Nas tabelas que guardam o
-- histórico, nem o dono do banco — que é quem roda migration — as esvazia,
-- nem por CASCADE a partir de outra tabela.
--
-- shared.proibir_truncate() é o que cada migration chama (Documento 7 §22)
-- com a lista de tabelas que guarda até a sua etapa: idempotente, porque uma
-- migration posterior repete a chamada com a lista maior, e a tabela que já
-- tinha o gatilho não o recebe de novo. Religa o gatilho que alguém tenha
-- desabilitado (`DISABLE TRIGGER`, tgenabled 'D') ou restringido à réplica
-- (`ENABLE REPLICA TRIGGER`, 'R' — não dispara nas sessões normais) entre
-- uma etapa e outra — do contrário, a varredura seguinte o encontraria e
-- concluiria, errado, que a tabela já está guardada. 'A' (ALWAYS) dispara
-- em qualquer sessão e fica como está.
-- -----------------------------------------------------------------------------

CREATE FUNCTION shared.proibir_truncate(p_tabelas regclass[]) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  t regclass;
  v_gatilho pg_trigger;
BEGIN
  FOREACH t IN ARRAY p_tabelas
  LOOP
    SELECT * INTO v_gatilho FROM pg_trigger WHERE tgrelid = t AND tgname = 'sem_truncate';
    IF NOT FOUND THEN
      EXECUTE format('CREATE TRIGGER sem_truncate BEFORE TRUNCATE ON %s
                        FOR EACH STATEMENT EXECUTE FUNCTION shared.somente_insercao()', t);
    ELSIF v_gatilho.tgenabled IN ('D', 'R') THEN
      EXECUTE format('ALTER TABLE %s ENABLE TRIGGER sem_truncate', t);
    END IF;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- RLS — aplicada por varredura, não à mão
--
-- Toda tabela com `instituicao_id`, em todos os schemas de domínio, ganha RLS
-- com FORCE e a mesma política. shared.aplicar_isolamento_por_instituicao()
-- é o que cada migration chama (Documento 7 §22) depois de criar suas
-- tabelas — é o que impede a tabela nova esquecida; o teste T23 confere que
-- ela rodou. Idempotente: a tabela que já tem ENABLE+FORCE não repete o
-- ALTER TABLE (evita ACCESS EXCLUSIVE sem necessidade numa migration que só
-- varre o que outra etapa já tratou), e a que já tem a política não a
-- recebe de novo, então uma etapa posterior pode chamá-la de novo sobre o
-- esquema inteiro sem duplicar nem travar à toa.
--
-- A lista de schemas já cobre os módulos de B1-B6 (Doc 7 §22): nenhuma
-- migration futura precisa recriar esta função só para alargar a lista — um
-- schema que ainda não existe não casa nenhuma linha de
-- information_schema.columns, e não é referência cruzada de verdade.
-- -----------------------------------------------------------------------------

CREATE FUNCTION shared.aplicar_isolamento_por_instituicao() RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.table_schema, c.table_name, pc.relrowsecurity, pc.relforcerowsecurity
      FROM information_schema.columns c
      JOIN information_schema.tables tb
        ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name AND tb.table_type = 'BASE TABLE'
      JOIN pg_namespace pn ON pn.nspname = c.table_schema
      JOIN pg_class pc     ON pc.relnamespace = pn.oid AND pc.relname = c.table_name
     WHERE c.column_name = 'instituicao_id'
       AND c.table_schema IN ('shared','identidade','pessoas','financeiro','eventos','estoque')
       AND (c.table_schema, c.table_name) <> ('shared','outbox')
  LOOP
    IF NOT (t.relrowsecurity AND t.relforcerowsecurity) THEN
      EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', t.table_schema, t.table_name);
      EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', t.table_schema, t.table_name);
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policy p
        JOIN pg_class c     ON c.oid = p.polrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = t.table_schema AND c.relname = t.table_name
         AND p.polname = 'isolamento_por_instituicao'
    ) THEN
      EXECUTE format($p$CREATE POLICY isolamento_por_instituicao ON %I.%I
                        USING (instituicao_id = shared.instituicao_atual())
                        WITH CHECK (instituicao_id = shared.instituicao_atual())$p$,
                     t.table_schema, t.table_name);
    END IF;
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA shared TO cdd_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA shared TO cdd_app;

SELECT shared.aplicar_isolamento_por_instituicao();
