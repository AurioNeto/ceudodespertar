-- b0-007-idempotencia-expurgo
--
-- O expurgo periódico (Documento 7 §12) apaga, por instituição, as chaves de
-- idempotência com criada_em além da janela de retenção. A chave primária
-- (instituicao_id, chave) não ordena por criada_em: sem este índice cada
-- rodada varre todas as chaves da instituição, vencidas ou não.
--
-- Roda como cdd_owner.

CREATE INDEX chave_de_idempotencia_por_criacao
  ON shared.chave_de_idempotencia (instituicao_id, criada_em);
