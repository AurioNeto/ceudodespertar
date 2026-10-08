-- b0-008-auditoria-grupo-editado
--
-- O agregado Grupo emite GRUPO_EDITADO (conceder, revogar, excluir e renomear),
-- distinto de GRUPO_ALTERADO, que é a mudança de grupos de um usuário
-- (Doc 3 §10.4). A trilha síncrona grava os dois, então a enumeração de
-- operacao ganha GRUPO_EDITADO.
--
-- Efeito de lock: ALTER TABLE ... ADD CONSTRAINT toma ACCESS EXCLUSIVE em
-- identidade.registro_de_auditoria e valida as linhas existentes (varredura
-- única); em B0 a trilha é pequena. Não dispara o gatilho de só-inserção.
--
-- Roda como cdd_owner.

ALTER TABLE identidade.registro_de_auditoria
  DROP CONSTRAINT registro_de_auditoria_operacao_check;

ALTER TABLE identidade.registro_de_auditoria
  ADD CONSTRAINT registro_de_auditoria_operacao_check CHECK (operacao IN (
    'LANCAMENTO_CONFIRMADO','LANCAMENTO_ESTORNADO','PENDENCIA_ABERTA',
    'PERIODO_FECHADO','PERIODO_REABERTO','PRESTACAO_GERADA','EXTRATO_IMPORTADO',
    'ADIANTAMENTO_AUTORIZADO','GRUPO_ALTERADO','GRUPO_EDITADO','USUARIO_CONVIDADO','USUARIO_ATIVADO',
    'USUARIO_SUSPENSO','USUARIO_REATIVADO',
    'FORMULARIO_PUBLICADO','PESSOA_ANONIMIZADA','ANAMNESE_LIDA','AUDITORIA_CONSULTADA'));
