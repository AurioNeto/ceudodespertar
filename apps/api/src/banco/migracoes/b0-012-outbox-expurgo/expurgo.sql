-- b0-012-outbox-expurgo
--
-- O expurgo do outbox (issue #43) apaga, por instituição e em lotes, os
-- eventos despachados há mais tempo que a retenção, do mais antigo para o
-- mais novo. Os índices existentes só cobrem eventos pendentes; sem este,
-- cada lote varreria o outbox inteiro. O predicado deixa pendentes e
-- esgotados fora do índice.
--
-- Roda como cdd_owner, dentro da transação do migrador: CREATE INDEX comum
-- (sem CONCURRENTLY) segura escrita no outbox durante a construção.

CREATE INDEX outbox_despachados_por_instituicao
  ON shared.outbox (instituicao_id, publicado_em)
  WHERE publicado_em IS NOT NULL;
