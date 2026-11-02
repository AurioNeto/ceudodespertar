-- TSK-517: tabelas novas, sem backfill; unicidade unidade/competência na aplicação.
CREATE TABLE financeiro.periodo_contabil (
  id uuid PRIMARY KEY,
  instituicao_id uuid NOT NULL,
  unidade_id uuid NOT NULL,
  competencia date NOT NULL CHECK (extract(day FROM competencia) = 1),
  fechado boolean NOT NULL DEFAULT false,
  fechado_por uuid,
  fechado_em timestamptz,
  hash_sha256 text,
  versao integer NOT NULL DEFAULT 1,
  UNIQUE (instituicao_id, id),
  FOREIGN KEY (instituicao_id, unidade_id) REFERENCES financeiro.unidade (instituicao_id, id),
  CHECK (NOT fechado OR (fechado_por IS NOT NULL AND fechado_em IS NOT NULL AND hash_sha256 IS NOT NULL))
);
CREATE INDEX periodo_por_competencia ON financeiro.periodo_contabil (instituicao_id, unidade_id, competencia);
CREATE TABLE financeiro.reabertura_de_periodo (
  id uuid PRIMARY KEY,
  instituicao_id uuid NOT NULL,
  periodo_id uuid NOT NULL,
  motivo text NOT NULL,
  reaberto_por uuid NOT NULL,
  reaberto_em timestamptz NOT NULL,
  hash_anterior text NOT NULL,
  versao_do_periodo integer NOT NULL,
  FOREIGN KEY (instituicao_id, periodo_id) REFERENCES financeiro.periodo_contabil (instituicao_id, id)
);
CREATE INDEX reabertura_por_periodo ON financeiro.reabertura_de_periodo (instituicao_id, periodo_id, versao_do_periodo);
CREATE FUNCTION financeiro.guarda_periodo() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.fechado THEN
    RAISE EXCEPTION 'PERIODO_FECHADO: período fechado não some' USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF TG_OP = 'UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.instituicao_id IS DISTINCT FROM OLD.instituicao_id OR NEW.unidade_id IS DISTINCT FROM OLD.unidade_id OR NEW.competencia IS DISTINCT FROM OLD.competencia) THEN
    RAISE EXCEPTION 'REGISTRO_IMUTAVEL: identidade do período não muda' USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.fechado AND NEW.fechado THEN
    RAISE EXCEPTION 'PERIODO_FECHADO: período fechado só admite reabertura' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER periodo_guarda BEFORE UPDATE OR DELETE ON financeiro.periodo_contabil FOR EACH ROW EXECUTE FUNCTION financeiro.guarda_periodo();
CREATE TRIGGER reabertura_somente_insercao BEFORE UPDATE OR DELETE ON financeiro.reabertura_de_periodo FOR EACH ROW EXECUTE FUNCTION shared.somente_insercao();
REVOKE EXECUTE ON FUNCTION financeiro.guarda_periodo() FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON financeiro.periodo_contabil TO cdd_app;
GRANT SELECT, INSERT ON financeiro.reabertura_de_periodo TO cdd_app;
SELECT shared.aplicar_isolamento_por_instituicao();
SELECT shared.proibir_truncate(ARRAY['financeiro.periodo_contabil','financeiro.reabertura_de_periodo']::regclass[]);
