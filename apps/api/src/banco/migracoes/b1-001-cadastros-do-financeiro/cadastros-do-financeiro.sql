-- b1-001-cadastros-do-financeiro
--
-- Schema `financeiro` e os três cadastros que todo lançamento referencia:
-- unidade, grupo de custo e categoria (Doc 7 §18.1; Doc 2 §1.1 e §1.2).
-- Só estrutura, isolamento e guardas de forma (issue #11): quem decide o que
-- uma categoria aceita, ou se um código pode mudar, é o agregado.
--
-- Roda como cdd_owner, depois de b0-001-shared (a varredura de RLS) e
-- b0-000-esquemas (os papéis). Só objetos novos: nenhum lock em tabela que
-- já exista.
--
-- As únicas restrições com nome são as que o domínio mapeia para erro:
-- o código de sistema repetido na mesma instituição.

CREATE SCHEMA financeiro AUTHORIZATION cdd_owner;
GRANT USAGE ON SCHEMA financeiro TO cdd_app;

CREATE TABLE financeiro.unidade (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id  uuid NOT NULL,
  codigo_sistema  text NOT NULL,
  nome            text NOT NULL,
  regime          text NOT NULL CHECK (regime IN ('CONTRIBUICAO','COMERCIAL')),
  teto_anual      bigint CHECK (teto_anual > 0),
  ativa           boolean NOT NULL DEFAULT true,
  versao          integer NOT NULL DEFAULT 1,
  UNIQUE (instituicao_id, id),
  CONSTRAINT unidade_codigo_unico UNIQUE (instituicao_id, codigo_sistema),
  CHECK (regime = 'COMERCIAL' OR teto_anual IS NULL)
);

CREATE TABLE financeiro.grupo_de_custo (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id  uuid NOT NULL,
  codigo_sistema  text NOT NULL,
  nome            text NOT NULL,
  ativo           boolean NOT NULL DEFAULT true,
  versao          integer NOT NULL DEFAULT 1,
  UNIQUE (instituicao_id, id),
  CONSTRAINT grupo_de_custo_codigo_unico UNIQUE (instituicao_id, codigo_sistema)
);

CREATE TABLE financeiro.categoria (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id     uuid NOT NULL,
  codigo_sistema     text NOT NULL,
  nome               text NOT NULL,
  natureza           text NOT NULL CHECK (natureza IN ('RECEITA','DESPESA')),
  tipo               text NOT NULL CHECK (tipo IN ('OPERACIONAL','INVESTIMENTO','MANUTENCAO','PATRIMONIAL')),
  regimes_permitidos text[] NOT NULL CHECK (regimes_permitidos <@ ARRAY['CONTRIBUICAO','COMERCIAL'] AND cardinality(regimes_permitidos) > 0),
  unidade_padrao_id  uuid,
  linha_relatorio    text NOT NULL,
  ativa              boolean NOT NULL DEFAULT true,
  versao             integer NOT NULL DEFAULT 1,
  UNIQUE (instituicao_id, id),
  UNIQUE (instituicao_id, id, natureza),
  CONSTRAINT categoria_codigo_unico UNIQUE (instituicao_id, codigo_sistema),
  FOREIGN KEY (instituicao_id, unidade_padrao_id) REFERENCES financeiro.unidade (instituicao_id, id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON financeiro.unidade TO cdd_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON financeiro.grupo_de_custo TO cdd_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON financeiro.categoria TO cdd_app;

SELECT shared.aplicar_isolamento_por_instituicao();
