import { pino } from 'pino';
import type { Logger } from 'pino';
import { construirOpcoesDoPino } from './opcoes-do-logger.js';

export function criarLoggerDePartida(): Logger {
  return pino(construirOpcoesDoPino('info'));
}
