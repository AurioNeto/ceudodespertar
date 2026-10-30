-- Reversão de b1-002-conta-e-fundo.
--
-- Primeiro quem referencia por FK (fundo aponta para conta), depois o
-- referenciado. O schema financeiro fica: pertence a b1-001.

DROP TABLE IF EXISTS financeiro.fundo;
DROP TABLE IF EXISTS financeiro.conta;
