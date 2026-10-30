-- b1-002-conta-e-fundo
--
-- Conta (onde o dinheiro está) e fundo (conta vinculada com meta e categorias
-- permitidas) no schema `financeiro` (Doc 7 §18.1 e §18.4; Doc 2 §1.5 e §1.9).
-- Só estrutura, isolamento e guardas de forma (issue #11): quem decide se a
-- conta se inativa, ou se uma saída cabe no fundo, é o agregado.
--
-- Roda como cdd_owner, depois de b1-001-cadastros-do-financeiro. Só tabelas
-- novas; a FK de conta para financeiro.unidade toma SHARE ROW EXCLUSIVE em
-- unidade (bloqueia escrita nela, não leitura) até o commit desta migration,
-- que é curto: as duas tabelas nascem vazias.
--
-- pessoa_titular_id não tem FK: o schema `pessoas` ainda não existe e nenhuma
-- FK cruza schema (Doc 7 §5).
--
-- As únicas restrições com nome são as que o domínio mapeia para erro: o
-- identificador bancário repetido e o código de sistema repetido do fundo.

CREATE TABLE financeiro.conta (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id         uuid NOT NULL,
  nome                   text NOT NULL,
  descricao              text NOT NULL DEFAULT '',
  tipo                   text NOT NULL CHECK (tipo IN ('CONTA_CORRENTE','CARTAO_CREDITO','DINHEIRO','FUNDO')),
  titularidade           text NOT NULL CHECK (titularidade IN ('INSTITUCIONAL','PESSOAL_DE_TERCEIRO')),
  pessoa_titular_id      uuid,
  identificador_bancario text,
  unidade_id             uuid,
  ativa                  boolean NOT NULL DEFAULT true,
  versao                 integer NOT NULL DEFAULT 1,
  UNIQUE (instituicao_id, id),
  UNIQUE (instituicao_id, id, tipo),
  UNIQUE (instituicao_id, id, titularidade),
  FOREIGN KEY (instituicao_id, unidade_id) REFERENCES financeiro.unidade (instituicao_id, id),
  CHECK ((titularidade = 'PESSOAL_DE_TERCEIRO') = (pessoa_titular_id IS NOT NULL))
);

CREATE UNIQUE INDEX conta_identificador_unico
  ON financeiro.conta (instituicao_id, identificador_bancario)
  WHERE identificador_bancario IS NOT NULL;

CREATE TABLE financeiro.fundo (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id        uuid NOT NULL,
  codigo_sistema        text NOT NULL,
  nome                  text NOT NULL,
  nota                  text NOT NULL DEFAULT '',
  conta_vinculada_id    uuid NOT NULL,
  meta                  bigint CHECK (meta > 0),
  categorias_permitidas text[] NOT NULL DEFAULT '{}',
  ativo                 boolean NOT NULL DEFAULT true,
  versao                integer NOT NULL DEFAULT 1,
  UNIQUE (instituicao_id, id),
  CONSTRAINT fundo_codigo_unico UNIQUE (instituicao_id, codigo_sistema),
  FOREIGN KEY (instituicao_id, conta_vinculada_id) REFERENCES financeiro.conta (instituicao_id, id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON financeiro.conta TO cdd_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON financeiro.fundo TO cdd_app;

SELECT shared.aplicar_isolamento_por_instituicao();
