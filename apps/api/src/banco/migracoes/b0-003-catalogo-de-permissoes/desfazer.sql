-- Reversão de b0-003-catalogo-de-permissoes.
--
-- Só as 64 linhas que este seed inseriu, por código — não um DELETE FROM
-- sem WHERE (a tabela em si sai no down() de b0-002-identidade), para que
-- uma migration futura que semeie mais permissões (I04 em diante) não
-- perca as suas ao desfazer só esta etapa.

DELETE FROM identidade.permissao WHERE codigo IN (
  'financeiro.lancamento.registrar', 'financeiro.lancamento.confirmar', 'financeiro.lancamento.estornar', 'financeiro.lancamento.ler',
  'financeiro.lancamento.ler_proprios', 'financeiro.transferencia.registrar', 'financeiro.conta.ler', 'financeiro.conta.gerenciar',
  'financeiro.fundo.gerenciar', 'financeiro.fatura.gerenciar', 'financeiro.emprestimo.gerenciar', 'financeiro.adiantamento.registrar',
  'financeiro.adiantamento.autorizar', 'financeiro.adiantamento.ressarcir', 'financeiro.reembolsos.ler', 'financeiro.importacao.executar',
  'financeiro.conciliacao.executar', 'financeiro.periodo.fechar', 'financeiro.periodo.reabrir', 'financeiro.plano_contas.ler',
  'financeiro.plano_contas.gerenciar', 'financeiro.dre.ler', 'financeiro.fluxo_caixa.ler', 'financeiro.resultado_evento.ler',
  'financeiro.prestacao_contas.gerar', 'financeiro.prestacao_contas.detalhada', 'eventos.evento.criar', 'eventos.evento.editar',
  'eventos.evento.cancelar', 'eventos.evento.realizar', 'eventos.inscricoes.abrir', 'eventos.inscricao.ler',
  'eventos.inscricao.registrar', 'eventos.inscricao.editar', 'eventos.inscricao.confirmar', 'eventos.inscricao.cancelar',
  'eventos.pagamento.registrar', 'eventos.arrecadacao.ler', 'eventos.devolucao.solicitar', 'eventos.devolucao.efetivar',
  'eventos.contratacao.gerenciar', 'eventos.acolhimento.registrar', 'eventos.operacao.ler', 'eventos.operacao.gerenciar',
  'pessoas.pessoa.ler', 'pessoas.pessoa.registrar', 'pessoas.pessoa.editar', 'pessoas.pessoa.anonimizar',
  'pessoas.vinculo.gerenciar', 'pessoas.anamnese.ler', 'pessoas.anamnese.analisar', 'pessoas.formulario.editar',
  'pessoas.formulario.publicar', 'pessoas.consentimento.registrar', 'pessoas.autorizacao_responsavel.registrar', 'estoque.saldo.ler',
  'estoque.item.gerenciar', 'estoque.movimento.registrar', 'estoque.consumo.registrar', 'estoque.feitio.gerenciar',
  'sistema.usuario.gerenciar', 'sistema.grupo.gerenciar', 'sistema.parametro.gerenciar', 'sistema.auditoria.ler'
);
