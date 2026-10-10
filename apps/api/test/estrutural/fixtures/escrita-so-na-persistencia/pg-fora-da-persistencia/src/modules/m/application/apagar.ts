import type { Pool } from 'pg';

export async function apagar(pool: Pool) {
  await pool.query('delete from t');
}
