-- verificacoes: 9
-- B0 · CHECKs de enumeração e de formato (Documento 7 §15): valor fora da
-- lista declarada não entra — identidade.usuario.situacao,
-- identidade.registro_de_auditoria.autor_tipo e .operacao — e o formato de
-- identidade.permissao.codigo (modulo.entidade.acao, só minúsculas e `_`).
-- Cada INSERT isola uma única CHECK: as demais colunas ficam coerentes com
-- as outras guardas (ex.: autor_coerente), senão o erro pego não provaria
-- qual CHECK específica reprovou.

INSERT INTO shared.instituicao (id, nome) VALUES ('a0000000-0000-0000-0000-000000000000', 'Casa A');

SET ROLE cdd_app;
SELECT set_config('app.instituicao_id', 'a0000000-0000-0000-0000-000000000000', false);

SELECT verif.espera_erro('usuario.situacao · valor fora da lista', $$
  INSERT INTO identidade.usuario (instituicao_id, nome, email, situacao)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'Fulano', 'fulano@casaa.example', 'EXCLUIDO')
$$, '23514');

-- autor_tipo = 'HACKER' com autor_usuario_id nulo mantém autor_coerente
-- satisfeita ((autor_tipo = 'USUARIO') = (autor_usuario_id IS NOT NULL) →
-- false = false) — só a enumeração de autor_tipo reprova.
SELECT verif.espera_erro('registro_de_auditoria.autor_tipo · valor fora da lista', $$
  INSERT INTO identidade.registro_de_auditoria (instituicao_id, autor_tipo, autor_grupos, operacao, agregado_tipo, agregado_id)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'HACKER', ARRAY[]::text[], 'USUARIO_ATIVADO', 'Usuario', gen_random_uuid())
$$, '23514');

SELECT verif.espera_erro('registro_de_auditoria.operacao · valor fora da lista', $$
  INSERT INTO identidade.registro_de_auditoria (instituicao_id, autor_tipo, autor_grupos, operacao, agregado_tipo, agregado_id)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'SISTEMA', ARRAY[]::text[], 'OPERACAO_INEXISTENTE', 'PeriodoContabil', gen_random_uuid())
$$, '23514');

-- T29 · a aplicação não inventa permissão: grupo_permissao.permissao só
-- aceita um código presente no catálogo (FK a identidade.permissao).
INSERT INTO identidade.grupo (id, instituicao_id, nome)
  VALUES ('07000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'Grupo do teste de catálogo');

SELECT verif.espera_erro('grupo_permissao.permissao · código inventado, fora do catálogo, não entra', $$
  INSERT INTO identidade.grupo_permissao (instituicao_id, grupo_id, permissao)
    VALUES ('a0000000-0000-0000-0000-000000000000', '07000000-0000-0000-0000-000000000001', 'inventada.qualquer.coisa')
$$, 'grupo_permissao_permissao_fkey|violates foreign key constraint');

RESET ROLE;

-- permissao.codigo: cdd_app só tem SELECT nesta tabela (caso 06) — testado
-- como dono, que é quem roda a migration do catálogo (b0-003).
SELECT verif.espera_erro('permissao.codigo · fora do formato modulo.entidade.acao', $$
  INSERT INTO identidade.permissao (codigo, modulo, descricao)
    VALUES ('CodigoInvalido', 'sistema', 'Só para o teste de formato')
$$, '23514');

-- Os quatro espera_erro acima só provam que UM valor de fora não entra —
-- alargar a lista com outro valor (ex.: situacao + 'BLOQUEADO', autor_tipo +
-- 'ANONIMO', operacao + 'USUARIO_EXCLUIDO', ou a regex de código aceitando
-- maiúsculas) continuaria rejeitando o valor testado, e passaria batido.
-- Fixa pg_get_constraintdef contra o Documento 7 §15 — qualquer mudança na
-- lista ou no padrão reprova aqui, e não só quando coincide com o valor
-- escolhido acima.
SELECT verif.confere('CHECK · identidade.usuario.situacao não foi alargado', (
  SELECT pg_get_constraintdef(oid) FROM pg_constraint
   WHERE conrelid = 'identidade.usuario'::regclass AND conname = 'usuario_situacao_check'
), $chk$CHECK ((situacao = ANY (ARRAY['CONVITE_PENDENTE'::text, 'ATIVO'::text, 'SUSPENSO'::text, 'REVOGADO'::text])))$chk$);

SELECT verif.confere('CHECK · identidade.registro_de_auditoria.autor_tipo não foi alargado', (
  SELECT pg_get_constraintdef(oid) FROM pg_constraint
   WHERE conrelid = 'identidade.registro_de_auditoria'::regclass AND conname = 'registro_de_auditoria_autor_tipo_check'
), $chk$CHECK ((autor_tipo = ANY (ARRAY['USUARIO'::text, 'SISTEMA'::text, 'LINK_PUBLICO'::text])))$chk$);

SELECT verif.confere('CHECK · identidade.registro_de_auditoria.operacao não foi alargado', (
  SELECT pg_get_constraintdef(oid) FROM pg_constraint
   WHERE conrelid = 'identidade.registro_de_auditoria'::regclass AND conname = 'registro_de_auditoria_operacao_check'
), $chk$CHECK ((operacao = ANY (ARRAY['LANCAMENTO_CONFIRMADO'::text, 'LANCAMENTO_ESTORNADO'::text, 'PENDENCIA_ABERTA'::text, 'PERIODO_FECHADO'::text, 'PERIODO_REABERTO'::text, 'PRESTACAO_GERADA'::text, 'EXTRATO_IMPORTADO'::text, 'ADIANTAMENTO_AUTORIZADO'::text, 'GRUPO_ALTERADO'::text, 'USUARIO_CONVIDADO'::text, 'USUARIO_ATIVADO'::text, 'USUARIO_SUSPENSO'::text, 'USUARIO_REATIVADO'::text, 'FORMULARIO_PUBLICADO'::text, 'PESSOA_ANONIMIZADA'::text, 'ANAMNESE_LIDA'::text, 'AUDITORIA_CONSULTADA'::text])))$chk$);

SELECT verif.confere('CHECK · identidade.permissao.codigo não teve o formato alargado', (
  SELECT pg_get_constraintdef(oid) FROM pg_constraint
   WHERE conrelid = 'identidade.permissao'::regclass AND conname = 'permissao_codigo_check'
), $chk$CHECK ((codigo ~ '^[a-z]+\.[a-z_]+\.[a-z_]+$'::text))$chk$);
