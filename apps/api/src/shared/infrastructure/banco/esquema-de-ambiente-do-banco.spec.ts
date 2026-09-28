import { describe, expect, it } from 'vitest';
import { analisarAmbienteDoBanco, ErroDeAmbienteDoBancoInvalido } from './esquema-de-ambiente-do-banco.js';

describe('analisarAmbienteDoBanco', () => {
  it('aceita BANCO_URL postgres:// e BANCO_POOL_MAXIMO válidos', () => {
    const ambiente = analisarAmbienteDoBanco({
      BANCO_URL: 'postgres://cdd_app:segredo@localhost:5432/cdd',
      BANCO_POOL_MAXIMO: '10',
    });

    expect(ambiente).toEqual({
      BANCO_URL: 'postgres://cdd_app:segredo@localhost:5432/cdd',
      BANCO_POOL_MAXIMO: 10,
    });
  });

  it('aceita o esquema postgresql://', () => {
    const ambiente = analisarAmbienteDoBanco({
      BANCO_URL: 'postgresql://cdd_app:segredo@localhost:5432/cdd',
      BANCO_POOL_MAXIMO: '5',
    });

    expect(ambiente.BANCO_URL).toBe('postgresql://cdd_app:segredo@localhost:5432/cdd');
  });

  it('lança ErroDeAmbienteDoBancoInvalido quando BANCO_URL está ausente', () => {
    expect.assertions(3);

    try {
      analisarAmbienteDoBanco({ BANCO_POOL_MAXIMO: '10' });
    } catch (erro) {
      expect(erro).toBeInstanceOf(ErroDeAmbienteDoBancoInvalido);
      const problemas = (erro as ErroDeAmbienteDoBancoInvalido).problemas;
      expect(problemas).toHaveLength(1);
      expect(problemas[0]?.startsWith('BANCO_URL')).toBe(true);
    }
  });

  it('lança ErroDeAmbienteDoBancoInvalido quando a URL não é postgres://', () => {
    expect.assertions(3);

    try {
      analisarAmbienteDoBanco({
        BANCO_URL: 'mysql://cdd_app:segredo@localhost:3306/cdd',
        BANCO_POOL_MAXIMO: '10',
      });
    } catch (erro) {
      expect(erro).toBeInstanceOf(ErroDeAmbienteDoBancoInvalido);
      const problemas = (erro as ErroDeAmbienteDoBancoInvalido).problemas;
      expect(problemas).toHaveLength(1);
      expect(problemas[0]?.startsWith('BANCO_URL')).toBe(true);
    }
  });

  it('lança ErroDeAmbienteDoBancoInvalido quando BANCO_POOL_MAXIMO está ausente ou zerado', () => {
    expect.assertions(3);

    try {
      analisarAmbienteDoBanco({
        BANCO_URL: 'postgres://cdd_app:segredo@localhost:5432/cdd',
        BANCO_POOL_MAXIMO: '0',
      });
    } catch (erro) {
      expect(erro).toBeInstanceOf(ErroDeAmbienteDoBancoInvalido);
      const problemas = (erro as ErroDeAmbienteDoBancoInvalido).problemas;
      expect(problemas).toHaveLength(1);
      expect(problemas[0]?.startsWith('BANCO_POOL_MAXIMO')).toBe(true);
    }
  });
});
