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

  it('recusa URL com query string (ex.: ?schema=)', () => {
    expect.assertions(3);

    try {
      analisarAmbienteDoMigrador({
        BANCO_URL_MIGRACAO: 'postgres://cdd_owner:segredo@localhost:5432/cdd?schema=shared',
      });
    } catch (erro) {
      expect(erro).toBeInstanceOf(ErroDeAmbienteDoMigradorInvalido);
      const problemas = (erro as ErroDeAmbienteDoMigradorInvalido).problemas;
      expect(problemas).toHaveLength(1);
      expect(problemas[0]).toContain('query string');
    }
  });

  it('recusa URL com fragmento', () => {
    expect.assertions(3);

    try {
      analisarAmbienteDoMigrador({
        BANCO_URL_MIGRACAO: 'postgres://cdd_owner:segredo@localhost:5432/cdd#fragmento',
      });
    } catch (erro) {
      expect(erro).toBeInstanceOf(ErroDeAmbienteDoMigradorInvalido);
      const problemas = (erro as ErroDeAmbienteDoMigradorInvalido).problemas;
      expect(problemas).toHaveLength(1);
      expect(problemas[0]).toContain('fragmento');
    }
  });

  it.each(['MIKRO_ORM_DB_NAME', 'MIKRO_ORM_SCHEMA', 'MIKRO_ORM_CLIENT_URL', 'MIKRO_ORM_HOST'])(
    'recusa quando %s está presente no ambiente, mesmo com BANCO_URL_MIGRACAO válida',
    (variavel) => {
      expect.assertions(3);

      try {
        analisarAmbienteDoMigrador({
          BANCO_URL_MIGRACAO: 'postgres://cdd_owner:segredo@localhost:5432/cdd',
          [variavel]: 'valor-qualquer',
        });
      } catch (erro) {
        expect(erro).toBeInstanceOf(ErroDeAmbienteDoMigradorInvalido);
        const problemas = (erro as ErroDeAmbienteDoMigradorInvalido).problemas;
        expect(problemas).toHaveLength(1);
        expect(problemas[0]).toContain(variavel);
      }
    },
  );

  it('acumula o problema de MIKRO_ORM_* junto com um problema de schema da URL, quando os dois ocorrem juntos', () => {
    expect.assertions(2);

    try {
      analisarAmbienteDoMigrador({
        BANCO_URL_MIGRACAO: 'mysql://cdd_owner:segredo@localhost:3306/cdd',
        MIKRO_ORM_DB_NAME: 'cdd_outro',
      });
    } catch (erro) {
      expect(erro).toBeInstanceOf(ErroDeAmbienteDoMigradorInvalido);
      const problemas = (erro as ErroDeAmbienteDoMigradorInvalido).problemas;
      expect(problemas).toHaveLength(2);
    }
  });

  it('ignora variáveis de ambiente que não começam com MIKRO_ORM_', () => {
    const ambiente = analisarAmbienteDoMigrador({
      BANCO_URL_MIGRACAO: 'postgres://cdd_owner:segredo@localhost:5432/cdd',
      PATH: '/usr/bin',
      HOME: '/home/cdd',
    });

    expect(ambiente.BANCO_URL_MIGRACAO).toBe('postgres://cdd_owner:segredo@localhost:5432/cdd');
  });
});
