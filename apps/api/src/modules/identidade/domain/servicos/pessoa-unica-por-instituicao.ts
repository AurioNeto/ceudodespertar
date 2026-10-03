import { erroDeDominio, type ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { err, ok, type Result } from '../../../../shared/kernel/result.js';

export function garantirPessoaUnicaPorInstituicao(pessoaJaTemUsuario: boolean): Result<void, ErroDeDominio> {
  return pessoaJaTemUsuario ? err(erroDeDominio('PESSOA_JA_TEM_USUARIO')) : ok();
}
