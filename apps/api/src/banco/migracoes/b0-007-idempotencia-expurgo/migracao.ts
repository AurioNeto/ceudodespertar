import { criarMigracaoDeSql } from '../criar-migracao-de-sql.js';

export class MigracaoB0007IdempotenciaExpurgo extends criarMigracaoDeSql(import.meta.url, {
  up: 'expurgo.sql',
  down: 'desfazer.sql',
}) {}
