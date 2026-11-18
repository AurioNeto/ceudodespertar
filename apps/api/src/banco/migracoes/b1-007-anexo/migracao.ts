import { criarMigracaoDeSql } from '../criar-migracao-de-sql.js';
export class MigracaoB1007Anexo extends criarMigracaoDeSql(import.meta.url, { up: 'anexo.sql', down: 'desfazer.sql' }) {}
