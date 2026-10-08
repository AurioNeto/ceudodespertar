import type { ContextoDaTransacao } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import type { EntradaDeAuditoria } from './entrada-de-auditoria.js';

export abstract class TrilhaDeAuditoria {
  abstract gravar(contexto: ContextoDaTransacao, entradas: readonly EntradaDeAuditoria[]): Promise<void>;
}
