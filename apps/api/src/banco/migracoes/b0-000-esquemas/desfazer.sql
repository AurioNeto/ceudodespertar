-- Reversão de b0-000-esquemas.
--
-- Só é segura enquanto nenhuma migration seguinte tiver criado algo dentro
-- de shared/identidade — o que é verdade só para esta etapa (F09b em
-- diante cria tabela, então a partir dali o down() delas é que precisa
-- rodar primeiro). RESTRICT (o padrão do DROP SCHEMA) garante isso: se
-- sobrar algum objeto dentro do schema, o comando falha em vez de arrastar
-- dados junto.

DROP SCHEMA IF EXISTS identidade;
DROP SCHEMA IF EXISTS shared;
