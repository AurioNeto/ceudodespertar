-- Cadastro completo em estrutura, com domínio mínimo na B1.
-- As colunas de perfil ficam nulas até a B4; nenhuma coluna de saúde.
-- Sem FK entre schemas; isolamento e unicidade são garantidos pelo banco.
CREATE SCHEMA pessoas AUTHORIZATION cdd_owner;
GRANT USAGE ON SCHEMA pessoas TO cdd_app;

CREATE TABLE pessoas.pessoa (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id           uuid NOT NULL,
  tipo                     text NOT NULL CHECK (tipo IN ('FISICA','JURIDICA')),
  nome                     text NOT NULL,
  apelido                  text,
  documento                text CHECK (documento ~ '^[0-9]{11}$|^[0-9]{14}$'),  -- CPF/CNPJ só dígitos
  telefone                 text,
  email                    text,
  cidade                   text,
  nascimento               date,
  foto_anexo_id            uuid,
  -- Decisão 7: o eixo "o quanto a pessoa é da casa" é campo, não papel.
  relacao_com_a_casa       text CHECK (relacao_com_a_casa IN ('MEMBRO','FREQUENTADOR','VISITANTE')),
  contato_emergencia_nome  text,
  contato_emergencia_tel   text,
  cadastrada_por_link      boolean NOT NULL DEFAULT false,  -- autocadastro (Doc 6 §2.6)
  anonimizada_em           timestamptz,
  ativa                    boolean NOT NULL DEFAULT true,
  versao                   integer NOT NULL DEFAULT 1,
  criada_em                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (instituicao_id, id),
  CHECK (tipo = 'FISICA' OR relacao_com_a_casa IS NULL),
  CHECK (anonimizada_em IS NULL OR documento IS NULL)
);
-- O CPF é a chave do link público: uma pessoa por documento na instituição.
CREATE UNIQUE INDEX pessoa_documento_unico ON pessoas.pessoa (instituicao_id, documento) WHERE documento IS NOT NULL;
CREATE INDEX pessoa_nome ON pessoas.pessoa (instituicao_id, lower(nome));

GRANT SELECT, INSERT, UPDATE ON pessoas.pessoa TO cdd_app;
SELECT shared.aplicar_isolamento_por_instituicao();
