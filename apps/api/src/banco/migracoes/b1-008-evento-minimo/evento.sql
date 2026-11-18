CREATE SCHEMA eventos AUTHORIZATION cdd_owner;
GRANT USAGE ON SCHEMA eventos TO cdd_app;


CREATE TABLE eventos.evento (
  id uuid PRIMARY KEY,
  instituicao_id uuid NOT NULL,
  unidade_id uuid NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('CERIMONIA', 'FEITIO', 'CONCENTRACAO', 'CURA', 'BAILADO', 'REUNIAO', 'TEMAZCAL', 'JORNADA', 'SHOW', 'ENCONTRO')),
  data_inicio date NOT NULL,
  data_fim date NOT NULL CHECK (data_fim >= data_inicio)
);
GRANT SELECT, INSERT ON eventos.evento TO cdd_app;
SELECT shared.aplicar_isolamento_por_instituicao();
SELECT shared.proibir_truncate(ARRAY['eventos.evento']::regclass[]);
