import { criarMigracaoDeSql } from '../criar-migracao-de-sql.js';

export class MigracaoB1005Transferencia extends criarMigracaoDeSql(import.meta.url, {
  up: 'transferencia.sql',
  down: 'desfazer.sql',
}) {}
