import { criarMigracaoDeSql } from '../criar-migracao-de-sql.js';

export class MigracaoB1003PessoaMinima extends criarMigracaoDeSql(import.meta.url, {
  up: 'pessoa.sql',
  down: 'desfazer.sql',
}) {}
