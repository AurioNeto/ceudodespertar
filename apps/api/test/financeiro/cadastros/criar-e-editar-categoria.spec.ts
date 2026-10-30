import { describe, expect, it } from 'vitest';
import { CriarCategoria } from '../../../src/modules/financeiro/application/cadastros/criar-categoria.js';
import { EditarCategoria } from '../../../src/modules/financeiro/application/cadastros/editar-categoria.js';
import { ehErr, ehOk } from '../../../src/shared/kernel/result.js';
import { UnidadeDeTrabalhoFalsa } from '../../identidade/gestao-de-usuarios/dubles.js';
import {
  CATEGORIA,
  categoriaEm,
  RepositorioDeCategoriaEmMemoria,
  RepositorioDeUnidadeEmMemoria,
  UNIDADE_COMERCIAL,
  UNIDADE_CONTRIBUICAO,
  unidadeEm,
  VERSAO_DO_CADASTRO,
} from './dubles.js';

const UNIDADE_INATIVA = '0198a3c0-0000-7000-8000-0000000000aa';

function unidadeInativa() {
  const unidade = unidadeEm({ id: UNIDADE_INATIVA as never, codigoSistema: 'PESSOAL', nome: 'Pessoal' });
  unidade.alterar({ nome: 'Pessoal', regime: 'CONTRIBUICAO', tetoAnual: null, ativa: false });
  return unidade;
}

function montar(existentes = [categoriaEm()]) {
  const categorias = new RepositorioDeCategoriaEmMemoria(existentes);
  const unidades = new RepositorioDeUnidadeEmMemoria([
    unidadeEm(),
    unidadeEm({ id: UNIDADE_COMERCIAL, codigoSistema: 'LOJINHA', nome: 'Lojinha', regime: 'COMERCIAL' }),
    unidadeInativa(),
  ]);
  const unidade = new UnidadeDeTrabalhoFalsa();
  return {
    categorias,
    unidade,
    criar: new CriarCategoria(unidade, categorias, unidades),
    editar: new EditarCategoria(unidade, categorias, unidades),
  };
}

const criacao = (sobrescritas = {}) => ({
  codigoSistema: 'ALUGUEL',
  nome: 'Aluguel de espaço',
  natureza: 'RECEITA' as const,
  tipo: 'OPERACIONAL' as const,
  regimesPermitidos: ['CONTRIBUICAO' as const],
  unidadePadraoId: null,
  linhaRelatorio: 'Receita de aluguel',
  ...sobrescritas,
});

const edicao = (sobrescritas = {}) => ({
  categoriaId: CATEGORIA,
  versaoEsperada: VERSAO_DO_CADASTRO,
  nome: 'Hospedagem e estadia',
  regimesPermitidos: ['CONTRIBUICAO' as const, 'COMERCIAL' as const],
  unidadePadraoId: null,
  linhaRelatorio: 'Receita de hospedagem',
  ativa: true,
  ...sobrescritas,
});

describe('CriarCategoria', () => {
  it('gera o id, adiciona em transação de escrita e devolve a categoria na versão 1', async () => {
    const { categorias, unidade, criar } = montar([]);

    const resultado = await criar.executar(criacao({ unidadePadraoId: UNIDADE_CONTRIBUICAO }));

    expect(ehOk(resultado) && resultado.valor).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      codigoSistema: 'ALUGUEL',
      nome: 'Aluguel de espaço',
      natureza: 'RECEITA',
      tipo: 'OPERACIONAL',
      regimesPermitidos: ['CONTRIBUICAO'],
      unidadePadraoId: UNIDADE_CONTRIBUICAO,
      linhaRelatorio: 'Receita de aluguel',
      ativa: true,
      versao: 1,
    });
    expect(categorias.adicionados).toHaveLength(1);
    expect(unidade.modos).toEqual(['escrita']);
  });

  it('aceita categoria sem unidade padrão', async () => {
    const { criar } = montar([]);

    expect(ehOk(await criar.executar(criacao()))).toBe(true);
  });

  it('unidade padrão de regime fora dos permitidos devolve CATEGORIA_FORA_DO_REGIME e não adiciona', async () => {
    const { categorias, criar } = montar([]);

    const resultado = await criar.executar(criacao({ unidadePadraoId: UNIDADE_COMERCIAL }));

    expect(ehErr(resultado) && resultado.erro).toEqual({
      codigo: 'CATEGORIA_FORA_DO_REGIME',
      detalhes: { codigoSistema: 'ALUGUEL', regime: 'COMERCIAL' },
    });
    expect(categorias.adicionados).toEqual([]);
  });

  it('unidade padrão inativa devolve CADASTRO_INATIVO e não adiciona (decisão do dono)', async () => {
    const { categorias, criar } = montar([]);

    const resultado = await criar.executar(criacao({ unidadePadraoId: UNIDADE_INATIVA }));

    expect(ehErr(resultado) && resultado.erro).toEqual({
      codigo: 'CADASTRO_INATIVO',
      detalhes: { unidadePadraoId: UNIDADE_INATIVA },
    });
    expect(categorias.adicionados).toEqual([]);
  });

  it('unidade padrão desconhecida devolve RECURSO_NAO_ENCONTRADO e não adiciona', async () => {
    const { categorias, criar } = montar([]);

    const resultado = await criar.executar(criacao({ unidadePadraoId: '0198a3c0-0000-7000-8000-0000000000ee' }));

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('RECURSO_NAO_ENCONTRADO');
    expect(categorias.adicionados).toEqual([]);
  });

  it('regimes vazios devolvem erro de forma e não adiciona', async () => {
    const { categorias, criar } = montar([]);

    const resultado = await criar.executar(criacao({ regimesPermitidos: [] }));

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('CORPO_INVALIDO');
    expect(categorias.adicionados).toEqual([]);
  });
});

describe('EditarCategoria', () => {
  it('altera, salva e devolve a categoria com a versão nova, mantendo natureza e tipo', async () => {
    const { categorias, editar } = montar();

    const resultado = await editar.executar(edicao({ unidadePadraoId: UNIDADE_COMERCIAL }));

    expect(ehOk(resultado) && resultado.valor).toMatchObject({
      id: CATEGORIA,
      nome: 'Hospedagem e estadia',
      natureza: 'RECEITA',
      tipo: 'OPERACIONAL',
      unidadePadraoId: UNIDADE_COMERCIAL,
      versao: VERSAO_DO_CADASTRO + 1,
    });
    expect(categorias.salvos).toHaveLength(1);
  });

  it('devolve RECURSO_NAO_ENCONTRADO para categoria desconhecida', async () => {
    const { editar } = montar([]);

    const resultado = await editar.executar(edicao());

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('RECURSO_NAO_ENCONTRADO');
  });

  it('devolve VERSAO_DESATUALIZADA sem alterar nem salvar quando a versão diverge', async () => {
    const existente = categoriaEm();
    const { categorias, editar } = montar([existente]);

    const resultado = await editar.executar(edicao({ versaoEsperada: VERSAO_DO_CADASTRO + 1 }));

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('VERSAO_DESATUALIZADA');
    expect(existente.nome).toBe('Hospedagem');
    expect(categorias.salvos).toEqual([]);
  });

  it('editar apontando unidade padrão inativa devolve CADASTRO_INATIVO e não salva', async () => {
    const { categorias, editar } = montar();

    const resultado = await editar.executar(edicao({ unidadePadraoId: UNIDADE_INATIVA }));

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('CADASTRO_INATIVO');
    expect(categorias.salvos).toEqual([]);
  });

  it('categoria que já apontava a unidade depois inativada continua editável, inclusive para se inativar', async () => {
    const { categorias, editar } = montar([categoriaEm({ unidadePadraoId: UNIDADE_INATIVA as never })]);

    const resultado = await editar.executar(edicao({ unidadePadraoId: UNIDADE_INATIVA, ativa: false }));

    expect(ehOk(resultado) && resultado.valor).toMatchObject({ unidadePadraoId: UNIDADE_INATIVA, ativa: false });
    expect(categorias.salvos).toHaveLength(1);
  });

  it('regimes novos que excluem o da unidade padrão devolvem CATEGORIA_FORA_DO_REGIME e não salvam', async () => {
    const { categorias, editar } = montar([categoriaEm({ unidadePadraoId: UNIDADE_COMERCIAL })]);

    const resultado = await editar.executar(edicao({ regimesPermitidos: ['CONTRIBUICAO'], unidadePadraoId: UNIDADE_COMERCIAL }));

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('CATEGORIA_FORA_DO_REGIME');
    expect(categorias.salvos).toEqual([]);
  });

  it('unidade padrão desconhecida devolve RECURSO_NAO_ENCONTRADO e não salva', async () => {
    const { categorias, editar } = montar();

    const resultado = await editar.executar(edicao({ unidadePadraoId: '0198a3c0-0000-7000-8000-0000000000ee' }));

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('RECURSO_NAO_ENCONTRADO');
    expect(categorias.salvos).toEqual([]);
  });
});
