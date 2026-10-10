import type { Pool } from 'pg';

export async function ler(pool: Pool, texto: string) {
  await pool.query('select 1');
  await pool.query({ text: 'select 1' });
  await pool.query('commit');
  await pool.query('delete from t');
  await pool.query({ text: 'delete from t' });
  await pool.query(texto);
  await pool.connect();
}
