import type { CategoriaId, UnidadeId } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import { ehErr, ehOk } from '../../../../shared/kernel/result.js';
import type { Result } from '../../../../shared/kernel/result.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import type { AlteracaoDaCategoria, DadosParaCriarCategoria } from './categoria.js';
import { Categoria } from './categoria.js';

const dados: DadosParaCriarCategoria = {
  id: 'categoria-1' as CategoriaId,
  codigoSistema: 'CACHE_PAGO',
  nome: 'Cachê a músico',
  natureza: 'DESPESA',
  tipo: 'OPERACIONAL',
  regimesPermitidos: ['COMERCIAL'],
  unidadePadraoId: null,
  linhaRelatorio: 'Custo da Munay',
};

const alteracao: AlteracaoDaCategoria = {
  nome: dados.nome,
  regimesPermitidos: dados.regimesPermitidos,
  unidadePadraoId: null,
  linhaRelatorio: dados.linhaRelatorio,
  ativa: true,
};

function criada(sobrescrita: Partial<DadosParaCriarCategoria> = {}): Categoria {
  const resultado = Categoria.criar({ ...dados, ...sobrescrita });
  if (!ehOk(resultado)) throw new Error('fixture inválida');
  return resultado.valor;
}

function regraRecusada(resultado: Result<unknown, ErroDeDominio>): unknown {
  return ehErr(resultado) ? resultado.erro.detalhes : undefined;
}

describe('Categoria.criar', () => {
  it('nasce ativa, na versão 1, com os dados informados', () => {
    const categoria = criada();

    expect(categoria).toMatchObject({
      codigoSistema: 'CACHE_PAGO',
      natureza: 'DESPESA',
      regimesPermitidos: ['COMERCIAL'],
      linhaRelatorio: 'Custo da Munay',
      ativa: true,
      versao: 1,
    });
  });

  it('C1 · categoria sem linha de relatório é recusada', () => {
    const resultado = Categoria.criar({ ...dados, linhaRelatorio: '   ' });

    expect(regraRecusada(resultado)).toEqual({
      problemas: [{ caminho: 'linhaRelatorio', regra: 'linha_relatorio_obrigatoria' }],
      total: 1,
    });
  });

  it('regimes permitidos · lista vazia é recusada', () => {
    const resultado = Categoria.criar({ ...dados, regimesPermitidos: [] });

    expect(regraRecusada(resultado)).toMatchObject({ problemas: [{ regra: 'regimes_obrigatorios' }] });
  });

  it('regimes permitidos · repetição é recusada', () => {
    const resultado = Categoria.criar({ ...dados, regimesPermitidos: ['COMERCIAL', 'COMERCIAL'] });

    expect(regraRecusada(resultado)).toMatchObject({ problemas: [{ regra: 'sem_duplicados' }] });
  });
});

describe('Categoria.alterar', () => {
  it('C1 · ativa sem linha de relatório é recusada e nada muda', () => {
    const categoria = criada();

    const resultado = categoria.alterar({ ...alteracao, nome: 'Outro nome', linhaRelatorio: '' });

    expect(regraRecusada(resultado)).toMatchObject({ problemas: [{ regra: 'linha_relatorio_obrigatoria' }] });
    expect(categoria.nome).toBe('Cachê a músico');
    expect(categoria.linhaRelatorio).toBe('Custo da Munay');
  });

  it('C1 · inativar sem linha de relatório é aceito', () => {
    const categoria = criada();

    const resultado = categoria.alterar({ ...alteracao, linhaRelatorio: '', ativa: false });

    expect(ehOk(resultado)).toBe(true);
    expect(categoria.ativa).toBe(false);
  });

  it('C1 · reativar sem linha de relatório é recusado', () => {
    const categoria = Categoria.reconstituir({ ...dados, linhaRelatorio: '', ativa: false, versao: 3 });

    const resultado = categoria.alterar({ ...alteracao, linhaRelatorio: '', ativa: true });

    expect(ehErr(resultado)).toBe(true);
    expect(categoria.ativa).toBe(false);
  });

  it('C2 · a natureza, o tipo e o código de sistema não mudam ao alterar', () => {
    const categoria = criada();

    categoria.alterar({ ...alteracao, nome: 'Cachê pago', regimesPermitidos: ['CONTRIBUICAO'] });

    expect(categoria).toMatchObject({
      natureza: 'DESPESA',
      codigoSistema: 'CACHE_PAGO',
      nome: 'Cachê pago',
      tipo: 'OPERACIONAL',
      regimesPermitidos: ['CONTRIBUICAO'],
    });
  });

  it('guarda a unidade padrão informada', () => {
    const categoria = criada();

    categoria.alterar({ ...alteracao, unidadePadraoId: 'unidade-1' as UnidadeId });

    expect(categoria.unidadePadraoId).toBe('unidade-1');
  });

  it('regimes permitidos · lista vazia e repetição são recusadas', () => {
    const categoria = criada();

    expect(ehErr(categoria.alterar({ ...alteracao, regimesPermitidos: [] }))).toBe(true);
    expect(ehErr(categoria.alterar({ ...alteracao, regimesPermitidos: ['COMERCIAL', 'COMERCIAL'] }))).toBe(true);
    expect(categoria.regimesPermitidos).toEqual(['COMERCIAL']);
  });
});

describe('Categoria.conferirUsoNoRegime', () => {
  it('C3 · regime permitido é aceito', () => {
    expect(ehOk(criada().conferirUsoNoRegime('COMERCIAL'))).toBe(true);
  });

  it('C3 · regime fora dos permitidos devolve CATEGORIA_FORA_DO_REGIME', () => {
    const resultado = criada().conferirUsoNoRegime('CONTRIBUICAO');

    expect(ehErr(resultado) && resultado.erro).toEqual({
      codigo: 'CATEGORIA_FORA_DO_REGIME',
      detalhes: { codigoSistema: 'CACHE_PAGO', regime: 'CONTRIBUICAO' },
    });
  });

  it('C3 · categoria de dois regimes serve aos dois', () => {
    const categoria = criada({ regimesPermitidos: ['CONTRIBUICAO', 'COMERCIAL'] });

    expect(ehOk(categoria.conferirUsoNoRegime('CONTRIBUICAO'))).toBe(true);
    expect(ehOk(categoria.conferirUsoNoRegime('COMERCIAL'))).toBe(true);
  });
});
