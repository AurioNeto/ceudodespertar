-- B0 · a trilha de auditoria (identidade.registro_de_auditoria) é
-- só-inserção (Documento 7 §15, §22): nem TRUNCATE, nem UPDATE, nem DELETE —
-- provado como cdd_app e como dono (quem roda migration, de quem o
-- descuido viria).

INSERT INTO shared.instituicao (id, nome) VALUES ('a0000000-0000-0000-0000-000000000000', 'Casa A');
SELECT set_config('app.instituicao_id', 'a0000000-0000-0000-0000-000000000000', false);

-- Como cdd_app: nem sequer tem o privilégio TRUNCATE concedido (a guarda
-- estrutural de §15 é "não há como", não só "o gatilho impede").
SET ROLE cdd_app;
SELECT verif.espera_erro('trilha · TRUNCATE como cdd_app não é permitido', $$
  TRUNCATE identidade.registro_de_auditoria
$$, '42501');
RESET ROLE;

-- Como dono (cdd_owner é quem roda migration e tem TRUNCATE implícito por
-- ser o dono da tabela): o gatilho `sem_truncate` barra mesmo assim.
SELECT verif.espera_erro('trilha · TRUNCATE como dono é barrado pelo gatilho sem_truncate', $$
  TRUNCATE identidade.registro_de_auditoria
$$, 'REGISTRO_IMUTAVEL');

-- Uma linha real, para provar que UPDATE/DELETE também são barrados — não só
-- a ausência de privilégio (owner tem privilégio pleno; quem barra é o
-- gatilho `auditoria_somente_insercao`).
INSERT INTO identidade.registro_de_auditoria (instituicao_id, autor_usuario_id, autor_grupos, operacao, agregado_tipo, agregado_id)
  VALUES ('a0000000-0000-0000-0000-000000000000', gen_random_uuid(), ARRAY['ADMINISTRADOR'], 'USUARIO_ATIVADO',
          'Usuario', gen_random_uuid());

SELECT verif.espera_erro('trilha · UPDATE como dono é barrado pelo gatilho auditoria_somente_insercao', $$
  UPDATE identidade.registro_de_auditoria SET operacao = 'USUARIO_SUSPENSO'
$$, 'REGISTRO_IMUTAVEL');

SELECT verif.espera_erro('trilha · DELETE como dono é barrado pelo gatilho auditoria_somente_insercao', $$
  DELETE FROM identidade.registro_de_auditoria
$$, 'REGISTRO_IMUTAVEL');

SELECT verif.confere('trilha · a linha inserida continua lá depois das tentativas',
  (SELECT count(*) FROM identidade.registro_de_auditoria), 1::bigint);

-- shared.proibir_truncate religa o gatilho que uma etapa anterior tenha
-- desligado (Documento 7 §22) — senão a varredura seguinte o encontraria
-- desabilitado e concluiria, errado, que a tabela já está guardada.
BEGIN;
ALTER TABLE identidade.registro_de_auditoria DISABLE TRIGGER sem_truncate;
SELECT shared.proibir_truncate(ARRAY['identidade.registro_de_auditoria']::regclass[]);
SELECT verif.confere('proibir_truncate · religa o gatilho sem_truncate que estava desligado',
  (SELECT tgenabled::text FROM pg_trigger WHERE tgrelid = 'identidade.registro_de_auditoria'::regclass AND tgname = 'sem_truncate'),
  'O');
ROLLBACK;
