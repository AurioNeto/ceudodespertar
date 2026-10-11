import { describe, expect, it } from 'vitest';
import { dataLocal, reais } from '@cdd/contracts';
import type { Conta, ContaId } from '@cdd/contracts';
import { ehCaixa, iconeDaConta, textoDaConciliacao, tomDaConciliacao } from './conta';

const base: Conta = {
  id: 'cora' as ContaId,
  nome: 'Cora PJ',
  descricao: 'conta principal da casa',
  tipo: 'CONTA_CORRENTE',
  titularidade: 'INSTITUCIONAL',
  pessoaTitularId: null,
  responsavel: 'Aurio Neto',
  saldo: reais(100),
  ultimoMovimento: dataLocal('2026-09-02'),
  conciliacao: 'CONCILIADA',
  alerta: null,
  ativa: true,
};

const conta = (sobrescritas: Partial<Conta>): Conta => ({ ...base, ...sobrescritas });

describe('ehCaixa', () => {
  it('só a conta de dinheiro é caixa', () => {
    expect(ehCaixa(conta({ tipo: 'DINHEIRO' }))).toBe(true);
    expect(ehCaixa(conta({ tipo: 'CONTA_CORRENTE' }))).toBe(false);
  });
});

describe('iconeDaConta', () => {
  it('caixa é carteira, mesmo pessoal de terceiro', () => {
    expect(iconeDaConta(conta({ tipo: 'DINHEIRO', titularidade: 'PESSOAL_DE_TERCEIRO' }))).toBe('wallet');
  });

  it('banco pessoal de terceiro é cartão; banco institucional é banco', () => {
    expect(iconeDaConta(conta({ titularidade: 'PESSOAL_DE_TERCEIRO' }))).toBe('credit-card');
    expect(iconeDaConta(conta({ titularidade: 'INSTITUCIONAL' }))).toBe('landmark');
  });
});

describe('textoDaConciliacao', () => {
  it('conciliada diz Conciliada ontem, mesmo sem movimento', () => {
    expect(textoDaConciliacao(conta({ ultimoMovimento: null }))).toBe('Conciliada ontem');
  });

  it('sem movimento e sem conciliar é Nova conta', () => {
    expect(textoDaConciliacao(conta({ conciliacao: 'PENDENTE', ultimoMovimento: null }))).toBe('Nova conta');
  });

  it('pendente com movimento — caixa pede contagem, banco pede conferência', () => {
    expect(textoDaConciliacao(conta({ conciliacao: 'PENDENTE', tipo: 'DINHEIRO' }))).toBe('Contagem pendente');
    expect(textoDaConciliacao(conta({ conciliacao: 'PENDENTE' }))).toBe('A conferir');
  });
});

describe('tomDaConciliacao', () => {
  it('só a conciliada é confirmada; o resto é pendente', () => {
    expect(tomDaConciliacao(conta({ conciliacao: 'CONCILIADA' }))).toBe('confirmed');
    expect(tomDaConciliacao(conta({ conciliacao: 'PENDENTE' }))).toBe('pending');
    expect(tomDaConciliacao(conta({ conciliacao: 'NAO_APLICAVEL' }))).toBe('pending');
  });
});
