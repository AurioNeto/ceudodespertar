import { describe, expect, it } from 'vitest';
import { erroDeDominio } from '../../src/shared/kernel/erro-de-dominio.js';

describe('erroDeDominio — contrato de tipos', () => {
  it('aceita um código do catálogo', () => {
    expect(erroDeDominio('ERRO_INTERNO').codigo).toBe('ERRO_INTERNO');
  });

  it('recusa em tempo de compilação um código fora do catálogo', () => {
    // @ts-expect-error CODIGO_INEXISTENTE não pertence a CodigoDeErro
    erroDeDominio('CODIGO_INEXISTENTE');
  });
});
