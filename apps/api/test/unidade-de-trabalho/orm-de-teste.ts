import { MikroORM } from '@mikro-orm/postgresql';
import type { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { inject } from 'vitest';
import { construirOpcoesDoOrm } from '../../src/shared/infrastructure/banco/configuracao-do-orm.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';

export type OrmDeTeste = Awaited<ReturnType<typeof MikroORM.init<PostgreSqlDriver>>>;

export function urlDoAppPara(banco: BancoDeTeste): string {
  const host = inject('hostDoBanco');
  const porta = inject('portaDoBanco');
  const senha = inject('senhaCddApp');
  return `postgres://cdd_app:${senha}@${host}:${porta}/${banco.nomeDoBanco}`;
}

export async function abrirOrmDeTeste(banco: BancoDeTeste, poolMaximo = 10): Promise<OrmDeTeste> {
  return MikroORM.init<PostgreSqlDriver>(
    construirOpcoesDoOrm({ BANCO_URL: urlDoAppPara(banco), BANCO_POOL_MAXIMO: String(poolMaximo) }),
  );
}
