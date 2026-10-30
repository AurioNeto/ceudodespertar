import type { ContaId, FundoId } from '@cdd/contracts';
import { dinheiro } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import { ehErr, ehOk } from '../../../../shared/kernel/result.js';
import type { DadosParaCriarFundo } from './fundo.js';
import { Fundo } from './fundo.js';

const dados: DadosParaCriarFundo = {
  id: 'fundo-1' as FundoId,
  codigoSistema: 'CAIXINHA_AYAHUASCA',
  nome: 'Caixinha da Ayahuasca',
  nota: '',
  contaVinculadaId: 'conta-1' as ContaId,
  meta: dinheiro(500_000),
  categoriasPermitidas: ['INSUMOS', 'TRANSPORTE'],
};

const alteracao = {
  nome: dados.nome,
  contaVinculadaId: dados.contaVinculadaId,
  nota: dados.nota,
  meta: dados.meta,
  categoriasPermitidas: dados.categoriasPermitidas,
  ativo: true,
};

function criado(sobrescrita: Partial<DadosParaCriarFundo> = {}): Fundo {
  const resultado = Fundo.criar({ ...dados, ...sobrescrita });
  if (!ehOk(resultado)) throw new Error('fixture inválida');
  return resultado.valor;
}

describe('Fundo.criar', () => {
  it('nasce ativo, na versão 1, com os dados informados', () => {
    expect(criado()).toMatchObject({
      id: 'fundo-1',
      codigoSistema: 'CAIXINHA_AYAHUASCA',
      contaVinculadaId: 'conta-1',
      meta: 500_000,
      categoriasPermitidas: ['INSUMOS', 'TRANSPORTE'],
      ativo: true,
      versao: 1,
    });
  });

  it('o fundo pode nascer sem meta', () => {
    expect(criado({ meta: null }).meta).toBeNull();
  });

  it('meta positiva · a meta zero é recusada', () => {
    const resultado = Fundo.criar({ ...dados, meta: dinheiro(0) });

    expect(ehErr(resultado) && resultado.erro).toMatchObject({
      codigo: 'CORPO_INVALIDO',
      detalhes: { problemas: [{ caminho: 'meta', regra: 'meta_positiva' }] },
    });
  });

  it('categorias permitidas sem repetição · o código repetido é recusado', () => {
    const resultado = Fundo.criar({ ...dados, categoriasPermitidas: ['INSUMOS', 'INSUMOS'] });

    expect(ehErr(resultado) && resultado.erro).toMatchObject({
      codigo: 'CORPO_INVALIDO',
      detalhes: { problemas: [{ caminho: 'categoriasPermitidas', regra: 'sem_duplicados' }] },
    });
  });
});

describe('Fundo.alterar', () => {
  it('troca nome, nota, meta, categorias e situação', () => {
    const fundo = criado();

    const resultado = fundo.alterar({ ...alteracao, nome: 'Reserva', nota: 'Para a obra', meta: null, categoriasPermitidas: ['OBRA'], ativo: false });

    expect(ehOk(resultado)).toBe(true);
    expect(fundo).toMatchObject({ nome: 'Reserva', nota: 'Para a obra', meta: null, categoriasPermitidas: ['OBRA'], ativo: false });
  });

  it('a conta vinculada pode mudar, como na nota do Doc 2 §1.9 (decisão do dono); o código de sistema não', () => {
    const fundo = criado();

    fundo.alterar({ ...alteracao, contaVinculadaId: 'conta-2' as ContaId });

    expect(fundo).toMatchObject({ codigoSistema: 'CAIXINHA_AYAHUASCA', contaVinculadaId: 'conta-2' });
  });

  it('guarda uma cópia das categorias: mexer depois na lista de quem chamou não muda o fundo', () => {
    const categorias = ['OBRA'];
    const fundo = criado({ categoriasPermitidas: categorias });
    categorias.push('OBRA');
    const lista = ['INSUMOS'];
    fundo.alterar({ ...alteracao, categoriasPermitidas: lista });
    lista.push('INSUMOS');

    expect(fundo.categoriasPermitidas).toEqual(['INSUMOS']);
  });

  it('meta positiva · a meta negativa é recusada e nada muda', () => {
    const fundo = criado();

    const resultado = fundo.alterar({ ...alteracao, nome: 'Outro', meta: dinheiro(-1) });

    expect(ehErr(resultado) && resultado.erro.detalhes).toMatchObject({ problemas: [{ caminho: 'meta', regra: 'meta_positiva' }] });
    expect(fundo.nome).toBe(dados.nome);
  });

  it('categorias permitidas sem repetição · o código repetido é recusado e nada muda', () => {
    const fundo = criado();

    const resultado = fundo.alterar({ ...alteracao, categoriasPermitidas: ['OBRA', 'OBRA'] });

    expect(ehErr(resultado) && resultado.erro.detalhes).toMatchObject({
      problemas: [{ caminho: 'categoriasPermitidas', regra: 'sem_duplicados' }],
    });
    expect(fundo.categoriasPermitidas).toEqual(['INSUMOS', 'TRANSPORTE']);
  });
});

describe('Fundo.conferirSaidaParaCategoria', () => {
  it('FD1 · a categoria da lista é aceita', () => {
    expect(ehOk(criado().conferirSaidaParaCategoria('INSUMOS'))).toBe(true);
  });

  it('FD1 · a categoria fora da lista é recusada com CATEGORIA_FORA_DO_FUNDO', () => {
    const resultado = criado().conferirSaidaParaCategoria('LAZER');

    expect(ehErr(resultado) && resultado.erro).toMatchObject({
      codigo: 'CATEGORIA_FORA_DO_FUNDO',
      detalhes: { codigoSistema: 'CAIXINHA_AYAHUASCA', categoria: 'LAZER' },
    });
  });

  it('FD1 · o fundo sem categorias permitidas não aceita saída alguma', () => {
    expect(ehErr(criado({ categoriasPermitidas: [] }).conferirSaidaParaCategoria('INSUMOS'))).toBe(true);
  });
});
