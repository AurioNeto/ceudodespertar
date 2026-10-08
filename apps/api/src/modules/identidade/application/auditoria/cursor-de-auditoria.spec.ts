import { describe, expect, it } from 'vitest';
import { ErroDeCursorInvalido, codificarCursor, decodificarCursor } from './cursor-de-auditoria.js';

const POSICAO = { em: new Date('2026-03-01T12:00:00.123Z'), id: '0195c3a0-7b1e-7c3a-8f2d-3b9a6d1e4f50' };

describe('cursor de auditoria', () => {
  it('devolve a mesma posição que codificou', () => {
    expect(decodificarCursor(codificarCursor(POSICAO))).toStrictEqual(POSICAO);
  });

  it('é opaco: não deixa o id nem o instante legíveis', () => {
    const cursor = codificarCursor(POSICAO);

    expect(cursor).not.toContain(POSICAO.id);
    expect(cursor).not.toContain('2026');
    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it.each([
    ['texto que não é base64 de JSON', '%%%'],
    ['JSON sem os campos', Buffer.from('{}').toString('base64url')],
    ['id que não é uuid', Buffer.from(JSON.stringify({ em: POSICAO.em.toISOString(), id: 'x' })).toString('base64url')],
    ['instante inválido', Buffer.from(JSON.stringify({ em: 'ontem', id: POSICAO.id })).toString('base64url')],
    ['JSON que não é objeto', Buffer.from('42').toString('base64url')],
  ])('recusa %s', (_descricao, cursor) => {
    expect(() => decodificarCursor(cursor)).toThrow(ErroDeCursorInvalido);
  });
});
