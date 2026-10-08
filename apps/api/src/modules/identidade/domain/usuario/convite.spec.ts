import type { UsuarioId } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import { ehErr, ehOk } from '../../../../shared/kernel/result.js';
import { Convite } from './convite.js';

const CRIADO_EM = new Date('2026-03-07T12:00:00Z');
const EXPIRA_EM = new Date('2026-03-10T12:00:00Z');
const ANTES_DE_EXPIRAR = new Date('2026-03-09T12:00:00Z');
const HASH = 'hash-correto';
const AUTOR = 'admin-1' as UsuarioId;

function conviteVigente(): Convite {
  return Convite.criar(HASH, EXPIRA_EM, AUTOR, CRIADO_EM);
}

describe('Convite', () => {
  it('data de expiração inválida é erro de programação', () => {
    expect(() => Convite.criar(HASH, new Date('inválida'), AUTOR, CRIADO_EM)).toThrow(RangeError);
  });

  it('instante de criação inválido é erro de programação', () => {
    expect(() => Convite.criar(HASH, EXPIRA_EM, AUTOR, new Date('inválida'))).toThrow(RangeError);
  });

  it('guarda quem criou e quando', () => {
    const convite = conviteVigente();

    expect(convite.criadoPor).toBe(AUTOR);
    expect(convite.criadoEm).toEqual(CRIADO_EM);
  });

  it('aceita expirar exatamente 72 horas depois da criação', () => {
    expect(conviteVigente().expiraEm).toEqual(EXPIRA_EM);
  });

  it('recusa expirar um milissegundo além de 72 horas', () => {
    const alemDoLimite = new Date(EXPIRA_EM.getTime() + 1);

    expect(() => Convite.criar(HASH, alemDoLimite, AUTOR, CRIADO_EM)).toThrow(RangeError);
  });

  it('aceita expirar um milissegundo depois da criação', () => {
    const logoDepois = new Date(CRIADO_EM.getTime() + 1);

    expect(Convite.criar(HASH, logoDepois, AUTOR, CRIADO_EM).expiraEm).toEqual(logoDepois);
  });

  it.each([
    ['no instante da criação', CRIADO_EM],
    ['antes da criação', new Date('2026-03-06T12:00:00Z')],
  ])('recusa expirar %s', (_descricao, expiraEm) => {
    expect(() => Convite.criar(HASH, expiraEm, AUTOR, CRIADO_EM)).toThrow(RangeError);
  });

  it('aceita o hash correto antes de expirar', () => {
    expect(ehOk(conviteVigente().validar(HASH, ANTES_DE_EXPIRAR))).toBe(true);
  });

  it('recusa hash diferente com CONVITE_INVALIDO', () => {
    const resultado = conviteVigente().validar('outro-hash', ANTES_DE_EXPIRAR);

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('CONVITE_INVALIDO');
  });

  it('recusa convite revogado com CONVITE_INVALIDO', () => {
    const resultado = conviteVigente().revogar(ANTES_DE_EXPIRAR).validar(HASH, ANTES_DE_EXPIRAR);

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('CONVITE_INVALIDO');
  });

  it('recusa convite já usado com CONVITE_JA_USADO', () => {
    const resultado = conviteVigente().usar(ANTES_DE_EXPIRAR).validar(HASH, ANTES_DE_EXPIRAR);

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('CONVITE_JA_USADO');
  });

  it('recusa convite expirado com CONVITE_EXPIRADO', () => {
    const resultado = conviteVigente().validar(HASH, new Date('2026-03-10T12:00:01Z'));

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('CONVITE_EXPIRADO');
  });

  it('aceita no último instante de validade', () => {
    expect(ehOk(conviteVigente().validar(HASH, EXPIRA_EM))).toBe(true);
  });

  it('guarda o instante de uso e de revogação sem mutar o original', () => {
    const original = conviteVigente();

    expect(original.usar(ANTES_DE_EXPIRAR).usadoEm).toEqual(ANTES_DE_EXPIRAR);
    expect(original.revogar(ANTES_DE_EXPIRAR).revogadoEm).toEqual(ANTES_DE_EXPIRAR);
    expect(original.usadoEm).toBeNull();
    expect(original.revogadoEm).toBeNull();
  });

  it('reconstitui o convite com o estado persistido', () => {
    const convite = Convite.reconstituir({
      hashDoToken: HASH,
      expiraEm: EXPIRA_EM,
      criadoPor: AUTOR,
      criadoEm: CRIADO_EM,
      usadoEm: ANTES_DE_EXPIRAR,
      revogadoEm: null,
    });

    expect(convite.hashDoToken).toBe(HASH);
    expect(convite.expiraEm).toEqual(EXPIRA_EM);
    expect(convite.usadoEm).toEqual(ANTES_DE_EXPIRAR);
    expect(convite.criadoPor).toBe(AUTOR);
    expect(convite.criadoEm).toEqual(CRIADO_EM);
  });
});
