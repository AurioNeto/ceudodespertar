import { describe, expect, it } from 'vitest';
import { analisarComandoDoMigrador, ErroDeComandoInvalido } from './comando-cli.js';

describe('analisarComandoDoMigrador', () => {
  it('aceita o subcomando migrar', () => {
    expect(analisarComandoDoMigrador(['migrar'])).toEqual({ subcomando: 'migrar' });
  });

  it('aceita o subcomando situacao', () => {
    expect(analisarComandoDoMigrador(['situacao'])).toEqual({ subcomando: 'situacao' });
  });

  it('ignora argumentos extras depois do subcomando', () => {
    expect(analisarComandoDoMigrador(['migrar', '--forcar'])).toEqual({ subcomando: 'migrar' });
  });

  it('lança ErroDeComandoInvalido listando os subcomandos válidos quando nenhum argumento é passado', () => {
    expect.assertions(3);

    try {
      analisarComandoDoMigrador([]);
    } catch (erro) {
      expect(erro).toBeInstanceOf(ErroDeComandoInvalido);
      expect((erro as Error).message).toContain('migrar');
      expect((erro as Error).message).toContain('situacao');
    }
  });

  it('lança ErroDeComandoInvalido para um subcomando desconhecido, citando o recebido', () => {
    expect.assertions(4);

    try {
      analisarComandoDoMigrador(['semear']);
    } catch (erro) {
      expect(erro).toBeInstanceOf(ErroDeComandoInvalido);
      expect((erro as Error).message).toContain('semear');
      expect((erro as Error).message).toContain('migrar');
      expect((erro as Error).message).toContain('situacao');
    }
  });
});
