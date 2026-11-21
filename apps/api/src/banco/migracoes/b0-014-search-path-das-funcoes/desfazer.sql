-- Reversão de b0-014-search-path-das-funcoes.
ALTER FUNCTION shared.instituicao_atual() RESET search_path;
ALTER FUNCTION shared.somente_insercao() RESET search_path;
ALTER FUNCTION shared.proibir_truncate(regclass[]) RESET search_path;
ALTER FUNCTION shared.aplicar_isolamento_por_instituicao() RESET search_path;
