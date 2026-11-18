CREATE TABLE shared.anexo (
  id uuid PRIMARY KEY,
  instituicao_id uuid NOT NULL,
  chave text NOT NULL,
  nome_original text NOT NULL,
  mime text NOT NULL,
  tamanho_bytes bigint NOT NULL CHECK (tamanho_bytes > 0),
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  sensivel boolean NOT NULL DEFAULT false,
  enviado_por_tipo text NOT NULL DEFAULT 'USUARIO' CHECK (enviado_por_tipo IN ('USUARIO', 'SISTEMA', 'LINK_PUBLICO')),
  enviado_por uuid,
  enviado_em timestamptz NOT NULL DEFAULT now(),
  CHECK ((enviado_por_tipo = 'USUARIO') = (enviado_por IS NOT NULL))
);
GRANT SELECT, INSERT ON shared.anexo TO cdd_app;
SELECT shared.aplicar_isolamento_por_instituicao();
SELECT shared.proibir_truncate(ARRAY['shared.anexo']::regclass[]);
