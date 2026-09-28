import 'reflect-metadata';
import { iniciarAplicacao } from './composicao/aplicacao.js';

iniciarAplicacao().catch((erro: unknown) => {
  console.error(erro);
  process.exit(1);
});
