-- b0-005-outbox-por-agregado
--
-- O NOT EXISTS do despachante (Documento 7 §9) filtra por
-- (agregado_tipo, agregado_id, id) entre linhas pendentes. Sem um índice
-- dedicado, com o outbox na casa das centenas de milhares de linhas
-- publicadas, o planner cai para Seq Scan a cada ciclo de polling.
--
-- Roda como cdd_owner.

CREATE INDEX outbox_por_agregado ON shared.outbox (agregado_tipo, agregado_id, id)
  WHERE publicado_em IS NULL;
