import { describe, expect, it } from 'vitest';
import { analisarAmbienteDoMigrador, ErroDeAmbienteDoMigradorInvalido } from './ambiente-do-migrador.js';

describe('analisarAmbienteDoMigrador', () => {
  it('aceita uma BANCO_URL_MIGRACAO postgres:// válida', () => {
    const ambiente = analisarAmbienteDoMigrador({
      BANCO_URL_MIGRACAO: 'postgres://cdd_owner:segredo@localhost:5432/cdd',
    });

    expect(ambiente).toEqual({
      BANCO_URL_MIGRACAO: 'postgres://cdd_owner:segredo@localhost:5432/cdd',
    });
  });

  it('aceita o esquema postgresql://', () => {
    const ambiente = analisarAmbienteDoMigrador({
      BANCO_URL_MIGRACAO: 'postgresql://cdd_owner:segredo@localhost:5432/cdd',
    });

    expect(ambiente.BANCO_URL_MIGRACAO).toBe('postgresql://cdd_owner:segredo@localhost:5432/cdd');
  });

  it('lança ErroDeAmbienteDoMigradorInvalido quando BANCO_URL_MIGRACAO está ausente', () => {
    expect.assertions(3);

    try {
      analisarAmbienteDoMigrador({});
    } catch (erro) {
      expect(erro).toBeInstanceOf(ErroDeAmbienteDoMigradorInvalido);
      const problemas = (erro as ErroDeAmbienteDoMigradorInvalido).problemas;
      expect(problemas).toHaveLength(1);
      expect(problemas[0]?.startsWith('BANCO_URL_MIGRACAO')).toBe(true);
    }
  });

  it('lança ErroDeAmbienteDoMigradorInvalido quando a URL não é postgres://', () => {
    expect.assertions(3);

    try {
      analisarAmbienteDoMigrador({ BANCO_URL_MIGRACAO: 'mysql://cdd_owner:segredo@localhost:3306/cdd' });
    } catch (erro) {
      expect(erro).toBeInstanceOf(ErroDeAmbienteDoMigradorInvalido);
      const problemas = (erro as ErroDeAmbienteDoMigradorInvalido).problemas;
      expect(problemas).toHaveLength(1);
      expect(problemas[0]?.startsWith('BANCO_URL_MIGRACAO')).toBe(true);
    }
  });

  it('lança ErroDeAmbienteDoMigradorInvalido quando a URL é malformada', () => {
    expect.assertions(2);

    try {
      analisarAmbienteDoMigrador({ BANCO_URL_MIGRACAO: 'não é uma url' });
    } catch (erro) {
      expect(erro).toBeInstanceOf(ErroDeAmbienteDoMigradorInvalido);
      const problemas = (erro as ErroDeAmbienteDoMigradorInvalido).problemas;
      expect(problemas).toHaveLength(1);
    }
  });
});
