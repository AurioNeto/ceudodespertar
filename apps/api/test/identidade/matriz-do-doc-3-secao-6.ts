import type { CodigoGrupo } from '@cdd/contracts';

export interface LinhaDaMatriz {
  readonly permissao: string;
  readonly gruposComAcesso: readonly CodigoGrupo[];
}

export const PERMISSOES_FORA_DO_CATALOGO: readonly string[] = ['pessoas.anamnese.responder_por_terceiro'];

export const MATRIZ_DO_DOC_3_SECAO_6: readonly LinhaDaMatriz[] = [
  { permissao: 'financeiro.lancamento.registrar', gruposComAcesso: ['ADMINISTRADOR', 'TESOURARIA', 'REGISTRO'] },
  { permissao: 'financeiro.lancamento.confirmar', gruposComAcesso: ['ADMINISTRADOR', 'TESOURARIA'] },
  { permissao: 'financeiro.lancamento.estornar', gruposComAcesso: ['ADMINISTRADOR', 'TESOURARIA'] },
  { permissao: 'financeiro.lancamento.ler', gruposComAcesso: ['ADMINISTRADOR', 'GOVERNANCA', 'TESOURARIA'] },
  { permissao: 'financeiro.lancamento.ler_proprios', gruposComAcesso: ['ADMINISTRADOR', 'TESOURARIA', 'REGISTRO'] },
  { permissao: 'financeiro.transferencia.registrar', gruposComAcesso: ['ADMINISTRADOR', 'TESOURARIA'] },
  { permissao: 'financeiro.conta.ler', gruposComAcesso: ['ADMINISTRADOR', 'GOVERNANCA', 'TESOURARIA'] },
  { permissao: 'financeiro.conta.gerenciar', gruposComAcesso: ['ADMINISTRADOR', 'TESOURARIA'] },
  { permissao: 'financeiro.fatura.gerenciar', gruposComAcesso: ['ADMINISTRADOR', 'TESOURARIA'] },
  { permissao: 'financeiro.emprestimo.gerenciar', gruposComAcesso: ['ADMINISTRADOR', 'TESOURARIA'] },
  { permissao: 'financeiro.adiantamento.registrar', gruposComAcesso: ['ADMINISTRADOR', 'TESOURARIA'] },
  { permissao: 'financeiro.adiantamento.autorizar', gruposComAcesso: ['ADMINISTRADOR', 'GOVERNANCA'] },
  { permissao: 'financeiro.adiantamento.ressarcir', gruposComAcesso: ['ADMINISTRADOR', 'TESOURARIA'] },
  { permissao: 'financeiro.fundo.gerenciar', gruposComAcesso: ['ADMINISTRADOR', 'TESOURARIA'] },
  { permissao: 'financeiro.periodo.fechar', gruposComAcesso: ['ADMINISTRADOR', 'TESOURARIA'] },
  { permissao: 'financeiro.periodo.reabrir', gruposComAcesso: ['ADMINISTRADOR'] },
  { permissao: 'financeiro.plano_contas.ler', gruposComAcesso: ['ADMINISTRADOR', 'GOVERNANCA', 'TESOURARIA', 'REGISTRO', 'LEITURA'] },
  { permissao: 'financeiro.plano_contas.gerenciar', gruposComAcesso: ['ADMINISTRADOR', 'TESOURARIA'] },
  { permissao: 'financeiro.dre.ler', gruposComAcesso: ['ADMINISTRADOR', 'GOVERNANCA', 'TESOURARIA', 'LEITURA'] },
  { permissao: 'financeiro.fluxo_caixa.ler', gruposComAcesso: ['ADMINISTRADOR', 'GOVERNANCA', 'TESOURARIA', 'LEITURA'] },
  { permissao: 'financeiro.resultado_evento.ler', gruposComAcesso: ['ADMINISTRADOR', 'GOVERNANCA', 'TESOURARIA', 'LEITURA'] },
  { permissao: 'financeiro.reembolsos.ler', gruposComAcesso: ['ADMINISTRADOR', 'GOVERNANCA', 'TESOURARIA'] },
  { permissao: 'financeiro.importacao.executar', gruposComAcesso: ['ADMINISTRADOR', 'TESOURARIA'] },
  { permissao: 'financeiro.conciliacao.executar', gruposComAcesso: ['ADMINISTRADOR', 'TESOURARIA'] },
  { permissao: 'financeiro.prestacao_contas.gerar', gruposComAcesso: ['ADMINISTRADOR', 'GOVERNANCA', 'TESOURARIA'] },
  { permissao: 'financeiro.prestacao_contas.detalhada', gruposComAcesso: ['ADMINISTRADOR', 'GOVERNANCA', 'TESOURARIA'] },
  { permissao: 'eventos.evento.criar', gruposComAcesso: ['ADMINISTRADOR', 'ACOLHIMENTO'] },
  { permissao: 'eventos.evento.editar', gruposComAcesso: ['ADMINISTRADOR', 'ACOLHIMENTO'] },
  { permissao: 'eventos.evento.cancelar', gruposComAcesso: ['ADMINISTRADOR', 'ACOLHIMENTO'] },
  { permissao: 'eventos.evento.realizar', gruposComAcesso: ['ADMINISTRADOR', 'ACOLHIMENTO'] },
  { permissao: 'eventos.inscricoes.abrir', gruposComAcesso: ['ADMINISTRADOR', 'ACOLHIMENTO'] },
  { permissao: 'eventos.inscricao.registrar', gruposComAcesso: ['ADMINISTRADOR', 'ACOLHIMENTO'] },
  { permissao: 'eventos.inscricao.editar', gruposComAcesso: ['ADMINISTRADOR', 'ACOLHIMENTO'] },
  { permissao: 'eventos.inscricao.confirmar', gruposComAcesso: ['ADMINISTRADOR', 'ACOLHIMENTO'] },
  { permissao: 'eventos.inscricao.cancelar', gruposComAcesso: ['ADMINISTRADOR', 'ACOLHIMENTO'] },
  { permissao: 'eventos.inscricao.ler', gruposComAcesso: ['ADMINISTRADOR', 'GOVERNANCA', 'TESOURARIA', 'ACOLHIMENTO'] },
  { permissao: 'eventos.pagamento.registrar', gruposComAcesso: ['ADMINISTRADOR', 'TESOURARIA', 'ACOLHIMENTO'] },
  { permissao: 'eventos.arrecadacao.ler', gruposComAcesso: ['ADMINISTRADOR', 'GOVERNANCA', 'TESOURARIA', 'ACOLHIMENTO'] },
  { permissao: 'eventos.devolucao.solicitar', gruposComAcesso: ['ADMINISTRADOR', 'TESOURARIA', 'ACOLHIMENTO'] },
  { permissao: 'eventos.devolucao.efetivar', gruposComAcesso: ['ADMINISTRADOR', 'TESOURARIA'] },
  { permissao: 'eventos.operacao.ler', gruposComAcesso: ['ADMINISTRADOR', 'GOVERNANCA', 'TESOURARIA', 'ACOLHIMENTO'] },
  { permissao: 'eventos.operacao.gerenciar', gruposComAcesso: ['ADMINISTRADOR', 'ACOLHIMENTO'] },
  { permissao: 'eventos.contratacao.gerenciar', gruposComAcesso: ['ADMINISTRADOR', 'GOVERNANCA', 'TESOURARIA'] },
  { permissao: 'eventos.acolhimento.registrar', gruposComAcesso: ['ADMINISTRADOR', 'ACOLHIMENTO'] },
  { permissao: 'pessoas.pessoa.registrar', gruposComAcesso: ['ADMINISTRADOR', 'TESOURARIA', 'ACOLHIMENTO'] },
  { permissao: 'pessoas.pessoa.editar', gruposComAcesso: ['ADMINISTRADOR', 'TESOURARIA', 'ACOLHIMENTO'] },
  { permissao: 'pessoas.pessoa.ler', gruposComAcesso: ['ADMINISTRADOR', 'GOVERNANCA', 'TESOURARIA', 'ACOLHIMENTO'] },
  { permissao: 'pessoas.vinculo.gerenciar', gruposComAcesso: ['ADMINISTRADOR', 'GOVERNANCA', 'ACOLHIMENTO'] },
  { permissao: 'pessoas.anamnese.ler', gruposComAcesso: ['ADMINISTRADOR', 'ACOLHIMENTO'] },
  { permissao: 'pessoas.anamnese.analisar', gruposComAcesso: ['ADMINISTRADOR', 'ACOLHIMENTO'] },
  { permissao: 'pessoas.anamnese.responder_por_terceiro', gruposComAcesso: ['ADMINISTRADOR', 'ACOLHIMENTO'] },
  { permissao: 'pessoas.formulario.editar', gruposComAcesso: ['ADMINISTRADOR', 'ACOLHIMENTO'] },
  { permissao: 'pessoas.formulario.publicar', gruposComAcesso: ['ADMINISTRADOR', 'ACOLHIMENTO'] },
  { permissao: 'pessoas.autorizacao_responsavel.registrar', gruposComAcesso: ['ADMINISTRADOR', 'ACOLHIMENTO'] },
  { permissao: 'pessoas.consentimento.registrar', gruposComAcesso: ['ADMINISTRADOR', 'ACOLHIMENTO'] },
  { permissao: 'pessoas.pessoa.anonimizar', gruposComAcesso: ['ADMINISTRADOR'] },
  { permissao: 'estoque.item.gerenciar', gruposComAcesso: ['ADMINISTRADOR', 'TESOURARIA'] },
  { permissao: 'estoque.movimento.registrar', gruposComAcesso: ['ADMINISTRADOR', 'TESOURARIA', 'REGISTRO'] },
  { permissao: 'estoque.consumo.registrar', gruposComAcesso: ['ADMINISTRADOR', 'ACOLHIMENTO'] },
  { permissao: 'estoque.feitio.gerenciar', gruposComAcesso: ['ADMINISTRADOR', 'TESOURARIA'] },
  { permissao: 'estoque.saldo.ler', gruposComAcesso: ['ADMINISTRADOR', 'GOVERNANCA', 'TESOURARIA', 'ACOLHIMENTO', 'LEITURA'] },
  { permissao: 'sistema.usuario.gerenciar', gruposComAcesso: ['ADMINISTRADOR'] },
  { permissao: 'sistema.grupo.gerenciar', gruposComAcesso: ['ADMINISTRADOR'] },
  { permissao: 'sistema.parametro.gerenciar', gruposComAcesso: ['ADMINISTRADOR'] },
  { permissao: 'sistema.auditoria.ler', gruposComAcesso: ['ADMINISTRADOR', 'GOVERNANCA'] },
];

export function permissoesDaMatrizPara(codigo: CodigoGrupo): string[] {
  return MATRIZ_DO_DOC_3_SECAO_6.filter(
    ({ permissao, gruposComAcesso }) =>
      !PERMISSOES_FORA_DO_CATALOGO.includes(permissao) && gruposComAcesso.includes(codigo),
  )
    .map(({ permissao }) => permissao)
    .toSorted();
}
