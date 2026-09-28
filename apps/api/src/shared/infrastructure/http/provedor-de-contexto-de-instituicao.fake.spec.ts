import { describe, expect, it } from 'vitest';
import { ProvedorDeContextoDeInstituicaoFake } from './provedor-de-contexto-de-instituicao.fake.js';

describe('ProvedorDeContextoDeInstituicaoFake', () => {
  it('começa sem identidade nenhuma', () => {
    const provedor = new ProvedorDeContextoDeInstituicaoFake();

    expect(provedor.identidadeAtual()).toStrictEqual({});
  });

  it('devolve a identidade definida', () => {
    const provedor = new ProvedorDeContextoDeInstituicaoFake();

    provedor.definir({ instituicaoId: 'inst-a', usuarioId: 'user-1' });

    expect(provedor.identidadeAtual()).toStrictEqual({ instituicaoId: 'inst-a', usuarioId: 'user-1' });
  });

  it('limpar() volta a não ter identidade nenhuma', () => {
    const provedor = new ProvedorDeContextoDeInstituicaoFake();
    provedor.definir({ instituicaoId: 'inst-a' });

    provedor.limpar();

    expect(provedor.identidadeAtual()).toStrictEqual({});
  });
});
