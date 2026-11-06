-- TSK-515: tabelas novas, sem backfill. As unicidades de negócio são da aplicação.
CREATE TABLE financeiro.lancamento (
  id uuid PRIMARY KEY,
  instituicao_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('A_CONFERIR','CONFIRMADO')),
  origem text NOT NULL CHECK (origem IN ('MANUAL','REGISTRO_RAPIDO','COMPROVANTE_IA','IMPORTACAO_EXTRATO','IMPORTACAO_TEXTO','INTEGRACAO_EVENTOS','INTEGRACAO_ESTOQUE','MIGRACAO')),
  natureza text NOT NULL CHECK (natureza IN ('RECEITA','DESPESA')),
  valor bigint NOT NULL CHECK (valor > 0),
  motivo text NOT NULL,
  unidade_id uuid,
  grupo_de_custo_id uuid,
  conta_id uuid,
  fatura_id uuid,
  pessoa_id uuid,
  contraparte_texto text,
  forma_pagamento text,
  evento_id uuid,
  competencia date,
  data_competencia date,
  data_caixa date,
  reembolso_a_id uuid,
  comprovante_id uuid,
  estorno_de_id uuid,
  registrado_por uuid NOT NULL,
  registrado_em timestamptz NOT NULL,
  confirmado_autor_tipo text CHECK (confirmado_autor_tipo IN ('USUARIO','SISTEMA')),
  confirmado_por uuid,
  confirmado_em timestamptz,
  gravado_na_transacao xid8 NOT NULL,
  versao integer NOT NULL DEFAULT 1,
  UNIQUE (instituicao_id, id),
  UNIQUE (instituicao_id, id, natureza),
  FOREIGN KEY (instituicao_id, unidade_id) REFERENCES financeiro.unidade (instituicao_id, id),
  FOREIGN KEY (instituicao_id, grupo_de_custo_id) REFERENCES financeiro.grupo_de_custo (instituicao_id, id),
  FOREIGN KEY (instituicao_id, conta_id) REFERENCES financeiro.conta (instituicao_id, id),
  FOREIGN KEY (instituicao_id, estorno_de_id, natureza) REFERENCES financeiro.lancamento (instituicao_id, id, natureza)
);
CREATE INDEX lancamento_competencia ON financeiro.lancamento (instituicao_id, unidade_id, competencia);
CREATE INDEX lancamento_autor ON financeiro.lancamento (instituicao_id, registrado_por, registrado_em DESC);
CREATE INDEX lancamento_estorno ON financeiro.lancamento (instituicao_id, estorno_de_id) WHERE estorno_de_id IS NOT NULL;

CREATE TABLE financeiro.lancamento_categoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id uuid NOT NULL,
  lancamento_id uuid NOT NULL,
  categoria_id uuid NOT NULL,
  natureza text NOT NULL,
  valor bigint NOT NULL CHECK (valor > 0),
  FOREIGN KEY (instituicao_id, lancamento_id) REFERENCES financeiro.lancamento (instituicao_id, id) ON DELETE CASCADE,
  FOREIGN KEY (instituicao_id, categoria_id, natureza) REFERENCES financeiro.categoria (instituicao_id, id, natureza)
);
CREATE INDEX lancamento_categoria_pai ON financeiro.lancamento_categoria (instituicao_id, lancamento_id);

CREATE TABLE financeiro.pendencia (
  id uuid PRIMARY KEY,
  instituicao_id uuid NOT NULL,
  lancamento_id uuid NOT NULL,
  texto text NOT NULL,
  aberta_por uuid NOT NULL,
  destinatario uuid NOT NULL,
  aberta_em timestamptz NOT NULL,
  resposta text,
  resolvida_em timestamptz,
  FOREIGN KEY (instituicao_id, lancamento_id) REFERENCES financeiro.lancamento (instituicao_id, id) ON DELETE CASCADE,
  CHECK ((resposta IS NULL) = (resolvida_em IS NULL))
);
CREATE INDEX pendencia_pai ON financeiro.pendencia (instituicao_id, lancamento_id);

CREATE FUNCTION financeiro.guarda_lancamento() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.status = 'CONFIRMADO' THEN
    RAISE EXCEPTION 'LANCAMENTO_IMUTAVEL: lançamento confirmado não muda' USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF TG_OP = 'UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.instituicao_id IS DISTINCT FROM OLD.instituicao_id) THEN
    RAISE EXCEPTION 'LANCAMENTO_IMUTAVEL: identidade não muda' USING ERRCODE = 'P0001';
  END IF;
  NEW.gravado_na_transacao := pg_current_xact_id();
  RETURN NEW;
END $$;
CREATE TRIGGER lancamento_guarda BEFORE INSERT OR UPDATE OR DELETE ON financeiro.lancamento
  FOR EACH ROW EXECUTE FUNCTION financeiro.guarda_lancamento();

CREATE FUNCTION financeiro.guarda_etiqueta() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_id uuid;
  v_status text;
  v_transacao xid8;
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.lancamento_id IS DISTINCT FROM OLD.lancamento_id OR NEW.instituicao_id IS DISTINCT FROM OLD.instituicao_id) THEN
    RAISE EXCEPTION 'LANCAMENTO_IMUTAVEL: etiqueta não muda de lançamento' USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'DELETE' THEN v_id := OLD.lancamento_id; ELSE v_id := NEW.lancamento_id; END IF;
  SELECT status, gravado_na_transacao INTO v_status, v_transacao FROM financeiro.lancamento WHERE id = v_id FOR UPDATE;
  IF v_status = 'CONFIRMADO' AND v_transacao IS DISTINCT FROM pg_current_xact_id() THEN
    RAISE EXCEPTION 'LANCAMENTO_IMUTAVEL: etiquetas confirmadas não mudam' USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER etiqueta_guarda BEFORE INSERT OR UPDATE OR DELETE ON financeiro.lancamento_categoria
  FOR EACH ROW EXECUTE FUNCTION financeiro.guarda_etiqueta();

GRANT SELECT, INSERT, UPDATE, DELETE ON financeiro.lancamento, financeiro.lancamento_categoria, financeiro.pendencia TO cdd_app;
REVOKE EXECUTE ON FUNCTION financeiro.guarda_lancamento(), financeiro.guarda_etiqueta() FROM PUBLIC;
SELECT shared.aplicar_isolamento_por_instituicao();
SELECT shared.proibir_truncate(ARRAY['financeiro.lancamento','financeiro.lancamento_categoria','financeiro.pendencia']::regclass[]);
