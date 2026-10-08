import type {
  DataHora,
  GrupoId,
  InstituicaoId,
  PessoaId,
  RegistroAcessoId,
  RegistroAuditoriaId,
  UsuarioId,
} from '../kernel.js';
import type { Permissao } from './permissoes.js';

export type SituacaoUsuario = 'ATIVO' | 'CONVITE_PENDENTE' | 'SUSPENSO' | 'REVOGADO';

export interface Usuario {
  readonly id: UsuarioId;
  readonly pessoaId: PessoaId;
  readonly nome: string;
  readonly email: string;
  readonly grupoId: GrupoId;
  readonly grupoNome: string;
  readonly situacao: SituacaoUsuario;
  readonly ultimoAcesso: DataHora | null;
}

export interface Credenciais {
  readonly email: string;
  readonly senha: string;
}

export type FalhaDeEntrada =
  | { readonly tipo: 'CREDENCIAL_INVALIDA' }
  | { readonly tipo: 'CONVITE_PENDENTE'; readonly email: string }
  | { readonly tipo: 'SUSPENSO' }
  | { readonly tipo: 'REVOGADO' }
  | { readonly tipo: 'INFRAESTRUTURA' };

export type ResultadoDeEntrada =
  | { readonly ok: true; readonly usuario: Usuario }
  | { readonly ok: false; readonly falha: FalhaDeEntrada };

export interface Convite {
  readonly token: string;
  readonly nome: string;
  readonly email: string;
  readonly grupoNome: string;
  readonly convidadoPor: string;
  readonly expiraEm: DataHora;
}

export type FalhaDeConvite = 'INVALIDO' | 'EXPIRADO' | 'JA_USADO';

export type OperacaoAuditada =
  | 'LANCAMENTO_CONFIRMADO'
  | 'LANCAMENTO_ESTORNADO'
  | 'PENDENCIA_ABERTA'
  | 'PERIODO_FECHADO'
  | 'PERIODO_REABERTO'
  | 'PRESTACAO_GERADA'
  | 'EXTRATO_IMPORTADO'
  | 'ADIANTAMENTO_AUTORIZADO'
  | 'GRUPO_ALTERADO'
  | 'GRUPO_EDITADO'
  | 'USUARIO_CONVIDADO'
  | 'USUARIO_ATIVADO'
  | 'USUARIO_SUSPENSO'
  | 'USUARIO_REATIVADO'
  | 'FORMULARIO_PUBLICADO'
  | 'PESSOA_ANONIMIZADA'
  | 'ANAMNESE_LIDA'
  | 'AUDITORIA_CONSULTADA';

export interface DetalheDeAuditoria {
  readonly rotulo: string;
  readonly valor: string;
  readonly anterior?: string;
}

export type AutorDeAuditoria =
  | { readonly autorTipo: 'USUARIO'; readonly autorId: UsuarioId }
  | { readonly autorTipo: 'SISTEMA' | 'LINK_PUBLICO'; readonly autorId?: null };

export type RegistroDeAuditoria = AutorDeAuditoria & {
  readonly id: RegistroAuditoriaId;
  readonly em: DataHora;
  readonly autorNome: string;
  readonly autorGrupo: string;
  readonly operacao: OperacaoAuditada;
  readonly alvo: string;
  readonly referencia: string | null;
  readonly detalhes: readonly DetalheDeAuditoria[];
  readonly sensivel: boolean;
};

export interface ContextoDeLeitura {
  readonly tipo: 'INSCRICAO' | 'REVISAO' | 'ATENDIMENTO';
  readonly descricao: string;
}

export interface RegistroDeAcesso {
  readonly id: RegistroAcessoId;
  readonly em: DataHora;
  readonly leitorId: UsuarioId;
  readonly leitorNome: string;
  readonly leitorGrupo: string;
  readonly pessoaId: PessoaId;
  readonly pessoaNome: string;
  readonly contexto: ContextoDeLeitura | null;
}

export type SituacaoDoUsuario = SituacaoUsuario;

export interface GrupoResumido {
  readonly id: GrupoId;
  readonly nome: string;
}

export interface Eu {
  readonly usuario: {
    readonly id: UsuarioId;
    readonly nome: string;
    readonly email: string;
  };
  readonly instituicao: {
    readonly id: InstituicaoId;
    readonly nome: string;
  };
  readonly grupos: readonly GrupoResumido[];
  readonly permissoes: readonly Permissao[];
}

export interface UsuarioDaInstituicao {
  readonly id: UsuarioId;
  readonly pessoaId: PessoaId | null;
  readonly nome: string;
  readonly email: string;
  readonly situacao: SituacaoDoUsuario;
  readonly grupos: readonly GrupoResumido[];
  readonly ultimoAcessoEm: DataHora | null;
}
