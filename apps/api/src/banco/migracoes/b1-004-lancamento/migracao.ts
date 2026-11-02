import { criarMigracaoDeSql } from '../criar-migracao-de-sql.js';

export class MigracaoB1004Lancamento extends criarMigracaoDeSql(import.meta.url, {
  up: 'lancamento.sql',
  down: 'desfazer.sql',
}) {}
