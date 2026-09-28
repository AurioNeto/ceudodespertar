import 'reflect-metadata';
import { instalarParsersDoPg } from './shared/infrastructure/banco/parsers-do-pg.js';
import { iniciarAplicacao } from './composicao/aplicacao.js';

instalarParsersDoPg();

iniciarAplicacao().catch((erro: unknown) => {
  console.error(erro);
  process.exit(1);
});
