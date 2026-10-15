import type { GrupoDeCustoId } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import { GrupoDeCusto } from './grupo-de-custo.js';

const dados = { id: 'grupo-1' as GrupoDeCustoId, codigoSistema: 'COZINHA', nome: 'Cozinha' };

describe('GrupoDeCusto', () => {
  it('nasce ativo, na versão 1', () => {
    const grupo = GrupoDeCusto.criar(dados);

    expect(grupo).toMatchObject({ codigoSistema: 'COZINHA', nome: 'Cozinha', ativo: true, versao: 1 });
  });

  it('o código de sistema é imutável ao alterar', () => {
    const grupo = GrupoDeCusto.criar(dados);

    grupo.alterar({ nome: 'Cozinha central', ativo: false });

    expect(grupo).toMatchObject({ codigoSistema: 'COZINHA', nome: 'Cozinha central', ativo: false });
  });

  it('reconstituir devolve o estado gravado, com a versão do banco', () => {
    const grupo = GrupoDeCusto.reconstituir({ ...dados, ativo: false, versao: 4 });

    expect(grupo).toMatchObject({ ativo: false, versao: 4 });
  });
});
