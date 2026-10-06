import { criarMigracaoDeSql } from '../criar-migracao-de-sql.js';

export class MigracaoB0006OutboxEsgotados extends criarMigracaoDeSql(import.meta.url, {
  up: 'outbox-esgotados.sql',
  down: 'desfazer.sql',
}) {}
