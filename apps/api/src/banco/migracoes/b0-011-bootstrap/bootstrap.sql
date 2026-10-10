-- b0-011-bootstrap
--
-- Marcador de que o primeiro administrador já foi criado. Linha única
-- (id = true). Sem coluna instituicao_id de propósito: com ela,
-- shared.aplicar_isolamento_por_instituicao ligaria RLS FORCE e a guarda,
-- rodando sob o contexto da instituição recém-criada, leria 0 linhas.
--
-- cdd_app só lê e insere: o marcador nunca é alterado nem removido.
-- Roda como cdd_owner.

CREATE TABLE identidade.bootstrap_executado (
  id                boolean PRIMARY KEY DEFAULT true CHECK (id),
  criado_em         timestamptz NOT NULL,
  admin_usuario_id  uuid NOT NULL
);

GRANT SELECT, INSERT ON identidade.bootstrap_executado TO cdd_app;
