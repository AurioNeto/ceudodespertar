DROP INDEX IF EXISTS identidade.usuario_por_nome;

ALTER TABLE identidade.usuario_grupo
  RENAME CONSTRAINT usuario_grupo_grupo_fk TO usuario_grupo_instituicao_id_grupo_id_fkey;

DROP INDEX IF EXISTS identidade.usuario_grupo_por_grupo;
