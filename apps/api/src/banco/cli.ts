import { MikroORM } from '@mikro-orm/postgresql';
import type { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { analisarComandoDoMigrador } from './comando-cli.js';
import {
  construirOpcoesDoMigrador,
  SCHEMA_DA_TABELA_DE_HISTORICO,
  TABELA_DE_HISTORICO_DO_MIGRADOR,
} from './opcoes-do-migrador.js';
import { verificarPapelDoMigrador } from './verificar-papel-do-migrador.js';
import { analisarAmbienteDoMigrador } from './ambiente-do-migrador.js';
import { executarMigracoes } from './executar-migracoes.js';
import { MIGRACOES_DO_CDD } from './migracoes/lista.js';

type OrmDoMigrador = Awaited<ReturnType<typeof MikroORM.init<PostgreSqlDriver>>>;

async function migrar(orm: OrmDoMigrador, escopo?: 'banco' | 'esquemas'): Promise<void> {
  const aplicadas = await executarMigracoes(orm, escopo);

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
  const ambiente = analisarAmbienteDoMigrador(process.env);
  const orm = await MikroORM.init<PostgreSqlDriver>(construirOpcoesDoMigrador());

  try {
    await verificarPapelDoMigrador(orm.em, ambiente.BANCO_MIGRACAO_ESCOPO);

    if (comando.subcomando === 'migrar') {
      await migrar(orm, ambiente.BANCO_MIGRACAO_ESCOPO);
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
