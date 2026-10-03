import { describe, expect, it } from 'vitest';
import { formatarUltimoErro } from './formatador-de-erro.js';

const MENSAGEM_GENERICA = 'o consumidor falhou ao processar o evento';

describe('formatarUltimoErro', () => {
  it('de um erro que não é de banco grava só a classe e a mensagem genérica', () => {
    expect(formatarUltimoErro(new TypeError('falha proposital'))).toBe(`TypeError - ${MENSAGEM_GENERICA}`);
  });

  it('de um erro de banco grava a classe, o SQLSTATE e o nome da constraint', () => {
    const erroDeBanco = Object.assign(new Error('duplicado'), {
      code: '23505',
      constraint: 'usuario_email_key',
    });

    expect(formatarUltimoErro(erroDeBanco)).toBe(
      `Error: 23505 constraint=usuario_email_key - ${MENSAGEM_GENERICA}`,
    );
  });

  it('nunca grava a mensagem nem o detail do driver, onde o dado pessoal aparece', () => {
    const erroDeBanco = Object.assign(
      new Error('duplicate key value violates unique constraint "usuario_email_key"'),
      {
        code: '23505',
        constraint: 'usuario_email_key',
        detail: 'Key (email)=(fulana@exemplo.com) already exists.',
      },
    );

    const resultado = formatarUltimoErro(erroDeBanco);

    expect(resultado).not.toContain('fulana@exemplo.com');
    expect(resultado).not.toContain('duplicate key');
    expect(resultado).not.toContain('already exists');
  });

  it.each([
    ['e-mail', 'titular fulana@exemplo.com duplicado'],
    ['CPF formatado', 'titular 123.456.789-00 duplicado'],
    ['CPF de 11 dígitos', 'titular 12345678900 duplicado'],
  ])('não grava %s presente na mensagem de um erro comum', (_rotulo, mensagem) => {
    expect(formatarUltimoErro(new Error(mensagem))).toBe(`Error - ${MENSAGEM_GENERICA}`);
  });

  it('descarta code e constraint que não têm o formato de identificador técnico', () => {
    const erroComDadoNosCampos = Object.assign(new Error('x'), {
      code: 'fulana@exemplo.com',
      constraint: 'cpf 12345678900',
    });

    expect(formatarUltimoErro(erroComDadoNosCampos)).toBe(`Error - ${MENSAGEM_GENERICA}`);
  });

  it.each(['12345678900', '2350', '235055', '23505 ', 'ECONNRESET', '2350a'])(
    'omite o code %j que não tem o formato SQLSTATE de cinco caracteres',
    (code) => {
      const erro = Object.assign(new Error('x'), { code });

      expect(formatarUltimoErro(erro)).toBe(`Error - ${MENSAGEM_GENERICA}`);
    },
  );

  it.each(['23505', '57014', '42P01', '0A000'])('mantém o SQLSTATE %s', (code) => {
    const erro = Object.assign(new Error('x'), { code });

    expect(formatarUltimoErro(erro)).toBe(`Error: ${code} - ${MENSAGEM_GENERICA}`);
  });

  it('limita o nome da classe', () => {
    const NomeGigante = class extends Error {};
    Object.defineProperty(NomeGigante, 'name', { value: 'E'.repeat(10_000) });

    expect(formatarUltimoErro(new NomeGigante()).length).toBeLessThan(200);
  });
});
