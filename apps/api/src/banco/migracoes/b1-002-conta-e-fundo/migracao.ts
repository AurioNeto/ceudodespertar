import { criarMigracaoDeSql } from '../criar-migracao-de-sql.js';

export class MigracaoB1002ContaEFundo extends criarMigracaoDeSql(import.meta.url, {
  up: 'conta-e-fundo.sql',
  down: 'desfazer.sql',
}) {}
