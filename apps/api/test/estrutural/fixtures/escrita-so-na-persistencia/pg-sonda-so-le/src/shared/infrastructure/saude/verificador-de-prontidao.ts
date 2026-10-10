import type { Pool } from 'pg';

export async function sondar(pool: Pool, limite: number) {
  pool.on('error', () => {});
  const cliente = await pool.connect();
  const { rows } = await cliente.query(`select 1 limit ${limite}`);
  await cliente.query('select ' + limite);
  await cliente.query({ text: 'select 1' });
  cliente.release();
  return rows;
}
