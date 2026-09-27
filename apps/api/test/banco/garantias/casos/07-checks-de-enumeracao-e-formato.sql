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

RESET ROLE;

-- permissao.codigo: cdd_app só tem SELECT nesta tabela (caso 06) — testado
-- como dono, que é quem roda a migration do catálogo (b0-003).
SELECT verif.espera_erro('permissao.codigo · fora do formato modulo.entidade.acao', $$
  INSERT INTO identidade.permissao (codigo, modulo, descricao)
    VALUES ('CodigoInvalido', 'sistema', 'Só para o teste de formato')
$$, '23514');
