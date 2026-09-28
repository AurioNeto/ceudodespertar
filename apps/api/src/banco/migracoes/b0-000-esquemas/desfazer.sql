-- Reversão de b0-000-esquemas.
--
-- Só é segura enquanto nenhuma migration posterior tiver criado objetos
-- nesses schemas; a partir daí, o down() delas precisa rodar primeiro.
-- RESTRICT (o padrão do DROP SCHEMA) garante isso: se sobrar algum objeto
-- dentro do schema, o comando falha em vez de arrastar dados junto.

DROP SCHEMA identidade;
DROP SCHEMA shared;
