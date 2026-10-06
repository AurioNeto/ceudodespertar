import { describe, expect, it } from 'vitest';
import { ehErroDeBanco, ehVersaoDesatualizada } from './classificacao-de-erros-do-banco.js';
import { erroDeVersaoDesatualizada, erroDoDriverComSqlstate, erroDoPgComSqlstate } from './erros-de-banco.fake.js';

describe('classificação de erros do banco', () => {
  it('reconhece o erro do pg com SQLSTATE válido', () => {
    expect(ehErroDeBanco(erroDoPgComSqlstate('duplicado', '23505', 'usuario_email_unico'))).toBe(true);
  });

  it('reconhece a DriverException do MikroORM com SQLSTATE válido', () => {
    expect(ehErroDeBanco(erroDoDriverComSqlstate('duplicado', '23505', 'usuario_email_unico'))).toBe(true);
  });

  it.each(['2350', '235055', '23a05', ''])('rejeita o código %j que não é SQLSTATE', (codigo) => {
    expect(ehErroDeBanco(erroDoPgComSqlstate('falha', codigo))).toBe(false);
  });

  it('rejeita erro comum, ainda que carregue um código de SQLSTATE', () => {
    expect(ehErroDeBanco(Object.assign(new Error('falha'), { code: '23505' }))).toBe(false);
  });

  it.each([undefined, null, 'texto', 42, {}])('rejeita o valor %j que não é erro', (valor) => {
    expect(ehErroDeBanco(valor)).toBe(false);
  });

  it('expõe o constraint quando o driver o informa', () => {
    const erro = erroDoPgComSqlstate('duplicado', '23505', 'usuario_email_unico');

    expect(ehErroDeBanco(erro) && erro.constraint).toBe('usuario_email_unico');
  });

  it('reconhece a versão desatualizada do bloqueio otimista', () => {
    expect(ehVersaoDesatualizada(erroDeVersaoDesatualizada('Usuario'))).toBe(true);
  });

  it('não confunde outros erros com versão desatualizada', () => {
    expect(ehVersaoDesatualizada(erroDoPgComSqlstate('falha', '23505'))).toBe(false);
    expect(ehVersaoDesatualizada(new Error('falha'))).toBe(false);
  });
});
