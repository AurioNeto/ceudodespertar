import { describe, expect, it } from 'vitest';
import { CriarUnidade } from '../../../src/modules/financeiro/application/cadastros/criar-unidade.js';
import { EditarUnidade } from '../../../src/modules/financeiro/application/cadastros/editar-unidade.js';
import { ehErr, ehOk } from '../../../src/shared/kernel/result.js';
import { UnidadeDeTrabalhoFalsa } from '../../identidade/gestao-de-usuarios/dubles.js';
import { RepositorioDeUnidadeEmMemoria, UNIDADE_COMERCIAL, UNIDADE_CONTRIBUICAO, unidadeEm, VERSAO_DO_CADASTRO } from './dubles.js';

function montar(existentes = [unidadeEm()]) {
  const repositorio = new RepositorioDeUnidadeEmMemoria(existentes);
  const unidade = new UnidadeDeTrabalhoFalsa();
  return { repositorio, unidade, criar: new CriarUnidade(unidade, repositorio), editar: new EditarUnidade(unidade, repositorio) };
}

const edicao = (sobrescritas = {}) => ({
  unidadeId: UNIDADE_CONTRIBUICAO,
  versaoEsperada: VERSAO_DO_CADASTRO,
  nome: 'CDD Casa',
  regime: 'CONTRIBUICAO' as const,
  tetoAnual: null,
  ativa: true,
  ...sobrescritas,
});

describe('CriarUnidade', () => {
  it('gera o id, adiciona em transação de escrita e devolve a unidade na versão 1', async () => {
    const { repositorio, unidade, criar } = montar([]);

    const resultado = await criar.executar({ codigoSistema: 'OFICINA', nome: 'Oficina', regime: 'CONTRIBUICAO', tetoAnual: null });

    expect(ehOk(resultado) && resultado.valor).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      codigoSistema: 'OFICINA',
      nome: 'Oficina',
      regime: 'CONTRIBUICAO',
      tetoAnual: null,
      ativa: true,
      versao: 1,
    });
    expect(repositorio.adicionados).toHaveLength(1);
    expect(unidade.modos).toEqual(['escrita']);
  });

  it('teto em unidade de contribuição devolve erro de forma e não adiciona', async () => {
    const { repositorio, criar } = montar([]);

    const resultado = await criar.executar({ codigoSistema: 'OFICINA', nome: 'Oficina', regime: 'CONTRIBUICAO', tetoAnual: 100 as never });

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('CORPO_INVALIDO');
    expect(repositorio.adicionados).toEqual([]);
  });
});

describe('EditarUnidade', () => {
  it('altera, salva e devolve a unidade com a versão nova', async () => {
    const { repositorio, editar } = montar();

    const resultado = await editar.executar(edicao());

    expect(ehOk(resultado) && resultado.valor).toEqual({
      id: UNIDADE_CONTRIBUICAO,
      codigoSistema: 'CDD',
      nome: 'CDD Casa',
      regime: 'CONTRIBUICAO',
      tetoAnual: null,
      ativa: true,
      versao: VERSAO_DO_CADASTRO + 1,
    });
    expect(repositorio.salvos).toHaveLength(1);
  });

  it('devolve RECURSO_NAO_ENCONTRADO para unidade desconhecida', async () => {
    const { editar } = montar([]);

    const resultado = await editar.executar(edicao({ unidadeId: UNIDADE_COMERCIAL }));

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('RECURSO_NAO_ENCONTRADO');
  });

  it('devolve VERSAO_DESATUALIZADA sem alterar nem salvar quando a versão diverge', async () => {
    const existente = unidadeEm();
    const { repositorio, editar } = montar([existente]);

    const resultado = await editar.executar(edicao({ versaoEsperada: VERSAO_DO_CADASTRO + 1 }));

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('VERSAO_DESATUALIZADA');
    expect(existente.nome).toBe('CDD');
    expect(repositorio.salvos).toEqual([]);
  });

  it('teto em unidade de contribuição devolve erro de forma e não salva', async () => {
    const { repositorio, editar } = montar();

    const resultado = await editar.executar(edicao({ tetoAnual: 100 }));

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('CORPO_INVALIDO');
    expect(repositorio.salvos).toEqual([]);
  });
});
