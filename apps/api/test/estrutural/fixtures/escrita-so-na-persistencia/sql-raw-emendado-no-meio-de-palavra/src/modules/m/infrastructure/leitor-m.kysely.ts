import { sql } from 'kysely';
import type { Kysely } from 'kysely';

export async function leitor(db: Kysely<any>, texto: string) {
  await sql`com${sql.raw('mit')}`.execute(db);
  await sql`select set_${sql.raw('config')}('a', 'b', true)`.execute(db);
  await sql`se${sql.raw('t')} a = 1`.execute(db);
  await sql`ro${(sql.raw('llback'))}`.execute(db);
  await sql`com${sql.raw(texto)}`.execute(db);
}
