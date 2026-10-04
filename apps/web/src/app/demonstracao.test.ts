import { describe, expect, it, vi } from 'vitest';
import { carregarDemonstracao, demonstracaoLigada } from './demonstracao';

describe('demonstracaoLigada', () => {
  it('liga em desenvolvimento com a flag', () => {
    expect(demonstracaoLigada(true, '1')).toBe(true);
  });

  it('fica desligada sem a flag, mesmo em desenvolvimento', () => {
    expect(demonstracaoLigada(true, undefined)).toBe(false);
    expect(demonstracaoLigada(true, '')).toBe(false);
  });

  it('fica desligada com flag que não é exatamente 1', () => {
    expect(demonstracaoLigada(true, '0')).toBe(false);
    expect(demonstracaoLigada(true, 'true')).toBe(false);
  });

  it('fica desligada fora de desenvolvimento, mesmo com a flag', () => {
    expect(demonstracaoLigada(false, '1')).toBe(false);
  });
});

describe('carregarDemonstracao', () => {
  const modulo = { marca: 'demonstracao' };

  it('importa o módulo em desenvolvimento com a flag', async () => {
    const importar = vi.fn(() => Promise.resolve(modulo));
    expect(await carregarDemonstracao({ desenvolvimento: true, flag: '1', importar })).toBe(modulo);
    expect(importar).toHaveBeenCalledTimes(1);
  });

  it('não importa nada sem a flag', async () => {
    const importar = vi.fn(() => Promise.resolve(modulo));
    expect(await carregarDemonstracao({ desenvolvimento: true, flag: undefined, importar })).toBeNull();
    expect(importar).not.toHaveBeenCalled();
  });

  it('não importa nada fora de desenvolvimento, mesmo com a flag', async () => {
    const importar = vi.fn(() => Promise.resolve(modulo));
    expect(await carregarDemonstracao({ desenvolvimento: false, flag: '1', importar })).toBeNull();
    expect(importar).not.toHaveBeenCalled();
  });
});
