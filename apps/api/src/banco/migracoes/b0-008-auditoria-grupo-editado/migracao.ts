import { criarMigracaoDeSql } from '../criar-migracao-de-sql.js';

export class MigracaoB0008AuditoriaGrupoEditado extends criarMigracaoDeSql(import.meta.url, {
  up: 'grupo-editado.sql',
  down: 'desfazer.sql',
}) {}
