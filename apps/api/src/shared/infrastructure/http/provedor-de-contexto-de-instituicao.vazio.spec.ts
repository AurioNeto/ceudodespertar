import { describe, expect, it } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { ProvedorDeContextoDeInstituicaoVazio } from './provedor-de-contexto-de-instituicao.vazio.js';

describe('ProvedorDeContextoDeInstituicaoVazio', () => {
  it('nunca inventa uma identidade — devolve vazio para qualquer requisição', () => {
    const provedor = new ProvedorDeContextoDeInstituicaoVazio();

    expect(provedor.identidadeAtual({} as ExecutionContext)).toStrictEqual({});
  });

  it('não guarda estado entre chamadas', () => {
    const provedor = new ProvedorDeContextoDeInstituicaoVazio();

    provedor.identidadeAtual({} as ExecutionContext);
    const segundaChamada = provedor.identidadeAtual({} as ExecutionContext);

    expect(segundaChamada).toStrictEqual({});
  });
});
