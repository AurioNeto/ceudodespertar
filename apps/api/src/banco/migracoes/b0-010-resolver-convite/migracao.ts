import { criarMigracaoDeSql } from '../criar-migracao-de-sql.js';

export class MigracaoB0010ResolverConvite extends criarMigracaoDeSql(import.meta.url, {
  up: 'resolver-convite.sql',
  down: 'desfazer.sql',
}) {}
