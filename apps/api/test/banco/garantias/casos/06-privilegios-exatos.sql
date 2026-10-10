-- verificacoes: 22
-- B0 · privilégios EXATOS de cdd_app (Documento 7 §15): nem a mais, nem a
-- menos, tabela por tabela e função por função. Roda como dono, porque lê a
-- ACL de cdd_app (o dono não precisa dos privilégios dele para consultá-los).

SELECT verif.confere('privilégios · shared.instituicao é SELECT, INSERT, UPDATE, DELETE',
  verif.privilegios_de_tabela('cdd_app', 'shared.instituicao'),
  ARRAY['DELETE','INSERT','SELECT','UPDATE']);

SELECT verif.confere('privilégios · shared.outbox é SELECT, INSERT, UPDATE, DELETE',
  verif.privilegios_de_tabela('cdd_app', 'shared.outbox'),
  ARRAY['DELETE','INSERT','SELECT','UPDATE']);

SELECT verif.confere('privilégios · shared.evento_processado é SELECT, INSERT, UPDATE, DELETE',
  verif.privilegios_de_tabela('cdd_app', 'shared.evento_processado'),
  ARRAY['DELETE','INSERT','SELECT','UPDATE']);

SELECT verif.confere('privilégios · shared.chave_de_idempotencia é SELECT, INSERT, UPDATE, DELETE',
  verif.privilegios_de_tabela('cdd_app', 'shared.chave_de_idempotencia'),
  ARRAY['DELETE','INSERT','SELECT','UPDATE']);

SELECT verif.confere('privilégios · shared.outbox_id_seq é só USAGE',
  verif.privilegios_de_sequencia('cdd_app', 'shared.outbox_id_seq'),
  ARRAY['USAGE']);

SELECT verif.confere('privilégios · identidade.permissao é só SELECT (o código escreve, a app só lê)',
  verif.privilegios_de_tabela('cdd_app', 'identidade.permissao'),
  ARRAY['SELECT']);

SELECT verif.confere('privilégios · identidade.usuario é SELECT, INSERT, UPDATE, DELETE',
  verif.privilegios_de_tabela('cdd_app', 'identidade.usuario'),
  ARRAY['DELETE','INSERT','SELECT','UPDATE']);

SELECT verif.confere('privilégios · identidade.grupo é SELECT, INSERT, UPDATE, DELETE',
  verif.privilegios_de_tabela('cdd_app', 'identidade.grupo'),
  ARRAY['DELETE','INSERT','SELECT','UPDATE']);

SELECT verif.confere('privilégios · identidade.grupo_permissao é SELECT, INSERT, UPDATE, DELETE',
  verif.privilegios_de_tabela('cdd_app', 'identidade.grupo_permissao'),
  ARRAY['DELETE','INSERT','SELECT','UPDATE']);

SELECT verif.confere('privilégios · identidade.usuario_grupo é SELECT, INSERT, UPDATE, DELETE',
  verif.privilegios_de_tabela('cdd_app', 'identidade.usuario_grupo'),
  ARRAY['DELETE','INSERT','SELECT','UPDATE']);

SELECT verif.confere('privilégios · identidade.convite é SELECT, INSERT, UPDATE, DELETE',
  verif.privilegios_de_tabela('cdd_app', 'identidade.convite'),
  ARRAY['DELETE','INSERT','SELECT','UPDATE']);

-- Tabela só-inserção: o papel nem recebe UPDATE/DELETE — além do gatilho.
SELECT verif.confere('privilégios · identidade.registro_de_auditoria é só SELECT, INSERT',
  verif.privilegios_de_tabela('cdd_app', 'identidade.registro_de_auditoria'),
  ARRAY['INSERT','SELECT']);

SELECT verif.confere('privilégios · identidade.bootstrap_executado é só SELECT, INSERT',
  verif.privilegios_de_tabela('cdd_app', 'identidade.bootstrap_executado'),
  ARRAY['INSERT','SELECT']);

-- As três funções que só uma migration (ou o gatilho que instalam) chama:
-- PUBLIC nunca ganha EXECUTE nelas.
SELECT verif.confere('privilégios · PUBLIC sem EXECUTE em shared.aplicar_isolamento_por_instituicao',
  has_function_privilege('public', 'shared.aplicar_isolamento_por_instituicao()', 'EXECUTE'), false);

SELECT verif.confere('privilégios · PUBLIC sem EXECUTE em shared.proibir_truncate',
  has_function_privilege('public', 'shared.proibir_truncate(regclass[])', 'EXECUTE'), false);

SELECT verif.confere('privilégios · PUBLIC sem EXECUTE em shared.somente_insercao',
  has_function_privilege('public', 'shared.somente_insercao()', 'EXECUTE'), false);

-- has_function_privilege('public', ...) não pega um GRANT direto a cdd_app
-- (que não é PUBLIC): as três continuam de uso exclusivo de migration.
SELECT verif.confere('privilégios · cdd_app sem EXECUTE em shared.aplicar_isolamento_por_instituicao',
  has_function_privilege('cdd_app', 'shared.aplicar_isolamento_por_instituicao()', 'EXECUTE'), false);

SELECT verif.confere('privilégios · cdd_app sem EXECUTE em shared.proibir_truncate',
  has_function_privilege('cdd_app', 'shared.proibir_truncate(regclass[])', 'EXECUTE'), false);

SELECT verif.confere('privilégios · cdd_app sem EXECUTE em shared.somente_insercao',
  has_function_privilege('cdd_app', 'shared.somente_insercao()', 'EXECUTE'), false);

-- cdd_app não ganha CREATE em nenhum schema do B0 (só USAGE implícito pelos
-- GRANTs de tabela/função) — CREATE abriria a porta para o papel de execução
-- criar objetos por fora de migration.
SELECT verif.confere('privilégios · cdd_app sem CREATE no schema shared',
  has_schema_privilege('cdd_app', 'shared', 'CREATE'), false);

SELECT verif.confere('privilégios · cdd_app sem CREATE no schema identidade',
  has_schema_privilege('cdd_app', 'identidade', 'CREATE'), false);

-- Varredura pelo catálogo, não só nos dois schemas do B0: um GRANT CREATE
-- concedido em qualquer outro schema (ex.: public, que o Postgres cria por
-- padrão) também abriria a mesma porta, e as duas conferências acima não o
-- enxergariam. Fora pg_* (schemas internos), information_schema e verif
-- (schema desta própria suíte de verificação, sem relação com o B0).
SELECT verif.confere('privilégios · cdd_app sem CREATE em nenhum outro schema do catálogo (varredura de pg_namespace)',
  (SELECT count(*) FROM pg_namespace n
    WHERE n.nspname !~ '^pg_'
      AND n.nspname <> 'information_schema'
      AND n.nspname <> 'verif'
      AND has_schema_privilege('cdd_app', n.nspname, 'CREATE')),
  0::bigint);
