-- b0-006-outbox-esgotados
--
-- A vigia de eventos esgotados (Documento 7 §13, runbook "Evento esgotado")
-- conta, a cada minuto, os eventos pendentes que já atingiram o teto de
-- tentativas. Sem este índice a contagem varre todo o acúmulo de pendentes
-- por outbox_por_agregado; com o despachante parado, isso cresce sem limite.
-- O teto (10) vai literal no predicado, como em outbox_pendentes (b0-001), e
-- tem que acompanhar TETO_DE_TENTATIVAS em
-- shared/infrastructure/eventos/teto-de-tentativas.ts.
--
-- Roda como cdd_owner.

CREATE INDEX outbox_esgotados ON shared.outbox (ocorrido_em)
  WHERE publicado_em IS NULL AND tentativas >= 10;
