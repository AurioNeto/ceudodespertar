import { describe, expect, it } from 'vitest';
import { CriarGrupoDeCusto } from '../../../src/modules/financeiro/application/cadastros/criar-grupo-de-custo.js';
import { EditarGrupoDeCusto } from '../../../src/modules/financeiro/application/cadastros/editar-grupo-de-custo.js';
import { ehErr, ehOk } from '../../../src/shared/kernel/result.js';
import { UnidadeDeTrabalhoFalsa } from '../../identidade/gestao-de-usuarios/dubles.js';
import { GRUPO_DE_CUSTO, grupoDeCustoEm, RepositorioDeGrupoDeCustoEmMemoria, VERSAO_DO_CADASTRO } from './dubles.js';

function montar(existentes = [grupoDeCustoEm()]) {
  const repositorio = new RepositorioDeGrupoDeCustoEmMemoria(existentes);
  const unidade = new UnidadeDeTrabalhoFalsa();
  return { repositorio, unidade, criar: new CriarGrupoDeCusto(unidade, repositorio), editar: new EditarGrupoDeCusto(unidade, repositorio) };
}

const edicao = (sobrescritas = {}) => ({
  grupoDeCustoId: GRUPO_DE_CUSTO,
  versaoEsperada: VERSAO_DO_CADASTRO,
  nome: 'Cozinha central',
  ativo: false,
  ...sobrescritas,
});

describe('CriarGrupoDeCusto', () => {
  it('gera o id, adiciona em transação de escrita e devolve o grupo ativo na versão 1', async () => {
    const { repositorio, unidade, criar } = montar([]);

    const resultado = await criar.executar({ codigoSistema: 'OFICINA', nome: 'Oficina' });

    expect(ehOk(resultado) && resultado.valor).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      codigoSistema: 'OFICINA',
      nome: 'Oficina',
      ativo: true,
      versao: 1,
    });
    expect(repositorio.adicionados).toHaveLength(1);
    expect(unidade.modos).toEqual(['escrita']);
  });
});

describe('EditarGrupoDeCusto', () => {
  it('altera nome e situação, salva e devolve o grupo com a versão nova', async () => {
    const { repositorio, editar } = montar();

    const resultado = await editar.executar(edicao());

    expect(ehOk(resultado) && resultado.valor).toEqual({
      id: GRUPO_DE_CUSTO,
      codigoSistema: 'COZINHA',
      nome: 'Cozinha central',
      ativo: false,
      versao: VERSAO_DO_CADASTRO + 1,
    });
    expect(repositorio.salvos).toHaveLength(1);
  });

  it('devolve RECURSO_NAO_ENCONTRADO para grupo desconhecido', async () => {
    const { editar } = montar([]);

    const resultado = await editar.executar(edicao());

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('RECURSO_NAO_ENCONTRADO');
  });

  it('devolve VERSAO_DESATUALIZADA sem alterar nem salvar quando a versão diverge', async () => {
    const existente = grupoDeCustoEm();
    const { repositorio, editar } = montar([existente]);

    const resultado = await editar.executar(edicao({ versaoEsperada: VERSAO_DO_CADASTRO - 1 }));

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('VERSAO_DESATUALIZADA');
    expect(existente.nome).toBe('Cozinha');
    expect(repositorio.salvos).toEqual([]);
  });
});
