-- verificacoes: 18
-- B1 · conta e fundo: isolamento por instituição, fail-closed sem contexto,
-- FK composta para a unidade e para a conta vinculada, identificador bancário
-- único por casa e guardas de forma.

INSERT INTO shared.instituicao (id, nome) VALUES
  ('a0000000-0000-0000-0000-000000000000', 'Casa A'),
  ('b0000000-0000-0000-0000-000000000000', 'Casa B');

SET ROLE cdd_app;

SELECT set_config('app.instituicao_id', 'b0000000-0000-0000-0000-000000000000', false);
INSERT INTO financeiro.unidade (id, instituicao_id, codigo_sistema, nome, regime)
  VALUES ('b1000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000000', 'CDD', 'CDD B', 'CONTRIBUICAO');
INSERT INTO financeiro.conta (id, instituicao_id, nome, tipo, titularidade, identificador_bancario)
  VALUES ('b2000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000000', 'Itaú B', 'CONTA_CORRENTE', 'INSTITUCIONAL', 'ITAU-1');
INSERT INTO financeiro.fundo (instituicao_id, codigo_sistema, nome, conta_vinculada_id)
  VALUES ('b0000000-0000-0000-0000-000000000000', 'CAIXINHA', 'Caixinha B', 'b2000000-0000-0000-0000-000000000000');

SELECT set_config('app.instituicao_id', 'a0000000-0000-0000-0000-000000000000', false);
INSERT INTO financeiro.conta (id, instituicao_id, nome, tipo, titularidade, identificador_bancario)
  VALUES ('a2000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'Itaú A', 'CONTA_CORRENTE', 'INSTITUCIONAL', 'ITAU-1');
INSERT INTO financeiro.conta (instituicao_id, nome, tipo, titularidade)
  VALUES ('a0000000-0000-0000-0000-000000000000', 'Caixa A', 'DINHEIRO', 'INSTITUCIONAL'),
         ('a0000000-0000-0000-0000-000000000000', 'Caixa A2', 'DINHEIRO', 'INSTITUCIONAL');
INSERT INTO financeiro.fundo (instituicao_id, codigo_sistema, nome, conta_vinculada_id)
  VALUES ('a0000000-0000-0000-0000-000000000000', 'CAIXINHA', 'Caixinha A', 'a2000000-0000-0000-0000-000000000000');

SELECT verif.confere('financeiro · A enxerga só as próprias contas', (SELECT count(*) FROM financeiro.conta), 3::bigint);
SELECT verif.confere('financeiro · A enxerga só o próprio fundo', (SELECT count(*) FROM financeiro.fundo), 1::bigint);

SELECT verif.espera_erro('financeiro · A não grava conta em nome de B', $$
  INSERT INTO financeiro.conta (instituicao_id, nome, tipo, titularidade)
    VALUES ('b0000000-0000-0000-0000-000000000000', 'Invasora', 'DINHEIRO', 'INSTITUCIONAL')
$$, '42501');

SELECT verif.espera_erro('financeiro · fundo não aponta para a conta vinculada de outra instituição', $$
  INSERT INTO financeiro.fundo (instituicao_id, codigo_sistema, nome, conta_vinculada_id)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'OUTRO', 'Outro', 'b2000000-0000-0000-0000-000000000000')
$$, '23503');

SELECT verif.espera_erro('financeiro · conta não aponta para a unidade de outra instituição', $$
  INSERT INTO financeiro.conta (instituicao_id, nome, tipo, titularidade, unidade_id)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'Conta', 'DINHEIRO', 'INSTITUCIONAL', 'b1000000-0000-0000-0000-000000000000')
$$, '23503');

SELECT verif.espera_erro('financeiro · identificador bancário repetido na casa é recusado pelo índice nomeado', $$
  INSERT INTO financeiro.conta (instituicao_id, nome, tipo, titularidade, identificador_bancario)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'Duplicada', 'CONTA_CORRENTE', 'INSTITUCIONAL', 'ITAU-1')
$$, 'conta_identificador_unico');

SELECT verif.confere('financeiro · o mesmo identificador bancário vale em outra casa', (SELECT count(*) FROM financeiro.conta WHERE identificador_bancario = 'ITAU-1'), 1::bigint);

SELECT verif.confere('financeiro · duas contas sem identificador bancário não colidem', (SELECT count(*) FROM financeiro.conta WHERE identificador_bancario IS NULL), 2::bigint);

SELECT verif.espera_erro('financeiro · código de sistema repetido no fundo é recusado pela restrição nomeada', $$
  INSERT INTO financeiro.fundo (instituicao_id, codigo_sistema, nome, conta_vinculada_id)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'CAIXINHA', 'Repetido', 'a2000000-0000-0000-0000-000000000000')
$$, 'fundo_codigo_unico');

SELECT verif.espera_erro('financeiro · conta institucional com titular é recusada', $$
  INSERT INTO financeiro.conta (instituicao_id, nome, tipo, titularidade, pessoa_titular_id)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'Conta', 'DINHEIRO', 'INSTITUCIONAL', 'a3000000-0000-0000-0000-000000000000')
$$, '23514');

SELECT verif.espera_erro('financeiro · conta pessoal de terceiro sem titular é recusada', $$
  INSERT INTO financeiro.conta (instituicao_id, nome, tipo, titularidade)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'Conta', 'DINHEIRO', 'PESSOAL_DE_TERCEIRO')
$$, '23514');

SELECT verif.espera_erro('financeiro · tipo de conta fora da enumeração é recusado', $$
  INSERT INTO financeiro.conta (instituicao_id, nome, tipo, titularidade)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'Conta', 'POUPANCA', 'INSTITUCIONAL')
$$, '23514');

SELECT verif.espera_erro('financeiro · titularidade fora da enumeração é recusada', $$
  INSERT INTO financeiro.conta (instituicao_id, nome, tipo, titularidade)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'Conta', 'DINHEIRO', 'COMPARTILHADA')
$$, '23514');

SELECT verif.espera_erro('financeiro · meta de fundo zero é recusada', $$
  INSERT INTO financeiro.fundo (instituicao_id, codigo_sistema, nome, conta_vinculada_id, meta)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'ZERO', 'Zero', 'a2000000-0000-0000-0000-000000000000', 0)
$$, '23514');

SELECT set_config('app.instituicao_id', '', false);

SELECT verif.confere('financeiro · sem contexto, nenhuma conta é visível', (SELECT count(*) FROM financeiro.conta), 0::bigint);
SELECT verif.confere('financeiro · sem contexto, nenhum fundo é visível', (SELECT count(*) FROM financeiro.fundo), 0::bigint);

SELECT verif.confere('financeiro · conta tem a única (instituicao_id, id, tipo), alvo de FK futura', (
  SELECT count(*) FROM pg_constraint
   WHERE conrelid = 'financeiro.conta'::regclass AND contype = 'u'
     AND pg_get_constraintdef(oid) = 'UNIQUE (instituicao_id, id, tipo)'), 1::bigint);
SELECT verif.confere('financeiro · conta tem a única (instituicao_id, id, titularidade), alvo de FK futura', (
  SELECT count(*) FROM pg_constraint
   WHERE conrelid = 'financeiro.conta'::regclass AND contype = 'u'
     AND pg_get_constraintdef(oid) = 'UNIQUE (instituicao_id, id, titularidade)'), 1::bigint);
