import { describe, expect, it } from 'vitest';
import { PapelHerdaPrivilegioError, papelConectadoEhSeguroParaMigrar } from './papel-seguro-para-migrar.js';
import type { AtributosDoPapelConectado } from './papel-seguro-para-migrar.js';

const ATRIBUTOS_SEGUROS: AtributosDoPapelConectado = {
  sessionUser: 'cdd_owner',
  currentUser: 'cdd_owner',
  donoDoBanco: 'cdd_owner',
  rolsuper: false,
  rolbypassrls: false,
  papeisPrivilegiadosHerdados: [],
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
        papeisPrivilegiadosHerdados: [],
      }),
    ).toBe(false);
  });
});

describe('privilégio herdado por pertencer a outro papel', () => {
  const propriedade = { podeCriarEsquemas: true, esquemasDeOutroDono: [], historicoDeOutroDono: false };
  const herdando = { ...ATRIBUTOS_SEGUROS, papeisPrivilegiadosHerdados: ['pg_write_all_data'] };

  it('recusa no escopo banco quando herda papel privilegiado', () => {
    expect(papelConectadoEhSeguroParaMigrar(herdando)).toBe(false);
  });

  it('recusa no escopo esquemas quando herda papel privilegiado', () => {
    const atributos = { ...herdando, donoDoBanco: 'postgres' };
    expect(papelConectadoEhSeguroParaMigrar(atributos, 'esquemas', propriedade)).toBe(false);
  });

  it('aceita no escopo esquemas quando não herda papel privilegiado', () => {
    const atributos = { ...ATRIBUTOS_SEGUROS, donoDoBanco: 'postgres' };
    expect(papelConectadoEhSeguroParaMigrar(atributos, 'esquemas', propriedade)).toBe(true);
  });

  it('o erro nomeado cita quais papéis foram herdados', () => {
    const erro = new PapelHerdaPrivilegioError(['pg_read_all_data', 'admin_legado']);
    expect(erro.name).toBe('PapelHerdaPrivilegioError');
    expect(erro.message).toContain('pg_read_all_data, admin_legado');
  });
});

describe('migração restrita aos esquemas CDD', () => {
  const atributos = { ...ATRIBUTOS_SEGUROS, donoDoBanco: 'postgres' };
  const propriedade = {
    podeCriarEsquemas: true,
    esquemasDeOutroDono: [],
    historicoDeOutroDono: false,
  };

  it('aceita cdd_owner sem ser dono do banco somente no modo explícito de esquemas', () => {
    expect(papelConectadoEhSeguroParaMigrar(atributos)).toBe(false);
    expect(papelConectadoEhSeguroParaMigrar(atributos, 'esquemas', propriedade)).toBe(true);
  });

  it('recusa quando não foram consultadas as propriedades do destino', () => {
    expect(papelConectadoEhSeguroParaMigrar(atributos, 'esquemas')).toBe(false);
  });

  it.each([
    { ...propriedade, podeCriarEsquemas: false },
    { ...propriedade, esquemasDeOutroDono: ['financeiro'] },
    { ...propriedade, historicoDeOutroDono: true },
  ])('recusa quando permissões ou propriedade divergem: %j', (divergente) => {
    expect(papelConectadoEhSeguroParaMigrar(atributos, 'esquemas', divergente)).toBe(false);
  });

  it.each([
    { ...atributos, sessionUser: 'postgres' },
    { ...atributos, sessionUser: 'outro', currentUser: 'outro' },
    { ...atributos, rolsuper: true },
    { ...atributos, rolbypassrls: true },
  ])('mantém as guardas de identidade e RLS: %j', (inseguro) => {
    expect(papelConectadoEhSeguroParaMigrar(inseguro, 'esquemas', propriedade)).toBe(false);
  });
});
