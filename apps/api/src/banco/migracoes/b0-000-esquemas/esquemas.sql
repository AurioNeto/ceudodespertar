-- b0-000-esquemas
--
-- Só os dois schemas que o B0 usa (shared, identidade) e o USAGE mínimo para
-- a aplicação enxergar o que as migrations seguintes forem criar dentro
-- deles. Nenhuma tabela, função, RLS ou guarda nasce aqui — isso é do
-- restante do B0 (F09b em diante), que herda estes schemas já existindo.
--
-- Roda como cdd_owner (dono de ambos): pressupõe que os papéis de cluster
-- (cdd_owner, cdd_app) já existem, porque quem os cria é a infra
-- (infra/postgres/papeis.sql), não uma migration.
--
-- IF NOT EXISTS: DDL idempotente por construção, não só por o migrador
-- garantir execução única — sobrevive a um retomar depois de uma falha
-- a meio da transação.

CREATE SCHEMA IF NOT EXISTS shared AUTHORIZATION cdd_owner;
CREATE SCHEMA IF NOT EXISTS identidade AUTHORIZATION cdd_owner;

GRANT USAGE ON SCHEMA shared TO cdd_app;
GRANT USAGE ON SCHEMA identidade TO cdd_app;
