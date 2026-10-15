import { criarMigracaoDeSql } from '../criar-migracao-de-sql.js';

export class MigracaoB1001CadastrosDoFinanceiro extends criarMigracaoDeSql(import.meta.url, {
  up: 'cadastros-do-financeiro.sql',
  down: 'desfazer.sql',
}) {}
