/** Contexto Identidade e Acesso — Doc 3. */
import type { DataHora, GrupoId, PessoaId, UsuarioId } from './kernel.js';

/**
 * Catálogo de permissões — vocabulário fixo em código (Doc 1 §4.8).
 * O domínio verifica o código, nunca o nome do grupo (Doc 3 §11).
 */
export const PERMISSOES = [
  'financeiro.lancamento.registrar',
  'financeiro.lancamento.confirmar',
  'financeiro.lancamento.estornar',
  'financeiro.lancamento.ler',
  'financeiro.lancamento.ler_proprios',
  'financeiro.transferencia.registrar',
  'financeiro.conta.ler',
  'financeiro.conta.gerenciar',
  'financeiro.fundo.gerenciar',
  'financeiro.periodo.fechar',
  'financeiro.periodo.reabrir',
  'financeiro.dre.ler',
  'financeiro.prestacao_contas.gerar',
  'eventos.evento.criar',
  'eventos.evento.editar',
  'eventos.evento.cancelar',
  'eventos.inscricao.ler',
  'eventos.inscricao.registrar',
  'eventos.pagamento.registrar',
  'pessoas.pessoa.ler',
  'pessoas.pessoa.editar',
  'pessoas.anamnese.ler',
  'pessoas.formulario.editar',
  'pessoas.formulario.publicar',
  'estoque.saldo.ler',
  'estoque.movimento.registrar',
  'sistema.usuario.gerenciar',
  'sistema.auditoria.ler',
] as const;

export type Permissao = (typeof PERMISSOES)[number];

export type CodigoGrupo =
  | 'ADMINISTRADOR'
  | 'GOVERNANCA'
  | 'TESOURARIA'
  | 'ACOLHIMENTO'
  | 'REGISTRO'
  | 'GUARDIAO'
  | 'LEITURA';

export interface Grupo {
  readonly id: GrupoId;
  readonly codigoSistema: CodigoGrupo;
  readonly nome: string;
  readonly descricao: string;
  readonly permissoes: readonly Permissao[];
  /** Grupos de seed não são excluíveis. */
  readonly protegido: boolean;
  readonly usuarios: number;
}

export type SituacaoUsuario = 'ATIVO' | 'CONVITE_PENDENTE' | 'SUSPENSO' | 'REVOGADO';

export interface Usuario {
  readonly id: UsuarioId;
  /** Todo usuário é uma pessoa — Doc 3 §2. */
  readonly pessoaId: PessoaId;
  readonly nome: string;
  readonly email: string;
  readonly grupoId: GrupoId;
  readonly grupoNome: string;
  readonly situacao: SituacaoUsuario;
  readonly ultimoAcesso: DataHora | null;
}
