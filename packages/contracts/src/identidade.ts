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

/* ---------------------------------------------------------------------------
   Entrada no sistema.

   O Doc 1 §4.4 é explícito: autenticação não se constrói, se compra — quem
   valida a senha é o Keycloak. O que fica do nosso lado é o contrato abaixo e
   a tela que o exercita, para que o formulário da casa vire tema do Keycloak
   sem reescrita e sem passar pela cara padrão dele.
   --------------------------------------------------------------------------- */

export interface Credenciais {
  readonly email: string;
  readonly senha: string;
}

/**
 * Por que a falha é tipada e não uma string: cada motivo tem uma saída
 * diferente na tela — e três deles não são erro do usuário, são situação da
 * conta (Doc 3 §4). Quem esbarra num convite pendente precisa do link de
 * definir senha, não de tentar a senha de novo.
 */
export type FalhaDeEntrada =
  | { readonly tipo: 'CREDENCIAL_INVALIDA' }
  | { readonly tipo: 'CONVITE_PENDENTE'; readonly email: string }
  | { readonly tipo: 'SUSPENSO' }
  | { readonly tipo: 'REVOGADO' }
  | { readonly tipo: 'INFRAESTRUTURA' };

export type ResultadoDeEntrada =
  | { readonly ok: true; readonly usuario: Usuario }
  | { readonly ok: false; readonly falha: FalhaDeEntrada };

/**
 * Convite de primeiro acesso. Usuário nasce sempre de uma `Pessoa` já
 * cadastrada (Doc 3 §2), então o convite carrega o nome que a secretaria
 * escreveu — quem chega na tela se reconhece antes de digitar qualquer coisa.
 */
export interface Convite {
  readonly token: string;
  readonly nome: string;
  readonly email: string;
  readonly grupoNome: string;
  readonly convidadoPor: string;
  readonly expiraEm: DataHora;
}

export type FalhaDeConvite = 'INVALIDO' | 'EXPIRADO' | 'JA_USADO';
