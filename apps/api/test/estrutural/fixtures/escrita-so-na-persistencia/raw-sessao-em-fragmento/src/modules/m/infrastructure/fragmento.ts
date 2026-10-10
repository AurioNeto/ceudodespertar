import { sql } from 'kysely';

export const ajuste = sql.raw('set local app.tenant = 1');
export const volta = sql.raw('reset role');
