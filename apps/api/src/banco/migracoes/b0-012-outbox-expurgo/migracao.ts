import { criarMigracaoDeSql } from '../criar-migracao-de-sql.js';

export class MigracaoB0012OutboxExpurgo extends criarMigracaoDeSql(import.meta.url, {
  up: 'expurgo.sql',
  down: 'desfazer.sql',
}) {}
