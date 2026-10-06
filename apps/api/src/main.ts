import 'reflect-metadata';
import { instalarParsersDoPg } from './shared/infrastructure/banco/parsers-do-pg.js';
import { criarLoggerDePartida } from './shared/infrastructure/log/logger-de-partida.js';
import { iniciarAplicacao } from './composicao/aplicacao.js';

instalarParsersDoPg();

iniciarAplicacao().catch((erro: unknown) => {
  criarLoggerDePartida().fatal({ err: erro }, 'a API não conseguiu partir');
  process.exit(1);
});
