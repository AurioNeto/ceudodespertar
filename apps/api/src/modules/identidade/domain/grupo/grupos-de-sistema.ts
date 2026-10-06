import { PERMISSOES, type CodigoGrupo, type Permissao } from '@cdd/contracts';

export interface GrupoDeSistema {
  readonly codigoSistema: CodigoGrupo;
  readonly nome: string;
  readonly descricao: string;
  readonly permissoes: readonly Permissao[];
}

const ADMINISTRADOR: GrupoDeSistema = {
  codigoSistema: 'ADMINISTRADOR',
  nome: 'Administrador',
  descricao: 'Quem mantém o sistema. Acesso pleno, incluindo gestão de usuários.',
  permissoes: PERMISSOES,
};

const GOVERNANCA: GrupoDeSistema = {
  codigoSistema: 'GOVERNANCA',
  nome: 'Governança',
  descricao:
    'Padrinho e madrinha. Visão consolidada, prestação de contas e autorização de adiantamento. Não opera o dia a dia.',
  permissoes: [
    'financeiro.lancamento.ler',
    'financeiro.conta.ler',
    'financeiro.dre.ler',
    'financeiro.fluxo_caixa.ler',
    'financeiro.resultado_evento.ler',
    'financeiro.reembolsos.ler',
    'financeiro.plano_contas.ler',
    'financeiro.adiantamento.autorizar',
    'financeiro.prestacao_contas.gerar',
    'financeiro.prestacao_contas.detalhada',
    'eventos.inscricao.ler',
    'eventos.arrecadacao.ler',
    'eventos.operacao.ler',
    'eventos.contratacao.gerenciar',
    'pessoas.pessoa.ler',
    'pessoas.vinculo.gerenciar',
    'estoque.saldo.ler',
    'sistema.auditoria.ler',
  ],
};

const TESOURARIA: GrupoDeSistema = {
  codigoSistema: 'TESOURARIA',
  nome: 'Tesouraria',
  descricao: 'Quem cuida do dinheiro. Registra, confirma, estorna, concilia e fecha período.',
  permissoes: [
    'financeiro.lancamento.registrar',
    'financeiro.lancamento.confirmar',
    'financeiro.lancamento.estornar',
    'financeiro.lancamento.ler',
    'financeiro.lancamento.ler_proprios',
    'financeiro.transferencia.registrar',
    'financeiro.conta.ler',
    'financeiro.conta.gerenciar',
    'financeiro.fundo.gerenciar',
    'financeiro.fatura.gerenciar',
    'financeiro.emprestimo.gerenciar',
    'financeiro.adiantamento.registrar',
    'financeiro.adiantamento.ressarcir',
    'financeiro.reembolsos.ler',
    'financeiro.importacao.executar',
    'financeiro.conciliacao.executar',
    'financeiro.periodo.fechar',
    'financeiro.plano_contas.ler',
    'financeiro.plano_contas.gerenciar',
    'financeiro.dre.ler',
    'financeiro.fluxo_caixa.ler',
    'financeiro.resultado_evento.ler',
    'financeiro.prestacao_contas.gerar',
    'financeiro.prestacao_contas.detalhada',
    'eventos.inscricao.ler',
    'eventos.pagamento.registrar',
    'eventos.arrecadacao.ler',
    'eventos.devolucao.solicitar',
    'eventos.devolucao.efetivar',
    'eventos.operacao.ler',
    'eventos.contratacao.gerenciar',
    'pessoas.pessoa.registrar',
    'pessoas.pessoa.editar',
    'pessoas.pessoa.ler',
    'estoque.item.gerenciar',
    'estoque.movimento.registrar',
    'estoque.feitio.gerenciar',
    'estoque.saldo.ler',
  ],
};

const ACOLHIMENTO: GrupoDeSistema = {
  codigoSistema: 'ACOLHIMENTO',
  nome: 'Acolhimento e Organização',
  descricao:
    'Quem recebe, inscreve, analisa anamnese e organiza o evento. Sem acesso a movimentação financeira.',
  permissoes: [
    'eventos.evento.criar',
    'eventos.evento.editar',
    'eventos.evento.cancelar',
    'eventos.evento.realizar',
    'eventos.inscricoes.abrir',
    'eventos.inscricao.registrar',
    'eventos.inscricao.editar',
    'eventos.inscricao.confirmar',
    'eventos.inscricao.cancelar',
    'eventos.inscricao.ler',
    'eventos.pagamento.registrar',
    'eventos.arrecadacao.ler',
    'eventos.devolucao.solicitar',
    'eventos.operacao.ler',
    'eventos.operacao.gerenciar',
    'eventos.acolhimento.registrar',
    'pessoas.pessoa.registrar',
    'pessoas.pessoa.editar',
    'pessoas.pessoa.ler',
    'pessoas.vinculo.gerenciar',
    'pessoas.anamnese.ler',
    'pessoas.anamnese.analisar',
    'pessoas.formulario.editar',
    'pessoas.formulario.publicar',
    'pessoas.autorizacao_responsavel.registrar',
    'pessoas.consentimento.registrar',
    'estoque.consumo.registrar',
    'estoque.saldo.ler',
  ],
};

const REGISTRO: GrupoDeSistema = {
  codigoSistema: 'REGISTRO',
  nome: 'Registro rápido',
  descricao: 'Quem gasta e precisa registrar. Cria lançamento a conferir e acompanha os próprios registros. Não confirma.',
  permissoes: [
    'financeiro.lancamento.registrar',
    'financeiro.lancamento.ler_proprios',
    'financeiro.plano_contas.ler',
    'estoque.movimento.registrar',
  ],
};

const LEITURA: GrupoDeSistema = {
  codigoSistema: 'LEITURA',
  nome: 'Leitura',
  descricao: 'Consulta painéis consolidados, sem escrita e sem dado sensível.',
  permissoes: [
    'financeiro.dre.ler',
    'financeiro.fluxo_caixa.ler',
    'financeiro.resultado_evento.ler',
    'financeiro.plano_contas.ler',
    'estoque.saldo.ler',
  ],
};

export const GRUPOS_DE_SISTEMA: readonly GrupoDeSistema[] = [
  ADMINISTRADOR,
  GOVERNANCA,
  TESOURARIA,
  ACOLHIMENTO,
  REGISTRO,
  LEITURA,
];
