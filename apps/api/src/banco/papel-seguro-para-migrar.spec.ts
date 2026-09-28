import { describe, expect, it } from 'vitest';
import { papelConectadoEhSeguroParaMigrar } from './papel-seguro-para-migrar.js';
import type { AtributosDoPapelConectado } from './papel-seguro-para-migrar.js';

const ATRIBUTOS_SEGUROS: AtributosDoPapelConectado = {
  sessionUser: 'cdd_owner',
  currentUser: 'cdd_owner',
  donoDoBanco: 'cdd_owner',
  rolsuper: false,
  rolbypassrls: false,
};

describe('papelConectadoEhSeguroParaMigrar', () => {
  it('aceita quando session_user, current_user e o dono do banco coincidem, sem SUPERUSER nem BYPASSRLS', () => {
    expect(papelConectadoEhSeguroParaMigrar(ATRIBUTOS_SEGUROS)).toBe(true);
  });

  it('recusa quando session_user difere de current_user (SET ROLE/PGOPTIONS trocou o papel da sessão)', () => {
    expect(
      papelConectadoEhSeguroParaMigrar({
        ...ATRIBUTOS_SEGUROS,
        sessionUser: 'postgres',
      }),
    ).toBe(false);
  });

  it('recusa quando current_user não é o dono do banco (login apenas membro de cdd_owner)', () => {
    expect(
      papelConectadoEhSeguroParaMigrar({
        ...ATRIBUTOS_SEGUROS,
        currentUser: 'crivo_membro',
        sessionUser: 'crivo_membro',
      }),
    ).toBe(false);
  });

  it('recusa quando o papel conectado tem SUPERUSER', () => {
    expect(papelConectadoEhSeguroParaMigrar({ ...ATRIBUTOS_SEGUROS, rolsuper: true })).toBe(false);
  });

  it('recusa quando o papel conectado tem BYPASSRLS', () => {
    expect(papelConectadoEhSeguroParaMigrar({ ...ATRIBUTOS_SEGUROS, rolbypassrls: true })).toBe(false);
  });

  it('recusa quando SUPERUSER e a troca de sessão coincidem (URL de superusuário com PGOPTIONS role=cdd_owner)', () => {
    expect(
      papelConectadoEhSeguroParaMigrar({
        sessionUser: 'postgres',
        currentUser: 'cdd_owner',
        donoDoBanco: 'cdd_owner',
        rolsuper: false,
        rolbypassrls: false,
      }),
    ).toBe(false);
  });
});
