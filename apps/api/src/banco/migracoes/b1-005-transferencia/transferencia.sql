-- TSK-516: tabela nova; sem backfill e sem UNIQUE de negócio para estorno.
CREATE TABLE financeiro.transferencia (
  id uuid PRIMARY KEY,
  instituicao_id uuid NOT NULL,
  finalidade text NOT NULL CHECK (finalidade IN ('MOVIMENTACAO_SIMPLES','APORTE_A_FUNDO','PAGAMENTO_DE_FATURA','RESSARCIMENTO_DE_ADIANTAMENTO','CONCESSAO_DE_EMPRESTIMO','DEVOLUCAO_DE_EMPRESTIMO','REPASSE_ENTRE_UNIDADES')),
  status text NOT NULL CHECK (status IN ('A_CONFERIR','CONFIRMADO')),
  valor bigint NOT NULL CHECK (valor > 0),
  data date NOT NULL,
  conta_origem_id uuid,
  conta_destino_id uuid,
  unidade_id uuid NOT NULL,
  unidade_destino_id uuid,
  fundo_id uuid,
  fatura_id uuid,
  emprestimo_id uuid,
  adiantamento_id uuid,
  motivo text NOT NULL,
  estorno_de_id uuid,
  registrado_por uuid NOT NULL,
  registrado_em timestamptz NOT NULL,
  confirmado_por uuid,
  confirmado_em timestamptz,
  versao integer NOT NULL DEFAULT 1,
  UNIQUE (instituicao_id, id),
  FOREIGN KEY (instituicao_id, conta_origem_id) REFERENCES financeiro.conta (instituicao_id, id),
  FOREIGN KEY (instituicao_id, conta_destino_id) REFERENCES financeiro.conta (instituicao_id, id),
  FOREIGN KEY (instituicao_id, unidade_id) REFERENCES financeiro.unidade (instituicao_id, id),
  FOREIGN KEY (instituicao_id, unidade_destino_id) REFERENCES financeiro.unidade (instituicao_id, id),
  FOREIGN KEY (instituicao_id, fundo_id) REFERENCES financeiro.fundo (instituicao_id, id),
  FOREIGN KEY (instituicao_id, estorno_de_id) REFERENCES financeiro.transferencia (instituicao_id, id),
  CHECK (conta_origem_id IS DISTINCT FROM conta_destino_id),
  CHECK (conta_origem_id IS NOT NULL OR conta_destino_id IS NOT NULL),
  CHECK ((conta_origem_id IS NOT NULL AND conta_destino_id IS NOT NULL) OR finalidade IN ('CONCESSAO_DE_EMPRESTIMO','DEVOLUCAO_DE_EMPRESTIMO')),
  CONSTRAINT fd3_aporte_tem_fundo CHECK ((finalidade = 'APORTE_A_FUNDO') = (fundo_id IS NOT NULL)),
  CONSTRAINT f3_pagamento_tem_fatura CHECK ((finalidade = 'PAGAMENTO_DE_FATURA') = (fatura_id IS NOT NULL)),
  CONSTRAINT e1_emprestimo_tem_emprestimo CHECK ((finalidade IN ('CONCESSAO_DE_EMPRESTIMO','DEVOLUCAO_DE_EMPRESTIMO')) = (emprestimo_id IS NOT NULL)),
  CONSTRAINT a4_ressarcimento_tem_adiantamento CHECK ((finalidade = 'RESSARCIMENTO_DE_ADIANTAMENTO') = (adiantamento_id IS NOT NULL)),
  CONSTRAINT t_repasse_tem_destino CHECK ((finalidade = 'REPASSE_ENTRE_UNIDADES') = (unidade_destino_id IS NOT NULL))
);
CREATE INDEX transferencia_origem ON financeiro.transferencia (instituicao_id, conta_origem_id, data);
CREATE INDEX transferencia_destino ON financeiro.transferencia (instituicao_id, conta_destino_id, data);
CREATE INDEX transferencia_estorno ON financeiro.transferencia (instituicao_id, estorno_de_id) WHERE estorno_de_id IS NOT NULL;

CREATE FUNCTION financeiro.guarda_transferencia() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.status = 'CONFIRMADO' THEN
    RAISE EXCEPTION 'TRANSFERENCIA_IMUTAVEL: transferência confirmada não muda' USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF TG_OP = 'UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.instituicao_id IS DISTINCT FROM OLD.instituicao_id) THEN
    RAISE EXCEPTION 'TRANSFERENCIA_IMUTAVEL: identidade não muda' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER transferencia_guarda BEFORE INSERT OR UPDATE OR DELETE ON financeiro.transferencia
  FOR EACH ROW EXECUTE FUNCTION financeiro.guarda_transferencia();
REVOKE EXECUTE ON FUNCTION financeiro.guarda_transferencia() FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON financeiro.transferencia TO cdd_app;
SELECT shared.aplicar_isolamento_por_instituicao();
SELECT shared.proibir_truncate(ARRAY['financeiro.transferencia']::regclass[]);
