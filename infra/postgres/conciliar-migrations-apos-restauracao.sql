-- Concilia o banco hospedado com a lista de migrations restaurada ao PR #235.
--
-- Remove o que as migrations b1-003 a b1-008 criaram e apaga do histórico as
-- linhas de b1-003 a b1-009. O search_path das quatro funções de shared, fixado
-- pela b1-009, permanece: a b0-014 o registra no histórico ao rodar db:migrar.
--
-- Executar uma única vez, como cdd_owner, com a API da base #235 já publicada.
-- Tudo roda em uma transação: qualquer divergência aborta sem alterar o banco.
-- Recusa prosseguir se alguma das tabelas removidas tiver linhas.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
DECLARE
  v_esperadas CONSTANT text[] := ARRAY[
    'b1-003-pessoa-minima', 'b1-004-lancamento', 'b1-005-transferencia',
    'b1-006-periodo-contabil', 'b1-007-anexo', 'b1-008-evento-minimo',
    'b1-009-search-path-das-funcoes'];
  v_tabelas CONSTANT text[] := ARRAY[
    'pessoas.pessoa', 'financeiro.lancamento', 'financeiro.lancamento_categoria',
    'financeiro.pendencia', 'financeiro.transferencia', 'financeiro.periodo_contabil',
    'financeiro.reabertura_de_periodo', 'shared.anexo', 'eventos.evento'];
  v_encontradas integer;
  v_instituicao uuid;
  v_tabela text;
  v_linhas bigint;
BEGIN
  IF current_user <> 'cdd_owner' OR session_user <> 'cdd_owner' THEN
    RAISE EXCEPTION 'CONCILIACAO_RECUSADA: executar conectado como cdd_owner, não como %', session_user;
  END IF;

  SELECT count(*) INTO v_encontradas
    FROM public.cdd_migracoes_aplicadas WHERE name = ANY (v_esperadas);
  IF v_encontradas <> cardinality(v_esperadas) THEN
    RAISE EXCEPTION 'CONCILIACAO_RECUSADA: o histórico tem % das % migrations esperadas',
      v_encontradas, cardinality(v_esperadas);
  END IF;

  FOR v_instituicao IN SELECT id FROM shared.instituicao LOOP
    PERFORM set_config('app.instituicao_id', v_instituicao::text, true);
    FOREACH v_tabela IN ARRAY v_tabelas LOOP
      EXECUTE format('SELECT count(*) FROM %s', v_tabela) INTO v_linhas;
      IF v_linhas > 0 THEN
        RAISE EXCEPTION 'CONCILIACAO_RECUSADA: % tem % linha(s) na instituição %',
          v_tabela, v_linhas, v_instituicao;
      END IF;
    END LOOP;
  END LOOP;
  PERFORM set_config('app.instituicao_id', '', true);
END $$;

-- b1-008-evento-minimo
DROP TABLE eventos.evento;
DROP SCHEMA eventos;

-- b1-007-anexo
DROP TABLE shared.anexo;

-- b1-006-periodo-contabil
DROP TABLE financeiro.reabertura_de_periodo;
DROP TABLE financeiro.periodo_contabil;
DROP FUNCTION financeiro.guarda_periodo();

-- b1-005-transferencia
DROP TABLE financeiro.transferencia;
DROP FUNCTION financeiro.guarda_transferencia();

-- b1-004-lancamento
DROP TABLE financeiro.pendencia;
DROP TABLE financeiro.lancamento_categoria;
DROP TABLE financeiro.lancamento;
DROP FUNCTION financeiro.guarda_etiqueta();
DROP FUNCTION financeiro.guarda_lancamento();

-- b1-003-pessoa-minima
DROP TABLE pessoas.pessoa;
DROP SCHEMA pessoas;

DELETE FROM public.cdd_migracoes_aplicadas
 WHERE name IN (
   'b1-003-pessoa-minima', 'b1-004-lancamento', 'b1-005-transferencia',
   'b1-006-periodo-contabil', 'b1-007-anexo', 'b1-008-evento-minimo',
   'b1-009-search-path-das-funcoes');

DO $$
DECLARE
  v_restantes integer;
BEGIN
  SELECT count(*) INTO v_restantes FROM public.cdd_migracoes_aplicadas;
  IF v_restantes <> 16 THEN
    RAISE EXCEPTION 'CONCILIACAO_RECUSADA: sobraram % migrations no histórico, esperadas 16', v_restantes;
  END IF;
END $$;

COMMIT;
