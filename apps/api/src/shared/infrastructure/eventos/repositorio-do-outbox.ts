import type { EventoDeDominio } from '../../kernel/evento-de-dominio.js';
import type { ContextoDaTransacao } from '../banco/unidade-de-trabalho.js';

export abstract class RepositorioDoOutbox {
  abstract gravar(contexto: ContextoDaTransacao, eventos: readonly EventoDeDominio[]): Promise<void>;
}
