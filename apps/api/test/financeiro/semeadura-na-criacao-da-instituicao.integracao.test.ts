import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ehOk } from '../../src/shared/kernel/result.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { abrirAmbienteDaIdentidade, consultarNaInstituicao } from '../identidade/apoio.js';
import type { AmbienteDaIdentidade } from '../identidade/apoio.js';
import { COMANDO_POR_VINCULO, montarBootstrap } from '../identidade/bootstrap/apoio-de-bootstrap.js';
import { montarSemeadura } from '../identidade/seed-demo/apoio-da-semeadura.js';
import { ID_DA_INSTITUICAO_DE_DEMONSTRACAO } from '../../src/modules/identidade/application/seed-demo/conteudo-da-demonstracao.js';
import { abrirAmbienteDoFinanceiro } from './apoio.js';
import type { AmbienteDoFinanceiro } from './apoio.js';

describe('cadastros do financeiro no nascimento da instituição', () => {
  let banco: BancoDeTeste;
  let identidade: AmbienteDaIdentidade;
  let financeiro: AmbienteDoFinanceiro;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    identidade = await abrirAmbienteDaIdentidade(banco);
    financeiro = await abrirAmbienteDoFinanceiro(banco);
  });

  afterEach(async () => {
    await identidade.orm.close(true);
    await financeiro.orm.close(true);
    await derrubarBancoDeTeste(banco);
  });

  function cadastrosDe(instituicaoId: string): Promise<object[]> {
    return consultarNaInstituicao(
      banco,
      instituicaoId,
      `select (select count(*) from financeiro.unidade)::int as unidades,
              (select count(*) from financeiro.grupo_de_custo)::int as grupos,
              (select count(*) from financeiro.categoria)::int as categorias`,
    );
  }

  it('o bootstrap semeia unidades, grupos de custo e categorias da instituição criada', async () => {
    const bootstrap = montarBootstrap(identidade, { semeadoresDaInstituicao: financeiro.semeadores });

    const resultado = await bootstrap.executar(COMANDO_POR_VINCULO);

    if (!ehOk(resultado)) throw new Error(resultado.erro.codigo);
    expect(await cadastrosDe(resultado.valor.instituicaoId)).toEqual([{ unidades: 6, grupos: 6, categorias: 14 }]);
  });

  it('o seed de demonstração semeia a instituição de demonstração, e repetir não duplica', async () => {
    const semeadura = montarSemeadura(identidade, { semeadoresDaInstituicao: financeiro.semeadores });

    const primeira = await semeadura.executar();
    const segunda = await semeadura.executar();

    expect(ehOk(primeira) && ehOk(segunda)).toBe(true);
    expect(await cadastrosDe(ID_DA_INSTITUICAO_DE_DEMONSTRACAO)).toEqual([{ unidades: 6, grupos: 6, categorias: 14 }]);
  });
});
