import { criarMigracaoDeSql } from '../criar-migracao-de-sql.js';

export class MigracaoB0014SearchPathDasFuncoes extends criarMigracaoDeSql(import.meta.url, {
  up: 'search-path.sql',
  down: 'desfazer.sql',
}) {}
