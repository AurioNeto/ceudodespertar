import type { Kysely } from 'kysely';
import type { DB } from './banco-cdd.gerado.js';

export async function listarIdsDasInstituicoes(kysely: Kysely<DB>): Promise<string[]> {
  const linhas = await kysely.selectFrom('shared.instituicao').select('id').execute();
  return linhas.map((linha) => linha.id);
}
