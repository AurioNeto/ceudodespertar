import { sql } from 'kysely';
import type { Kysely } from 'kysely';

export async function leitor(kysely: Kysely<any>, verbo: string) {
  const q1 = sql.raw('commit');
  await q1.execute(kysely);
  const q2 = sql`${verbo}update t set a = 1`;
  await q2.execute(kysely);
  await (sql.raw('rollback')).execute(kysely);
  const q3 = (sql`${verbo} from t`);
  await q3.execute(kysely);
}
