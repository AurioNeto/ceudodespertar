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

  it('recusa em tempo de compilação ISOLAMENTO_INVALIDO, removido do catálogo', () => {
    // @ts-expect-error ISOLAMENTO_INVALIDO saiu do catálogo — a borda transacional garante o isolamento
    erroDeDominio('ISOLAMENTO_INVALIDO');
  });
});
