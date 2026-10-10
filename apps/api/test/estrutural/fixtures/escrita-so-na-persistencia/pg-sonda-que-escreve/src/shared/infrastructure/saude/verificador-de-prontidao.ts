import type { Kysely } from 'kysely';
import type { Pool } from 'pg';

export async function sondar(pool: Pool, kysely: Kysely<any>) {
  const cliente = await pool.connect();
  await cliente.query('delete from t');
  await cliente.query('select 1');
  cliente.release();
  await pool.end();
  await kysely.selectFrom('t').execute();
}
