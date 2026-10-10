import type { Pool } from 'pg';

export async function encerrar(pool: Pool) {
  await pool.end();
}
