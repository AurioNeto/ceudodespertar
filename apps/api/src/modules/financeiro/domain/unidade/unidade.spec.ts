import { dinheiro } from '@cdd/contracts';
import type { UnidadeId } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import { ehErr, ehOk } from '../../../../shared/kernel/result.js';
import type { DadosParaCriarUnidade } from './unidade.js';
import { Unidade } from './unidade.js';

const TETO_MEI = dinheiro(8_100_000);

const contribuicao: DadosParaCriarUnidade = {
  id: 'unidade-1' as UnidadeId,
  codigoSistema: 'CDD',
  nome: 'CDD',
  regime: 'CONTRIBUICAO',
  tetoAnual: null,
};

const comercial: DadosParaCriarUnidade = { ...contribuicao, codigoSistema: 'MUNAY', nome: 'Munay', regime: 'COMERCIAL', tetoAnual: TETO_MEI };

function criada(dados: DadosParaCriarUnidade): Unidade {
  const resultado = Unidade.criar(dados);
  if (!ehOk(resultado)) throw new Error('fixture inválida');
  return resultado.valor;
}

describe('Unidade.criar', () => {
  it('nasce ativa, na versão 1', () => {
    const unidade = criada(contribuicao);

    expect(unidade.ativa).toBe(true);
    expect(unidade.versao).toBe(1);
  });

  it('a comercial guarda o teto anual', () => {
    expect(criada(comercial).tetoAnual).toBe(TETO_MEI);
  });

  it('a comercial pode nascer sem teto', () => {
    expect(criada({ ...comercial, tetoAnual: null }).tetoAnual).toBeNull();
  });

  it('teto só na comercial · a de contribuição com teto é recusada', () => {
    const resultado = Unidade.criar({ ...contribuicao, tetoAnual: TETO_MEI });

    expect(ehErr(resultado) && resultado.erro).toMatchObject({
      codigo: 'CORPO_INVALIDO',
      detalhes: { problemas: [{ caminho: 'tetoAnual', regra: 'teto_so_na_comercial' }] },
    });
  });
});

describe('Unidade.alterar', () => {
  it('U1 · o código de sistema não muda ao alterar', () => {
    const unidade = criada(comercial);

    unidade.alterar({ nome: 'Munay Música', regime: 'COMERCIAL', tetoAnual: TETO_MEI, ativa: true });

    expect(unidade.codigoSistema).toBe('MUNAY');
    expect(unidade.nome).toBe('Munay Música');
  });

  it('inativar e reativar muda só a situação; a recusa de lançamento em unidade inativa (U4) chega com o lançamento', () => {
    const unidade = criada(contribuicao);

    unidade.alterar({ nome: 'CDD', regime: 'CONTRIBUICAO', tetoAnual: null, ativa: false });
    expect(unidade.ativa).toBe(false);

    unidade.alterar({ nome: 'CDD', regime: 'CONTRIBUICAO', tetoAnual: null, ativa: true });
    expect(unidade.ativa).toBe(true);
  });

  it('teto só na comercial · trocar para contribuição mantendo o teto é recusado e nada muda', () => {
    const unidade = criada(comercial);

    const resultado = unidade.alterar({ nome: 'Munay', regime: 'CONTRIBUICAO', tetoAnual: TETO_MEI, ativa: true });

    expect(ehErr(resultado) && resultado.erro.codigo).toBe('CORPO_INVALIDO');
    expect(unidade.regime).toBe('COMERCIAL');
    expect(unidade.tetoAnual).toBe(TETO_MEI);
  });

  it('teto só na comercial · trocar para contribuição zerando o teto é aceito', () => {
    const unidade = criada(comercial);

    const resultado = unidade.alterar({ nome: 'Munay', regime: 'CONTRIBUICAO', tetoAnual: null, ativa: true });

    expect(ehOk(resultado)).toBe(true);
    expect(unidade.regime).toBe('CONTRIBUICAO');
    expect(unidade.tetoAnual).toBeNull();
  });
});

describe('Unidade.reconstituir', () => {
  it('devolve o estado gravado, com a versão do banco', () => {
    const unidade = Unidade.reconstituir({ ...comercial, ativa: false, versao: 7 });

    expect(unidade).toMatchObject({ codigoSistema: 'MUNAY', ativa: false, versao: 7 });
  });
});
