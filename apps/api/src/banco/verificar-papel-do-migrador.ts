import type { EntityManager } from '@mikro-orm/postgresql';
import { PapelHerdaPrivilegioError, papelConectadoEhSeguroParaMigrar } from './papel-seguro-para-migrar.js';
import type { AtributosDoPapelConectado, PropriedadeDosEsquemas } from './papel-seguro-para-migrar.js';
import { SCHEMA_DA_TABELA_DE_HISTORICO, TABELA_DE_HISTORICO_DO_MIGRADOR } from './opcoes-do-migrador.js';

export async function verificarPapelDoMigrador(
  em: EntityManager,
  escopo: 'banco' | 'esquemas' = 'banco',
): Promise<void> {
  const linhas = await em.execute<(AtributosDoPapelConectado & PropriedadeDosEsquemas)[]>(
    `SELECT session_user AS "sessionUser", current_user AS "currentUser",
       (SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname = current_database()) AS "donoDoBanco",
       (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS "rolsuper",
       (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) AS "rolbypassrls",
       COALESCE((SELECT json_agg(rolname ORDER BY rolname) FROM pg_roles
         WHERE rolname <> current_user
           AND pg_has_role(current_user, oid, 'MEMBER')
           AND (rolsuper OR rolbypassrls OR rolname IN (
             'pg_read_all_data', 'pg_write_all_data', 'pg_execute_server_program',
             'pg_read_server_files', 'pg_write_server_files'))), '[]'::json) AS "papeisPrivilegiadosHerdados",
       has_database_privilege(current_user, current_database(), 'CREATE')
         AND has_schema_privilege(current_user, ?, 'USAGE')
         AND has_schema_privilege(current_user, ?, 'CREATE') AS "podeCriarEsquemas",
       COALESCE((SELECT json_agg(nspname) FROM pg_namespace
         WHERE nspname IN ('shared', 'identidade', 'financeiro', 'pessoas', 'eventos', 'estoque')
           AND pg_get_userbyid(nspowner) <> current_user), '[]'::json) AS "esquemasDeOutroDono",
       EXISTS(SELECT 1 FROM pg_class
         WHERE oid = to_regclass(?) AND pg_get_userbyid(relowner) <> current_user) AS "historicoDeOutroDono"`,
    [SCHEMA_DA_TABELA_DE_HISTORICO, SCHEMA_DA_TABELA_DE_HISTORICO,
      `${SCHEMA_DA_TABELA_DE_HISTORICO}.${TABELA_DE_HISTORICO_DO_MIGRADOR}`],
  );
  const atributos = linhas[0];
  if (atributos && atributos.papeisPrivilegiadosHerdados.length > 0) {
    throw new PapelHerdaPrivilegioError(atributos.papeisPrivilegiadosHerdados);
  }
  if (!atributos || !papelConectadoEhSeguroParaMigrar(atributos, escopo, atributos)) {
    throw new Error(
      'O papel conectado por BANCO_URL_MIGRACAO não é seguro para migrar. ' +
      'Exige session_user = current_user, sem SUPERUSER nem BYPASSRLS. No escopo banco, ' +
      'deve ser dono do banco. No escopo esquemas, exige cdd_owner, permissão de criação ' +
      'e propriedade dos esquemas CDD e do histórico existentes.',
    );
  }
}
