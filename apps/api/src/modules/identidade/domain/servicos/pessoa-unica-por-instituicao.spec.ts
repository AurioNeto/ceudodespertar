import { describe, expect, it } from 'vitest';
import { ehErr, ehOk } from '../../../../shared/kernel/result.js';
import { garantirPessoaUnicaPorInstituicao } from './pessoa-unica-por-instituicao.js';

describe('garantirPessoaUnicaPorInstituicao', () => {
  it('US2: aceita quando a pessoa ainda não tem usuário na instituição', () => {
    expect(ehOk(garantirPessoaUnicaPorInstituicao(false))).toBe(true);
  });

  it('US2: recusa com PESSOA_JA_TEM_USUARIO quando a pessoa já tem usuário', () => {
    const resultado = garantirPessoaUnicaPorInstituicao(true);

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('PESSOA_JA_TEM_USUARIO');
  });
});
