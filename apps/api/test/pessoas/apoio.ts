import type { BancoDeTeste } from '../integracao/banco-de-teste.js';

/** Prepara fixtures persistidas; consultarNaInstituicao desfaz a transação ao sair. */
export async function gravarNaInstituicao(banco: BancoDeTeste, instituicao: string, sql: string, parametros: readonly unknown[]): Promise<void> {
  await banco.owner.query('begin');
  try {
    await banco.owner.query("select set_config('app.instituicao_id', $1, true)", [instituicao]);
    await banco.owner.query(sql, [...parametros]);
    await banco.owner.query('commit');
  } catch (erro) {
    await banco.owner.query('rollback');
    throw erro;
  }
}
