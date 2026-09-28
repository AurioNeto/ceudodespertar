import { describe, expect, it } from 'vitest';
import type { ErroDeDominio } from '../../src/shared/kernel/erro-de-dominio.js';
import { encadear, err, ok, type Result } from '../../src/shared/kernel/result.js';

interface ErroDeLeitura {
  readonly origem: 'leitura';
}

interface ErroDeGravacao {
  readonly origem: 'gravacao';
}

function ler(): Result<number, ErroDeLeitura> {
  return ok(1);
}

function gravar(valor: number): Result<string, ErroDeGravacao> {
  return valor > 0 ? ok(String(valor)) : err({ origem: 'gravacao' });
}

describe('Result — contrato de tipos', () => {
  it('ok() sem argumento serve a um comando sem valor de retorno', () => {
    const resultado: Result<void, ErroDeDominio> = ok();

    expect(resultado.tipo).toBe('ok');
  });

  it('encadear une os tipos de erro das duas etapas', () => {
    const resultado: Result<string, ErroDeLeitura | ErroDeGravacao> = encadear(ler(), gravar);

    expect(resultado.tipo).toBe('ok');
  });

  it('encadear não esconde o erro da segunda etapa', () => {
    // @ts-expect-error o erro da gravação não cabe em Result<string, ErroDeLeitura>
    const resultado: Result<string, ErroDeLeitura> = encadear(ler(), gravar);

    expect(resultado.tipo).toBe('ok');
  });
});
