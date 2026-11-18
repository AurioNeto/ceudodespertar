import { criarMigracaoDeSql } from '../criar-migracao-de-sql.js';
export class MigracaoB1006PeriodoContabil extends criarMigracaoDeSql(import.meta.url, { up: 'periodo.sql', down: 'desfazer.sql' }) {}
