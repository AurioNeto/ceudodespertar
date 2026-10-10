import { describe, expect, it } from 'vitest';
import { normalizarEmail } from '../../../src/modules/identidade/application/convite/normalizar-email.js';

describe('normalizarEmail', () => {
  it('converte para minúsculas', () => {
    expect(normalizarEmail('MARIA@Casa.ORG')).toBe('maria@casa.org');
  });

  it('remove espaços das pontas', () => {
    expect(normalizarEmail('  maria@casa.org \t')).toBe('maria@casa.org');
  });

  it('iguala a forma decomposta (NFD) e a composta (NFC) do mesmo e-mail', () => {
    const composto = 'josé@casa.org';
    const decomposto = 'josé@casa.org';
    expect(composto).not.toBe(decomposto);
    expect(normalizarEmail(decomposto)).toBe(normalizarEmail(composto));
  });

  it('aplica compatibilidade (NFKC) a formas de largura total', () => {
    expect(normalizarEmail('ｍａｒｉａ@casa.org')).toBe('maria@casa.org');
  });

  it('não remove espaços do meio', () => {
    expect(normalizarEmail('ma ria@casa.org')).toBe('ma ria@casa.org');
  });
});
