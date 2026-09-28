import { criarMigracaoDeSql } from '../criar-migracao-de-sql.js';

export class MigracaoB0005OutboxPorAgregado extends criarMigracaoDeSql(import.meta.url, {
  up: 'outbox-por-agregado.sql',
  down: 'desfazer.sql',
}) {}
