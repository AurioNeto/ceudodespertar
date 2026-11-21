-- b0-014-search-path-das-funcoes
--
-- Fixa o search_path das quatro funções de shared criadas em b0-001. Roda como
-- cdd_owner. ALTER FUNCTION ... SET é idempotente: reaplicar sobre um banco que
-- já tem o caminho fixado não muda nada.
ALTER FUNCTION shared.instituicao_atual() SET search_path = pg_catalog, pg_temp;
ALTER FUNCTION shared.somente_insercao() SET search_path = pg_catalog, pg_temp;
ALTER FUNCTION shared.proibir_truncate(regclass[]) SET search_path = pg_catalog, pg_temp;
ALTER FUNCTION shared.aplicar_isolamento_por_instituicao() SET search_path = pg_catalog, pg_temp;
