import { criarMigracaoDeSql } from '../criar-migracao-de-sql.js';

export class MigracaoB0001Shared extends criarMigracaoDeSql(import.meta.url, {
  up: 'shared.sql',
  down: 'desfazer.sql',
}) {}
