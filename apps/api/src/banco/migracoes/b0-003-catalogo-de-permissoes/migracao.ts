import { criarMigracaoDeSql } from '../criar-migracao-de-sql.js';

export class MigracaoB0003CatalogoDePermissoes extends criarMigracaoDeSql(import.meta.url, {
  up: 'catalogo.sql',
  down: 'desfazer.sql',
}) {}
