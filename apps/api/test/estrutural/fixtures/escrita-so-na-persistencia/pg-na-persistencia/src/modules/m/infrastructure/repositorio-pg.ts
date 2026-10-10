import type { Pool } from 'pg';

export async function gravar(pool: Pool) {
  await pool.query('delete from t');
  await pool.query({ text: 'insert into t values (1)' });
  await pool.query('commit');
}
