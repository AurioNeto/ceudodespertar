-- b0-009-usuario-grupo-por-grupo
--
-- identidade.usuario_grupo só tinha a chave primária (usuario_id, grupo_id):
-- a contagem de usuários ativos por grupo (GET /identidade/grupos) e a
-- verificação de membros ao revogar permissão varriam a tabela inteira.
-- O índice cobre a leitura por (instituicao_id, grupo_id).
--
-- A FK composta (instituicao_id, grupo_id) ganha nome explícito para que a
-- violação 23503 (grupo inexistente ou de outra instituição) seja mapeada
-- para GRUPO_INEXISTENTE em vez de sair como 500.
--
-- Efeito de lock e tamanho: CREATE INDEX toma SHARE em usuario_grupo (bloqueia
-- escritas, não leituras) durante a construção; RENAME CONSTRAINT é só
-- catálogo, mas toma ACCESS EXCLUSIVE até o commit, por isso vem depois do
-- índice. No B0 a tabela tem poucas dezenas de linhas por instituição. Fica o
-- CREATE INDEX simples: CONCURRENTLY não roda dentro de transação e a
-- migração é transacional.
--
-- O índice usuario_por_nome cobre a listagem de usuários, ordenada por
-- (instituicao_id, lower(nome), id).
--
-- Roda como cdd_owner.

CREATE INDEX usuario_grupo_por_grupo
  ON identidade.usuario_grupo (instituicao_id, grupo_id);

ALTER TABLE identidade.usuario_grupo
  RENAME CONSTRAINT usuario_grupo_instituicao_id_grupo_id_fkey TO usuario_grupo_grupo_fk;

CREATE INDEX usuario_por_nome
  ON identidade.usuario (instituicao_id, lower(nome), id);
