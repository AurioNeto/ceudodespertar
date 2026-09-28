import { describe, expect, it } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { ProvedorDeContextoDeInstituicaoFake } from './provedor-de-contexto-de-instituicao.fake.js';

const CONTEXTO_DE_EXECUCAO_QUALQUER = {} as ExecutionContext;

describe('ProvedorDeContextoDeInstituicaoFake', () => {
  it('começa sem identidade nenhuma', () => {
    const provedor = new ProvedorDeContextoDeInstituicaoFake();

    expect(provedor.identidadeAtual(CONTEXTO_DE_EXECUCAO_QUALQUER)).toStrictEqual({});
  });

  it('devolve a identidade definida', () => {
    const provedor = new ProvedorDeContextoDeInstituicaoFake();

    provedor.definir({ instituicaoId: 'inst-a', usuarioId: 'user-1' });

    expect(provedor.identidadeAtual(CONTEXTO_DE_EXECUCAO_QUALQUER)).toStrictEqual({
      instituicaoId: 'inst-a',
      usuarioId: 'user-1',
    });
  });

  it('limpar() volta a não ter identidade nenhuma', () => {
    const provedor = new ProvedorDeContextoDeInstituicaoFake();
    provedor.definir({ instituicaoId: 'inst-a' });

    provedor.limpar();

    expect(provedor.identidadeAtual(CONTEXTO_DE_EXECUCAO_QUALQUER)).toStrictEqual({});
  });
});
