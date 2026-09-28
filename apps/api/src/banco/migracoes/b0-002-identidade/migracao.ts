import { criarMigracaoDeSql } from '../criar-migracao-de-sql.js';

export class MigracaoB0002Identidade extends criarMigracaoDeSql(import.meta.url, {
  up: 'identidade.sql',
  down: 'desfazer.sql',
}) {}
