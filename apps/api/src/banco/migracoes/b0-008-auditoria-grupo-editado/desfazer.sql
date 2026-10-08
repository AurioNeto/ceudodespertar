-- NOT VALID: a trilha é só-inserção, então linhas GRUPO_EDITADO já gravadas
-- não podem ser removidas; o CHECK anterior volta a valer só para as novas.
ALTER TABLE identidade.registro_de_auditoria
  DROP CONSTRAINT registro_de_auditoria_operacao_check;

ALTER TABLE identidade.registro_de_auditoria
  ADD CONSTRAINT registro_de_auditoria_operacao_check CHECK (operacao IN (
    'LANCAMENTO_CONFIRMADO','LANCAMENTO_ESTORNADO','PENDENCIA_ABERTA',
    'PERIODO_FECHADO','PERIODO_REABERTO','PRESTACAO_GERADA','EXTRATO_IMPORTADO',
    'ADIANTAMENTO_AUTORIZADO','GRUPO_ALTERADO','USUARIO_CONVIDADO','USUARIO_ATIVADO',
    'USUARIO_SUSPENSO','USUARIO_REATIVADO',
    'FORMULARIO_PUBLICADO','PESSOA_ANONIMIZADA','ANAMNESE_LIDA','AUDITORIA_CONSULTADA')) NOT VALID;
