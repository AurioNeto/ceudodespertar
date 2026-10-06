-- b0-004-idempotencia
--
-- shared.chave_de_idempotencia (b0-001-shared) guarda status_http e resposta,
-- mas não o corpo da requisição em si — comparar o jsonb inteiro é frágil
-- (ordem de chave, espaço em branco). corpo_hash guarda o hash do corpo de
-- entrada, calculado pela aplicação, só para a interceptadora de idempotência
-- comparar reuso de chave (Documento 7 §12): mesma chave em rota diferente
-- ou com corpo diferente é 422 CHAVE_DE_IDEMPOTENCIA_REUTILIZADA.
--
-- Roda como cdd_owner. Nullable como usuario_id: quem grava fora da
-- interceptadora (fixture de teste, carga manual) não é obrigado a inventar
-- um hash — uma linha sem corpo_hash simplesmente nunca casa como reuso
-- válido de chave (comparação com NULL não bate com nenhum hash real).

ALTER TABLE shared.chave_de_idempotencia ADD COLUMN corpo_hash text;
