import { MikroORM } from '@mikro-orm/postgresql';
import type { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { analisarComandoDoMigrador } from './comando-cli.js';
import { construirOpcoesDoMigrador } from './opcoes-do-migrador.js';

type OrmDoMigrador = Awaited<ReturnType<typeof MikroORM.init<PostgreSqlDriver>>>;

interface AtributosDoPapelConectado {
  rolsuper: boolean;
  rolbypassrls: boolean;
}

class ErroDePapelInseguroParaMigrar extends Error {
  constructor() {
    super(
      'O papel conectado por BANCO_URL_MIGRACAO tem SUPERUSER ou BYPASSRLS ligado. ' +
        'O migrador exige um dono comum (NOSUPERUSER, NOBYPASSRLS) para que RLS e as guardas do banco valham também durante a migration.',
    );
    this.name = 'ErroDePapelInseguroParaMigrar';
  }
}

async function recusarSeSuperusuarioOuBypassRls(orm: OrmDoMigrador): Promise<void> {
  const linhas = await orm.em.execute<AtributosDoPapelConectado[]>(
    'SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user',
  );
  const atributos = linhas[0];
  if (!atributos || atributos.rolsuper || atributos.rolbypassrls) {
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

async function relatarSituacao(orm: OrmDoMigrador): Promise<void> {
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
    await recusarSeSuperusuarioOuBypassRls(orm);

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
