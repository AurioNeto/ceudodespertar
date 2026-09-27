-- b0-002-identidade
--
-- Tabelas de `identidade` (Doc 3) que sobrevivem ao corte de banco x domínio
-- (issue #11, Doc 7 §15/§21/anexo): estrutura, isolamento e as guardas
-- mínimas de histórico. Toda regra de negócio (convite de uso único, quem
-- pode fazer o quê) mora no agregado, não aqui.
--
-- Roda como cdd_owner, depois de b0-001-shared (shared.somente_insercao() e
-- as duas varreduras já existem).

-- Catálogo global, espelho do código (T29). Sem instituição: o vocabulário é
-- do sistema, não da casa. Grupos configuráveis combinam, não inventam. O
-- INSERT das 64 permissões é a migration seguinte (b0-003).
CREATE TABLE identidade.permissao (
  codigo     text PRIMARY KEY CHECK (codigo ~ '^[a-z]+\.[a-z_]+\.[a-z_]+$'),
  modulo     text NOT NULL,
  descricao  text NOT NULL
);

CREATE TABLE identidade.usuario (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id    uuid NOT NULL,
  subject_id        text UNIQUE,              -- `sub` do Keycloak; NULL até aceitar o convite.
                                                -- (situacao = 'CONVITE_PENDENTE') = (subject_id IS NULL)
                                                -- é regra do agregado Usuario (ativar grava o sub),
                                                -- não uma CHECK do banco — decisão do B0.
  pessoa_id         uuid,                     -- pessoas.pessoa — base do eixo de vínculo (Doc 3 §8)
  nome              text NOT NULL,
  email             text NOT NULL,
  situacao          text NOT NULL CHECK (situacao IN ('CONVITE_PENDENTE','ATIVO','SUSPENSO','REVOGADO')),
  ativado_em        timestamptz,
  suspenso_em       timestamptz,
  ultimo_acesso_em  timestamptz,
  versao            integer NOT NULL DEFAULT 1,
  criado_em         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (instituicao_id, id)
);
CREATE UNIQUE INDEX usuario_email_unico ON identidade.usuario (instituicao_id, lower(email));
-- US2: a mesma pessoa não é duas contas na mesma casa.
CREATE UNIQUE INDEX usuario_pessoa_unica ON identidade.usuario (instituicao_id, pessoa_id) WHERE pessoa_id IS NOT NULL;

-- O `sub` do Keycloak chega sem instituição, e `identidade.usuario` tem RLS
-- FORCE: sem contexto, nem o dono dos objetos leria a linha para descobri-la.
-- Molde de `eventos.resolver_link` (Documento 7 §7.3, §8, F07/B5): SECURITY
-- DEFINER, dono próprio sem BYPASSRLS, devolve só o necessário para montar
-- o contexto.
CREATE FUNCTION identidade.resolver_sujeito(p_subject_id text)
  RETURNS TABLE (instituicao_id uuid, usuario_id uuid)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT u.instituicao_id, u.id
    FROM identidade.usuario u
   WHERE u.subject_id = p_subject_id
$$;
REVOKE ALL ON FUNCTION identidade.resolver_sujeito(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION identidade.resolver_sujeito(text) TO cdd_app;
GRANT USAGE ON SCHEMA identidade TO cdd_resolvedor_identidade;
GRANT SELECT (subject_id, instituicao_id, id) ON identidade.usuario TO cdd_resolvedor_identidade;
GRANT CREATE ON SCHEMA identidade TO cdd_resolvedor_identidade;
ALTER FUNCTION identidade.resolver_sujeito(text) OWNER TO cdd_resolvedor_identidade;
REVOKE CREATE ON SCHEMA identidade FROM cdd_resolvedor_identidade;
CREATE POLICY resolucao_do_sujeito ON identidade.usuario FOR SELECT TO cdd_resolvedor_identidade USING (true);

CREATE TABLE identidade.grupo (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id  uuid NOT NULL,
  codigo_sistema  text,                       -- ADMINISTRADOR, TESOURARIA…; NULL em grupo criado pela casa
  nome            text NOT NULL,
  descricao       text NOT NULL DEFAULT '',
  protegido       boolean NOT NULL DEFAULT false,   -- G: grupo de sistema não se apaga
  ativo           boolean NOT NULL DEFAULT true,
  versao          integer NOT NULL DEFAULT 1,
  UNIQUE (instituicao_id, id),
  UNIQUE (instituicao_id, codigo_sistema)
);
CREATE UNIQUE INDEX grupo_nome_unico ON identidade.grupo (instituicao_id, lower(nome));

CREATE TABLE identidade.grupo_permissao (
  instituicao_id  uuid NOT NULL,
  grupo_id        uuid NOT NULL,
  permissao       text NOT NULL REFERENCES identidade.permissao (codigo),
  PRIMARY KEY (grupo_id, permissao),
  FOREIGN KEY (instituicao_id, grupo_id) REFERENCES identidade.grupo (instituicao_id, id) ON DELETE CASCADE
);

CREATE TABLE identidade.usuario_grupo (
  instituicao_id  uuid NOT NULL,
  usuario_id      uuid NOT NULL,
  grupo_id        uuid NOT NULL,
  atribuido_por   uuid NOT NULL,
  atribuido_em    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, grupo_id),
  FOREIGN KEY (instituicao_id, usuario_id) REFERENCES identidade.usuario (instituicao_id, id),
  FOREIGN KEY (instituicao_id, grupo_id)   REFERENCES identidade.grupo (instituicao_id, id)
);

CREATE TABLE identidade.convite (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id  uuid NOT NULL,
  usuario_id      uuid NOT NULL,
  token_sha256    bytea NOT NULL UNIQUE,      -- o token em si só existe no e-mail
  expira_em       timestamptz NOT NULL,
  usado_em        timestamptz,
  revogado_em     timestamptz,                -- convite cancelado antes do uso (reenvio, engano)
  criado_por      uuid NOT NULL,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (instituicao_id, usuario_id) REFERENCES identidade.usuario (instituicao_id, id),
  CONSTRAINT convite_nao_usado_e_revogado CHECK (usado_em IS NULL OR revogado_em IS NULL)
);
-- No máximo um convite vigente (nem usado, nem revogado) por usuário.
CREATE UNIQUE INDEX convite_vigente_unico ON identidade.convite (instituicao_id, usuario_id)
  WHERE usado_em IS NULL AND revogado_em IS NULL;

-- Trilha de auditoria (Doc 3 §10.4). Só INSERT — ver gatilho abaixo.
-- O alvo é guardado por referência, e o texto humano é montado na leitura:
-- anonimizar uma pessoa (LGPD) não pode exigir reescrever a trilha.
CREATE TABLE identidade.registro_de_auditoria (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id   uuid NOT NULL,
  em               timestamptz NOT NULL DEFAULT now(),
  -- Ator do ato: o despachante (consumidor de evento) e o link público
  -- também precisam auditar, e nenhum dos dois é um identidade.usuario.
  autor_tipo       text NOT NULL DEFAULT 'USUARIO' CHECK (autor_tipo IN ('USUARIO','SISTEMA','LINK_PUBLICO')),
  autor_usuario_id uuid,                      -- nulo fora de USUARIO
  autor_grupos     text[] NOT NULL,           -- fotografia dos grupos no instante do ato
  operacao         text NOT NULL CHECK (operacao IN (
                     'LANCAMENTO_CONFIRMADO','LANCAMENTO_ESTORNADO','PENDENCIA_ABERTA',
                     'PERIODO_FECHADO','PERIODO_REABERTO','PRESTACAO_GERADA','EXTRATO_IMPORTADO',
                     'ADIANTAMENTO_AUTORIZADO','GRUPO_ALTERADO','USUARIO_CONVIDADO','USUARIO_ATIVADO',
                     'USUARIO_SUSPENSO','USUARIO_REATIVADO',
                     'FORMULARIO_PUBLICADO','PESSOA_ANONIMIZADA','ANAMNESE_LIDA','AUDITORIA_CONSULTADA')),
  agregado_tipo    text NOT NULL,
  agregado_id      uuid NOT NULL,
  pessoa_alvo_id   uuid,                      -- quando o alvo é (ou envolve) uma pessoa
  detalhes         jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{rotulo, valor, anterior?}]
  sensivel         boolean NOT NULL DEFAULT false,
  correlacao_id    uuid,                      -- liga a trilha ao trace da requisição
  CONSTRAINT autor_coerente CHECK ((autor_tipo = 'USUARIO') = (autor_usuario_id IS NOT NULL))
);
CREATE INDEX auditoria_por_data     ON identidade.registro_de_auditoria (instituicao_id, em DESC);
CREATE INDEX auditoria_por_agregado ON identidade.registro_de_auditoria (agregado_tipo, agregado_id);

CREATE TRIGGER auditoria_somente_insercao
  BEFORE UPDATE OR DELETE ON identidade.registro_de_auditoria
  FOR EACH ROW EXECUTE FUNCTION shared.somente_insercao();

-- -----------------------------------------------------------------------------
-- Privilégios do papel de execução
-- -----------------------------------------------------------------------------

-- Por tabela, nunca `ON ALL TABLES IN SCHEMA` (mesmo raciocínio de
-- b0-001-shared): uma etapa futura que crie outra tabela em `identidade`
-- faz o próprio GRANT da sua tabela nova, sem repetir um GRANT amplo aqui.

-- O catálogo de permissões é do código: a aplicação só lê, a migration escreve.
GRANT SELECT ON identidade.permissao TO cdd_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON identidade.usuario TO cdd_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON identidade.grupo TO cdd_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON identidade.grupo_permissao TO cdd_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON identidade.usuario_grupo TO cdd_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON identidade.convite TO cdd_app;
-- Tabela só-inserção: além do gatilho, o papel nem recebe UPDATE/DELETE.
GRANT SELECT, INSERT ON identidade.registro_de_auditoria TO cdd_app;

SELECT shared.aplicar_isolamento_por_instituicao();
SELECT shared.proibir_truncate(ARRAY['identidade.registro_de_auditoria']::regclass[]);
