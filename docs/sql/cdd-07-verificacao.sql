-- =============================================================================
-- CDD — verificação do esquema de referência (Documento 7 §15)
--
-- Uso, num banco vazio:
--   psql -v ON_ERROR_STOP=1 -f cdd-07-esquema.sql -f cdd-07-verificacao.sql
--
-- Tudo roda como `cdd_app`, o papel da aplicação — superusuário ignora RLS e
-- tornaria metade destes testes inúteis. Cada caso imprime OK ou aborta.
-- Não substitui a suíte de integração (Testcontainers): prova que as guardas
-- de banco que o documento promete existem e fazem o que ele diz.
-- =============================================================================

\set QUIET on
SET client_min_messages = notice;

CREATE SCHEMA verif;
GRANT USAGE ON SCHEMA verif TO cdd_app;

-- Executa `p_sql` e exige que falhe com SQLSTATE ou mensagem casando `p_padrao`.
-- Força os gatilhos DEFERRED a rodarem ali mesmo, dentro do subbloco.
CREATE FUNCTION verif.espera_erro(p_nome text, p_sql text, p_padrao text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
    SET CONSTRAINTS ALL IMMEDIATE;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE ~ ('^(' || p_padrao || ')$') OR SQLERRM ~ p_padrao THEN
      RAISE NOTICE 'OK    %  ← %', p_nome, left(SQLERRM, 90);
      RETURN;
    END IF;
    RAISE EXCEPTION 'FALHA % — erro inesperado: [%] %', p_nome, SQLSTATE, SQLERRM;
  END;
  RAISE EXCEPTION 'FALHA % — passou sem erro', p_nome;
END $$;

CREATE FUNCTION verif.espera_ok(p_nome text, p_sql text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE p_sql;
  SET CONSTRAINTS ALL IMMEDIATE;
  RAISE NOTICE 'OK    %', p_nome;
END $$;

CREATE FUNCTION verif.confere(p_nome text, p_obtido anyelement, p_esperado anyelement) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF p_obtido IS DISTINCT FROM p_esperado THEN
    RAISE EXCEPTION 'FALHA % — obtido %, esperado %', p_nome, p_obtido, p_esperado;
  END IF;
  RAISE NOTICE 'OK    %', p_nome;
END $$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA verif TO cdd_app;

-- -----------------------------------------------------------------------------
-- Estrutural — roda como dono, porque lê o catálogo
-- -----------------------------------------------------------------------------

-- T23 (Doc 3 §11.4), versão de banco: nenhuma tabela de domínio sem RLS forçada.
SELECT verif.confere('T23 · toda tabela com instituicao_id tem RLS forçada',
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND n.nspname IN ('shared','identidade','pessoas','financeiro','eventos','estoque')
      AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = c.oid AND a.attname = 'instituicao_id')
      AND NOT (c.relrowsecurity AND c.relforcerowsecurity)
      AND (n.nspname, c.relname) <> ('shared','outbox')), 0::bigint);

-- Doc 1 §4.7: nenhuma FK cruza schema.
SELECT verif.confere('nenhuma chave estrangeira cruza schema',
  (SELECT count(*) FROM pg_constraint k
     JOIN pg_class a ON a.oid = k.conrelid  JOIN pg_namespace na ON na.oid = a.relnamespace
     JOIN pg_class b ON b.oid = k.confrelid JOIN pg_namespace nb ON nb.oid = b.relnamespace
    WHERE k.contype = 'f' AND na.nspname <> nb.nspname), 0::bigint);

SELECT verif.confere('o papel da aplicação não ignora RLS',
  (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'cdd_app'), false);

-- O dono é quem roda migration: é dele que o TRUNCATE descuidado viria.
SELECT verif.espera_erro('nem o dono esvazia o histórico com TRUNCATE', $$
  TRUNCATE identidade.registro_de_auditoria
$$, 'REGISTRO_IMUTAVEL');
SELECT verif.espera_erro('nem por CASCADE a partir de outra tabela', $$
  TRUNCATE financeiro.conta CASCADE
$$, 'REGISTRO_IMUTAVEL');

-- O link público só funciona em produção se o dono do resolvedor não depender
-- de ser superusuário: é como superusuário que este arquivo costuma rodar.
SELECT verif.confere('link público · o dono do resolvedor não é superusuário nem ignora RLS',
  (SELECT r.rolsuper OR r.rolbypassrls FROM pg_proc p JOIN pg_roles r ON r.oid = p.proowner
    WHERE p.oid = 'eventos.resolver_link(text)'::regprocedure), false);

-- F07 · as duas funções que toda migration chama (Documento 7 §22) são
-- idempotentes: uma etapa que repete a chamada sobre o esquema inteiro não
-- falha nem duplica o que a etapa anterior já tinha feito.
BEGIN;
SELECT shared.aplicar_isolamento_por_instituicao();
SELECT verif.confere('varredura de RLS é idempotente · nenhuma tabela ganha política duplicada',
  (SELECT count(*) FROM (
     SELECT polrelid FROM pg_policy WHERE polname = 'isolamento_por_instituicao'
     GROUP BY polrelid HAVING count(*) > 1
   ) duplicadas), 0::bigint);
-- Chamada sem nada para varrer (a primeira, dentro do próprio esquema, já
-- passou por tudo): não pode pegar ACCESS EXCLUSIVE em tabela nenhuma, senão
-- uma migration de etapa posterior trava o esquema inteiro à toa (§22).
SELECT verif.confere('varredura de RLS é idempotente · segunda chamada sem nada a mudar não pega ACCESS EXCLUSIVE',
  (SELECT count(*) FROM pg_locks WHERE pid = pg_backend_pid() AND locktype = 'relation' AND mode = 'AccessExclusiveLock'),
  0::bigint);
COMMIT;
SELECT verif.confere('T23 · continua com RLS forçada depois da segunda varredura',
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND n.nspname IN ('shared','identidade','pessoas','financeiro','eventos','estoque')
      AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = c.oid AND a.attname = 'instituicao_id')
      AND NOT (c.relrowsecurity AND c.relforcerowsecurity)
      AND (n.nspname, c.relname) <> ('shared','outbox')), 0::bigint);

-- A varredura precisa pegar a tabela que só existe a partir da etapa
-- seguinte, não só repetir sem falhar sobre o que já viu — senão uma
-- varredura que sai cedo ao encontrar QUALQUER política já criada (em vez de
-- checar tabela a tabela) passaria despercebida pelos casos acima.
BEGIN;
CREATE TABLE pessoas.tabela_da_etapa_seguinte (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id uuid NOT NULL
);
SELECT shared.aplicar_isolamento_por_instituicao();
SELECT verif.confere('varredura de RLS alcança tabela criada entre etapas · RLS forçada',
  (SELECT c.relrowsecurity AND c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'pessoas' AND c.relname = 'tabela_da_etapa_seguinte'), true);
SELECT verif.confere('varredura de RLS alcança tabela criada entre etapas · política criada',
  (SELECT count(*) FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'pessoas' AND c.relname = 'tabela_da_etapa_seguinte' AND p.polname = 'isolamento_por_instituicao'),
  1::bigint);
ROLLBACK;

SELECT shared.proibir_truncate(ARRAY['financeiro.lancamento', 'financeiro.lancamento_categoria', 'financeiro.transferencia',
                                     'financeiro.periodo_contabil', 'financeiro.reabertura_de_periodo',
                                     'financeiro.prestacao_de_contas', 'identidade.registro_de_auditoria',
                                     'pessoas.registro_de_acesso', 'estoque.movimento_de_estoque', 'estoque.feitio']::regclass[]);
SELECT verif.confere('bloqueio de TRUNCATE é idempotente · um só gatilho sem_truncate por tabela',
  (SELECT count(*) FROM pg_trigger WHERE tgname = 'sem_truncate'), 10::bigint);

-- Mesmo raciocínio para o gatilho: uma lista que inclua uma tabela nova
-- (sem sem_truncate ainda) tem que recebê-lo, não só deixar as antigas como
-- estavam — senão uma função que sai cedo ao ver QUALQUER sem_truncate no
-- catálogo passaria despercebida.
BEGIN;
CREATE TABLE pessoas.tabela_da_proxima_etapa (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
SELECT shared.proibir_truncate(ARRAY['pessoas.tabela_da_proxima_etapa']::regclass[]);
SELECT verif.confere('bloqueio de TRUNCATE alcança tabela criada entre etapas · gatilho criado',
  (SELECT count(*) FROM pg_trigger WHERE tgrelid = 'pessoas.tabela_da_proxima_etapa'::regclass AND tgname = 'sem_truncate'),
  1::bigint);
ROLLBACK;

-- -----------------------------------------------------------------------------
-- Daqui em diante, como a aplicação
-- -----------------------------------------------------------------------------

SET ROLE cdd_app;

-- Duas instituições. A é o CDD; B existe para tentar vazar.
INSERT INTO shared.instituicao (id, nome) VALUES
  ('a0000000-0000-0000-0000-000000000000', 'Céu do Despertar'),
  ('b0000000-0000-0000-0000-000000000000', 'Outra casa');

SELECT set_config('app.instituicao_id', 'b0000000-0000-0000-0000-000000000000', false);
INSERT INTO financeiro.unidade (id, instituicao_id, codigo_sistema, nome, regime)
  VALUES ('b1000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000000', 'CASA_B', 'Casa B', 'CONTRIBUICAO');
INSERT INTO financeiro.conta (id, instituicao_id, nome, tipo, titularidade)
  VALUES ('b2000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000000', 'Caixa B', 'DINHEIRO', 'INSTITUCIONAL');

SELECT set_config('app.instituicao_id', 'a0000000-0000-0000-0000-000000000000', false);

-- Cadastro mínimo de A
INSERT INTO financeiro.unidade (id, instituicao_id, codigo_sistema, nome, regime, teto_anual) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'CDD',   'Céu do Despertar', 'CONTRIBUICAO', NULL),
  ('a1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000', 'MUNAY', 'Munay',            'COMERCIAL',    8100000);

INSERT INTO financeiro.conta (id, instituicao_id, nome, tipo, titularidade, pessoa_titular_id) VALUES
  ('a2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'Conta corrente', 'CONTA_CORRENTE', 'INSTITUCIONAL', NULL),
  ('a2000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000', 'Cartão',         'CARTAO_CREDITO', 'INSTITUCIONAL', NULL),
  ('a2000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000000', 'Pix da Aline',   'CONTA_CORRENTE', 'PESSOAL_DE_TERCEIRO', 'a5000000-0000-0000-0000-000000000001');

INSERT INTO financeiro.categoria (id, instituicao_id, codigo_sistema, nome, natureza, tipo, regimes_permitidos, linha_relatorio) VALUES
  ('a3000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'CONTRIBUICAO', 'Contribuição de cerimônia', 'RECEITA', 'OPERACIONAL', '{CONTRIBUICAO}', 'Contribuições'),
  ('a3000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000', 'FLORES',       'Flores',                    'DESPESA', 'OPERACIONAL', '{CONTRIBUICAO}', 'Insumos de cerimônia'),
  ('a3000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000000', 'ERVAS',        'Ervas',                     'DESPESA', 'OPERACIONAL', '{CONTRIBUICAO}', 'Insumos de cerimônia');

-- -----------------------------------------------------------------------------
-- Multi-instituição
-- -----------------------------------------------------------------------------

SELECT verif.confere('RLS · A enxerga só as próprias unidades',
  (SELECT count(*) FROM financeiro.unidade), 2::bigint);

SELECT set_config('app.instituicao_id', '', false);
SELECT verif.confere('RLS · sem contexto, nenhuma linha (fail-closed)',
  (SELECT count(*) FROM financeiro.unidade), 0::bigint);
SELECT set_config('app.instituicao_id', 'a0000000-0000-0000-0000-000000000000', false);

SELECT verif.espera_erro('RLS · A não grava linha em nome de B',
  $$INSERT INTO financeiro.grupo_de_custo (instituicao_id, codigo_sistema, nome)
    VALUES ('b0000000-0000-0000-0000-000000000000', 'X', 'X')$$, '42501');

SELECT verif.espera_erro('FK composta · A não aponta para a conta de B, mesmo sabendo o id',
  $$INSERT INTO financeiro.lancamento (instituicao_id, status, origem, natureza, valor, motivo, conta_id, registrado_por)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'A_CONFERIR', 'MANUAL', 'DESPESA', 100, 'x',
            'b2000000-0000-0000-0000-000000000000', gen_random_uuid())$$, 'lancamento_instituicao_id_conta_id_fkey');

-- O link público chega sem instituição e a descobre pelo token.
INSERT INTO eventos.evento (id, instituicao_id, unidade_id, nome, tipo, regime_de_receita, status,
                            data_inicio, data_fim, hora_inicio, local, consagra, valor_social, valor_sustentavel, valor_prospero)
  VALUES ('a4000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000',
          'a1000000-0000-0000-0000-000000000001', 'Cerimônia de outubro', 'CERIMONIA', 'CONTRIBUICAO',
          'INSCRICOES_ABERTAS', '2026-10-17', '2026-10-18', '20:00', 'Igreja', true, 15000, 22000, 30000);
INSERT INTO eventos.link_de_inscricao (evento_id, instituicao_id, token)
  VALUES ('a4000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'k7Qm2xVb9LpR4sT8wYz3Nd');

SELECT set_config('app.instituicao_id', '', false);
SELECT verif.confere('link público · o token resolve a instituição sem contexto',
  (SELECT instituicao_id FROM eventos.resolver_link('k7Qm2xVb9LpR4sT8wYz3Nd')),
  'a0000000-0000-0000-0000-000000000000'::uuid);
SELECT verif.confere('link público · e só isso: a tabela continua fechada',
  (SELECT count(*) FROM eventos.link_de_inscricao), 0::bigint);
SELECT verif.confere('link público · token desconhecido não resolve',
  (SELECT count(*) FROM eventos.resolver_link('nao-existe-nao-existe-00')), 0::bigint);
SELECT set_config('app.instituicao_id', 'a0000000-0000-0000-0000-000000000000', false);

-- -----------------------------------------------------------------------------
-- Lançamento
-- -----------------------------------------------------------------------------

-- Decisão 1, o caso que a motivou: Aline devia 100 de contribuição, forneceu
-- flores (70) e ervas (50); o CDD paga a diferença de 20.
SELECT verif.espera_ok('decisão 1 · caso Aline: despesa de 20 com três etiquetas de naturezas mistas', $$
  INSERT INTO financeiro.lancamento (id, instituicao_id, status, origem, natureza, valor, motivo, unidade_id, conta_id,
                                     competencia, data_competencia, data_caixa, registrado_por, confirmado_por)
    VALUES ('a6000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'CONFIRMADO', 'MANUAL',
            'DESPESA', 2000, 'Encontro de contas com a Aline', 'a1000000-0000-0000-0000-000000000001',
            'a2000000-0000-0000-0000-000000000001', '2026-09-01', '2026-09-10', '2026-09-10',
            gen_random_uuid(), gen_random_uuid());
  INSERT INTO financeiro.lancamento_categoria (instituicao_id, lancamento_id, categoria_id, natureza, valor) VALUES
    ('a0000000-0000-0000-0000-000000000000', 'a6000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000002', 'DESPESA', 7000),
    ('a0000000-0000-0000-0000-000000000000', 'a6000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000003', 'DESPESA', 5000),
    ('a0000000-0000-0000-0000-000000000000', 'a6000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'RECEITA', 10000)
$$);

SELECT verif.espera_erro('decisão 1 · etiquetas que não fecham no valor são recusadas no commit', $$
  INSERT INTO financeiro.lancamento (id, instituicao_id, status, origem, natureza, valor, motivo, registrado_por)
    VALUES ('a6000000-0000-0000-0000-000000000099', 'a0000000-0000-0000-0000-000000000000', 'A_CONFERIR', 'MANUAL',
            'DESPESA', 2500, 'x', gen_random_uuid());
  INSERT INTO financeiro.lancamento_categoria (instituicao_id, lancamento_id, categoria_id, natureza, valor) VALUES
    ('a0000000-0000-0000-0000-000000000000', 'a6000000-0000-0000-0000-000000000099', 'a3000000-0000-0000-0000-000000000002', 'DESPESA', 2000)
$$, 'ETIQUETAS_NAO_FECHAM');

SELECT verif.espera_erro('L3 · a etiqueta não inventa natureza: é a da categoria', $$
  INSERT INTO financeiro.lancamento (id, instituicao_id, status, origem, natureza, valor, motivo, registrado_por)
    VALUES ('a6000000-0000-0000-0000-000000000098', 'a0000000-0000-0000-0000-000000000000', 'A_CONFERIR', 'MANUAL',
            'DESPESA', 100, 'x', gen_random_uuid());
  INSERT INTO financeiro.lancamento_categoria (instituicao_id, lancamento_id, categoria_id, natureza, valor) VALUES
    ('a0000000-0000-0000-0000-000000000000', 'a6000000-0000-0000-0000-000000000098', 'a3000000-0000-0000-0000-000000000001', 'DESPESA', 100)
$$, 'l3_natureza_da_categoria');

SELECT verif.espera_ok('L7 · A_CONFERIR admite lacuna (registro rápido sem conta nem categoria)', $$
  INSERT INTO financeiro.lancamento (id, instituicao_id, status, origem, natureza, valor, motivo, registrado_por)
    VALUES ('a6000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000', 'A_CONFERIR',
            'REGISTRO_RAPIDO', 'DESPESA', 4590, 'padaria', 'a7000000-0000-0000-0000-000000000001')
$$);

SELECT verif.espera_erro('L7 · confirmado não admite lacuna', $$
  UPDATE financeiro.lancamento SET status = 'CONFIRMADO', confirmado_por = gen_random_uuid()
   WHERE id = 'a6000000-0000-0000-0000-000000000002'
$$, 'l7_confirmado_completo');

SELECT verif.espera_erro('L6 · caixa não antecede a competência', $$
  INSERT INTO financeiro.lancamento (instituicao_id, status, origem, natureza, valor, motivo, competencia, data_competencia,
                                     data_caixa, registrado_por)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'A_CONFERIR', 'MANUAL', 'DESPESA', 100, 'ração dos cavalos (23/02)',
            '2026-02-01', '2026-02-23', '2026-02-10', gen_random_uuid())
$$, 'l6_caixa_depois_da_competencia');

SELECT verif.espera_erro('L10 · pendência não se abre para si mesmo', $$
  INSERT INTO financeiro.pendencia (instituicao_id, lancamento_id, texto, aberta_por, destinatario)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a6000000-0000-0000-0000-000000000002', 'de qual cerimônia?',
            'a7000000-0000-0000-0000-000000000001', 'a7000000-0000-0000-0000-000000000001')
$$, 'l10_pergunta_a_quem_registrou');

SELECT verif.espera_ok('L10 · uma pendência aberta', $$
  INSERT INTO financeiro.pendencia (instituicao_id, lancamento_id, texto, aberta_por, destinatario)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a6000000-0000-0000-0000-000000000002', 'de qual cerimônia?',
            gen_random_uuid(), 'a7000000-0000-0000-0000-000000000001')
$$);
SELECT verif.espera_erro('L10 · não duas ao mesmo tempo', $$
  INSERT INTO financeiro.pendencia (instituicao_id, lancamento_id, texto, aberta_por, destinatario)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a6000000-0000-0000-0000-000000000002', 'e o comprovante?',
            gen_random_uuid(), 'a7000000-0000-0000-0000-000000000001')
$$, 'pendencia_uma_aberta');

SELECT verif.espera_erro('L2 · confirmado não muda de valor', $$
  UPDATE financeiro.lancamento SET valor = 1900 WHERE id = 'a6000000-0000-0000-0000-000000000001'
$$, 'LANCAMENTO_IMUTAVEL');
SELECT verif.espera_erro('L2 · nem de etiqueta', $$
  DELETE FROM financeiro.lancamento_categoria WHERE lancamento_id = 'a6000000-0000-0000-0000-000000000001'
$$, 'LANCAMENTO_IMUTAVEL');
SELECT verif.espera_erro('L2 · nem some', $$
  DELETE FROM financeiro.lancamento WHERE id = 'a6000000-0000-0000-0000-000000000001'
$$, 'LANCAMENTO_IMUTAVEL');

SELECT verif.espera_ok('L2 · a conferência completa, confirma e ajusta a etiqueta no mesmo ato', $$
  UPDATE financeiro.lancamento
     SET unidade_id = 'a1000000-0000-0000-0000-000000000001', conta_id = 'a2000000-0000-0000-0000-000000000001',
         competencia = '2026-09-01', data_competencia = '2026-09-05',
         status = 'CONFIRMADO', confirmado_por = gen_random_uuid()
   WHERE id = 'a6000000-0000-0000-0000-000000000002';
  INSERT INTO financeiro.lancamento_categoria (instituicao_id, lancamento_id, categoria_id, natureza, valor) VALUES
    ('a0000000-0000-0000-0000-000000000000', 'a6000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000002', 'DESPESA', 4590)
$$);
SELECT verif.espera_erro('L2 · e na transação seguinte, não mais', $$
  UPDATE financeiro.lancamento_categoria SET valor = 4500 WHERE lancamento_id = 'a6000000-0000-0000-0000-000000000002'
$$, 'LANCAMENTO_IMUTAVEL');
SELECT verif.espera_erro('L2 · nem trocando a categoria, mesmo valor, forjando a marca com set_config', $$
  SELECT set_config('cdd.lancamento_a6000000000000000000000000000002', 'gravado', true);
  UPDATE financeiro.lancamento_categoria SET categoria_id = 'a3000000-0000-0000-0000-000000000003'
   WHERE lancamento_id = 'a6000000-0000-0000-0000-000000000002'
$$, 'LANCAMENTO_IMUTAVEL');
SELECT verif.espera_erro('L2 · nem com um INSERT que não acontece (ON CONFLICT DO NOTHING)', $$
  INSERT INTO financeiro.lancamento (id, instituicao_id, status, origem, natureza, valor, motivo, registrado_por)
    VALUES ('a6000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000', 'A_CONFERIR', 'MANUAL',
            'DESPESA', 4590, 'x', gen_random_uuid())
    ON CONFLICT (id) DO NOTHING;
  UPDATE financeiro.lancamento_categoria SET categoria_id = 'a3000000-0000-0000-0000-000000000003'
   WHERE lancamento_id = 'a6000000-0000-0000-0000-000000000002'
$$, 'LANCAMENTO_IMUTAVEL');
SELECT verif.espera_erro('L2 · nem movendo a etiqueta para outro lançamento', $$
  INSERT INTO financeiro.lancamento (id, instituicao_id, status, origem, natureza, valor, motivo, registrado_por)
    VALUES ('a6000000-0000-0000-0000-000000000097', 'a0000000-0000-0000-0000-000000000000', 'A_CONFERIR', 'MANUAL',
            'DESPESA', 7000, 'x', gen_random_uuid());
  UPDATE financeiro.lancamento_categoria SET lancamento_id = 'a6000000-0000-0000-0000-000000000097'
   WHERE lancamento_id = 'a6000000-0000-0000-0000-000000000001' AND categoria_id = 'a3000000-0000-0000-0000-000000000002'
$$, 'LANCAMENTO_IMUTAVEL');
SELECT verif.espera_erro('L2 · nem subindo a versão do lançamento', $$
  UPDATE financeiro.lancamento SET versao = versao + 1 WHERE id = 'a6000000-0000-0000-0000-000000000002';
  UPDATE financeiro.lancamento_categoria SET categoria_id = 'a3000000-0000-0000-0000-000000000003'
   WHERE lancamento_id = 'a6000000-0000-0000-0000-000000000002'
$$, 'LANCAMENTO_IMUTAVEL');

-- Receita de contribuição de 210, depois devolvida (Doc 6 §2.5.1).
SELECT verif.espera_ok('receita de contribuição de 210', $$
  INSERT INTO financeiro.lancamento (id, instituicao_id, status, origem, natureza, valor, motivo, unidade_id, conta_id,
                                     competencia, data_competencia, registrado_por, confirmado_por)
    VALUES ('a6000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000000', 'CONFIRMADO',
            'INTEGRACAO_EVENTOS', 'RECEITA', 21000, 'Contribuição — Clarice', 'a1000000-0000-0000-0000-000000000001',
            'a2000000-0000-0000-0000-000000000001', '2026-09-01', '2026-09-12', gen_random_uuid(), gen_random_uuid());
  INSERT INTO financeiro.lancamento_categoria (instituicao_id, lancamento_id, categoria_id, natureza, valor) VALUES
    ('a0000000-0000-0000-0000-000000000000', 'a6000000-0000-0000-0000-000000000003', 'a3000000-0000-0000-0000-000000000001', 'RECEITA', 21000)
$$);

SELECT verif.espera_erro('§2.5.1 · o estorno tem a natureza do original, nunca a oposta', $$
  INSERT INTO financeiro.lancamento (instituicao_id, status, origem, natureza, valor, motivo, unidade_id, conta_id,
                                     competencia, data_competencia, estorno_de_id, registrado_por, confirmado_por)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'CONFIRMADO', 'MANUAL', 'DESPESA', 21000, 'devolução',
            'a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', '2026-09-01', '2026-09-20',
            'a6000000-0000-0000-0000-000000000003', gen_random_uuid(), gen_random_uuid())
$$, 'estorno_mesma_natureza');

SELECT verif.espera_ok('§2.5.1 · devolução como estorno da receita', $$
  INSERT INTO financeiro.lancamento (id, instituicao_id, status, origem, natureza, valor, motivo, unidade_id, conta_id,
                                     competencia, data_competencia, estorno_de_id, registrado_por, confirmado_por)
    VALUES ('a6000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000000', 'CONFIRMADO', 'MANUAL',
            'RECEITA', 21000, 'Devolução — Clarice', 'a1000000-0000-0000-0000-000000000001',
            'a2000000-0000-0000-0000-000000000001', '2026-09-01', '2026-09-20',
            'a6000000-0000-0000-0000-000000000003', gen_random_uuid(), gen_random_uuid());
  INSERT INTO financeiro.lancamento_categoria (instituicao_id, lancamento_id, categoria_id, natureza, valor) VALUES
    ('a0000000-0000-0000-0000-000000000000', 'a6000000-0000-0000-0000-000000000004', 'a3000000-0000-0000-0000-000000000001', 'RECEITA', 21000);
  UPDATE financeiro.lancamento SET status = 'ESTORNADO' WHERE id = 'a6000000-0000-0000-0000-000000000003'
$$);

SELECT verif.espera_erro('um lançamento se estorna uma vez só', $$
  INSERT INTO financeiro.lancamento (instituicao_id, status, origem, natureza, valor, motivo, estorno_de_id, registrado_por)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'A_CONFERIR', 'MANUAL', 'RECEITA', 21000, 'de novo',
            'a6000000-0000-0000-0000-000000000003', gen_random_uuid())
$$, 'lancamento_estorno_de_id_key');

SELECT verif.espera_erro('L2 · estornar não reabre as etiquetas do original, nem na mesma transação', $$
  UPDATE financeiro.lancamento SET status = 'ESTORNADO' WHERE id = 'a6000000-0000-0000-0000-000000000001';
  UPDATE financeiro.lancamento_categoria SET valor = 6000
   WHERE lancamento_id = 'a6000000-0000-0000-0000-000000000001' AND categoria_id = 'a3000000-0000-0000-0000-000000000002'
$$, 'LANCAMENTO_IMUTAVEL');

-- A DRE lê etiquetas: contribuição = +100 (Aline) + 210 − 210 = 100;
-- despesas = 70 + 50 (Aline) + 45,90 (padaria) = 165,90.
SELECT verif.confere('DRE · a devolução derruba a receita, não infla a despesa',
  (SELECT sum(valor) FROM financeiro.v_dre WHERE natureza = 'RECEITA' AND competencia = '2026-09-01'), 10000::numeric);
SELECT verif.confere('DRE · despesa é só o que a casa gastou: flores, ervas e padaria — a devolução não entra',
  (SELECT sum(valor) FROM financeiro.v_dre WHERE natureza = 'DESPESA' AND competencia = '2026-09-01'), 16590::numeric);
SELECT verif.confere('saldo · a conta mostra −20 da Aline, −45,90 da padaria, +210 −210 da Clarice',
  (SELECT saldo FROM financeiro.v_saldo_da_conta WHERE conta_id = 'a2000000-0000-0000-0000-000000000001'), -6590::bigint);

-- -----------------------------------------------------------------------------
-- Período
-- -----------------------------------------------------------------------------

INSERT INTO financeiro.periodo_contabil (instituicao_id, unidade_id, competencia, fechado, fechado_por, fechado_em, hash_sha256)
  VALUES ('a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000001', '2026-07-01',
          true, gen_random_uuid(), now(), sha256('julho'));

SELECT verif.espera_erro('L5 · nada nasce em competência fechada', $$
  INSERT INTO financeiro.lancamento (instituicao_id, status, origem, natureza, valor, motivo, unidade_id, competencia, data_competencia, registrado_por)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'A_CONFERIR', 'MANUAL', 'DESPESA', 500, 'ajuste',
            'a1000000-0000-0000-0000-000000000001', '2026-07-01', '2026-07-15', gen_random_uuid())
$$, 'PERIODO_FECHADO');

SELECT verif.espera_erro('L5 · nem transferência', $$
  INSERT INTO financeiro.transferencia (instituicao_id, finalidade, status, valor, data, conta_origem_id, conta_destino_id,
                                        unidade_id, motivo, registrado_por)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'MOVIMENTACAO_SIMPLES', 'A_CONFERIR', 500, '2026-07-20',
            'a2000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002',
            'a1000000-0000-0000-0000-000000000001', 'x', gen_random_uuid())
$$, 'PERIODO_FECHADO');

SELECT verif.espera_erro('P3 · reabertura sem motivo de verdade não existe', $$
  INSERT INTO financeiro.reabertura_de_periodo (instituicao_id, periodo_id, motivo, reaberto_por, hash_anterior)
    SELECT instituicao_id, id, 'erro', gen_random_uuid(), hash_sha256 FROM financeiro.periodo_contabil
$$, 'p3_reabertura_tem_motivo');

SELECT verif.espera_erro('P3 · competência fechada não se reabre em silêncio', $$
  UPDATE financeiro.periodo_contabil SET fechado = false, fechado_por = NULL, fechado_em = NULL, hash_sha256 = NULL
   WHERE competencia = '2026-07-01'
$$, 'PERIODO_FECHADO');
SELECT verif.espera_erro('P2 · nem troca o hash do fechamento', $$
  UPDATE financeiro.periodo_contabil SET hash_sha256 = sha256('outro julho') WHERE competencia = '2026-07-01'
$$, 'PERIODO_FECHADO');
SELECT verif.espera_erro('P3 · nem some', $$
  DELETE FROM financeiro.periodo_contabil WHERE competencia = '2026-07-01'
$$, 'PERIODO_FECHADO');

SELECT verif.espera_ok('P3 · reabre com o motivo registrado na mesma transação', $$
  INSERT INTO financeiro.reabertura_de_periodo (instituicao_id, periodo_id, motivo, reaberto_por, hash_anterior)
    SELECT instituicao_id, id, 'nota da padaria de julho chegou depois', gen_random_uuid(), hash_sha256
      FROM financeiro.periodo_contabil WHERE competencia = '2026-07-01';
  UPDATE financeiro.periodo_contabil SET fechado = false, fechado_por = NULL, fechado_em = NULL, hash_sha256 = NULL
   WHERE competencia = '2026-07-01'
$$);
SELECT verif.espera_erro('P3 · reaberta, a competência não troca de mês', $$
  UPDATE financeiro.periodo_contabil SET competencia = '2026-06-01' WHERE competencia = '2026-07-01'
$$, 'PERIODO_FECHADO');
UPDATE financeiro.periodo_contabil SET fechado = true, fechado_por = gen_random_uuid(), fechado_em = now(), hash_sha256 = sha256('julho')
 WHERE competencia = '2026-07-01';
SELECT verif.espera_erro('P3 · a reabertura de antes não serve para reabrir de novo', $$
  UPDATE financeiro.periodo_contabil SET fechado = false, fechado_por = NULL, fechado_em = NULL, hash_sha256 = NULL
   WHERE competencia = '2026-07-01'
$$, 'PERIODO_FECHADO');
SELECT verif.espera_erro('P3 · nem reabrindo e trocando de mês em dois comandos', $$
  INSERT INTO financeiro.reabertura_de_periodo (instituicao_id, periodo_id, motivo, reaberto_por, hash_anterior)
    SELECT instituicao_id, id, 'conferência do extrato de julho', gen_random_uuid(), hash_sha256
      FROM financeiro.periodo_contabil WHERE competencia = '2026-07-01';
  UPDATE financeiro.periodo_contabil SET fechado = false, fechado_por = NULL, fechado_em = NULL, hash_sha256 = NULL
   WHERE competencia = '2026-07-01';
  UPDATE financeiro.periodo_contabil SET competencia = '2026-05-01' WHERE competencia = '2026-07-01'
$$, 'PERIODO_FECHADO');
SELECT verif.espera_ok('P3 · o banco carimba a hora da reabertura, mesmo que a aplicação mande outra', $$
  INSERT INTO financeiro.reabertura_de_periodo (instituicao_id, periodo_id, motivo, reaberto_por, reaberto_em, hash_anterior)
    SELECT instituicao_id, id, 'conferência do extrato de julho', gen_random_uuid(), '2026-09-26T12:00:00.123Z', hash_sha256
      FROM financeiro.periodo_contabil WHERE competencia = '2026-07-01';
  UPDATE financeiro.periodo_contabil SET fechado = false, fechado_por = NULL, fechado_em = NULL, hash_sha256 = NULL
   WHERE competencia = '2026-07-01'
$$);
UPDATE financeiro.periodo_contabil SET fechado = true, fechado_por = gen_random_uuid(), fechado_em = now(), hash_sha256 = sha256('julho')
 WHERE competencia = '2026-07-01';

-- Fechar e gravar na mesma competência disputam a mesma trava; a corrida em
-- si é caso da suíte de concorrência (Documento 7 §26), com duas conexões.
SET datestyle = 'German';
SELECT set_config('verif.chave', financeiro.chave_do_periodo('a0000000-0000-0000-0000-000000000000',
  'a1000000-0000-0000-0000-000000000001', '2026-10-01')::text, false);
SET datestyle = 'ISO, MDY';
SELECT verif.confere('P2 · a chave da trava não depende do formato de data da sessão',
  financeiro.chave_do_periodo('a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000001',
                              '2026-10-01')::text, current_setting('verif.chave'));
RESET datestyle;

BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT verif.espera_erro('P2 · gravar na competência fora de READ COMMITTED é recusado', $$
  INSERT INTO financeiro.lancamento (instituicao_id, status, origem, natureza, valor, motivo, unidade_id, competencia,
                                     data_competencia, registrado_por)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'A_CONFERIR', 'MANUAL', 'DESPESA', 300, 'x',
            'a1000000-0000-0000-0000-000000000001', '2026-10-01', '2026-10-06', gen_random_uuid())
$$, '^ISOLAMENTO_INVALIDO: .*READ COMMITTED');
ROLLBACK;
SELECT verif.espera_ok('P2 · gravar na competência toma a trava do período, compartilhada', $$
  INSERT INTO financeiro.lancamento (instituicao_id, status, origem, natureza, valor, motivo, unidade_id, competencia,
                                     data_competencia, registrado_por)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'A_CONFERIR', 'MANUAL', 'DESPESA', 1200, 'gás de outubro',
            'a1000000-0000-0000-0000-000000000001', '2026-10-01', '2026-10-05', gen_random_uuid());
  DO $x$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_locks WHERE locktype = 'advisory' AND mode = 'ShareLock' AND granted
                      AND pid = pg_backend_pid()) THEN
      RAISE EXCEPTION 'sem a trava compartilhada do período';
    END IF;
  END $x$
$$);
SELECT verif.espera_ok('P2 · fechar a competência toma a mesma trava, exclusiva', $$
  INSERT INTO financeiro.periodo_contabil (instituicao_id, unidade_id, competencia)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000001', '2026-04-01');
  UPDATE financeiro.periodo_contabil SET fechado = true, fechado_por = gen_random_uuid(), fechado_em = now(), hash_sha256 = sha256('abril')
   WHERE competencia = '2026-04-01';
  DO $x$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_locks WHERE locktype = 'advisory' AND mode = 'ExclusiveLock' AND granted
                      AND pid = pg_backend_pid()) THEN
      RAISE EXCEPTION 'sem a trava exclusiva do período';
    END IF;
  END $x$
$$);

-- -----------------------------------------------------------------------------
-- Transferência, fatura, adiantamento
-- -----------------------------------------------------------------------------

SELECT verif.espera_erro('F1 · fatura só em conta de cartão', $$
  INSERT INTO financeiro.fatura (instituicao_id, conta_id, competencia, data_fechamento, data_vencimento, status)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a2000000-0000-0000-0000-000000000001', '2026-09-01',
            '2026-09-25', '2026-10-05', 'ABERTA')
$$, 'f1_fatura_so_em_cartao');

SELECT verif.espera_erro('T · pagamento de fatura sem a fatura não existe', $$
  INSERT INTO financeiro.transferencia (instituicao_id, finalidade, status, valor, data, conta_origem_id, conta_destino_id,
                                        unidade_id, motivo, registrado_por)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'PAGAMENTO_DE_FATURA', 'A_CONFERIR', 500, '2026-09-20',
            'a2000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002',
            'a1000000-0000-0000-0000-000000000001', 'x', gen_random_uuid())
$$, 'f3_pagamento_tem_fatura');

SELECT verif.espera_erro('FD3 · aporte a fundo sem o fundo não existe', $$
  INSERT INTO financeiro.transferencia (instituicao_id, finalidade, status, valor, data, conta_origem_id, conta_destino_id,
                                        unidade_id, motivo, registrado_por)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'APORTE_A_FUNDO', 'A_CONFERIR', 384000, '2026-09-20',
            'a2000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002',
            'a1000000-0000-0000-0000-000000000001', 'movim. Ayahuasca pra caixinha', gen_random_uuid())
$$, 'fd3_aporte_tem_fundo');

INSERT INTO financeiro.transferencia (id, instituicao_id, finalidade, status, valor, data, conta_origem_id, conta_destino_id,
                                      unidade_id, motivo, registrado_por, confirmado_por)
  VALUES ('a9800000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'MOVIMENTACAO_SIMPLES', 'CONFIRMADO',
          30000, '2026-09-15', 'a2000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002',
          'a1000000-0000-0000-0000-000000000001', 'pagamento antecipado do cartão', gen_random_uuid(), gen_random_uuid());

SELECT verif.espera_erro('transferência confirmada não muda de valor', $$
  UPDATE financeiro.transferencia SET valor = 29000 WHERE id = 'a9800000-0000-0000-0000-000000000001'
$$, 'TRANSFERENCIA_IMUTAVEL');
SELECT verif.espera_erro('transferência confirmada não some', $$
  DELETE FROM financeiro.transferencia WHERE id = 'a9800000-0000-0000-0000-000000000001'
$$, 'TRANSFERENCIA_IMUTAVEL');
SELECT verif.espera_ok('transferência A_CONFERIR ainda se descarta', $$
  INSERT INTO financeiro.transferencia (id, instituicao_id, finalidade, status, valor, data, conta_origem_id, conta_destino_id,
                                        unidade_id, motivo, registrado_por)
    VALUES ('a9800000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000', 'MOVIMENTACAO_SIMPLES', 'A_CONFERIR',
            500, '2026-09-16', 'a2000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002',
            'a1000000-0000-0000-0000-000000000001', 'registrada em dobro', gen_random_uuid());
  DELETE FROM financeiro.transferencia WHERE id = 'a9800000-0000-0000-0000-000000000002'
$$);
SELECT verif.espera_erro('transferência confirmada registra quem conferiu', $$
  INSERT INTO financeiro.transferencia (instituicao_id, finalidade, status, valor, data, conta_origem_id, conta_destino_id,
                                        unidade_id, motivo, registrado_por)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'MOVIMENTACAO_SIMPLES', 'CONFIRMADO', 500, '2026-09-20',
            'a2000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002',
            'a1000000-0000-0000-0000-000000000001', 'sem conferente', gen_random_uuid())
$$, 't_confirmada_tem_conferente');
SELECT verif.confere('e some de fato, não é descartada em silêncio pela guarda',
  (SELECT count(*) FROM financeiro.transferencia WHERE id = 'a9800000-0000-0000-0000-000000000002'), 0::bigint);

SELECT verif.espera_erro('A2 · adiantamento sai de conta pessoal, nunca da institucional', $$
  INSERT INTO financeiro.adiantamento (instituicao_id, pessoa_id, conta_origem_id, valor, data_despesa, lancamento_id, status)
    VALUES ('a0000000-0000-0000-0000-000000000000', gen_random_uuid(), 'a2000000-0000-0000-0000-000000000001',
            2000, '2026-09-10', 'a6000000-0000-0000-0000-000000000001', 'AGUARDANDO_AUTORIZACAO')
$$, 'a2_origem_e_conta_pessoal');

-- -----------------------------------------------------------------------------
-- Extrato
-- -----------------------------------------------------------------------------

INSERT INTO shared.anexo (id, instituicao_id, chave, nome_original, mime, tamanho_bytes, sha256, enviado_por)
  VALUES ('a8000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000',
          'a000/financeiro/extrato-set.ofx', 'extrato-set.ofx', 'application/x-ofx', 4096, sha256('ofx'), gen_random_uuid());
INSERT INTO financeiro.importacao_de_extrato (id, instituicao_id, conta_id, arquivo_anexo_id, formato, periodo_de, periodo_ate,
                                              linhas_lidas, linhas_ja_conhecidas, importado_por)
  VALUES ('a9000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'a2000000-0000-0000-0000-000000000001',
          'a8000000-0000-0000-0000-000000000001', 'OFX', '2026-09-01', '2026-09-30', 1, 0, gen_random_uuid());
INSERT INTO financeiro.linha_extrato (instituicao_id, conta_id, importacao_id, identificador_externo, data, valor, sinal,
                                      descricao_banco, status)
  VALUES ('a0000000-0000-0000-0000-000000000000', 'a2000000-0000-0000-0000-000000000001', 'a9000000-0000-0000-0000-000000000001',
          'FITID-0001', '2026-09-10', 2000, 'DEBITO', 'PIX ALINE', 'NAO_CONCILIADA');

SELECT verif.espera_erro('I1 · reimportar o mesmo FITID não duplica', $$
  INSERT INTO financeiro.linha_extrato (instituicao_id, conta_id, importacao_id, identificador_externo, data, valor, sinal,
                                        descricao_banco, status)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a2000000-0000-0000-0000-000000000001', 'a9000000-0000-0000-0000-000000000001',
            'FITID-0001', '2026-09-10', 2000, 'DEBITO', 'PIX ALINE', 'NAO_CONCILIADA')
$$, 'i1_fitid_unico');

SELECT verif.espera_ok('conciliar a linha com o lançamento da Aline', $$
  UPDATE financeiro.linha_extrato SET status = 'CONCILIADA', lancamento_id = 'a6000000-0000-0000-0000-000000000001',
         conciliada_por = gen_random_uuid(), conciliada_em = now()
   WHERE identificador_externo = 'FITID-0001'
$$);

SELECT verif.espera_erro('I2 · a linha concilia com lançamento ou com transferência, nunca os dois', $$
  INSERT INTO financeiro.transferencia (id, instituicao_id, finalidade, status, valor, data, conta_origem_id, conta_destino_id,
                                        unidade_id, motivo, registrado_por)
    VALUES ('a9900000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'MOVIMENTACAO_SIMPLES', 'A_CONFERIR',
            2000, '2026-09-10', 'a2000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002',
            'a1000000-0000-0000-0000-000000000001', 'x', gen_random_uuid());
  UPDATE financeiro.linha_extrato SET transferencia_id = 'a9900000-0000-0000-0000-000000000001'
   WHERE identificador_externo = 'FITID-0001'
$$, 'i2_um_so_par');

-- -----------------------------------------------------------------------------
-- Pessoas e anamnese
-- -----------------------------------------------------------------------------

INSERT INTO pessoas.pessoa (id, instituicao_id, tipo, nome, documento, relacao_com_a_casa) VALUES
  ('a5000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'FISICA', 'Aline', '52918734011', 'FREQUENTADOR'),
  ('a5000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000', 'FISICA', 'Clarice', '33091877542', 'VISITANTE');

SELECT verif.espera_erro('link público · CPF é único na casa', $$
  INSERT INTO pessoas.pessoa (instituicao_id, tipo, nome, documento)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'FISICA', 'Outra Clarice', '33091877542')
$$, 'pessoa_documento_unico');

INSERT INTO pessoas.vinculo (instituicao_id, pessoa_id, papel, vigencia, registrado_por)
  VALUES ('a0000000-0000-0000-0000-000000000000', 'a5000000-0000-0000-0000-000000000001', 'MADRINHA', '[2020-01-01,)', gen_random_uuid());
SELECT verif.espera_erro('V · o mesmo papel não se sobrepõe a si mesmo', $$
  INSERT INTO pessoas.vinculo (instituicao_id, pessoa_id, papel, vigencia, registrado_por)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a5000000-0000-0000-0000-000000000001', 'MADRINHA', '[2024-01-01,2025-01-01)', gen_random_uuid())
$$, 'v_papel_sem_sobreposicao');

INSERT INTO pessoas.formulario_de_anamnese (id, instituicao_id, numero, status, validade_meses, publicada_em, publicada_por)
  VALUES ('aa000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 3, 'PUBLICADA', 12, now(), gen_random_uuid());
SELECT verif.espera_erro('FA · uma versão publicada por vez', $$
  INSERT INTO pessoas.formulario_de_anamnese (instituicao_id, numero, status, validade_meses, publicada_em, publicada_por)
    VALUES ('a0000000-0000-0000-0000-000000000000', 4, 'PUBLICADA', 12, now(), gen_random_uuid())
$$, 'formulario_um_publicado');

INSERT INTO pessoas.pergunta (id, instituicao_id, codigo) VALUES
  ('ab000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'MEDICACAO_CONTINUA');
INSERT INTO pessoas.pergunta_no_formulario (instituicao_id, formulario_id, pergunta_id, ordem, texto, tipo, obrigatoria, sensivel)
  VALUES ('a0000000-0000-0000-0000-000000000000', 'aa000000-0000-0000-0000-000000000001', 'ab000000-0000-0000-0000-000000000001',
          1, 'Você usa alguma medicação de uso contínuo?', 'BOOLEANO', true, true);

INSERT INTO pessoas.resposta_de_anamnese (id, instituicao_id, pessoa_id, formulario_id, modo, situacao, valida_ate, canal)
  VALUES ('ac000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'a5000000-0000-0000-0000-000000000002',
          'aa000000-0000-0000-0000-000000000001', 'PRIMEIRA_VEZ', 'VIGENTE', '2027-09-12', 'LINK_DE_INSCRICAO');
INSERT INTO pessoas.item_de_resposta (instituicao_id, resposta_id, pergunta_id, valor, respondido_em, motivo_pendencia)
  VALUES ('a0000000-0000-0000-0000-000000000000', 'ac000000-0000-0000-0000-000000000001', 'ab000000-0000-0000-0000-000000000001',
          'false', now(), 'PRIMEIRA_VEZ');

SELECT verif.espera_erro('RA · uma resposta vigente por pessoa', $$
  INSERT INTO pessoas.resposta_de_anamnese (instituicao_id, pessoa_id, formulario_id, modo, situacao, valida_ate, canal)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a5000000-0000-0000-0000-000000000002',
            'aa000000-0000-0000-0000-000000000001', 'POR_ESCOLHA', 'VIGENTE', '2027-10-01', 'LINK_DE_INSCRICAO')
$$, 'resposta_uma_vigente');

SELECT verif.espera_erro('item · ou herdado, ou com motivo — nunca os dois, nunca nenhum', $$
  INSERT INTO pessoas.resposta_de_anamnese (id, instituicao_id, pessoa_id, formulario_id, modo, situacao, valida_ate, canal)
    VALUES ('ac000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000000', 'a5000000-0000-0000-0000-000000000001',
            'aa000000-0000-0000-0000-000000000001', 'PRIMEIRA_VEZ', 'VIGENTE', '2027-10-01', 'LINK_DE_INSCRICAO');
  INSERT INTO pessoas.item_de_resposta (instituicao_id, resposta_id, pergunta_id, valor, respondido_em)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'ac000000-0000-0000-0000-000000000009',
            'ab000000-0000-0000-0000-000000000001', 'true', now())
$$, 'item_herdado_ou_com_motivo');

INSERT INTO pessoas.declaracao_de_veracidade (instituicao_id, pessoa_id, evento_id, resposta_id, texto)
  VALUES ('a0000000-0000-0000-0000-000000000000', 'a5000000-0000-0000-0000-000000000002', 'a4000000-0000-0000-0000-000000000001',
          'ac000000-0000-0000-0000-000000000001', 'Declaro que as informações seguem verdadeiras para esta cerimônia.');
SELECT verif.espera_erro('§2.6 · uma declaração por pessoa por cerimônia', $$
  INSERT INTO pessoas.declaracao_de_veracidade (instituicao_id, pessoa_id, evento_id, resposta_id, texto)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a5000000-0000-0000-0000-000000000002', 'a4000000-0000-0000-0000-000000000001',
            'ac000000-0000-0000-0000-000000000001', 'de novo')
$$, 'uma_declaracao_por_cerimonia');

INSERT INTO pessoas.registro_de_acesso (instituicao_id, leitor_usuario_id, pessoa_id, resposta_id, contexto_tipo)
  VALUES ('a0000000-0000-0000-0000-000000000000', gen_random_uuid(), 'a5000000-0000-0000-0000-000000000002',
          'ac000000-0000-0000-0000-000000000001', 'INSCRICAO');
SELECT verif.espera_erro('RA3 · leitura de anamnese registrada não se apaga', $$
  DELETE FROM pessoas.registro_de_acesso
$$, '42501|REGISTRO_IMUTAVEL');

SELECT verif.espera_erro('§23 · o cabeçalho da resposta lida não se apaga: o registro de acesso aponta para ele', $$
  DELETE FROM pessoas.declaracao_de_veracidade WHERE resposta_id = 'ac000000-0000-0000-0000-000000000001';
  DELETE FROM pessoas.item_de_resposta WHERE resposta_id = 'ac000000-0000-0000-0000-000000000001';
  DELETE FROM pessoas.resposta_de_anamnese WHERE id = 'ac000000-0000-0000-0000-000000000001'
$$, 'registro_de_acesso_instituicao_id_resposta_id_fkey');

-- -----------------------------------------------------------------------------
-- Auditoria
-- -----------------------------------------------------------------------------

INSERT INTO identidade.registro_de_auditoria (instituicao_id, autor_usuario_id, autor_grupos, operacao, agregado_tipo, agregado_id)
  VALUES ('a0000000-0000-0000-0000-000000000000', gen_random_uuid(), '{TESOURARIA}', 'LANCAMENTO_CONFIRMADO',
          'Lancamento', 'a6000000-0000-0000-0000-000000000001');
SELECT verif.espera_erro('trilha · não se edita', $$
  UPDATE identidade.registro_de_auditoria SET operacao = 'LANCAMENTO_ESTORNADO'
$$, '42501|REGISTRO_IMUTAVEL');
SELECT verif.espera_erro('trilha · não se apaga', $$
  DELETE FROM identidade.registro_de_auditoria
$$, '42501|REGISTRO_IMUTAVEL');
SELECT verif.espera_erro('catálogo de permissões · a aplicação não inventa permissão', $$
  INSERT INTO identidade.permissao VALUES ('financeiro.tudo.fazer', 'financeiro', 'x')
$$, '42501');

-- -----------------------------------------------------------------------------
-- Ator da trilha e do anexo — o despachante (SISTEMA) e o link público
-- (LINK_PUBLICO) também auditam e também enviam anexo, e nenhum dos dois
-- tem um identidade.usuario por trás.
-- -----------------------------------------------------------------------------

SELECT verif.espera_ok('ator da trilha · SISTEMA sem usuário é aceito', $$
  INSERT INTO identidade.registro_de_auditoria (instituicao_id, autor_tipo, autor_grupos, operacao, agregado_tipo, agregado_id)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'SISTEMA', '{}', 'LANCAMENTO_CONFIRMADO', 'Lancamento',
            'a6000000-0000-0000-0000-000000000001')
$$);
SELECT verif.espera_erro('ator da trilha · USUARIO sem usuário é recusado', $$
  INSERT INTO identidade.registro_de_auditoria (instituicao_id, autor_tipo, autor_grupos, operacao, agregado_tipo, agregado_id)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'USUARIO', '{}', 'LANCAMENTO_CONFIRMADO', 'Lancamento',
            'a6000000-0000-0000-0000-000000000001')
$$, 'autor_coerente');
SELECT verif.espera_erro('ator da trilha · SISTEMA com usuário é recusado', $$
  INSERT INTO identidade.registro_de_auditoria (instituicao_id, autor_tipo, autor_usuario_id, autor_grupos, operacao,
                                                 agregado_tipo, agregado_id)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'SISTEMA', gen_random_uuid(), '{}', 'LANCAMENTO_CONFIRMADO',
            'Lancamento', 'a6000000-0000-0000-0000-000000000001')
$$, 'autor_coerente');

SELECT verif.espera_ok('ator do anexo · SISTEMA sem usuário é aceito', $$
  INSERT INTO shared.anexo (instituicao_id, chave, nome_original, mime, tamanho_bytes, sha256, enviado_por_tipo)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a000/financeiro/despachante-01.txt', 'x', 'text/plain', 10,
            sha256('sistema'), 'SISTEMA')
$$);
SELECT verif.espera_erro('ator do anexo · USUARIO sem usuário é recusado', $$
  INSERT INTO shared.anexo (instituicao_id, chave, nome_original, mime, tamanho_bytes, sha256, enviado_por_tipo)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a000/financeiro/despachante-02.txt', 'x', 'text/plain', 10,
            sha256('usuario-sem-id'), 'USUARIO')
$$, 'enviado_coerente');
SELECT verif.espera_erro('ator do anexo · SISTEMA com usuário é recusado', $$
  INSERT INTO shared.anexo (instituicao_id, chave, nome_original, mime, tamanho_bytes, sha256, enviado_por_tipo, enviado_por)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a000/financeiro/despachante-03.txt', 'x', 'text/plain', 10,
            sha256('sistema-com-id'), 'SISTEMA', gen_random_uuid())
$$, 'enviado_coerente');

-- -----------------------------------------------------------------------------
-- Eventos
-- -----------------------------------------------------------------------------

SELECT verif.espera_erro('decisão 6 · cerimônia de contribuição tem os três níveis', $$
  INSERT INTO eventos.evento (instituicao_id, unidade_id, nome, tipo, regime_de_receita, status, data_inicio, data_fim,
                              hora_inicio, local, consagra, valor_social)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000001', 'x', 'CERIMONIA',
            'CONTRIBUICAO', 'PLANEJADO', '2026-11-01', '2026-11-01', '20:00', 'Igreja', true, 15000)
$$, 'ev_contribuicao_tem_tres_niveis');
SELECT verif.espera_erro('decisão 6 · e em ordem: social ≤ sustentável ≤ próspero', $$
  INSERT INTO eventos.evento (instituicao_id, unidade_id, nome, tipo, regime_de_receita, status, data_inicio, data_fim,
                              hora_inicio, local, consagra, valor_social, valor_sustentavel, valor_prospero)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000001', 'x', 'CERIMONIA',
            'CONTRIBUICAO', 'PLANEJADO', '2026-11-01', '2026-11-01', '20:00', 'Igreja', true, 30000, 22000, 15000)
$$, 'ev_niveis_em_ordem');

INSERT INTO eventos.opcao_de_hospedagem (id, instituicao_id, evento_id, tipo, valor_por_noite, ocupa_leito) VALUES
  ('ad000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000001', 'BELICHE', 4000, true);
SELECT verif.espera_erro('decisão 6 · colchonete é de graça e não ocupa leito', $$
  INSERT INTO eventos.opcao_de_hospedagem (instituicao_id, evento_id, tipo, valor_por_noite, ocupa_leito)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000001', 'COLCHONETE', 1000, false)
$$, 'colchonete_gratis_e_sem_leito');

SELECT verif.espera_erro('isento ≠ zero · valor combinado zero não é isenção', $$
  INSERT INTO eventos.inscricao (instituicao_id, evento_id, pessoa_id, canal, tipo_participacao, status,
                                 primeira_vez_na_casa, primeira_vez_na_ayahuasca, consagra, valor_combinado,
                                 contato_emergencia_nome, contato_emergencia_tel, restricoes_alimentares, acolhimento)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001',
            'LINK', 'PARTICIPANTE', 'PENDENTE', false, false, true, 0, 'Mãe', '11999990000', 'Nenhuma', 'NAO_NECESSARIO')
$$, 'in_zero_nao_e_isencao');

SELECT verif.espera_erro('isenção tem motivo', $$
  INSERT INTO eventos.inscricao (instituicao_id, evento_id, pessoa_id, canal, tipo_participacao, status,
                                 primeira_vez_na_casa, primeira_vez_na_ayahuasca, consagra, isento,
                                 contato_emergencia_nome, contato_emergencia_tel, restricoes_alimentares, acolhimento)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001',
            'LINK', 'PARTICIPANTE', 'PENDENTE', false, false, true, true, 'Mãe', '11999990000', 'Nenhuma', 'NAO_NECESSARIO')
$$, 'in_isencao_tem_motivo');

SELECT verif.espera_erro('IN4 · sem contato de emergência não há inscrição', $$
  INSERT INTO eventos.inscricao (instituicao_id, evento_id, pessoa_id, canal, tipo_participacao, status,
                                 primeira_vez_na_casa, primeira_vez_na_ayahuasca, consagra, restricoes_alimentares, acolhimento)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001',
            'LINK', 'PARTICIPANTE', 'PENDENTE', false, false, true, 'Nenhuma', 'NAO_NECESSARIO')
$$, 'contato_emergencia_nome');

SELECT verif.espera_erro('IN4 · nem sem responder às restrições alimentares', $$
  INSERT INTO eventos.inscricao (instituicao_id, evento_id, pessoa_id, canal, tipo_participacao, status,
                                 primeira_vez_na_casa, primeira_vez_na_ayahuasca, consagra,
                                 contato_emergencia_nome, contato_emergencia_tel, acolhimento)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001',
            'LINK', 'PARTICIPANTE', 'PENDENTE', false, false, true, 'Mãe', '11999990000', 'NAO_NECESSARIO')
$$, 'restricoes_alimentares');
SELECT verif.espera_erro('IN4 · e resposta em branco não é resposta — "nenhuma" é', $$
  INSERT INTO eventos.inscricao (instituicao_id, evento_id, pessoa_id, canal, tipo_participacao, status,
                                 primeira_vez_na_casa, primeira_vez_na_ayahuasca, consagra,
                                 contato_emergencia_nome, contato_emergencia_tel, restricoes_alimentares, acolhimento)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001',
            'LINK', 'PARTICIPANTE', 'PENDENTE', false, false, true, 'Mãe', '11999990000', '  ', 'NAO_NECESSARIO')
$$, 'in4_restricoes_respondidas');

INSERT INTO eventos.inscricao (id, instituicao_id, evento_id, pessoa_id, canal, tipo_participacao, status,
                               primeira_vez_na_casa, primeira_vez_na_ayahuasca, consagra, nivel_escolhido, valor_combinado,
                               hospedagem_id, noites, contato_emergencia_nome, contato_emergencia_tel, restricoes_alimentares,
                               acolhimento) VALUES
  ('ae000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000001',
   'a5000000-0000-0000-0000-000000000001', 'LINK', 'PARTICIPANTE', 'CONFIRMADA', false, false, true, 'SUSTENTAVEL', 22000,
   'ad000000-0000-0000-0000-000000000001', '[2026-10-17,2026-10-18)', 'Mãe', '11999990000', 'Nenhuma', 'NAO_NECESSARIO'),
  ('ae000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000001',
   'a5000000-0000-0000-0000-000000000002', 'LINK', 'PARTICIPANTE', 'PENDENTE', true, true, true, NULL, NULL,
   'ad000000-0000-0000-0000-000000000001', '[2026-10-17,2026-10-18)', 'Irmão', '11988880000', 'vegetariana', 'PENDENTE');

SELECT verif.espera_erro('IN · uma inscrição viva por pessoa por evento', $$
  INSERT INTO eventos.inscricao (instituicao_id, evento_id, pessoa_id, canal, tipo_participacao, status,
                                 primeira_vez_na_casa, primeira_vez_na_ayahuasca, consagra, contato_emergencia_nome,
                                 contato_emergencia_tel, restricoes_alimentares, acolhimento, registrada_por)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001',
            'RECEPCAO', 'PARTICIPANTE', 'PENDENTE', false, false, true, 'Mãe', '11999990000', 'Nenhuma', 'NAO_NECESSARIO',
            gen_random_uuid())
$$, 'inscricao_uma_por_pessoa');

-- Anonimização (Documento 7 §23) da Clarice: a anamnese dela já foi lida e
-- declarada, ela tem inscrição e abriu o link com o CPF.
INSERT INTO eventos.sessao_de_inscricao (instituicao_id, evento_id, segredo_sha256, documento, pessoa_id, conferida_em, expira_em)
  VALUES ('a0000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000001', sha256('segredo da sessão'),
          '33091877542', 'a5000000-0000-0000-0000-000000000002', now(), now() + interval '1 hour');

SELECT verif.espera_ok('§23 · anonimizar apaga o conteúdo da anamnese, mesmo já lida, e o CPF das sessões do link', $$
  DELETE FROM pessoas.item_de_resposta
   WHERE resposta_id IN (SELECT id FROM pessoas.resposta_de_anamnese WHERE pessoa_id = 'a5000000-0000-0000-0000-000000000002');
  UPDATE pessoas.resposta_de_anamnese SET dispara_alerta = false WHERE pessoa_id = 'a5000000-0000-0000-0000-000000000002';
  UPDATE pessoas.declaracao_de_veracidade SET origem_ip_hash = NULL WHERE pessoa_id = 'a5000000-0000-0000-0000-000000000002';
  DELETE FROM eventos.sessao_de_inscricao
   WHERE pessoa_id = 'a5000000-0000-0000-0000-000000000002'
      OR documento = (SELECT documento FROM pessoas.pessoa WHERE id = 'a5000000-0000-0000-0000-000000000002');
  UPDATE eventos.inscricao
     SET contato_emergencia_nome = 'anonimizado', contato_emergencia_tel = 'anonimizado', restricoes_alimentares = 'anonimizado'
   WHERE pessoa_id = 'a5000000-0000-0000-0000-000000000002';
  UPDATE pessoas.pessoa
     SET nome = 'Pessoa anonimizada', apelido = NULL, documento = NULL, telefone = NULL, email = NULL, cidade = NULL,
         nascimento = NULL, foto_anexo_id = NULL, contato_emergencia_nome = NULL, contato_emergencia_tel = NULL,
         anonimizada_em = now()
   WHERE id = 'a5000000-0000-0000-0000-000000000002'
$$);
SELECT verif.confere('§23 · nenhum item de resposta sobra',
  (SELECT count(*) FROM pessoas.item_de_resposta i JOIN pessoas.resposta_de_anamnese r ON r.id = i.resposta_id
    WHERE r.pessoa_id = 'a5000000-0000-0000-0000-000000000002'), 0::bigint);
SELECT verif.confere('§23 · e a leitura registrada continua de pé (RA3)',
  (SELECT count(*) FROM pessoas.registro_de_acesso WHERE pessoa_id = 'a5000000-0000-0000-0000-000000000002'), 1::bigint);
SELECT verif.confere('§23 · nenhuma sessão do link guarda o CPF da pessoa anonimizada',
  (SELECT count(*) FROM eventos.sessao_de_inscricao
    WHERE pessoa_id = 'a5000000-0000-0000-0000-000000000002' OR documento = '33091877542'), 0::bigint);
SELECT verif.confere('§23 · a inscrição fica sem contato nem restrição reais',
  (SELECT count(*) FROM eventos.inscricao WHERE pessoa_id = 'a5000000-0000-0000-0000-000000000002'
     AND (contato_emergencia_nome, contato_emergencia_tel, restricoes_alimentares)
         IS DISTINCT FROM ('anonimizado', 'anonimizado', 'anonimizado')), 0::bigint);

INSERT INTO eventos.dormitorio (id, instituicao_id, unidade_id, nome) VALUES
  ('af000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000001', 'Dormitório 1'),
  ('af000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000001', 'Dormitório 2');
INSERT INTO eventos.leito (id, instituicao_id, dormitorio_id, identificacao, tipo, capacidade) VALUES
  ('b0100000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'af000000-0000-0000-0000-000000000001', 'Cama de casal', 'CAMA_CASAL', 2),
  ('b0100000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000', 'af000000-0000-0000-0000-000000000002', 'Beliche 1 · superior', 'BELICHE_SUPERIOR', 1);

SELECT verif.espera_erro('leito · beliche tem um lugar', $$
  INSERT INTO eventos.leito (instituicao_id, dormitorio_id, identificacao, tipo, capacidade)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'af000000-0000-0000-0000-000000000002', 'Beliche 1 · inferior', 'BELICHE_INFERIOR', 2)
$$, 'leito_capacidade_do_tipo');

SELECT verif.espera_ok('leito · a cama de casal recebe duas pessoas na mesma noite', $$
  INSERT INTO eventos.alocacao_de_leito (instituicao_id, evento_id, inscricao_id, leito_id, noite, vaga, capacidade_do_leito) VALUES
    ('a0000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000001', 'ae000000-0000-0000-0000-000000000001',
     'b0100000-0000-0000-0000-000000000001', '2026-10-17', 1, 2),
    ('a0000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000001', 'ae000000-0000-0000-0000-000000000002',
     'b0100000-0000-0000-0000-000000000001', '2026-10-17', 2, 2)
$$);
SELECT verif.espera_erro('ML1 · mas a mesma vaga não, no mesmo evento', $$
  UPDATE eventos.alocacao_de_leito SET vaga = 1 WHERE inscricao_id = 'ae000000-0000-0000-0000-000000000002'
$$, 'ml1_vaga_livre_no_evento');
SELECT verif.espera_erro('uma pessoa, uma cama por noite', $$
  INSERT INTO eventos.alocacao_de_leito (instituicao_id, evento_id, inscricao_id, leito_id, noite, vaga, capacidade_do_leito)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000001', 'ae000000-0000-0000-0000-000000000001',
            'b0100000-0000-0000-0000-000000000002', '2026-10-17', 1, 1)
$$, 'uma_cama_por_pessoa_por_noite');
SELECT verif.espera_erro('leito · o beliche não recebe uma segunda pessoa', $$
  INSERT INTO eventos.alocacao_de_leito (instituicao_id, evento_id, inscricao_id, leito_id, noite, vaga, capacidade_do_leito)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000001', 'ae000000-0000-0000-0000-000000000001',
            'b0100000-0000-0000-0000-000000000002', '2026-10-18', 2, 1)
$$, 'vaga_dentro_da_capacidade');
SELECT verif.espera_erro('leito · nem declarando capacidade maior que a do leito', $$
  INSERT INTO eventos.alocacao_de_leito (instituicao_id, evento_id, inscricao_id, leito_id, noite, vaga, capacidade_do_leito)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000001', 'ae000000-0000-0000-0000-000000000001',
            'b0100000-0000-0000-0000-000000000002', '2026-10-18', 2, 2)
$$, 'alocacao_na_capacidade_do_leito');
SELECT verif.espera_erro('leito · a cama de casal tem dois lugares, nem mais nem menos', $$
  INSERT INTO eventos.leito (instituicao_id, dormitorio_id, identificacao, tipo, capacidade)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'af000000-0000-0000-0000-000000000001', 'Outra cama de casal', 'CAMA_CASAL', 4)
$$, 'leito_capacidade_do_tipo');

INSERT INTO eventos.pagamento_de_inscricao (id, instituicao_id, inscricao_id, valor, recebido_em, conta_id, forma, registrado_por)
  VALUES ('b0200000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'ae000000-0000-0000-0000-000000000001',
          22000, '2026-10-01', 'a2000000-0000-0000-0000-000000000001', 'PIX', 'a7000000-0000-0000-0000-000000000002');
SELECT verif.espera_erro('DV3 · quem pediu a devolução não é quem paga', $$
  INSERT INTO eventos.devolucao_devida (instituicao_id, evento_id, inscricao_id, pessoa_id, pagamento_id, valor, motivo,
                                        solicitada_por, status, paga_em, conta_id, efetivada_por)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000001', 'ae000000-0000-0000-0000-000000000001',
            'a5000000-0000-0000-0000-000000000001', 'b0200000-0000-0000-0000-000000000001', 22000, 'não pôde vir',
            'a7000000-0000-0000-0000-000000000002', 'PAGA', '2026-10-20', 'a2000000-0000-0000-0000-000000000001',
            'a7000000-0000-0000-0000-000000000002')
$$, 'dv3_quem_pede_nao_paga');

-- CN4: contratação cancelada com cachê já recebido gera devolução ao contratante.
INSERT INTO pessoas.pessoa (id, instituicao_id, tipo, nome, documento)
  VALUES ('a5000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000000', 'JURIDICA', 'Espaço Lua Cheia',
          '12345678000190');
INSERT INTO eventos.evento (id, instituicao_id, unidade_id, nome, tipo, regime_de_receita, status,
                            data_inicio, data_fim, hora_inicio, local, consagra, cancelado_motivo)
  VALUES ('a4000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000',
          'a1000000-0000-0000-0000-000000000002', 'Show da Munay no Lua Cheia', 'SHOW', 'CONTRATADO', 'CANCELADO',
          '2026-11-07', '2026-11-07', '21:00', 'Espaço Lua Cheia', false, 'o espaço fechou');
INSERT INTO eventos.contratacao (evento_id, instituicao_id, contratante_id, valor_acordado, forma_pagamento, status)
  VALUES ('a4000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000000',
          'a5000000-0000-0000-0000-000000000003', 180000, 'ANTECIPADO', 'CANCELADA');

SELECT verif.espera_ok('CN4 · a contratação cancelada gera devolução ao contratante', $$
  INSERT INTO eventos.devolucao_devida (instituicao_id, evento_id, pessoa_id, contratacao_evento_id, valor, motivo,
                                        solicitada_por, status)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000002',
            'a5000000-0000-0000-0000-000000000003', 'a4000000-0000-0000-0000-000000000002', 180000, 'show cancelado',
            gen_random_uuid(), 'PENDENTE')
$$);
SELECT verif.espera_erro('devolução sem saber que receita estorna não existe', $$
  INSERT INTO eventos.devolucao_devida (instituicao_id, evento_id, pessoa_id, valor, motivo, solicitada_por, status)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000002',
            'a5000000-0000-0000-0000-000000000003', 180000, 'x', gen_random_uuid(), 'PENDENTE')
$$, 'dv_origem_unica');
SELECT verif.espera_erro('nem estornando contribuição e cachê de uma vez', $$
  INSERT INTO eventos.devolucao_devida (instituicao_id, evento_id, pessoa_id, pagamento_id, contratacao_evento_id, valor,
                                        motivo, solicitada_por, status)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000002',
            'a5000000-0000-0000-0000-000000000003', 'b0200000-0000-0000-0000-000000000001',
            'a4000000-0000-0000-0000-000000000002', 180000, 'x', gen_random_uuid(), 'PENDENTE')
$$, 'dv_origem_unica');
SELECT verif.espera_erro('CN4 · a devolução é da contratação do próprio evento', $$
  INSERT INTO eventos.devolucao_devida (instituicao_id, evento_id, pessoa_id, contratacao_evento_id, valor, motivo,
                                        solicitada_por, status)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'a4000000-0000-0000-0000-000000000001',
            'a5000000-0000-0000-0000-000000000003', 'a4000000-0000-0000-0000-000000000002', 180000, 'x',
            gen_random_uuid(), 'PENDENTE')
$$, 'cn4_contratacao_do_proprio_evento');

-- -----------------------------------------------------------------------------
-- Estoque
-- -----------------------------------------------------------------------------

INSERT INTO estoque.item (id, instituicao_id, nome, categoria, unidade_medida) VALUES
  ('b0300000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'Daime', 'DAIME', 'L');
INSERT INTO estoque.lote (id, instituicao_id, item_id, nome, origem, data_entrada, quantidade_inicial, local, situacao)
  VALUES ('b0400000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 'b0300000-0000-0000-0000-000000000001',
          'Lote 03/2026', 'AQUISICAO', '2026-03-10', 10, 'Casa do daime', 'EM_USO');
INSERT INTO estoque.movimento_de_estoque (instituicao_id, lote_id, tipo, quantidade, data, registrado_por)
  VALUES ('a0000000-0000-0000-0000-000000000000', 'b0400000-0000-0000-0000-000000000001', 'ENTRADA_AQUISICAO', 10, '2026-03-10', gen_random_uuid());

SELECT verif.espera_ok('consumo de 6 L numa cerimônia', $$
  INSERT INTO estoque.movimento_de_estoque (instituicao_id, lote_id, tipo, quantidade, data, evento_id, registrado_por)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'b0400000-0000-0000-0000-000000000001', 'SAIDA_TRABALHO', 6, '2026-09-12',
            'a4000000-0000-0000-0000-000000000001', gen_random_uuid())
$$);
SELECT verif.espera_erro('saldo · o lote não fica negativo', $$
  INSERT INTO estoque.movimento_de_estoque (instituicao_id, lote_id, tipo, quantidade, data, evento_id, registrado_por)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'b0400000-0000-0000-0000-000000000001', 'SAIDA_TRABALHO', 5, '2026-10-17',
            'a4000000-0000-0000-0000-000000000001', gen_random_uuid())
$$, 'SALDO_INSUFICIENTE');
SELECT verif.espera_erro('perda sem justificativa não existe', $$
  INSERT INTO estoque.movimento_de_estoque (instituicao_id, lote_id, tipo, quantidade, data, registrado_por)
    VALUES ('a0000000-0000-0000-0000-000000000000', 'b0400000-0000-0000-0000-000000000001', 'SAIDA_PERDA', 1, '2026-10-01', gen_random_uuid())
$$, 'mov_perda_e_ajuste_justificados');
SELECT verif.confere('saldo · 10 − 6 = 4 L',
  (SELECT saldo FROM estoque.v_saldo_por_lote WHERE lote_id = 'b0400000-0000-0000-0000-000000000001'), 4.000::numeric);

INSERT INTO estoque.estimativa_de_consumo (evento_id, instituicao_id, consagrantes_previstos, ml_por_consagrante, base)
  VALUES ('a4000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', 40, 150, 'PARAMETRO');
SELECT verif.confere('EC1 · a estimativa (6 L) não mexe no saldo',
  (SELECT saldo FROM estoque.v_saldo_por_lote WHERE lote_id = 'b0400000-0000-0000-0000-000000000001'), 4.000::numeric);

SELECT verif.espera_erro('feitio concluído sem custo por litro não existe', $$
  INSERT INTO estoque.feitio (instituicao_id, evento_id, nome, data_inicio, data_fim, status, litros_produzidos)
    VALUES ('a0000000-0000-0000-0000-000000000000', gen_random_uuid(), 'Feitio de setembro', '2026-09-01', '2026-09-08',
            'CONCLUIDO', 55)
$$, 'feitio_concluido_tem_custo');

INSERT INTO estoque.feitio (id, instituicao_id, evento_id, nome, data_inicio, status)
  VALUES ('b0500000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000000', gen_random_uuid(),
          'Feitio de agosto', '2026-08-01', 'EM_ANDAMENTO');
SELECT verif.espera_ok('feitio em andamento conclui e grava os três custos', $$
  UPDATE estoque.feitio
     SET status = 'CONCLUIDO', data_fim = '2026-08-08', litros_produzidos = 50,
         custo_materia_prima = 180000, custo_lancamentos = 95000, custo_por_litro = 5500
   WHERE id = 'b0500000-0000-0000-0000-000000000001'
$$);
SELECT verif.espera_erro('S-04 · e o custo por litro fica congelado', $$
  UPDATE estoque.feitio SET custo_por_litro = 5000 WHERE id = 'b0500000-0000-0000-0000-000000000001'
$$, 'FEITIO_IMUTAVEL');
SELECT verif.espera_erro('S-04 · feitio concluído não some', $$
  DELETE FROM estoque.feitio WHERE id = 'b0500000-0000-0000-0000-000000000001'
$$, 'FEITIO_IMUTAVEL');

-- -----------------------------------------------------------------------------
-- E, por fim, B continua sem ver nada de A
-- -----------------------------------------------------------------------------

SELECT set_config('app.instituicao_id', 'b0000000-0000-0000-0000-000000000000', false);
SELECT verif.confere('RLS · B não vê lançamentos, pessoas nem anamneses de A',
  (SELECT (SELECT count(*) FROM financeiro.lancamento) + (SELECT count(*) FROM pessoas.pessoa)
        + (SELECT count(*) FROM pessoas.resposta_de_anamnese) + (SELECT count(*) FROM financeiro.v_dre)), 0::bigint);

RESET ROLE;
\echo
\echo 'Verificação concluída: todas as guardas de banco se comportaram como o Documento 7 descreve.'
