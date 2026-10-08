import { PERMISSOES } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import { GRUPOS_DE_SISTEMA } from '../../src/modules/identidade/domain/grupo/grupos-de-sistema.js';
import { MATRIZ_DO_DOC_3_SECAO_6, PERMISSOES_FORA_DO_CATALOGO, permissoesDaMatrizPara } from './matriz-do-doc-3-secao-6.js';

describe('T29(e) · matriz do Doc 3 §6 transcrita é o seed dos grupos de sistema', () => {
  it('cobre exatamente o catálogo, menos as permissões que perderam o caso de uso', () => {
    const daMatriz = MATRIZ_DO_DOC_3_SECAO_6.map(({ permissao }) => permissao)
      .filter((permissao) => !PERMISSOES_FORA_DO_CATALOGO.includes(permissao))
      .toSorted();

    expect(daMatriz).toEqual([...PERMISSOES].toSorted());
  });

  it.each(GRUPOS_DE_SISTEMA.map((grupo) => [grupo.codigoSistema] as const))(
    '%s concede exatamente o que a coluna da matriz concede',
    (codigo) => {
      const seed = GRUPOS_DE_SISTEMA.find((grupo) => grupo.codigoSistema === codigo)!;

      expect([...seed.permissoes].toSorted()).toEqual(permissoesDaMatrizPara(codigo));
    },
  );
});
