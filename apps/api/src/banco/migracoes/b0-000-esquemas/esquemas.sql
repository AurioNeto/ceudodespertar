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
-- Sem IF NOT EXISTS: a migration inteira roda numa única transação
-- (allOrNothing/transactional), então não existe um "retomar depois de
-- falha a meio do arquivo" a proteger — uma falha aqui sempre desfaz tudo.
-- Um schema com este nome já existindo é uma divergência real (nome
-- colidindo com outra coisa, ou a migration rodando duas vezes por engano)
-- e precisa derrubar a migration, não passar em silêncio.

CREATE SCHEMA shared AUTHORIZATION cdd_owner;
CREATE SCHEMA identidade AUTHORIZATION cdd_owner;

GRANT USAGE ON SCHEMA shared TO cdd_app;
GRANT USAGE ON SCHEMA identidade TO cdd_app;
