-- Reversão de b0-004-idempotencia.

ALTER TABLE shared.chave_de_idempotencia DROP COLUMN corpo_hash;
