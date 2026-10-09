import { criarMigracaoDeSql } from '../criar-migracao-de-sql.js';

export class MigracaoB0009UsuarioGrupoPorGrupo extends criarMigracaoDeSql(import.meta.url, {
  up: 'usuario-grupo-por-grupo.sql',
  down: 'desfazer.sql',
}) {}
