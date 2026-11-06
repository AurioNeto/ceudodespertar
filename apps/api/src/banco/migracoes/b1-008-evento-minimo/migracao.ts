import { criarMigracaoDeSql } from '../criar-migracao-de-sql.js';

export class MigracaoB1008EventoMinimo extends criarMigracaoDeSql(import.meta.url, { up: 'evento.sql', down: 'desfazer.sql' }) {}
