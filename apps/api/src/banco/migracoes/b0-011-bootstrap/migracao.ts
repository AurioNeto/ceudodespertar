import { criarMigracaoDeSql } from '../criar-migracao-de-sql.js';

export class MigracaoB0011Bootstrap extends criarMigracaoDeSql(import.meta.url, {
  up: 'bootstrap.sql',
  down: 'desfazer.sql',
}) {}
