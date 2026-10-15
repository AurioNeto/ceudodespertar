-- Reversão de b1-001-cadastros-do-financeiro.
--
-- Primeiro quem referencia por FK (categoria aponta para unidade), depois o
-- referenciado, e por fim o schema. DROP SCHEMA sem CASCADE falha se uma
-- migration posterior ainda deixou objeto dentro dele — o down() dela roda antes.

DROP TABLE IF EXISTS financeiro.categoria;
DROP TABLE IF EXISTS financeiro.grupo_de_custo;
DROP TABLE IF EXISTS financeiro.unidade;

DROP SCHEMA financeiro;
