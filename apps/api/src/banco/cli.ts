import { MikroORM } from '@mikro-orm/postgresql';
import type { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { analisarComandoDoMigrador } from './comando-cli.js';
import {
  construirOpcoesDoMigrador,
  SCHEMA_DA_TABELA_DE_HISTORICO,
  TABELA_DE_HISTORICO_DO_MIGRADOR,
} from './opcoes-do-migrador.js';
import { papelConectadoEhSeguroParaMigrar } from './papel-seguro-para-migrar.js';
import type { AtributosDoPapelConectado } from './papel-seguro-para-migrar.js';
import { MIGRACOES_DO_CDD } from './migracoes/lista.js';

type OrmDoMigrador = Awaited<ReturnType<typeof MikroORM.init<PostgreSqlDriver>>>;

class ErroDePapelInseguroParaMigrar extends Error {
  constructor() {
    super(
      'O papel conectado por BANCO_URL_MIGRACAO não é seguro para migrar. O migrador exige ' +
        'session_user = current_user (nenhum SET ROLE/PGOPTIONS em vigor), current_user igual ao ' +
        'dono do banco corrente, e nem SUPERUSER nem BYPASSRLS — para que RLS e as guardas do ' +
        'banco valham também durante a migration.',
    );
    this.name = 'ErroDePapelInseguroParaMigrar';
  }
}

async function buscarAtributosDoPapelConectado(
  orm: OrmDoMigrador,
): Promise<AtributosDoPapelConectado | undefined> {
  const linhas = await orm.em.execute<AtributosDoPapelConectado[]>(
    `SELECT
       session_user AS "sessionUser",
       current_user AS "currentUser",
       (SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname = current_database()) AS "donoDoBanco",
       (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS "rolsuper",
       (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) AS "rolbypassrls"`,
  );
  return linhas[0];
}

async function recusarSeInseguroParaMigrar(orm: OrmDoMigrador): Promise<void> {
  const atributos = await buscarAtributosDoPapelConectado(orm);
  if (!atributos || !papelConectadoEhSeguroParaMigrar(atributos)) {
    throw new ErroDePapelInseguroParaMigrar();
  }
}

async function migrar(orm: OrmDoMigrador): Promise<void> {
  const aplicadas = await orm.migrator.up();

  if (aplicadas.length === 0) {
    console.log('Nada a aplicar — já está tudo em dia.');
    return;
  }

  for (const migracao of aplicadas) {
    console.log(`Aplicada: ${migracao.name}`);
  }
}

async function tabelaDeHistoricoExiste(orm: OrmDoMigrador): Promise<boolean> {
  const linhas = await orm.em.execute<{ existe: boolean }[]>('SELECT to_regclass(?) IS NOT NULL AS existe', [
    `${SCHEMA_DA_TABELA_DE_HISTORICO}.${TABELA_DE_HISTORICO_DO_MIGRADOR}`,
  ]);
  return linhas[0]?.existe ?? false;
}

function relatarSituacaoSemHistorico(): void {
  console.log('Aplicadas: nenhuma');
  console.log('Pendentes:');
  for (const migracao of MIGRACOES_DO_CDD) {
    console.log(`  ${migracao.name}`);
  }
}

async function relatarSituacao(orm: OrmDoMigrador): Promise<void> {
  if (!(await tabelaDeHistoricoExiste(orm))) {
    relatarSituacaoSemHistorico();
    return;
  }

  const aplicadas = await orm.migrator.getExecuted();
  const pendentes = await orm.migrator.getPending();

  console.log('Aplicadas:');
  for (const migracao of aplicadas) {
    console.log(`  ${migracao.name} (${migracao.executed_at.toISOString()})`);
  }

  console.log('Pendentes:');
  for (const migracao of pendentes) {
    console.log(`  ${migracao.name}`);
  }
}

async function executar(): Promise<void> {
  const comando = analisarComandoDoMigrador(process.argv.slice(2));
  const orm = await MikroORM.init<PostgreSqlDriver>(construirOpcoesDoMigrador());

  try {
    await recusarSeInseguroParaMigrar(orm);

    if (comando.subcomando === 'migrar') {
      await migrar(orm);
    } else {
      await relatarSituacao(orm);
    }
  } finally {
    await orm.close(true);
  }
}

executar().catch((erro: unknown) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exitCode = 1;
});
