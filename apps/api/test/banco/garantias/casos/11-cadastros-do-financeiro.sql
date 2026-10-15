-- verificacoes: 17
-- B1 · cadastros do financeiro (unidade, grupo_de_custo, categoria): isolamento
-- por instituição, fail-closed sem contexto, guardas de forma e FK composta.

INSERT INTO shared.instituicao (id, nome) VALUES
  ('a0000000-0000-0000-0000-000000000000', 'Casa A'),
  ('b0000000-0000-0000-0000-000000000000', 'Casa B');

SET ROLE cdd_app;

SELECT set_config('app.instituicao_id', 'b0000000-0000-0000-0000-000000000000', false);
INSERT INTO financeiro.unidade (id, instituicao_id, codigo_sistema, nome, regime)
  VALUES ('b1000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000000', 'CDD', 'CDD B', 'CONTRIBUICAO');
INSERT INTO financeiro.grupo_de_custo (instituicao_id, codigo_sistema, nome)
  VALUES ('b0000000-0000-0000-0000-000000000000', 'COZINHA', 'Cozinha B');
INSERT INTO financeiro.categoria (instituicao_id, codigo_sistema, nome, natureza, tipo, regimes_permitidos, linha_relatorio)
  VALUES ('b0000000-0000-0000-0000-000000000000', 'MANUTENCAO', 'Manutenção B', 'DESPESA', 'MANUTENCAO', ARRAY['CONTRIBUICAO'], 'Manutenção');

SELECT set_config('app.instituicao_id', 'a0000000-0000-0000-0000-000000000000', false);
INSERT INTO financeiro.unidade (id, instituicao_id, codigo_sistema, nome, regime)
  VALUES ('a1000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'CDD', 'CDD A', 'CONTRIBUICAO');

SELECT verif.confere('financeiro · A enxerga só a própria unidade', (SELECT count(*) FROM financeiro.unidade), 1::bigint);
SELECT verif.confere('financeiro · A não enxerga o grupo de custo de B', (SELECT count(*) FROM financeiro.grupo_de_custo), 0::bigint);
SELECT verif.confere('financeiro · A não enxerga a categoria de B', (SELECT count(*) FROM financeiro.categoria), 0::bigint);

SELECT verif.espera_erro('financeiro · A não grava unidade em nome de B', $$
  INSERT INTO financeiro.unidade (instituicao_id, codigo_sistema, nome, regime)
    VALUES ('b0000000-0000-0000-0000-000000000000', 'OUTRA', 'Outra', 'CONTRIBUICAO')
$$, '42501');

SELECT verif.espera_erro('financeiro · categoria não aponta para a unidade padrão de outra instituição', $$
  INSERT INTO financeiro.categoria (instituicao_id, codigo_sistema, nome, natureza, tipo, regimes_permitidos, unidade_padrao_id, linha_relatorio)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'X', 'X', 'DESPESA', 'OPERACIONAL', ARRAY['CONTRIBUICAO'],
            'b1000000-0000-0000-0000-000000000000', 'X')
$$, '23503');

SELECT verif.espera_erro('financeiro · código de sistema repetido na unidade é recusado pela restrição nomeada', $$
  INSERT INTO financeiro.unidade (instituicao_id, codigo_sistema, nome, regime)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'CDD', 'Repetida', 'CONTRIBUICAO')
$$, 'unidade_codigo_unico');

SELECT verif.espera_erro('financeiro · código de sistema repetido no grupo de custo é recusado pela restrição nomeada', $$
  INSERT INTO financeiro.grupo_de_custo (instituicao_id, codigo_sistema, nome)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'COZINHA', 'Cozinha');
  INSERT INTO financeiro.grupo_de_custo (instituicao_id, codigo_sistema, nome)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'COZINHA', 'Cozinha de novo')
$$, 'grupo_de_custo_codigo_unico');

SELECT verif.espera_erro('financeiro · código de sistema repetido na categoria é recusado pela restrição nomeada', $$
  INSERT INTO financeiro.categoria (instituicao_id, codigo_sistema, nome, natureza, tipo, regimes_permitidos, linha_relatorio)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'C', 'C', 'DESPESA', 'OPERACIONAL', ARRAY['CONTRIBUICAO'], 'L');
  INSERT INTO financeiro.categoria (instituicao_id, codigo_sistema, nome, natureza, tipo, regimes_permitidos, linha_relatorio)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'C', 'C2', 'DESPESA', 'OPERACIONAL', ARRAY['CONTRIBUICAO'], 'L')
$$, 'categoria_codigo_unico');

SELECT verif.espera_erro('financeiro · teto anual em unidade de contribuição é recusado', $$
  INSERT INTO financeiro.unidade (instituicao_id, codigo_sistema, nome, regime, teto_anual)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'T', 'T', 'CONTRIBUICAO', 100)
$$, '23514');

SELECT verif.espera_erro('financeiro · teto anual zero é recusado', $$
  INSERT INTO financeiro.unidade (instituicao_id, codigo_sistema, nome, regime, teto_anual)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'Z', 'Z', 'COMERCIAL', 0)
$$, '23514');

SELECT verif.espera_erro('financeiro · regime fora da enumeração é recusado', $$
  INSERT INTO financeiro.unidade (instituicao_id, codigo_sistema, nome, regime)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'R', 'R', 'OUTRO')
$$, '23514');

SELECT verif.espera_erro('financeiro · categoria sem regime permitido é recusada', $$
  INSERT INTO financeiro.categoria (instituicao_id, codigo_sistema, nome, natureza, tipo, regimes_permitidos, linha_relatorio)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'V', 'V', 'DESPESA', 'OPERACIONAL', ARRAY[]::text[], 'L')
$$, '23514');

SELECT verif.espera_erro('financeiro · categoria com regime inexistente é recusada', $$
  INSERT INTO financeiro.categoria (instituicao_id, codigo_sistema, nome, natureza, tipo, regimes_permitidos, linha_relatorio)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'W', 'W', 'DESPESA', 'OPERACIONAL', ARRAY['MISTO'], 'L')
$$, '23514');

SELECT verif.espera_erro('financeiro · natureza fora da enumeração é recusada', $$
  INSERT INTO financeiro.categoria (instituicao_id, codigo_sistema, nome, natureza, tipo, regimes_permitidos, linha_relatorio)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'N', 'N', 'TRANSFERENCIA', 'OPERACIONAL', ARRAY['CONTRIBUICAO'], 'L')
$$, '23514');

SELECT verif.espera_erro('financeiro · tipo fora da enumeração é recusado', $$
  INSERT INTO financeiro.categoria (instituicao_id, codigo_sistema, nome, natureza, tipo, regimes_permitidos, linha_relatorio)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'P', 'P', 'DESPESA', 'OUTRO', ARRAY['CONTRIBUICAO'], 'L')
$$, '23514');

SELECT set_config('app.instituicao_id', '', false);

SELECT verif.confere('financeiro · sem contexto, nenhuma unidade é visível', (SELECT count(*) FROM financeiro.unidade), 0::bigint);
SELECT verif.confere('financeiro · sem contexto, nenhuma categoria é visível', (SELECT count(*) FROM financeiro.categoria), 0::bigint);
