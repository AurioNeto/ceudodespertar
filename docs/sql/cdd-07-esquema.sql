-- =============================================================================
-- CDD — esquema de referência do banco (Documento 7)
--
-- PostgreSQL 16. Este arquivo é a fonte da verdade das colunas citadas no
-- Documento 7 e é executado na íntegra por `cdd-07-verificacao.sql`. Não é a
-- migration de produção: as migrations nascem do MikroORM (Documento 7 §22),
-- e cada uma delas deve manter este arquivo coerente.
--
-- Convenções (Documento 7 §14):
--   · um schema por módulo; nenhuma FK cruza schema — referência entre módulos
--     é por id, e a integridade é do domínio;
--   · toda tabela de domínio tem `instituicao_id`, RLS ativa e FORCE;
--   · dentro do schema, FKs são compostas com `instituicao_id`, para que uma
--     linha nunca aponte para outra instituição (FK ignora RLS);
--   · dinheiro em `bigint` de centavos; quantidade física em `numeric(12,3)`;
--   · competência é `date` no dia 1;
--   · enumerações são `text` + CHECK, não ENUM do Postgres (migram melhor);
--   · ids `uuid` gerados pela aplicação (UUIDv7); o DEFAULT existe para seed.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cdd_app') THEN
    CREATE ROLE cdd_app NOLOGIN NOBYPASSRLS;
  END IF;
END $$;

CREATE SCHEMA shared;
CREATE SCHEMA identidade;
CREATE SCHEMA pessoas;
CREATE SCHEMA financeiro;
CREATE SCHEMA eventos;
CREATE SCHEMA estoque;

-- -----------------------------------------------------------------------------
-- shared — o que é de todos e de nenhum módulo
-- -----------------------------------------------------------------------------

-- Fail-closed: sem `app.instituicao_id` na transação, devolve NULL e nenhuma
-- política casa. Esquecer o contexto produz tela vazia, nunca vazamento.
CREATE FUNCTION shared.instituicao_atual() RETURNS uuid
  LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('app.instituicao_id', true), '')::uuid $$;

CREATE TABLE shared.instituicao (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL,
  criada_em   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE shared.anexo (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id  uuid NOT NULL,
  chave           text NOT NULL,              -- caminho no bucket: {instituicao}/{modulo}/{uuid}
  nome_original   text NOT NULL,
  mime            text NOT NULL,
  tamanho_bytes   bigint NOT NULL CHECK (tamanho_bytes > 0),
  sha256          bytea NOT NULL,
  sensivel        boolean NOT NULL DEFAULT false,
  enviado_por     uuid NOT NULL,              -- identidade.usuario, ou NULL-equivalente do link público
  enviado_em      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (instituicao_id, id),
  UNIQUE (chave)
);

-- Outbox: gravado na mesma transação do agregado. Sem RLS de propósito — o
-- despachante lê de todas as instituições e restabelece o contexto de cada
-- evento antes de entregá-lo (Documento 7 §9).
CREATE TABLE shared.outbox (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  evento_id       uuid NOT NULL UNIQUE,
  instituicao_id  uuid NOT NULL,
  tipo            text NOT NULL,              -- 'financeiro.LancamentoConfirmado'
  agregado_tipo   text NOT NULL,
  agregado_id     uuid NOT NULL,
  payload         jsonb NOT NULL,
  ocorrido_em     timestamptz NOT NULL DEFAULT now(),
  publicado_em    timestamptz,
  tentativas      integer NOT NULL DEFAULT 0,
  ultimo_erro     text
);
CREATE INDEX outbox_pendentes ON shared.outbox (id) WHERE publicado_em IS NULL;

-- Idempotência dos consumidores: cada handler registra o que já processou.
CREATE TABLE shared.evento_processado (
  consumidor    text NOT NULL,
  evento_id     uuid NOT NULL,
  processado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (consumidor, evento_id)
);

-- Idempotência de comando HTTP (cabeçalho Idempotency-Key).
CREATE TABLE shared.chave_de_idempotencia (
  instituicao_id  uuid NOT NULL,
  chave           text NOT NULL,
  usuario_id      uuid,
  rota            text NOT NULL,
  status_http     smallint NOT NULL,
  resposta        jsonb NOT NULL,
  criada_em       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (instituicao_id, chave)
);

-- -----------------------------------------------------------------------------
-- identidade — Doc 3
-- -----------------------------------------------------------------------------

-- Catálogo global, espelho do código (T29). Sem instituição: o vocabulário é
-- do sistema, não da casa. Grupos configuráveis combinam, não inventam.
CREATE TABLE identidade.permissao (
  codigo     text PRIMARY KEY CHECK (codigo ~ '^[a-z]+\.[a-z_]+\.[a-z_]+$'),
  modulo     text NOT NULL,
  descricao  text NOT NULL
);

CREATE TABLE identidade.usuario (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id    uuid NOT NULL,
  subject_id        text UNIQUE,              -- `sub` do Keycloak; NULL até aceitar o convite
  pessoa_id         uuid,                     -- pessoas.pessoa — base do eixo de vínculo (Doc 3 §8)
  nome              text NOT NULL,
  email             text NOT NULL,
  situacao          text NOT NULL CHECK (situacao IN ('CONVITE_PENDENTE','ATIVO','SUSPENSO','REVOGADO')),
  ativado_em        timestamptz,
  suspenso_em       timestamptz,
  ultimo_acesso_em  timestamptz,
  versao            integer NOT NULL DEFAULT 1,
  criado_em         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (instituicao_id, id),
  CHECK (situacao = 'CONVITE_PENDENTE' OR subject_id IS NOT NULL)
);
CREATE UNIQUE INDEX usuario_email_unico ON identidade.usuario (instituicao_id, lower(email));

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
  criado_por      uuid NOT NULL,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (instituicao_id, usuario_id) REFERENCES identidade.usuario (instituicao_id, id)
);

-- Trilha de auditoria (Doc 3 §10.4). Só INSERT — ver gatilho abaixo.
-- O alvo é guardado por referência, e o texto humano é montado na leitura:
-- anonimizar uma pessoa (LGPD) não pode exigir reescrever a trilha.
CREATE TABLE identidade.registro_de_auditoria (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id   uuid NOT NULL,
  em               timestamptz NOT NULL DEFAULT now(),
  autor_usuario_id uuid NOT NULL,
  autor_grupos     text[] NOT NULL,           -- fotografia dos grupos no instante do ato
  operacao         text NOT NULL CHECK (operacao IN (
                     'LANCAMENTO_CONFIRMADO','LANCAMENTO_ESTORNADO','PENDENCIA_ABERTA',
                     'PERIODO_FECHADO','PERIODO_REABERTO','PRESTACAO_GERADA','EXTRATO_IMPORTADO',
                     'ADIANTAMENTO_AUTORIZADO','GRUPO_ALTERADO','USUARIO_CONVIDADO','USUARIO_SUSPENSO',
                     'FORMULARIO_PUBLICADO','PESSOA_ANONIMIZADA','ANAMNESE_LIDA','AUDITORIA_CONSULTADA')),
  agregado_tipo    text NOT NULL,
  agregado_id      uuid NOT NULL,
  pessoa_alvo_id   uuid,                      -- quando o alvo é (ou envolve) uma pessoa
  detalhes         jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{rotulo, valor, anterior?}]
  sensivel         boolean NOT NULL DEFAULT false,
  correlacao_id    uuid                       -- liga a trilha ao trace da requisição
);
CREATE INDEX auditoria_por_data     ON identidade.registro_de_auditoria (instituicao_id, em DESC);
CREATE INDEX auditoria_por_agregado ON identidade.registro_de_auditoria (agregado_tipo, agregado_id);

CREATE FUNCTION shared.somente_insercao() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'REGISTRO_IMUTAVEL: % não aceita %', TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'P0001';
END $$;

CREATE TRIGGER auditoria_somente_insercao
  BEFORE UPDATE OR DELETE ON identidade.registro_de_auditoria
  FOR EACH ROW EXECUTE FUNCTION shared.somente_insercao();

-- -----------------------------------------------------------------------------
-- pessoas — Doc 2 §3, com as decisões 7 e 8 e §2.6 do Doc 6
-- -----------------------------------------------------------------------------

CREATE TABLE pessoas.pessoa (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id           uuid NOT NULL,
  tipo                     text NOT NULL CHECK (tipo IN ('FISICA','JURIDICA')),
  nome                     text NOT NULL,
  apelido                  text,
  documento                text CHECK (documento ~ '^[0-9]{11}$|^[0-9]{14}$'),  -- CPF/CNPJ só dígitos
  telefone                 text,
  email                    text,
  cidade                   text,
  nascimento               date,
  foto_anexo_id            uuid,
  -- Decisão 7: o eixo "o quanto a pessoa é da casa" é campo, não papel.
  relacao_com_a_casa       text CHECK (relacao_com_a_casa IN ('MEMBRO','FREQUENTADOR','VISITANTE')),
  contato_emergencia_nome  text,
  contato_emergencia_tel   text,
  cadastrada_por_link      boolean NOT NULL DEFAULT false,  -- autocadastro (Doc 6 §2.6)
  anonimizada_em           timestamptz,
  ativa                    boolean NOT NULL DEFAULT true,
  versao                   integer NOT NULL DEFAULT 1,
  criada_em                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (instituicao_id, id),
  CHECK (tipo = 'FISICA' OR relacao_com_a_casa IS NULL),
  CHECK (anonimizada_em IS NULL OR documento IS NULL)
);
-- O CPF é a chave do link público: uma pessoa por documento na instituição.
CREATE UNIQUE INDEX pessoa_documento_unico ON pessoas.pessoa (instituicao_id, documento) WHERE documento IS NOT NULL;
CREATE INDEX pessoa_nome ON pessoas.pessoa (instituicao_id, lower(nome));

-- Papéis com vigência. MADRINHA/PADRINHO aqui é o que A1 consulta.
CREATE TABLE pessoas.vinculo (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id  uuid NOT NULL,
  pessoa_id       uuid NOT NULL,
  papel           text NOT NULL CHECK (papel IN ('MADRINHA','PADRINHO','GUARDIAO','CUIDADORA','ACOLHIMENTO',
                    'VOLUNTARIO','MUSICO','PRESTADOR','FORNECEDOR','CONTRATANTE','PARTICIPANTE','APOIADOR')),
  unidade_id      uuid,                       -- financeiro.unidade, por id
  vigencia        daterange NOT NULL CHECK (NOT isempty(vigencia) AND lower_inc(vigencia)),
  registrado_por  uuid NOT NULL,
  FOREIGN KEY (instituicao_id, pessoa_id) REFERENCES pessoas.pessoa (instituicao_id, id),
  -- V: o mesmo papel não se sobrepõe a si mesmo para a mesma pessoa e unidade.
  CONSTRAINT v_papel_sem_sobreposicao EXCLUDE USING gist (
    instituicao_id WITH =, pessoa_id WITH =, papel WITH =,
    (coalesce(unidade_id, '00000000-0000-0000-0000-000000000000'::uuid)) WITH =,
    vigencia WITH &&)
);

CREATE TABLE pessoas.autorizacao_de_responsavel (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id     uuid NOT NULL,
  menor_id           uuid NOT NULL,
  responsavel_id     uuid NOT NULL,
  evento_id          uuid,                    -- NULL = autorização geral com validade
  valida_ate         date,
  documento_anexo_id uuid,
  registrada_por     uuid NOT NULL,
  registrada_em      timestamptz NOT NULL DEFAULT now(),
  revogada_em        timestamptz,
  FOREIGN KEY (instituicao_id, menor_id)       REFERENCES pessoas.pessoa (instituicao_id, id),
  FOREIGN KEY (instituicao_id, responsavel_id) REFERENCES pessoas.pessoa (instituicao_id, id),
  CHECK (menor_id <> responsavel_id),
  CHECK (evento_id IS NOT NULL OR valida_ate IS NOT NULL)
);

CREATE TABLE pessoas.consentimento (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id  uuid NOT NULL,
  pessoa_id       uuid NOT NULL,
  finalidade      text NOT NULL,              -- 'ANAMNESE', 'USO_DE_IMAGEM', 'CONTATO'…
  texto_versao    text NOT NULL,              -- a versão do texto que a pessoa leu
  concedido_em    timestamptz NOT NULL DEFAULT now(),
  canal           text NOT NULL CHECK (canal IN ('LINK_DE_INSCRICAO','RECEPCAO','MIGRACAO')),
  revogado_em     timestamptz,
  FOREIGN KEY (instituicao_id, pessoa_id) REFERENCES pessoas.pessoa (instituicao_id, id)
);

CREATE TABLE pessoas.formulario_de_anamnese (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id  uuid NOT NULL,
  versao          integer NOT NULL CHECK (versao > 0),
  status          text NOT NULL CHECK (status IN ('RASCUNHO','PUBLICADA','SUPERSEDIDA')),
  validade_meses  smallint NOT NULL CHECK (validade_meses BETWEEN 1 AND 60),
  publicada_em    timestamptz,
  publicada_por   uuid,
  UNIQUE (instituicao_id, id),
  UNIQUE (instituicao_id, versao),
  CHECK (status = 'RASCUNHO' OR publicada_em IS NOT NULL)
);
-- FA: no máximo uma versão publicada por vez.
CREATE UNIQUE INDEX formulario_um_publicado ON pessoas.formulario_de_anamnese (instituicao_id) WHERE status = 'PUBLICADA';

-- A pergunta tem identidade estável entre versões (Doc 2 §3.4); o texto de
-- cada versão mora na associação. É isso que torna o delta calculável.
CREATE TABLE pessoas.pergunta (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id  uuid NOT NULL,
  codigo          text NOT NULL,
  criada_em       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (instituicao_id, id),
  UNIQUE (instituicao_id, codigo)
);

CREATE TABLE pessoas.pergunta_no_formulario (
  instituicao_id      uuid NOT NULL,
  formulario_id       uuid NOT NULL,
  pergunta_id         uuid NOT NULL,
  ordem               smallint NOT NULL,
  texto               text NOT NULL,
  tipo                text NOT NULL CHECK (tipo IN ('BOOLEANO','TEXTO','ESCOLHA_UNICA','ESCOLHA_MULTIPLA','DATA','NUMERO')),
  opcoes              jsonb NOT NULL DEFAULT '[]'::jsonb,
  obrigatoria         boolean NOT NULL,
  sensivel            boolean NOT NULL,
  regra_de_alerta     jsonb,
  -- Mudança de sentido: invalida a resposta anterior (motivo SUBSTITUIU).
  exige_nova_resposta boolean NOT NULL DEFAULT false,
  PRIMARY KEY (formulario_id, pergunta_id),
  UNIQUE (formulario_id, ordem),
  FOREIGN KEY (instituicao_id, formulario_id) REFERENCES pessoas.formulario_de_anamnese (instituicao_id, id),
  FOREIGN KEY (instituicao_id, pergunta_id)   REFERENCES pessoas.pergunta (instituicao_id, id)
);

CREATE TABLE pessoas.resposta_de_anamnese (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id   uuid NOT NULL,
  pessoa_id        uuid NOT NULL,
  formulario_id    uuid NOT NULL,             -- a versão contra a qual foi respondida
  modo             text NOT NULL CHECK (modo IN ('PRIMEIRA_VEZ','INCREMENTAL','REVALIDACAO_COMPLETA','POR_ESCOLHA','MIGRACAO')),
  situacao         text NOT NULL CHECK (situacao IN ('VIGENTE','SUPERSEDIDA')),
  respondida_em    timestamptz NOT NULL DEFAULT now(),
  valida_ate       date NOT NULL,
  canal            text NOT NULL CHECK (canal IN ('LINK_DE_INSCRICAO','MIGRACAO')),
  evento_origem_id uuid,                      -- a inscrição que motivou, quando houve
  dispara_alerta   boolean NOT NULL DEFAULT false,
  supersedida_por  uuid,
  UNIQUE (instituicao_id, id),
  FOREIGN KEY (instituicao_id, pessoa_id)       REFERENCES pessoas.pessoa (instituicao_id, id),
  FOREIGN KEY (instituicao_id, formulario_id)   REFERENCES pessoas.formulario_de_anamnese (instituicao_id, id),
  FOREIGN KEY (instituicao_id, supersedida_por) REFERENCES pessoas.resposta_de_anamnese (instituicao_id, id)
);
-- RA: uma resposta vigente por pessoa. A anterior fica, supersedida.
CREATE UNIQUE INDEX resposta_uma_vigente ON pessoas.resposta_de_anamnese (instituicao_id, pessoa_id) WHERE situacao = 'VIGENTE';

-- Uma linha por pergunta respondida. Resposta incremental herda as linhas que
-- não mudaram, apontando a origem — o parecer sabe o que foi dito quando.
CREATE TABLE pessoas.item_de_resposta (
  instituicao_id    uuid NOT NULL,
  resposta_id       uuid NOT NULL,
  pergunta_id       uuid NOT NULL,
  valor             jsonb NOT NULL,
  respondido_em     timestamptz NOT NULL,     -- quando a pessoa disse isso, não quando foi copiado
  herdado_de        uuid,                     -- resposta de onde o item veio sem mudança
  motivo_pendencia  text CHECK (motivo_pendencia IN ('PRIMEIRA_VEZ','NOVA_NA_VERSAO','SUBSTITUIU','REVALIDACAO','POR_ESCOLHA')),
  dispara_alerta    boolean NOT NULL DEFAULT false,
  PRIMARY KEY (resposta_id, pergunta_id),
  FOREIGN KEY (instituicao_id, resposta_id) REFERENCES pessoas.resposta_de_anamnese (instituicao_id, id),
  FOREIGN KEY (instituicao_id, pergunta_id) REFERENCES pessoas.pergunta (instituicao_id, id),
  FOREIGN KEY (instituicao_id, herdado_de)  REFERENCES pessoas.resposta_de_anamnese (instituicao_id, id),
  CONSTRAINT item_herdado_ou_com_motivo CHECK ((herdado_de IS NULL) <> (motivo_pendencia IS NULL))
);

-- Doc 6 §2.6: por cerimônia, sempre. Anamnese em dia não basta.
CREATE TABLE pessoas.declaracao_de_veracidade (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id  uuid NOT NULL,
  pessoa_id       uuid NOT NULL,
  evento_id       uuid NOT NULL,              -- eventos.evento, por id
  resposta_id     uuid NOT NULL,              -- a resposta vigente no instante da declaração
  texto           text NOT NULL,              -- o texto exato que a pessoa afirmou
  declarada_em    timestamptz NOT NULL DEFAULT now(),
  origem_ip_hash  bytea,                      -- prova de canal sem guardar o IP
  UNIQUE (instituicao_id, id),
  CONSTRAINT uma_declaracao_por_cerimonia UNIQUE (instituicao_id, evento_id, pessoa_id),
  FOREIGN KEY (instituicao_id, pessoa_id)   REFERENCES pessoas.pessoa (instituicao_id, id),
  FOREIGN KEY (instituicao_id, resposta_id) REFERENCES pessoas.resposta_de_anamnese (instituicao_id, id)
);

-- RA3: toda leitura de resposta é registrada. Só INSERT.
CREATE TABLE pessoas.registro_de_acesso (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id      uuid NOT NULL,
  em                  timestamptz NOT NULL DEFAULT now(),
  leitor_usuario_id   uuid NOT NULL,
  pessoa_id           uuid NOT NULL,
  resposta_id         uuid NOT NULL,
  contexto_tipo       text CHECK (contexto_tipo IN ('INSCRICAO','REVISAO','ATENDIMENTO')),
  contexto_descricao  text,
  FOREIGN KEY (instituicao_id, pessoa_id)   REFERENCES pessoas.pessoa (instituicao_id, id),
  FOREIGN KEY (instituicao_id, resposta_id) REFERENCES pessoas.resposta_de_anamnese (instituicao_id, id)
);
CREATE INDEX acesso_por_pessoa ON pessoas.registro_de_acesso (instituicao_id, pessoa_id, em DESC);
CREATE TRIGGER acesso_somente_insercao
  BEFORE UPDATE OR DELETE ON pessoas.registro_de_acesso
  FOR EACH ROW EXECUTE FUNCTION shared.somente_insercao();

-- -----------------------------------------------------------------------------
-- financeiro — Doc 2 §1, com as decisões 1–4 e 11 do Doc 6
-- -----------------------------------------------------------------------------

CREATE TABLE financeiro.unidade (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id  uuid NOT NULL,
  codigo_sistema  text NOT NULL,
  nome            text NOT NULL,
  regime          text NOT NULL CHECK (regime IN ('CONTRIBUICAO','COMERCIAL')),
  teto_anual      bigint CHECK (teto_anual > 0),   -- MEI: faturamento contra o teto
  ativa           boolean NOT NULL DEFAULT true,
  versao          integer NOT NULL DEFAULT 1,
  UNIQUE (instituicao_id, id),
  UNIQUE (instituicao_id, codigo_sistema),
  CHECK (regime = 'COMERCIAL' OR teto_anual IS NULL)
);

-- Decisão 2: "Grupo" (onde o gasto aconteceu) convive com Unidade.
CREATE TABLE financeiro.grupo_de_custo (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id  uuid NOT NULL,
  codigo_sistema  text NOT NULL,
  nome            text NOT NULL,
  ativo           boolean NOT NULL DEFAULT true,
  UNIQUE (instituicao_id, id),
  UNIQUE (instituicao_id, codigo_sistema)
);

CREATE TABLE financeiro.categoria (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id     uuid NOT NULL,
  codigo_sistema     text NOT NULL,
  nome               text NOT NULL,
  natureza           text NOT NULL CHECK (natureza IN ('RECEITA','DESPESA')),
  tipo               text NOT NULL CHECK (tipo IN ('OPERACIONAL','INVESTIMENTO','MANUTENCAO','PATRIMONIAL')),
  regimes_permitidos text[] NOT NULL CHECK (regimes_permitidos <@ ARRAY['CONTRIBUICAO','COMERCIAL'] AND cardinality(regimes_permitidos) > 0),
  unidade_padrao_id  uuid,
  linha_relatorio    text NOT NULL,
  ativa              boolean NOT NULL DEFAULT true,
  UNIQUE (instituicao_id, id),
  UNIQUE (instituicao_id, id, natureza),      -- alvo da FK que garante L3 na etiqueta
  UNIQUE (instituicao_id, codigo_sistema),
  FOREIGN KEY (instituicao_id, unidade_padrao_id) REFERENCES financeiro.unidade (instituicao_id, id)
);

CREATE TABLE financeiro.conta (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id         uuid NOT NULL,
  nome                   text NOT NULL,
  descricao              text NOT NULL DEFAULT '',
  tipo                   text NOT NULL CHECK (tipo IN ('CONTA_CORRENTE','CARTAO_CREDITO','DINHEIRO','FUNDO')),
  titularidade           text NOT NULL CHECK (titularidade IN ('INSTITUCIONAL','PESSOAL_DE_TERCEIRO')),
  pessoa_titular_id      uuid,                -- pessoas.pessoa; obrigatório se pessoal (CT)
  identificador_bancario text,                -- banco/agência/conta — casa o OFX com a conta
  unidade_id             uuid,
  ativa                  boolean NOT NULL DEFAULT true,
  versao                 integer NOT NULL DEFAULT 1,
  UNIQUE (instituicao_id, id),
  UNIQUE (instituicao_id, id, tipo),
  UNIQUE (instituicao_id, id, titularidade),
  FOREIGN KEY (instituicao_id, unidade_id) REFERENCES financeiro.unidade (instituicao_id, id),
  CHECK ((titularidade = 'PESSOAL_DE_TERCEIRO') = (pessoa_titular_id IS NOT NULL))
);
CREATE UNIQUE INDEX conta_identificador_unico ON financeiro.conta (instituicao_id, identificador_bancario) WHERE identificador_bancario IS NOT NULL;

CREATE TABLE financeiro.fundo (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id      uuid NOT NULL,
  codigo_sistema      text NOT NULL,
  nome                text NOT NULL,
  nota                text NOT NULL DEFAULT '',
  conta_vinculada_id  uuid NOT NULL,
  meta                bigint CHECK (meta > 0),
  categorias_permitidas text[] NOT NULL DEFAULT '{}',  -- códigos de sistema (FD1)
  ativo               boolean NOT NULL DEFAULT true,
  UNIQUE (instituicao_id, id),
  UNIQUE (instituicao_id, codigo_sistema),
  FOREIGN KEY (instituicao_id, conta_vinculada_id) REFERENCES financeiro.conta (instituicao_id, id)
);

CREATE TABLE financeiro.fatura (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id              uuid NOT NULL,
  conta_id                    uuid NOT NULL,
  conta_tipo                  text NOT NULL DEFAULT 'CARTAO_CREDITO' CHECK (conta_tipo = 'CARTAO_CREDITO'),
  competencia                 date NOT NULL CHECK (extract(day FROM competencia) = 1),
  data_fechamento             date NOT NULL,
  data_vencimento             date NOT NULL,
  status                      text NOT NULL CHECK (status IN ('ABERTA','FECHADA','PAGA')),
  transferencia_pagamento_id  uuid,           -- F3: quem quita é a transferência
  versao                      integer NOT NULL DEFAULT 1,
  UNIQUE (instituicao_id, id),
  UNIQUE (instituicao_id, conta_id, competencia),
  -- F1: fatura só em cartão, garantido pelo banco.
  CONSTRAINT f1_fatura_so_em_cartao FOREIGN KEY (instituicao_id, conta_id, conta_tipo) REFERENCES financeiro.conta (instituicao_id, id, tipo),
  CHECK (data_vencimento >= data_fechamento),
  CHECK ((status = 'PAGA') = (transferencia_pagamento_id IS NOT NULL))
);

CREATE TABLE financeiro.lancamento (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id    uuid NOT NULL,
  status            text NOT NULL CHECK (status IN ('A_CONFERIR','CONFIRMADO','ESTORNADO')),
  origem            text NOT NULL CHECK (origem IN ('MANUAL','REGISTRO_RAPIDO','COMPROVANTE_IA',
                      'IMPORTACAO_EXTRATO','IMPORTACAO_TEXTO','INTEGRACAO_EVENTOS','INTEGRACAO_ESTOQUE','MIGRACAO')),
  -- Natureza do valor líquido. Com etiquetas de naturezas mistas (decisão 1),
  -- é a natureza do saldo delas — não mais uma cópia da categoria (L3 revisto).
  natureza          text NOT NULL CHECK (natureza IN ('RECEITA','DESPESA')),
  valor             bigint NOT NULL CHECK (valor > 0),                          -- L1
  motivo            text NOT NULL,
  unidade_id        uuid,
  grupo_de_custo_id uuid,
  conta_id          uuid,
  fatura_id         uuid,
  pessoa_id         uuid,                     -- contraparte cadastrada (pessoas.pessoa)
  contraparte_texto text,                     -- contraparte ainda não cadastrada
  forma_pagamento   text,
  evento_id         uuid,                     -- eventos.evento
  competencia       date CHECK (extract(day FROM competencia) = 1),
  data_competencia  date,
  data_caixa        date,
  reembolso_a_id    uuid,                     -- pessoas.pessoa a ressarcir
  comprovante_id    uuid,                     -- shared.anexo
  estorno_de_id     uuid UNIQUE,              -- um estorno por lançamento
  registrado_por    uuid NOT NULL,
  registrado_em     timestamptz NOT NULL DEFAULT now(),
  confirmado_por    uuid,
  confirmado_em     timestamptz,
  versao            integer NOT NULL DEFAULT 1,
  UNIQUE (instituicao_id, id),
  UNIQUE (instituicao_id, id, natureza),
  FOREIGN KEY (instituicao_id, unidade_id)        REFERENCES financeiro.unidade (instituicao_id, id),
  FOREIGN KEY (instituicao_id, grupo_de_custo_id) REFERENCES financeiro.grupo_de_custo (instituicao_id, id),
  FOREIGN KEY (instituicao_id, conta_id)          REFERENCES financeiro.conta (instituicao_id, id),
  FOREIGN KEY (instituicao_id, fatura_id)         REFERENCES financeiro.fatura (instituicao_id, id),
  -- O estorno tem a natureza do original e conta com sinal invertido (Doc 6 §2.5.1).
  CONSTRAINT estorno_mesma_natureza FOREIGN KEY (instituicao_id, estorno_de_id, natureza) REFERENCES financeiro.lancamento (instituicao_id, id, natureza),
  CHECK (estorno_de_id IS NULL OR estorno_de_id <> id),
  -- L7: A_CONFERIR admite lacuna; confirmado não.
  CONSTRAINT l7_confirmado_completo CHECK (status = 'A_CONFERIR' OR (unidade_id IS NOT NULL AND conta_id IS NOT NULL
         AND competencia IS NOT NULL AND data_competencia IS NOT NULL AND confirmado_por IS NOT NULL)),
  CHECK (data_competencia IS NULL OR competencia = date_trunc('month', data_competencia)::date),
  -- L6
  CONSTRAINT l6_caixa_depois_da_competencia CHECK (data_caixa IS NULL OR data_competencia IS NULL OR data_caixa >= data_competencia)
);
CREATE INDEX lancamento_competencia ON financeiro.lancamento (instituicao_id, unidade_id, competencia);
CREATE INDEX lancamento_fila        ON financeiro.lancamento (instituicao_id, registrado_em) WHERE status = 'A_CONFERIR';
CREATE INDEX lancamento_evento      ON financeiro.lancamento (instituicao_id, evento_id) WHERE evento_id IS NOT NULL;
CREATE INDEX lancamento_conta_caixa ON financeiro.lancamento (instituicao_id, conta_id, data_caixa);
CREATE INDEX lancamento_autor       ON financeiro.lancamento (instituicao_id, registrado_por, registrado_em DESC);

-- Decisão 1: a etiqueta carrega valor e natureza próprios. O caso Aline —
-- devia 100 de contribuição, forneceu 70 + 50 — vira um lançamento de despesa
-- de 20 com três etiquetas. A soma com sinal das etiquetas é o valor.
CREATE TABLE financeiro.lancamento_categoria (
  instituicao_id  uuid NOT NULL,
  lancamento_id   uuid NOT NULL,
  categoria_id    uuid NOT NULL,
  natureza        text NOT NULL,              -- cópia garantida por FK: é a da categoria (L3)
  valor           bigint NOT NULL CHECK (valor > 0),
  PRIMARY KEY (lancamento_id, categoria_id),
  FOREIGN KEY (instituicao_id, lancamento_id) REFERENCES financeiro.lancamento (instituicao_id, id) ON DELETE CASCADE,
  CONSTRAINT l3_natureza_da_categoria FOREIGN KEY (instituicao_id, categoria_id, natureza) REFERENCES financeiro.categoria (instituicao_id, id, natureza)
);

-- L10/L11: pendência é conversa, não estado.
CREATE TABLE financeiro.pendencia (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id   uuid NOT NULL,
  lancamento_id    uuid NOT NULL,
  texto            text NOT NULL,
  aberta_por       uuid NOT NULL,
  destinatario     uuid NOT NULL,             -- sempre o registrado_por (L10, no domínio)
  aberta_em        timestamptz NOT NULL DEFAULT now(),
  resposta         text,
  resolvida_em     timestamptz,
  FOREIGN KEY (instituicao_id, lancamento_id) REFERENCES financeiro.lancamento (instituicao_id, id),
  CHECK ((resposta IS NULL) = (resolvida_em IS NULL)),
  CONSTRAINT l10_pergunta_a_quem_registrou CHECK (aberta_por <> destinatario)
);
CREATE UNIQUE INDEX pendencia_uma_aberta ON financeiro.pendencia (lancamento_id) WHERE resolvida_em IS NULL;

CREATE TABLE financeiro.emprestimo (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id    uuid NOT NULL,
  direcao           text NOT NULL CHECK (direcao IN ('CONCEDIDO','RECEBIDO')),
  contraparte_id    uuid NOT NULL,            -- pessoas.pessoa
  valor_principal   bigint NOT NULL CHECK (valor_principal > 0),
  data_concessao    date NOT NULL,
  conta_id          uuid NOT NULL,
  motivo            text NOT NULL,
  observacao        text,
  versao            integer NOT NULL DEFAULT 1,
  UNIQUE (instituicao_id, id),
  FOREIGN KEY (instituicao_id, conta_id) REFERENCES financeiro.conta (instituicao_id, id)
);

CREATE TABLE financeiro.adiantamento (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id         uuid NOT NULL,
  pessoa_id              uuid NOT NULL,       -- quem pagou do próprio bolso
  conta_origem_id        uuid NOT NULL,
  conta_origem_titular   text NOT NULL DEFAULT 'PESSOAL_DE_TERCEIRO' CHECK (conta_origem_titular = 'PESSOAL_DE_TERCEIRO'),
  valor                  bigint NOT NULL CHECK (valor > 0),
  data_despesa           date NOT NULL,
  lancamento_id          uuid NOT NULL UNIQUE,
  status                 text NOT NULL CHECK (status IN ('AGUARDANDO_AUTORIZACAO','AUTORIZADO','RECUSADO','RESSARCIDO')),
  -- A1 é verificado no domínio contra pessoas.vinculo na data da despesa; a
  -- linha guarda quem era a pessoa autorizadora, não só o usuário.
  autorizado_por_usuario uuid,
  autorizado_por_pessoa  uuid,
  autorizado_em          timestamptz,
  recusa_motivo          text,
  transferencia_ressarcimento_id uuid UNIQUE,
  versao                 integer NOT NULL DEFAULT 1,
  UNIQUE (instituicao_id, id),
  -- A2: a origem é sempre conta pessoal de terceiro.
  CONSTRAINT a2_origem_e_conta_pessoal FOREIGN KEY (instituicao_id, conta_origem_id, conta_origem_titular) REFERENCES financeiro.conta (instituicao_id, id, titularidade),
  FOREIGN KEY (instituicao_id, lancamento_id) REFERENCES financeiro.lancamento (instituicao_id, id),
  CHECK (status NOT IN ('AUTORIZADO','RESSARCIDO') OR (autorizado_por_pessoa IS NOT NULL AND autorizado_em IS NOT NULL)),
  CHECK ((status = 'RECUSADO') = (recusa_motivo IS NOT NULL)),
  CHECK ((status = 'RESSARCIDO') = (transferencia_ressarcimento_id IS NOT NULL))
);

-- Decisão 3: agregado próprio. Nunca entra na DRE; alimenta saldo e caixa.
CREATE TABLE financeiro.transferencia (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id     uuid NOT NULL,
  finalidade         text NOT NULL CHECK (finalidade IN ('MOVIMENTACAO_SIMPLES','APORTE_A_FUNDO','PAGAMENTO_DE_FATURA',
                       'RESSARCIMENTO_DE_ADIANTAMENTO','CONCESSAO_DE_EMPRESTIMO','DEVOLUCAO_DE_EMPRESTIMO','REPASSE_ENTRE_UNIDADES')),
  status             text NOT NULL CHECK (status IN ('A_CONFERIR','CONFIRMADO','ESTORNADO')),
  valor              bigint NOT NULL CHECK (valor > 0),
  data               date NOT NULL,
  -- Conta NULL num dos lados = o dinheiro sai ou chega de fora do sistema
  -- (a contraparte de um empréstimo não tem conta cadastrada).
  conta_origem_id    uuid,
  conta_destino_id   uuid,
  unidade_id         uuid NOT NULL,
  unidade_destino_id uuid,
  fundo_id           uuid,
  fatura_id          uuid,
  emprestimo_id      uuid,
  adiantamento_id    uuid,
  motivo             text NOT NULL,
  estorno_de_id      uuid UNIQUE,
  registrado_por     uuid NOT NULL,
  registrado_em      timestamptz NOT NULL DEFAULT now(),
  confirmado_por     uuid,
  versao             integer NOT NULL DEFAULT 1,
  UNIQUE (instituicao_id, id),
  FOREIGN KEY (instituicao_id, conta_origem_id)    REFERENCES financeiro.conta (instituicao_id, id),
  FOREIGN KEY (instituicao_id, conta_destino_id)   REFERENCES financeiro.conta (instituicao_id, id),
  FOREIGN KEY (instituicao_id, unidade_id)         REFERENCES financeiro.unidade (instituicao_id, id),
  FOREIGN KEY (instituicao_id, unidade_destino_id) REFERENCES financeiro.unidade (instituicao_id, id),
  FOREIGN KEY (instituicao_id, fundo_id)           REFERENCES financeiro.fundo (instituicao_id, id),
  FOREIGN KEY (instituicao_id, fatura_id)          REFERENCES financeiro.fatura (instituicao_id, id),
  FOREIGN KEY (instituicao_id, emprestimo_id)      REFERENCES financeiro.emprestimo (instituicao_id, id),
  FOREIGN KEY (instituicao_id, adiantamento_id)    REFERENCES financeiro.adiantamento (instituicao_id, id),
  FOREIGN KEY (instituicao_id, estorno_de_id)      REFERENCES financeiro.transferencia (instituicao_id, id),
  CHECK (conta_origem_id IS DISTINCT FROM conta_destino_id),
  CHECK (conta_origem_id IS NOT NULL OR conta_destino_id IS NOT NULL),
  CHECK ((conta_origem_id IS NOT NULL AND conta_destino_id IS NOT NULL)
         OR finalidade IN ('CONCESSAO_DE_EMPRESTIMO','DEVOLUCAO_DE_EMPRESTIMO')),
  -- T: cada finalidade carrega a referência que a justifica.
  CONSTRAINT fd3_aporte_tem_fundo CHECK ((finalidade = 'APORTE_A_FUNDO') = (fundo_id IS NOT NULL)),
  CONSTRAINT f3_pagamento_tem_fatura CHECK ((finalidade = 'PAGAMENTO_DE_FATURA') = (fatura_id IS NOT NULL)),
  CONSTRAINT e1_emprestimo_tem_emprestimo CHECK ((finalidade IN ('CONCESSAO_DE_EMPRESTIMO','DEVOLUCAO_DE_EMPRESTIMO')) = (emprestimo_id IS NOT NULL)),
  CONSTRAINT a4_ressarcimento_tem_adiantamento CHECK ((finalidade = 'RESSARCIMENTO_DE_ADIANTAMENTO') = (adiantamento_id IS NOT NULL)),
  CONSTRAINT t_repasse_entre_unidades CHECK ((finalidade = 'REPASSE_ENTRE_UNIDADES') = (unidade_destino_id IS NOT NULL AND unidade_destino_id <> unidade_id))
);
CREATE INDEX transferencia_origem  ON financeiro.transferencia (instituicao_id, conta_origem_id, data);
CREATE INDEX transferencia_destino ON financeiro.transferencia (instituicao_id, conta_destino_id, data);

ALTER TABLE financeiro.fatura ADD FOREIGN KEY (instituicao_id, transferencia_pagamento_id)
  REFERENCES financeiro.transferencia (instituicao_id, id);
ALTER TABLE financeiro.adiantamento ADD FOREIGN KEY (instituicao_id, transferencia_ressarcimento_id)
  REFERENCES financeiro.transferencia (instituicao_id, id);

CREATE TABLE financeiro.periodo_contabil (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id  uuid NOT NULL,
  unidade_id      uuid NOT NULL,
  competencia     date NOT NULL CHECK (extract(day FROM competencia) = 1),
  fechado         boolean NOT NULL DEFAULT false,
  fechado_por     uuid,
  fechado_em      timestamptz,
  hash_sha256     bytea,                      -- P2: hash do conjunto de lançamentos
  versao          integer NOT NULL DEFAULT 1,
  UNIQUE (instituicao_id, id),
  UNIQUE (instituicao_id, unidade_id, competencia),
  FOREIGN KEY (instituicao_id, unidade_id) REFERENCES financeiro.unidade (instituicao_id, id),
  CHECK (NOT fechado OR (fechado_por IS NOT NULL AND fechado_em IS NOT NULL AND hash_sha256 IS NOT NULL))
);

-- P3: reabertura com motivo, para sempre. Só INSERT.
CREATE TABLE financeiro.reabertura_de_periodo (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id  uuid NOT NULL,
  periodo_id      uuid NOT NULL,
  motivo          text NOT NULL CONSTRAINT p3_reabertura_tem_motivo CHECK (length(trim(motivo)) >= 10),
  reaberto_por    uuid NOT NULL,
  reaberto_em     timestamptz NOT NULL DEFAULT now(),
  hash_anterior   bytea NOT NULL,
  FOREIGN KEY (instituicao_id, periodo_id) REFERENCES financeiro.periodo_contabil (instituicao_id, id)
);
CREATE TRIGGER reabertura_somente_insercao
  BEFORE UPDATE OR DELETE ON financeiro.reabertura_de_periodo
  FOR EACH ROW EXECUTE FUNCTION shared.somente_insercao();

CREATE TABLE financeiro.importacao_de_extrato (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id        uuid NOT NULL,
  conta_id              uuid NOT NULL,
  arquivo_anexo_id      uuid NOT NULL,
  formato               text NOT NULL CHECK (formato IN ('OFX','CSV')),
  periodo_de            date NOT NULL,
  periodo_ate           date NOT NULL,
  linhas_lidas          integer NOT NULL CHECK (linhas_lidas >= 0),
  linhas_ja_conhecidas  integer NOT NULL CHECK (linhas_ja_conhecidas BETWEEN 0 AND linhas_lidas),
  importado_por         uuid NOT NULL,
  importado_em          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (instituicao_id, id),
  FOREIGN KEY (instituicao_id, conta_id) REFERENCES financeiro.conta (instituicao_id, id),
  CHECK (periodo_ate >= periodo_de)
);

CREATE TABLE financeiro.linha_extrato (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id         uuid NOT NULL,
  conta_id               uuid NOT NULL,
  importacao_id          uuid NOT NULL,
  identificador_externo  text NOT NULL,       -- FITID
  data                   date NOT NULL,
  valor                  bigint NOT NULL CHECK (valor > 0),
  sinal                  text NOT NULL CHECK (sinal IN ('CREDITO','DEBITO')),
  descricao_banco        text NOT NULL,
  status                 text NOT NULL CHECK (status IN ('NAO_CONCILIADA','CONCILIADA','IGNORADA')),
  lancamento_id          uuid,
  transferencia_id       uuid,
  motivo_ignorada        text,
  conciliada_por         uuid,
  conciliada_em          timestamptz,
  UNIQUE (instituicao_id, id),
  CONSTRAINT i1_fitid_unico UNIQUE (instituicao_id, conta_id, identificador_externo),
  FOREIGN KEY (instituicao_id, conta_id)         REFERENCES financeiro.conta (instituicao_id, id),
  FOREIGN KEY (instituicao_id, importacao_id)    REFERENCES financeiro.importacao_de_extrato (instituicao_id, id),
  FOREIGN KEY (instituicao_id, lancamento_id)    REFERENCES financeiro.lancamento (instituicao_id, id),
  FOREIGN KEY (instituicao_id, transferencia_id) REFERENCES financeiro.transferencia (instituicao_id, id),
  CONSTRAINT i2_um_so_par CHECK (lancamento_id IS NULL OR transferencia_id IS NULL),
  CHECK ((status = 'CONCILIADA') = (lancamento_id IS NOT NULL OR transferencia_id IS NOT NULL)),
  CHECK ((status = 'IGNORADA') = (motivo_ignorada IS NOT NULL))
);
-- Um lançamento casa com no máximo uma linha de extrato.
CREATE UNIQUE INDEX linha_um_lancamento    ON financeiro.linha_extrato (lancamento_id)    WHERE lancamento_id IS NOT NULL;
CREATE UNIQUE INDEX linha_uma_transferencia ON financeiro.linha_extrato (transferencia_id) WHERE transferencia_id IS NOT NULL;

CREATE TABLE financeiro.prestacao_de_contas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id    uuid NOT NULL,
  unidade_id        uuid,                     -- NULL = consolidada
  periodo_de        date NOT NULL,
  periodo_ate       date NOT NULL,
  nivel_de_detalhe  text NOT NULL CHECK (nivel_de_detalhe IN ('RESUMO','DETALHADO')),
  gerada_por        uuid NOT NULL,
  gerada_em         timestamptz NOT NULL DEFAULT now(),
  hash_sha256       bytea NOT NULL,
  arquivo_anexo_id  uuid NOT NULL,
  FOREIGN KEY (instituicao_id, unidade_id) REFERENCES financeiro.unidade (instituicao_id, id),
  CHECK (periodo_ate >= periodo_de)
);
CREATE TRIGGER prestacao_somente_insercao
  BEFORE UPDATE OR DELETE ON financeiro.prestacao_de_contas
  FOR EACH ROW EXECUTE FUNCTION shared.somente_insercao();

-- ---- Guardas de banco do Financeiro -----------------------------------------
-- O domínio é quem aplica as regras. Estas guardas existem para que um bug,
-- um script de suporte ou uma migration não consiga fazer o que o domínio
-- proíbe. O código do erro é o mesmo do catálogo (Documento 7 §12).

-- L5 / P1: nada nasce em competência fechada. A única escrita admitida num
-- lançamento de período fechado é marcá-lo ESTORNADO (Doc 6 §2.5.1).
CREATE FUNCTION financeiro.periodo_esta_fechado(p_instituicao uuid, p_unidade uuid, p_competencia date)
  RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT coalesce((SELECT fechado FROM financeiro.periodo_contabil
                    WHERE instituicao_id = p_instituicao AND unidade_id = p_unidade
                      AND competencia = p_competencia), false)
$$;

-- Marca, até o fim da transação, que este lançamento foi gravado nela. É o
-- que deixa a própria unidade de trabalho que confirma (ou a integração que já
-- nasce CONFIRMADO) gravar as etiquetas — e nenhuma transação depois dela.
CREATE FUNCTION financeiro.marca_escrita(p_id uuid) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('cdd.lancamento_' || replace(p_id::text, '-', ''), 'gravado', true)
$$;

CREATE FUNCTION financeiro.gravado_nesta_transacao(p_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT coalesce(current_setting('cdd.lancamento_' || replace(p_id::text, '-', ''), true), '') = 'gravado'
$$;

CREATE FUNCTION financeiro.guarda_lancamento() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'A_CONFERIR' THEN
      RAISE EXCEPTION 'LANCAMENTO_IMUTAVEL: lançamento % já foi confirmado', OLD.id USING ERRCODE = 'P0001';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status <> 'A_CONFERIR' THEN
    -- L2: confirmado é imutável; só pode passar a ESTORNADO.
    IF (to_jsonb(NEW) - 'status' - 'versao') <> (to_jsonb(OLD) - 'status' - 'versao')
       OR NOT (NEW.status = OLD.status OR (OLD.status = 'CONFIRMADO' AND NEW.status = 'ESTORNADO')) THEN
      RAISE EXCEPTION 'LANCAMENTO_IMUTAVEL: lançamento % já foi confirmado', OLD.id USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;                                -- sem marca: estornar não reabre as etiquetas
  END IF;

  IF NEW.unidade_id IS NOT NULL AND NEW.competencia IS NOT NULL
     AND financeiro.periodo_esta_fechado(NEW.instituicao_id, NEW.unidade_id, NEW.competencia) THEN
    RAISE EXCEPTION 'PERIODO_FECHADO: competência % da unidade % está fechada', NEW.competencia, NEW.unidade_id
      USING ERRCODE = 'P0001';
  END IF;
  PERFORM financeiro.marca_escrita(NEW.id);
  RETURN NEW;
END $$;

CREATE TRIGGER lancamento_guarda
  BEFORE INSERT OR UPDATE OR DELETE ON financeiro.lancamento
  FOR EACH ROW EXECUTE FUNCTION financeiro.guarda_lancamento();

-- As etiquetas de um lançamento confirmado são tão imutáveis quanto ele —
-- a partir da transação seguinte à que o gravou.
CREATE FUNCTION financeiro.guarda_etiqueta() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_id     uuid := coalesce(NEW.lancamento_id, OLD.lancamento_id);
  v_status text;
BEGIN
  SELECT status INTO v_status FROM financeiro.lancamento WHERE id = v_id;
  IF v_status = 'ESTORNADO'
     OR (v_status = 'CONFIRMADO' AND NOT financeiro.gravado_nesta_transacao(v_id)) THEN
    RAISE EXCEPTION 'LANCAMENTO_IMUTAVEL: etiquetas de lançamento confirmado ou estornado não mudam' USING ERRCODE = 'P0001';
  END IF;
  RETURN coalesce(NEW, OLD);
END $$;

CREATE TRIGGER etiqueta_guarda
  BEFORE INSERT OR UPDATE OR DELETE ON financeiro.lancamento_categoria
  FOR EACH ROW EXECUTE FUNCTION financeiro.guarda_etiqueta();

-- Decisão 1: a soma com sinal das etiquetas fecha no valor do lançamento.
-- Verificada no COMMIT (DEFERRED), porque lançamento e etiquetas são gravados
-- em comandos separados da mesma unidade de trabalho.
CREATE FUNCTION financeiro.confere_etiquetas() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_id       uuid;
  v_lanc     financeiro.lancamento%ROWTYPE;
  v_qtd      integer;
  v_soma     bigint;
BEGIN
  IF TG_TABLE_NAME = 'lancamento' THEN
    v_id := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    v_id := OLD.lancamento_id;
  ELSE
    v_id := NEW.lancamento_id;
  END IF;
  SELECT * INTO v_lanc FROM financeiro.lancamento WHERE id = v_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT count(*), coalesce(sum(CASE WHEN e.natureza = v_lanc.natureza THEN e.valor ELSE -e.valor END), 0)
    INTO v_qtd, v_soma
    FROM financeiro.lancamento_categoria e WHERE e.lancamento_id = v_id;

  IF v_qtd = 0 AND v_lanc.status <> 'A_CONFERIR' THEN
    RAISE EXCEPTION 'CATEGORIA_OBRIGATORIA: lançamento % confirmado sem categoria', v_id USING ERRCODE = 'P0001';
  END IF;
  IF v_qtd > 0 AND v_soma <> v_lanc.valor THEN
    RAISE EXCEPTION 'ETIQUETAS_NAO_FECHAM: etiquetas somam % e o lançamento vale %', v_soma, v_lanc.valor
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER lancamento_confere_etiquetas
  AFTER INSERT OR UPDATE ON financeiro.lancamento
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION financeiro.confere_etiquetas();
CREATE CONSTRAINT TRIGGER etiqueta_confere_etiquetas
  AFTER INSERT OR UPDATE OR DELETE ON financeiro.lancamento_categoria
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION financeiro.confere_etiquetas();

-- Transferência também não nasce em período fechado — de nenhum dos lados.
CREATE FUNCTION financeiro.guarda_transferencia() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_comp date := date_trunc('month', NEW.data)::date;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status <> 'A_CONFERIR' THEN
    IF (to_jsonb(NEW) - 'status' - 'versao') <> (to_jsonb(OLD) - 'status' - 'versao')
       OR NOT (NEW.status = OLD.status OR (OLD.status = 'CONFIRMADO' AND NEW.status = 'ESTORNADO')) THEN
      RAISE EXCEPTION 'TRANSFERENCIA_IMUTAVEL: transferência % já foi confirmada', OLD.id USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;
  IF financeiro.periodo_esta_fechado(NEW.instituicao_id, NEW.unidade_id, v_comp)
     OR (NEW.unidade_destino_id IS NOT NULL
         AND financeiro.periodo_esta_fechado(NEW.instituicao_id, NEW.unidade_destino_id, v_comp)) THEN
    RAISE EXCEPTION 'PERIODO_FECHADO: competência % está fechada', v_comp USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER transferencia_guarda
  BEFORE INSERT OR UPDATE ON financeiro.transferencia
  FOR EACH ROW EXECUTE FUNCTION financeiro.guarda_transferencia();

-- ---- Leituras do Financeiro -------------------------------------------------
-- Volume do CDD (~600 lançamentos/ano) não justifica materialização: views
-- simples, com RLS herdada (security_invoker).

-- Efeito com sinal de cada etiqueta, já contando o estorno ao contrário.
CREATE VIEW financeiro.v_efeito_por_categoria WITH (security_invoker = true) AS
SELECT l.instituicao_id, l.id AS lancamento_id, l.unidade_id, l.grupo_de_custo_id, l.evento_id,
       l.competencia, e.categoria_id, e.natureza,
       CASE WHEN l.estorno_de_id IS NULL THEN e.valor ELSE -e.valor END AS valor
  FROM financeiro.lancamento l
  JOIN financeiro.lancamento_categoria e ON e.lancamento_id = l.id
 WHERE l.status IN ('CONFIRMADO','ESTORNADO');

-- DRE por competência: a leitura é por etiqueta, nunca por lançamento.
CREATE VIEW financeiro.v_dre WITH (security_invoker = true) AS
SELECT v.instituicao_id, v.unidade_id, v.competencia, c.linha_relatorio, v.natureza, c.tipo,
       sum(v.valor) AS valor
  FROM financeiro.v_efeito_por_categoria v
  JOIN financeiro.categoria c ON c.id = v.categoria_id
 GROUP BY v.instituicao_id, v.unidade_id, v.competencia, c.linha_relatorio, v.natureza, c.tipo;

-- Saldo por conta: lançamentos pelo valor líquido + transferências.
CREATE VIEW financeiro.v_saldo_da_conta WITH (security_invoker = true) AS
WITH mov AS (
  SELECT instituicao_id, conta_id,
         (CASE WHEN natureza = 'RECEITA' THEN valor ELSE -valor END)
       * (CASE WHEN estorno_de_id IS NULL THEN 1 ELSE -1 END) AS valor
    FROM financeiro.lancamento
   WHERE status IN ('CONFIRMADO','ESTORNADO') AND conta_id IS NOT NULL
  UNION ALL
  SELECT instituicao_id, conta_destino_id,
         valor * (CASE WHEN estorno_de_id IS NULL THEN 1 ELSE -1 END)
    FROM financeiro.transferencia
   WHERE status IN ('CONFIRMADO','ESTORNADO') AND conta_destino_id IS NOT NULL
  UNION ALL
  SELECT instituicao_id, conta_origem_id,
         -valor * (CASE WHEN estorno_de_id IS NULL THEN 1 ELSE -1 END)
    FROM financeiro.transferencia
   WHERE status IN ('CONFIRMADO','ESTORNADO') AND conta_origem_id IS NOT NULL
)
SELECT c.instituicao_id, c.id AS conta_id, c.nome, coalesce(sum(m.valor), 0)::bigint AS saldo
  FROM financeiro.conta c
  LEFT JOIN mov m ON m.conta_id = c.id
 GROUP BY c.instituicao_id, c.id, c.nome;

-- -----------------------------------------------------------------------------
-- eventos — Doc 2 §2, com as decisões 5, 6 e 9 e §2.5.1/§2.6 do Doc 6
-- -----------------------------------------------------------------------------

CREATE TABLE eventos.evento (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id       uuid NOT NULL,
  unidade_id           uuid NOT NULL,         -- financeiro.unidade
  nome                 text NOT NULL,
  abreviacao           text,
  tipo                 text NOT NULL CHECK (tipo IN ('CERIMONIA','FEITIO','CONCENTRACAO','CURA','BAILADO',
                         'REUNIAO','TEMAZCAL','JORNADA','SHOW','ENCONTRO')),
  regime_de_receita    text NOT NULL CHECK (regime_de_receita IN ('CONTRIBUICAO','CONTRATADO','INTERNO')),
  status               text NOT NULL CHECK (status IN ('PLANEJADO','INSCRICOES_ABERTAS','INSCRICOES_ENCERRADAS',
                         'REALIZADO','CANCELADO')),                               -- decisão 5
  data_inicio          date NOT NULL,
  data_fim             date NOT NULL,
  hora_inicio          time NOT NULL,
  hora_abertura        time,
  local                text NOT NULL,
  dirigente_id         uuid,                  -- pessoas.pessoa
  cartaz_anexo_id      uuid,
  capacidade           integer CHECK (capacidade > 0),
  consagra             boolean NOT NULL,      -- se há daime: define anamnese e estimativa de consumo
  -- Decisão 6: três níveis sugeridos, só para a participação. Nunca preço.
  valor_social         bigint CHECK (valor_social > 0),
  valor_sustentavel    bigint CHECK (valor_sustentavel > 0),
  valor_prospero       bigint CHECK (valor_prospero > 0),
  observacoes          text,
  cancelado_motivo     text,
  versao               integer NOT NULL DEFAULT 1,
  UNIQUE (instituicao_id, id),
  CHECK (data_fim >= data_inicio),
  CONSTRAINT ev_contribuicao_tem_tres_niveis CHECK ((regime_de_receita = 'CONTRIBUICAO') = (valor_social IS NOT NULL AND valor_sustentavel IS NOT NULL AND valor_prospero IS NOT NULL)),
  CONSTRAINT ev_niveis_em_ordem CHECK (valor_social <= valor_sustentavel AND valor_sustentavel <= valor_prospero),
  CHECK ((status = 'CANCELADO') = (cancelado_motivo IS NOT NULL))
);
CREATE INDEX evento_agenda ON eventos.evento (instituicao_id, data_inicio);

-- Hospedagem é paga à parte (decisão 6). COLCHONETE existe com valor 0
-- enquanto a coordenação não decidir o contrário (Doc 6 §2.5, ponto em aberto).
CREATE TABLE eventos.opcao_de_hospedagem (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id   uuid NOT NULL,
  evento_id        uuid NOT NULL,
  tipo             text NOT NULL CHECK (tipo IN ('COLCHONETE','BELICHE','QUARTO')),
  valor_por_noite  bigint NOT NULL CHECK (valor_por_noite >= 0),
  ocupa_leito      boolean NOT NULL,
  UNIQUE (instituicao_id, id),
  UNIQUE (evento_id, tipo),
  FOREIGN KEY (instituicao_id, evento_id) REFERENCES eventos.evento (instituicao_id, id) ON DELETE CASCADE,
  CONSTRAINT colchonete_gratis_e_sem_leito CHECK (tipo <> 'COLCHONETE' OR (valor_por_noite = 0 AND NOT ocupa_leito))
);

-- Alimentação só em ocasiões especiais (jornadas): opção explícita, nunca padrão.
CREATE TABLE eventos.opcao_de_refeicao (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id  uuid NOT NULL,
  evento_id       uuid NOT NULL,
  refeicao        text NOT NULL CHECK (refeicao IN ('CEIA','CAFE','ALMOCO','JANTAR')),
  dia             date NOT NULL,
  valor           bigint NOT NULL CHECK (valor >= 0),
  UNIQUE (instituicao_id, id),
  UNIQUE (evento_id, refeicao, dia),
  FOREIGN KEY (instituicao_id, evento_id) REFERENCES eventos.evento (instituicao_id, id) ON DELETE CASCADE
);

-- Doc 6 §2.6: um link por cerimônia, criado com ela.
CREATE TABLE eventos.link_de_inscricao (
  evento_id       uuid PRIMARY KEY,
  instituicao_id  uuid NOT NULL,
  token           text NOT NULL UNIQUE CHECK (length(token) >= 22),  -- ≥128 bits em base62
  criado_em       timestamptz NOT NULL DEFAULT now(),
  revogado_em     timestamptz,
  aberturas       integer NOT NULL DEFAULT 0,
  FOREIGN KEY (instituicao_id, evento_id) REFERENCES eventos.evento (instituicao_id, id)
);

-- O link público chega sem instituição: é o token que diz de quem ele é.
-- SECURITY DEFINER, e devolve só o necessário para montar o contexto.
CREATE FUNCTION eventos.resolver_link(p_token text)
  RETURNS TABLE (instituicao_id uuid, evento_id uuid)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT l.instituicao_id, l.evento_id
    FROM eventos.link_de_inscricao l
   WHERE l.token = p_token AND l.revogado_em IS NULL
$$;
REVOKE ALL ON FUNCTION eventos.resolver_link(text) FROM PUBLIC;

-- Sessão do link: CPF declarado + fator de conferência (Documento 7 §7.3).
CREATE TABLE eventos.sessao_de_inscricao (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id   uuid NOT NULL,
  evento_id        uuid NOT NULL,
  segredo_sha256   bytea NOT NULL UNIQUE,     -- cookie httpOnly; só o hash fica aqui
  documento        text NOT NULL CHECK (documento ~ '^[0-9]{11}$'),
  pessoa_id        uuid,                      -- preenchido quando reconhecida e conferida
  conferida_em     timestamptz,
  tentativas       smallint NOT NULL DEFAULT 0,
  criada_em        timestamptz NOT NULL DEFAULT now(),
  expira_em        timestamptz NOT NULL,
  concluida_em     timestamptz,
  FOREIGN KEY (instituicao_id, evento_id) REFERENCES eventos.evento (instituicao_id, id),
  CHECK (expira_em > criada_em AND expira_em <= criada_em + interval '2 hours'),
  CHECK (tentativas <= 5)
);

CREATE TABLE eventos.inscricao (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id            uuid NOT NULL,
  evento_id                 uuid NOT NULL,
  pessoa_id                 uuid NOT NULL,    -- pessoas.pessoa
  canal                     text NOT NULL CHECK (canal IN ('RECEPCAO','LINK')),
  tipo_participacao         text NOT NULL CHECK (tipo_participacao IN ('PARTICIPANTE','CRIANCA_ESTELAR','EQUIPE','CONVIDADO')),
  status                    text NOT NULL CHECK (status IN ('PENDENTE','CONFIRMADA','CANCELADA')),
  primeira_vez_na_casa      boolean NOT NULL,
  primeira_vez_na_ayahuasca boolean NOT NULL,
  consagra                  boolean NOT NULL,  -- explícito (v2.1 §18)
  -- Contribuição: nível escolhido é sugestão; o combinado é o que vale.
  -- NULL em valor_combinado = "a combinar". Isento é explícito — zero não é isenção.
  nivel_escolhido           text CHECK (nivel_escolhido IN ('SOCIAL','SUSTENTAVEL','PROSPERO')),
  valor_combinado           bigint CONSTRAINT in_zero_nao_e_isencao CHECK (valor_combinado > 0),
  isento                    boolean NOT NULL DEFAULT false,
  isencao_motivo            text,
  hospedagem_id             uuid,
  noites                    daterange,
  modalidade_crianca        text CHECK (modalidade_crianca IN ('PARTICIPA_RITUAL','PERMANECE_SOB_SUPERVISAO')),
  autorizacao_responsavel_id uuid,            -- pessoas.autorizacao_de_responsavel
  -- IN4 (decisão 9): sempre.
  contato_emergencia_nome   text NOT NULL,
  contato_emergencia_tel    text NOT NULL,
  restricoes_alimentares    text,
  acolhimento               text NOT NULL CHECK (acolhimento IN ('NAO_NECESSARIO','PENDENTE','REALIZADO')),
  declaracao_id             uuid,             -- pessoas.declaracao_de_veracidade
  registrada_por            uuid,             -- NULL quando veio pelo link
  registrada_em             timestamptz NOT NULL DEFAULT now(),
  cancelada_em              timestamptz,
  cancelamento_motivo       text,
  versao                    integer NOT NULL DEFAULT 1,
  UNIQUE (instituicao_id, id),
  FOREIGN KEY (instituicao_id, evento_id)     REFERENCES eventos.evento (instituicao_id, id),
  FOREIGN KEY (instituicao_id, hospedagem_id) REFERENCES eventos.opcao_de_hospedagem (instituicao_id, id),
  CHECK (NOT (isento AND valor_combinado IS NOT NULL)),
  CONSTRAINT in_isencao_tem_motivo CHECK (isento = (isencao_motivo IS NOT NULL)),
  CHECK ((tipo_participacao = 'CRIANCA_ESTELAR') = (modalidade_crianca IS NOT NULL)),
  CHECK ((hospedagem_id IS NULL) = (noites IS NULL)),
  CHECK ((status = 'CANCELADA') = (cancelada_em IS NOT NULL)),
  CONSTRAINT in_recepcao_tem_autor CHECK (canal = 'LINK' OR registrada_por IS NOT NULL)
);
-- IN: uma inscrição viva por pessoa por evento.
CREATE UNIQUE INDEX inscricao_uma_por_pessoa ON eventos.inscricao (instituicao_id, evento_id, pessoa_id) WHERE status <> 'CANCELADA';

CREATE TABLE eventos.pagamento_de_inscricao (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id  uuid NOT NULL,
  inscricao_id    uuid NOT NULL,
  valor           bigint NOT NULL CHECK (valor > 0),
  recebido_em     date NOT NULL,
  conta_id        uuid NOT NULL,              -- financeiro.conta
  forma           text NOT NULL CHECK (forma IN ('PIX','DINHEIRO','CARTAO','TRANSFERENCIA')),
  registrado_por  uuid NOT NULL,
  registrado_em   timestamptz NOT NULL DEFAULT now(),
  lancamento_id   uuid UNIQUE,                -- preenchido pela integração (Doc 2 §5.1.1)
  UNIQUE (instituicao_id, id),
  FOREIGN KEY (instituicao_id, inscricao_id) REFERENCES eventos.inscricao (instituicao_id, id)
);

-- DV3: solicitar (Acolhimento) e efetivar (Tesouraria) são atos distintos.
CREATE TABLE eventos.devolucao_devida (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id       uuid NOT NULL,
  evento_id            uuid NOT NULL,
  inscricao_id         uuid,
  pessoa_id            uuid NOT NULL,
  pagamento_id         uuid NOT NULL,         -- a receita que será estornada
  valor                bigint NOT NULL CHECK (valor > 0),
  motivo               text NOT NULL,
  solicitada_por       uuid NOT NULL,
  solicitada_em        timestamptz NOT NULL DEFAULT now(),
  status               text NOT NULL CHECK (status IN ('PENDENTE','PAGA','CANCELADA')),
  paga_em              date,
  conta_id             uuid,
  lancamento_estorno_id uuid UNIQUE,          -- Doc 6 §2.5.1: estorno da receita, não despesa
  efetivada_por        uuid,
  versao               integer NOT NULL DEFAULT 1,
  UNIQUE (instituicao_id, id),
  FOREIGN KEY (instituicao_id, evento_id)    REFERENCES eventos.evento (instituicao_id, id),
  FOREIGN KEY (instituicao_id, inscricao_id) REFERENCES eventos.inscricao (instituicao_id, id),
  FOREIGN KEY (instituicao_id, pagamento_id) REFERENCES eventos.pagamento_de_inscricao (instituicao_id, id),
  CHECK ((status = 'PAGA') = (paga_em IS NOT NULL AND conta_id IS NOT NULL AND efetivada_por IS NOT NULL)),
  CONSTRAINT dv3_quem_pede_nao_paga CHECK (efetivada_por IS NULL OR efetivada_por <> solicitada_por)
);

CREATE TABLE eventos.contratacao (
  evento_id               uuid PRIMARY KEY,
  instituicao_id          uuid NOT NULL,
  contratante_id          uuid NOT NULL,      -- pessoas.pessoa
  valor_acordado          bigint NOT NULL CHECK (valor_acordado > 0),
  forma_pagamento         text NOT NULL CHECK (forma_pagamento IN ('ANTECIPADO','NO_ATO','FATURADO')),
  data_prevista_pagamento date,
  status                  text NOT NULL CHECK (status IN ('PROPOSTA','CONFIRMADA','REALIZADA','CANCELADA')),
  lancamento_receita_id   uuid UNIQUE,        -- CACHE_RECEBIDO; o CACHE_PAGO são lançamentos do evento
  observacoes             text NOT NULL DEFAULT '',
  versao                  integer NOT NULL DEFAULT 1,
  FOREIGN KEY (instituicao_id, evento_id) REFERENCES eventos.evento (instituicao_id, id)
);

-- Cadastro fixo (fora do evento). São dois dormitórios hoje: um com cama de
-- casal, outro com três beliches — sem divisão por gênero.
CREATE TABLE eventos.dormitorio (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id  uuid NOT NULL,
  unidade_id      uuid NOT NULL,
  nome            text NOT NULL,
  ativo           boolean NOT NULL DEFAULT true,
  UNIQUE (instituicao_id, id),
  UNIQUE (instituicao_id, unidade_id, nome)
);

CREATE TABLE eventos.leito (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id  uuid NOT NULL,
  dormitorio_id   uuid NOT NULL,
  identificacao   text NOT NULL,
  tipo            text NOT NULL CHECK (tipo IN ('BELICHE_SUPERIOR','BELICHE_INFERIOR','CAMA_SOLTEIRO','CAMA_CASAL','QUARTO_PRIVATIVO')),
  capacidade      smallint NOT NULL CHECK (capacidade BETWEEN 1 AND 4),
  ativo           boolean NOT NULL DEFAULT true,
  UNIQUE (instituicao_id, id),
  UNIQUE (dormitorio_id, identificacao),
  FOREIGN KEY (instituicao_id, dormitorio_id) REFERENCES eventos.dormitorio (instituicao_id, id),
  CONSTRAINT leito_capacidade_do_tipo CHECK (tipo IN ('CAMA_CASAL','QUARTO_PRIVATIVO') OR capacidade = 1)
);

-- Mapa de leitos: uma linha por pessoa por noite. `vaga` numera os lugares de
-- um leito com capacidade > 1 (a cama de casal tem vagas 1 e 2).
CREATE TABLE eventos.alocacao_de_leito (
  instituicao_id  uuid NOT NULL,
  evento_id       uuid NOT NULL,
  inscricao_id    uuid NOT NULL,
  leito_id        uuid NOT NULL,
  noite           date NOT NULL,
  vaga            smallint NOT NULL CHECK (vaga BETWEEN 1 AND 4),
  CONSTRAINT uma_cama_por_pessoa_por_noite PRIMARY KEY (evento_id, inscricao_id, noite),
  CONSTRAINT ml1_vaga_livre_no_evento UNIQUE (evento_id, leito_id, noite, vaga),
  FOREIGN KEY (instituicao_id, evento_id)    REFERENCES eventos.evento (instituicao_id, id),
  FOREIGN KEY (instituicao_id, inscricao_id) REFERENCES eventos.inscricao (instituicao_id, id) ON DELETE CASCADE,
  FOREIGN KEY (instituicao_id, leito_id)     REFERENCES eventos.leito (instituicao_id, id)
);
-- Conflito entre eventos simultâneos é aviso, não invariante: índice para achá-lo.
CREATE INDEX alocacao_por_leito_noite ON eventos.alocacao_de_leito (instituicao_id, leito_id, noite);

CREATE TABLE eventos.tarefa_de_preparo (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id   uuid NOT NULL,
  evento_id        uuid NOT NULL,
  texto            text NOT NULL,
  responsavel_id   uuid,
  ordem            smallint NOT NULL,
  feita_em         timestamptz,
  origem_marcacao  text CHECK (origem_marcacao IN ('SISTEMA','LINK_PUBLICO','WEBHOOK')),
  FOREIGN KEY (instituicao_id, evento_id) REFERENCES eventos.evento (instituicao_id, id) ON DELETE CASCADE,
  CHECK ((feita_em IS NULL) = (origem_marcacao IS NULL))
);

-- -----------------------------------------------------------------------------
-- estoque — Doc 2 §4, com as decisões 10 e 11 do Doc 6
-- -----------------------------------------------------------------------------

CREATE TABLE estoque.item (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id  uuid NOT NULL,
  nome            text NOT NULL,
  categoria       text NOT NULL CHECK (categoria IN ('DAIME','MATERIA_PRIMA','INSUMO_CERIMONIA','ALIMENTO',
                    'MANUTENCAO','PRODUTO_LOJINHA')),
  unidade_medida  text NOT NULL CHECK (unidade_medida IN ('L','ML','KG','G','UN')),
  estoque_minimo  numeric(12,3) CHECK (estoque_minimo >= 0),
  ativo           boolean NOT NULL DEFAULT true,
  UNIQUE (instituicao_id, id),
  UNIQUE (instituicao_id, nome)
);

CREATE TABLE estoque.feitio (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id       uuid NOT NULL,
  evento_id            uuid NOT NULL,         -- eventos.evento (tipo FEITIO)
  nome                 text NOT NULL,
  data_inicio          date NOT NULL,
  data_fim             date,
  status               text NOT NULL CHECK (status IN ('EM_ANDAMENTO','CONCLUIDO')),
  litros_produzidos    numeric(12,3) CHECK (litros_produzidos > 0),
  forca                text,
  -- Congelados na conclusão: o custo por litro de um feitio concluído não
  -- muda se alguém estornar um lançamento depois — muda o do próximo.
  custo_materia_prima  bigint CHECK (custo_materia_prima >= 0),
  custo_lancamentos    bigint CHECK (custo_lancamentos >= 0),
  custo_por_litro      bigint CHECK (custo_por_litro >= 0),
  versao               integer NOT NULL DEFAULT 1,
  UNIQUE (instituicao_id, id),
  UNIQUE (instituicao_id, evento_id),
  CONSTRAINT feitio_concluido_tem_custo CHECK ((status = 'CONCLUIDO') = (data_fim IS NOT NULL AND litros_produzidos IS NOT NULL
         AND custo_por_litro IS NOT NULL AND custo_materia_prima IS NOT NULL AND custo_lancamentos IS NOT NULL))
);

CREATE TABLE estoque.lote (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id      uuid NOT NULL,
  item_id             uuid NOT NULL,
  nome                text NOT NULL,
  origem              text NOT NULL CHECK (origem IN ('FEITIO_PROPRIO','AQUISICAO','DOACAO','RECEBIMENTO_UNIDADE','COLHEITA_PROPRIA')),
  feitio_id           uuid UNIQUE,            -- um feitio gera exatamente um lote
  fornecedor_id       uuid,                   -- pessoas.pessoa
  data_entrada        date NOT NULL,
  quantidade_inicial  numeric(12,3) NOT NULL CHECK (quantidade_inicial > 0),
  custo_total         bigint CHECK (custo_total >= 0),
  forca               text,
  local               text NOT NULL,
  guardiao_id         uuid,                   -- pessoas.pessoa
  situacao            text NOT NULL CHECK (situacao IN ('EM_USO','LACRADO','QUARENTENA','ESGOTADO')),
  envase              text,
  analise             text,
  UNIQUE (instituicao_id, id),
  UNIQUE (instituicao_id, item_id, nome),
  FOREIGN KEY (instituicao_id, item_id)   REFERENCES estoque.item (instituicao_id, id),
  FOREIGN KEY (instituicao_id, feitio_id) REFERENCES estoque.feitio (instituicao_id, id),
  CHECK ((origem = 'FEITIO_PROPRIO') = (feitio_id IS NOT NULL))
);

-- Decisão 11: união das duas listas de tipo. Quantidade sempre positiva;
-- a direção vem do tipo, como no dinheiro.
CREATE TABLE estoque.movimento_de_estoque (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id  uuid NOT NULL,
  lote_id         uuid NOT NULL,
  tipo            text NOT NULL CHECK (tipo IN ('ENTRADA_FEITIO','ENTRADA_AQUISICAO','ENTRADA_DOACAO','ENTRADA_RECEBIMENTO',
                    'SAIDA_TRABALHO','SAIDA_FEITIO','SAIDA_VENDA','SAIDA_PERDA','TRANSFERENCIA_SAIDA','AJUSTE_ENTRADA','AJUSTE_SAIDA')),
  quantidade      numeric(12,3) NOT NULL CHECK (quantidade > 0),
  data            date NOT NULL,
  evento_id       uuid,                       -- trabalho em que foi servido
  feitio_id       uuid,                       -- feitio em que a matéria-prima entrou
  lancamento_id   uuid,                       -- financeiro.lancamento (compra, venda)
  custo           bigint CHECK (custo >= 0),  -- custo apropriado (matéria-prima no feitio)
  destino         text,
  justificativa   text,
  registrado_por  uuid NOT NULL,
  registrado_em   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (instituicao_id, id),
  FOREIGN KEY (instituicao_id, lote_id)   REFERENCES estoque.lote (instituicao_id, id),
  FOREIGN KEY (instituicao_id, feitio_id) REFERENCES estoque.feitio (instituicao_id, id),
  CONSTRAINT mov_perda_e_ajuste_justificados CHECK (tipo NOT IN ('SAIDA_PERDA','AJUSTE_ENTRADA','AJUSTE_SAIDA') OR justificativa IS NOT NULL),
  CHECK ((tipo = 'SAIDA_FEITIO') = (feitio_id IS NOT NULL)),
  CHECK (tipo <> 'SAIDA_TRABALHO' OR evento_id IS NOT NULL),
  CHECK (tipo <> 'TRANSFERENCIA_SAIDA' OR destino IS NOT NULL)
);
CREATE INDEX movimento_por_lote ON estoque.movimento_de_estoque (instituicao_id, lote_id, data);
CREATE TRIGGER movimento_somente_insercao
  BEFORE UPDATE OR DELETE ON estoque.movimento_de_estoque
  FOR EACH ROW EXECUTE FUNCTION shared.somente_insercao();

-- Saldo = soma dos movimentos. O lote nasce com o seu movimento de entrada
-- (ENTRADA_*), na mesma transação; `quantidade_inicial` é registro histórico.
CREATE FUNCTION estoque.saldo_do_lote(p_lote uuid) RETURNS numeric
  LANGUAGE sql STABLE AS $$
  SELECT coalesce(sum(CASE WHEN tipo LIKE 'ENTRADA%' OR tipo = 'AJUSTE_ENTRADA'
                           THEN quantidade ELSE -quantidade END), 0)
    FROM estoque.movimento_de_estoque WHERE lote_id = p_lote
$$;

-- Saldo nunca negativo. Verificado no banco porque duas saídas concorrentes
-- do mesmo lote são exatamente o caso que o domínio sozinho perde.
CREATE FUNCTION estoque.guarda_saldo() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM 1 FROM estoque.lote WHERE id = NEW.lote_id FOR UPDATE;   -- serializa movimentos do lote
  IF estoque.saldo_do_lote(NEW.lote_id) < 0 THEN
    RAISE EXCEPTION 'SALDO_INSUFICIENTE: lote % ficaria negativo', NEW.lote_id USING ERRCODE = 'P0001';
  END IF;
  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER movimento_guarda_saldo
  AFTER INSERT ON estoque.movimento_de_estoque
  FOR EACH ROW EXECUTE FUNCTION estoque.guarda_saldo();

-- EC1: estimativa nunca gera movimento. Tabela própria, sem ligação com saldo.
CREATE TABLE estoque.estimativa_de_consumo (
  evento_id              uuid PRIMARY KEY,
  instituicao_id         uuid NOT NULL,
  consagrantes_previstos integer NOT NULL CHECK (consagrantes_previstos >= 0),
  ml_por_consagrante     integer NOT NULL CHECK (ml_por_consagrante > 0),
  litros_estimados       numeric(12,3) GENERATED ALWAYS AS (consagrantes_previstos * ml_por_consagrante / 1000.0) STORED,
  base                   text NOT NULL CHECK (base IN ('PARAMETRO','MANUAL')),
  calculada_em           timestamptz NOT NULL DEFAULT now()
);

CREATE VIEW estoque.v_saldo_por_lote WITH (security_invoker = true) AS
SELECT l.instituicao_id, l.id AS lote_id, l.item_id, l.nome, l.situacao,
       estoque.saldo_do_lote(l.id) AS saldo
  FROM estoque.lote l;

-- -----------------------------------------------------------------------------
-- RLS — aplicada por varredura, não à mão
--
-- Toda tabela com `instituicao_id`, em todos os schemas de domínio, ganha RLS
-- com FORCE e a mesma política. A varredura é o que impede a tabela nova
-- esquecida; o teste T23 confere que ela rodou (cdd-07-verificacao.sql).
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.table_schema, c.table_name
      FROM information_schema.columns c
      JOIN information_schema.tables tb
        ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name AND tb.table_type = 'BASE TABLE'
     WHERE c.column_name = 'instituicao_id'
       AND c.table_schema IN ('shared','identidade','pessoas','financeiro','eventos','estoque')
       AND (c.table_schema, c.table_name) <> ('shared','outbox')
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', t.table_schema, t.table_name);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', t.table_schema, t.table_name);
    EXECUTE format($p$CREATE POLICY isolamento_por_instituicao ON %I.%I
                      USING (instituicao_id = shared.instituicao_atual())
                      WITH CHECK (instituicao_id = shared.instituicao_atual())$p$,
                   t.table_schema, t.table_name);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- Privilégios do papel de execução
-- -----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA shared, identidade, pessoas, financeiro, eventos, estoque TO cdd_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA shared, identidade, pessoas, financeiro, eventos, estoque TO cdd_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA shared TO cdd_app;
GRANT EXECUTE ON FUNCTION eventos.resolver_link(text) TO cdd_app;

-- O catálogo de permissões é do código: a aplicação lê, a migration escreve.
REVOKE INSERT, UPDATE, DELETE ON identidade.permissao FROM cdd_app;
-- Tabelas só-inserção: além do gatilho, o papel nem tem o privilégio.
REVOKE UPDATE, DELETE ON identidade.registro_de_auditoria, pessoas.registro_de_acesso,
  financeiro.reabertura_de_periodo, financeiro.prestacao_de_contas, estoque.movimento_de_estoque FROM cdd_app;

-- -----------------------------------------------------------------------------
-- Catálogo de permissões (Doc 3 §4), sem `pessoas.anamnese.responder_por_terceiro`
-- (Doc 6 §2.6: não tem caso de uso).
-- -----------------------------------------------------------------------------

INSERT INTO identidade.permissao (codigo, modulo, descricao) VALUES
  ('financeiro.lancamento.registrar',        'financeiro', 'Registrar lançamento'),
  ('financeiro.lancamento.confirmar',        'financeiro', 'Confirmar lançamento na verificação'),
  ('financeiro.lancamento.estornar',         'financeiro', 'Estornar lançamento confirmado'),
  ('financeiro.lancamento.ler',              'financeiro', 'Ler todos os lançamentos'),
  ('financeiro.lancamento.ler_proprios',     'financeiro', 'Ler os próprios registros'),
  ('financeiro.transferencia.registrar',     'financeiro', 'Registrar transferência'),
  ('financeiro.conta.ler',                   'financeiro', 'Ler contas e saldos'),
  ('financeiro.conta.gerenciar',             'financeiro', 'Criar e editar contas'),
  ('financeiro.fundo.gerenciar',             'financeiro', 'Gerenciar fundos'),
  ('financeiro.fatura.gerenciar',            'financeiro', 'Gerenciar faturas de cartão'),
  ('financeiro.emprestimo.gerenciar',        'financeiro', 'Gerenciar empréstimos'),
  ('financeiro.adiantamento.registrar',      'financeiro', 'Registrar adiantamento'),
  ('financeiro.adiantamento.autorizar',      'financeiro', 'Autorizar adiantamento (exige vínculo — A1)'),
  ('financeiro.adiantamento.ressarcir',      'financeiro', 'Ressarcir adiantamento'),
  ('financeiro.reembolsos.ler',              'financeiro', 'Ler reembolsos pendentes'),
  ('financeiro.importacao.executar',         'financeiro', 'Importar extrato'),
  ('financeiro.conciliacao.executar',        'financeiro', 'Conciliar extrato'),
  ('financeiro.periodo.fechar',              'financeiro', 'Fechar competência'),
  ('financeiro.periodo.reabrir',             'financeiro', 'Reabrir competência'),
  ('financeiro.plano_contas.ler',            'financeiro', 'Ler plano de contas'),
  ('financeiro.plano_contas.gerenciar',      'financeiro', 'Gerenciar plano de contas'),
  ('financeiro.dre.ler',                     'financeiro', 'Ler DRE'),
  ('financeiro.fluxo_caixa.ler',             'financeiro', 'Ler fluxo de caixa'),
  ('financeiro.resultado_evento.ler',        'financeiro', 'Ler resultado por cerimônia'),
  ('financeiro.prestacao_contas.gerar',      'financeiro', 'Gerar prestação de contas'),
  ('financeiro.prestacao_contas.detalhada',  'financeiro', 'Gerar prestação detalhada (com identidades)'),
  ('eventos.evento.criar',                   'eventos',    'Criar evento'),
  ('eventos.evento.editar',                  'eventos',    'Editar evento'),
  ('eventos.evento.cancelar',                'eventos',    'Cancelar evento'),
  ('eventos.evento.realizar',                'eventos',    'Marcar evento como realizado'),
  ('eventos.inscricoes.abrir',               'eventos',    'Abrir e encerrar inscrições'),
  ('eventos.inscricao.ler',                  'eventos',    'Ler inscrições'),
  ('eventos.inscricao.registrar',            'eventos',    'Registrar inscrição'),
  ('eventos.inscricao.editar',               'eventos',    'Editar inscrição'),
  ('eventos.inscricao.confirmar',            'eventos',    'Confirmar inscrição'),
  ('eventos.inscricao.cancelar',             'eventos',    'Cancelar inscrição'),
  ('eventos.pagamento.registrar',            'eventos',    'Marcar pagamento de contribuição'),
  ('eventos.arrecadacao.ler',                'eventos',    'Ler arrecadação do evento'),
  ('eventos.devolucao.solicitar',            'eventos',    'Registrar pedido de devolução'),
  ('eventos.devolucao.efetivar',             'eventos',    'Pagar devolução'),
  ('eventos.contratacao.gerenciar',          'eventos',    'Gerenciar contratação'),
  ('eventos.acolhimento.registrar',          'eventos',    'Registrar acolhimento'),
  ('eventos.operacao.ler',                   'eventos',    'Ler operação (leitos, refeições)'),
  ('eventos.operacao.gerenciar',             'eventos',    'Gerenciar operação (leitos, refeições)'),
  ('pessoas.pessoa.ler',                     'pessoas',    'Ler pessoas'),
  ('pessoas.pessoa.registrar',               'pessoas',    'Cadastrar pessoa'),
  ('pessoas.pessoa.editar',                  'pessoas',    'Editar pessoa'),
  ('pessoas.pessoa.anonimizar',              'pessoas',    'Anonimizar pessoa (LGPD)'),
  ('pessoas.vinculo.gerenciar',              'pessoas',    'Gerenciar papéis e vínculos'),
  ('pessoas.anamnese.ler',                   'pessoas',    'Ler respostas de anamnese'),
  ('pessoas.anamnese.analisar',              'pessoas',    'Dar parecer sobre anamnese'),
  ('pessoas.formulario.editar',              'pessoas',    'Editar formulário de anamnese'),
  ('pessoas.formulario.publicar',            'pessoas',    'Publicar versão do formulário'),
  ('pessoas.consentimento.registrar',        'pessoas',    'Registrar consentimento'),
  ('pessoas.autorizacao_responsavel.registrar','pessoas',  'Registrar autorização de responsável'),
  ('estoque.saldo.ler',                      'estoque',    'Ler saldo'),
  ('estoque.item.gerenciar',                 'estoque',    'Gerenciar itens'),
  ('estoque.movimento.registrar',            'estoque',    'Registrar movimento'),
  ('estoque.consumo.registrar',              'estoque',    'Registrar consumo de cerimônia'),
  ('estoque.feitio.gerenciar',               'estoque',    'Gerenciar feitio'),
  ('sistema.usuario.gerenciar',              'sistema',    'Gerenciar usuários'),
  ('sistema.grupo.gerenciar',                'sistema',    'Gerenciar grupos'),
  ('sistema.parametro.gerenciar',            'sistema',    'Gerenciar parâmetros'),
  ('sistema.auditoria.ler',                  'sistema',    'Ler trilha de auditoria');
