import type { DetalheDeAuditoria, OperacaoAuditada, UsuarioId } from '@cdd/contracts';

export interface EntradaDeAuditoria {
  readonly em: Date;
  readonly autorId: UsuarioId | null;
  readonly operacao: OperacaoAuditada;
  readonly agregadoTipo: string;
  readonly agregadoId: string;
  readonly pessoaAlvoId: string | null;
  readonly detalhes: readonly DetalheDeAuditoria[];
  readonly sensivel: boolean;
}
