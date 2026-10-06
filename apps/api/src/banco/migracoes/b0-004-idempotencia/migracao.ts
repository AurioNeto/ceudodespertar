import { criarMigracaoDeSql } from '../criar-migracao-de-sql.js';

export class MigracaoB0004Idempotencia extends criarMigracaoDeSql(import.meta.url, {
  up: 'idempotencia.sql',
  down: 'desfazer.sql',
}) {}
