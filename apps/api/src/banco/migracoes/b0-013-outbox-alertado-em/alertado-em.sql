-- b0-013-outbox-alertado-em
--
-- A vigia de eventos esgotados (Documento 7 §9 e §13) marca, na própria
-- linha, o esgotado que já entrou num alerta. Com a marca no banco o alerta
-- compara identidade, não quantidade: um esgotado resolvido e outro novo no
-- mesmo minuto ainda geram alerta, e o mesmo esgotado não volta a alertar em
-- outra task nem depois de um restart. O despachante zera a marca a cada
-- falha que registra, então um evento destravado que esgota de novo volta a
-- alertar.
--
-- Roda como cdd_owner. ADD COLUMN sem default é só catálogo e não reescreve a
-- tabela, mas o lock ACCESS EXCLUSIVE entra na fila atrás das transações
-- abertas no outbox (a do despachante dura até o timeout do consumidor) e,
-- enquanto espera, bloqueia quem chega depois. Aplicar com o despachante
-- ocioso ou numa janela curta.

ALTER TABLE shared.outbox ADD COLUMN alertado_em timestamptz;
