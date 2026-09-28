import { criarMigracaoDeSql } from '../criar-migracao-de-sql.js';

export class MigracaoB0000Esquemas extends criarMigracaoDeSql(import.meta.url, {
  up: 'esquemas.sql',
  down: 'desfazer.sql',
}) {}
