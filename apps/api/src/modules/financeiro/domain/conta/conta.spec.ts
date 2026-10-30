import type { ContaId, PessoaId, UnidadeId } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import { ehErr, ehOk } from '../../../../shared/kernel/result.js';
import type { DadosParaCriarConta } from './conta.js';
import { Conta } from './conta.js';

const PAULA = 'pessoa-1' as PessoaId;

const institucional: DadosParaCriarConta = {
  id: 'conta-1' as ContaId,
  nome: 'CC Itaú',
  descricao: '',
  tipo: 'CONTA_CORRENTE',
  titularidade: 'INSTITUCIONAL',
  pessoaTitularId: null,
  identificadorBancario: '341/1234/56789-0',
  unidadeId: null,
};

const pessoal: DadosParaCriarConta = { ...institucional, titularidade: 'PESSOAL_DE_TERCEIRO', pessoaTitularId: PAULA };

const alteracao = {
  nome: institucional.nome,
  descricao: institucional.descricao,
  identificadorBancario: institucional.identificadorBancario,
  unidadeId: null,
  ativa: true,
};

function criada(dados: DadosParaCriarConta = institucional): Conta {
  const resultado = Conta.criar(dados);
  if (!ehOk(resultado)) throw new Error('fixture inválida');
  return resultado.valor;
}

describe('Conta.criar', () => {
  it('nasce ativa, na versão 1, com os dados informados', () => {
    const conta = criada();

    expect(conta).toMatchObject({
      id: 'conta-1',
      nome: 'CC Itaú',
      tipo: 'CONTA_CORRENTE',
      titularidade: 'INSTITUCIONAL',
      pessoaTitularId: null,
      identificadorBancario: '341/1234/56789-0',
      ativa: true,
      versao: 1,
    });
  });

  it('CT1 · a conta pessoal de terceiro guarda o titular', () => {
    expect(criada(pessoal).pessoaTitularId).toBe(PAULA);
  });

  it('CT1 · a conta pessoal de terceiro sem titular é recusada', () => {
    const resultado = Conta.criar({ ...pessoal, pessoaTitularId: null });

    expect(ehErr(resultado) && resultado.erro).toMatchObject({
      codigo: 'CORPO_INVALIDO',
      detalhes: { problemas: [{ caminho: 'pessoaTitularId', regra: 'titular_da_conta_pessoal' }] },
    });
  });

  it('CT1 · a conta institucional com titular é recusada', () => {
    const resultado = Conta.criar({ ...institucional, pessoaTitularId: PAULA });

    expect(ehErr(resultado) && resultado.erro).toMatchObject({
      codigo: 'CORPO_INVALIDO',
      detalhes: { problemas: [{ caminho: 'pessoaTitularId', regra: 'titular_da_conta_pessoal' }] },
    });
  });

  it('o identificador bancário é aparado ao nascer', () => {
    expect(criada({ ...institucional, identificadorBancario: '  341/1234  ' }).identificadorBancario).toBe('341/1234');
  });

  it.each(['341/1', '341 /1', '341/ 1', ' 341/1 ', '\u200B341/1', '341\t/1', '341\u00A0/1'])(
    'CT4 · forma canônica sem espaços nem invisíveis (decisão do dono): %j vira 341/1',
    (identificador) => {
      expect(criada({ ...institucional, identificadorBancario: identificador }).identificadorBancario).toBe('341/1');
    },
  );

  it('CT4 · forma canônica em maiúsculas: itau-1 e ITAU-1 são o mesmo identificador', () => {
    expect(criada({ ...institucional, identificadorBancario: 'itau-1' }).identificadorBancario).toBe('ITAU-1');
  });

  it('o identificador bancário em branco vira nulo', () => {
    expect(criada({ ...institucional, identificadorBancario: '   ' }).identificadorBancario).toBeNull();
  });
});

describe('Conta.alterar', () => {
  it('troca nome, descrição, identificador, unidade e situação', () => {
    const conta = criada();

    conta.alterar({
      nome: 'CC Itaú Munay',
      descricao: 'Recebe a bilheteria',
      identificadorBancario: '341/1234/00000-0',
      unidadeId: 'unidade-1' as UnidadeId,
      ativa: false,
    });

    expect(conta).toMatchObject({
      nome: 'CC Itaú Munay',
      descricao: 'Recebe a bilheteria',
      identificadorBancario: '341/1234/00000-0',
      unidadeId: 'unidade-1',
      ativa: false,
    });
  });

  it('o identificador bancário alterado é aparado e, em branco, vira nulo', () => {
    const conta = criada();

    conta.alterar({ ...alteracao, identificadorBancario: '  341/9  ' });
    expect(conta.identificadorBancario).toBe('341/9');

    conta.alterar({ ...alteracao, identificadorBancario: '  ' });
    expect(conta.identificadorBancario).toBeNull();
  });

  it('tipo e titularidade não mudam depois de criada', () => {
    const conta = criada(pessoal);

    conta.alterar(alteracao);

    expect(conta).toMatchObject({ tipo: 'CONTA_CORRENTE', titularidade: 'PESSOAL_DE_TERCEIRO', pessoaTitularId: PAULA });
  });
});
