import { describe, expect, it } from 'vitest';
import { ContextoDaRequisicao } from './contexto-da-requisicao.js';

describe('ContextoDaRequisicao', () => {
  it('não tem valor fora de executar()', () => {
    expect(ContextoDaRequisicao.atual()).toBeUndefined();
  });

  it('expõe o valor definido dentro de executar()', () => {
    const valor = { correlacaoId: 'corr-1', instituicaoId: 'inst-a', usuarioId: 'user-1' };

    const observado = ContextoDaRequisicao.executar(valor, () => ContextoDaRequisicao.atual());

    expect(observado).toStrictEqual(valor);
  });

  it('volta a não ter valor depois que executar() termina', () => {
    ContextoDaRequisicao.executar({ correlacaoId: 'corr-2' }, () => undefined);

    expect(ContextoDaRequisicao.atual()).toBeUndefined();
  });

  it('propaga através de continuações assíncronas', async () => {
    const valor = { correlacaoId: 'corr-3', instituicaoId: 'inst-b' };

    const observado = await ContextoDaRequisicao.executar(valor, async () => {
      await Promise.resolve();
      return ContextoDaRequisicao.atual();
    });

    expect(observado).toStrictEqual(valor);
  });

  it('isola execuções concorrentes uma da outra', async () => {
    const resultados = await Promise.all([
      ContextoDaRequisicao.executar({ correlacaoId: 'a', instituicaoId: 'inst-a' }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return ContextoDaRequisicao.atual()?.instituicaoId;
      }),
      ContextoDaRequisicao.executar({ correlacaoId: 'b', instituicaoId: 'inst-b' }, async () => {
        return ContextoDaRequisicao.atual()?.instituicaoId;
      }),
    ]);

    expect(resultados).toStrictEqual(['inst-a', 'inst-b']);
  });
});
