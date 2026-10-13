import { criarMigracaoDeSql } from '../criar-migracao-de-sql.js';

export class MigracaoB0013OutboxAlertadoEm extends criarMigracaoDeSql(import.meta.url, {
  up: 'alertado-em.sql',
  down: 'desfazer.sql',
}) {}
