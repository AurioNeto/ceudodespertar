import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { MikroORM } from '@mikro-orm/postgresql';
import type { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { construirOpcoesDoMigrador } from '../../src/banco/opcoes-do-migrador.js';
import { verificarPapelDoMigrador } from '../../src/banco/verificar-papel-do-migrador.js';
import { executarMigracoes } from '../../src/banco/executar-migracoes.js';
import type { OrmDoMigrador } from '../../src/banco/executar-migracoes.js';
import { MIGRACOES_DO_CDD } from '../../src/banco/migracoes/lista.js';

describe('migração em banco gerenciado', () => {
  const nome = `cdd_gerenciado_${randomUUID().replaceAll('-', '')}`;
  let admin: Client;
  let orm: OrmDoMigrador;

  beforeAll(async () => {
    const conexao = {
      host: inject('hostDoBanco'), port: inject('portaDoBanco'),
      user: inject('usuarioSuperusuario'), password: inject('senhaSuperusuario'),
    };
    const servidor = new Client({ ...conexao, database: inject('bancoDeAdministracao') });
    await servidor.connect();
    try {
      await servidor.query(`CREATE DATABASE ${nome} OWNER postgres`);
    } finally {
      await servidor.end();
    }
    admin = new Client({ ...conexao, database: nome });
    await admin.connect();
    await admin.query(`GRANT CREATE ON DATABASE ${nome} TO cdd_owner`);
    await admin.query('GRANT USAGE, CREATE ON SCHEMA public TO cdd_owner');
    const senha = encodeURIComponent(inject('senhaCddOwner'));
    orm = await MikroORM.init<PostgreSqlDriver>(construirOpcoesDoMigrador({
      BANCO_URL_MIGRACAO: `postgres://cdd_owner:${senha}@${conexao.host}:${conexao.port}/${nome}`,
    }));
  });

  afterAll(async () => {
    await orm?.close(true);
    await admin?.end();
    const servidor = new Client({
      host: inject('hostDoBanco'), port: inject('portaDoBanco'),
      user: inject('usuarioSuperusuario'), password: inject('senhaSuperusuario'),
      database: inject('bancoDeAdministracao'),
    });
    await servidor.connect();
    try { await servidor.query(`DROP DATABASE IF EXISTS ${nome}`); }
    finally { await servidor.end(); }
  });

  it('recusa o modo local e aceita o dono dos esquemas no modo explícito', async () => {
    await expect(verificarPapelDoMigrador(orm.em)).rejects.toThrow('não é seguro');
    await expect(verificarPapelDoMigrador(orm.em, 'esquemas')).resolves.toBeUndefined();
  });

  it('aplica todas as migrações sem ser dono do banco e protege o histórico', async () => {
    expect(await executarMigracoes(orm, 'esquemas')).toHaveLength(MIGRACOES_DO_CDD.length);
    expect(await executarMigracoes(orm, 'esquemas')).toHaveLength(0);
    await expect(verificarPapelDoMigrador(orm.em, 'esquemas')).resolves.toBeUndefined();
    const [historico] = await orm.em.execute<{ relrowsecurity: boolean; relforcerowsecurity: boolean }[]>(
      "SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE oid='public.cdd_migracoes_aplicadas'::regclass",
    );
    expect(historico).toEqual({ relrowsecurity: true, relforcerowsecurity: false });
  });

  it('recusa quando um esquema pertence a outro papel', async () => {
    await admin.query('ALTER SCHEMA financeiro OWNER TO postgres');
    try {
      await expect(verificarPapelDoMigrador(orm.em, 'esquemas')).rejects.toThrow('não é seguro');
    } finally { await admin.query('ALTER SCHEMA financeiro OWNER TO cdd_owner'); }
  });

  it('recusa quando o histórico pertence a outro papel', async () => {
    await admin.query('ALTER TABLE public.cdd_migracoes_aplicadas OWNER TO postgres');
    try {
      await expect(verificarPapelDoMigrador(orm.em, 'esquemas')).rejects.toThrow('não é seguro');
    } finally { await admin.query('ALTER TABLE public.cdd_migracoes_aplicadas OWNER TO cdd_owner'); }
  });

  it('recusa quando falta permissão de criação no public', async () => {
    await admin.query('REVOKE CREATE ON SCHEMA public FROM cdd_owner');
    try {
      await expect(verificarPapelDoMigrador(orm.em, 'esquemas')).rejects.toThrow('não é seguro');
    } finally { await admin.query('GRANT CREATE ON SCHEMA public TO cdd_owner'); }
  });

  it('recusa uma sessão que assumiu outro papel', async () => {
    await orm.em.fork().transactional(async em => {
      await em.execute('SET LOCAL ROLE cdd_app');
      await expect(verificarPapelDoMigrador(em, 'esquemas')).rejects.toThrow('não é seguro');
    });
  });
});
