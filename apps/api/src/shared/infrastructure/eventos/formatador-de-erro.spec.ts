import { describe, expect, it } from 'vitest';
import { formatarUltimoErro } from './formatador-de-erro.js';

describe('formatarUltimoErro', () => {
  it('prefixa com o nome da classe do erro e a mensagem', () => {
    const resultado = formatarUltimoErro(new Error('falha proposital'));

    expect(resultado).toBe('Error: Error - falha proposital');
  });

  it('usa erro.code como identificador quando presente (erro de driver de banco)', () => {
    const erroDeBanco = Object.assign(new Error('unique violation'), { code: '23505' });

    expect(formatarUltimoErro(erroDeBanco)).toBe('Error: 23505 - unique violation');
  });

  it('mascara CPF no formato NNN.NNN.NNN-NN na mensagem', () => {
    const resultado = formatarUltimoErro(new Error('titular cpf 123.456.789-00 duplicado'));

    expect(resultado).toContain('***.***.***-**');
    expect(resultado).not.toContain('123.456.789-00');
  });

  it('trunca o resultado em 500 caracteres mesmo com mensagem de 1 MB', () => {
    const mensagemGigante = 'cpf 123.456.789-00 ' + 'x'.repeat(1_000_000);

    const resultado = formatarUltimoErro(new Error(mensagemGigante));

    expect(resultado.length).toBeLessThanOrEqual(500);
    expect(resultado).toContain('***.***.***-**');
    expect(resultado).not.toContain('123.456.789-00');
  });
});
