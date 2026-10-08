import { describe, expect, it } from 'vitest';
import type { Permissao } from '@cdd/contracts';
import type { NavEntry } from '../ds';
import { filtrarNavPorAcesso, podeVerTela } from './acesso';
import { construirNav } from './navegacao';
import { TELAS } from './telas';

const comAs = (...permissoes: Permissao[]) => (permissao: Permissao) => permissoes.includes(permissao);
const rotulos = (nav: readonly NavEntry[]) => nav.map((e) => ('section' in e ? `# ${e.section}` : e.label));

describe('podeVerTela', () => {
  it('lista vazia é tela livre', () => {
    expect(podeVerTela({ fonte: 'mock', acesso: [] }, comAs())).toBe(true);
  });

  it('basta uma das permissões da lista', () => {
    const registro = TELAS.relatorios;
    expect(podeVerTela(registro, comAs('financeiro.dre.ler'))).toBe(true);
    expect(podeVerTela(registro, comAs('financeiro.fluxo_caixa.ler'))).toBe(true);
    expect(podeVerTela(registro, comAs('financeiro.lancamento.ler'))).toBe(false);
  });
});

describe('filtrarNavPorAcesso', () => {
  const nav = construirNav(0);

  it('grupo REGISTRO vê só Painel, Registrar e Meus registros, sem seções vazias', () => {
    const pode = comAs(
      'financeiro.lancamento.registrar',
      'financeiro.lancamento.ler_proprios',
      'financeiro.plano_contas.ler',
      'estoque.movimento.registrar',
    );
    expect(rotulos(filtrarNavPorAcesso(nav, TELAS, pode))).toEqual([
      'Painel',
      'Registrar lançamento',
      'Meus registros',
    ]);
  });

  it('mantém a seção que ainda tem item e some só com a vazia', () => {
    const resultado = rotulos(filtrarNavPorAcesso(nav, TELAS, comAs('pessoas.pessoa.ler', 'financeiro.conta.ler')));
    expect(resultado).toEqual(['Painel', '# Financeiro', 'Contas e fundo', '# Pessoas', 'Pessoas']);
  });

  it('sem permissão nenhuma sobra só o que é livre', () => {
    expect(rotulos(filtrarNavPorAcesso(nav, TELAS, comAs()))).toEqual(['Painel']);
  });

  it('seção no fim da lista sem item também some', () => {
    expect(rotulos(filtrarNavPorAcesso(nav, TELAS, comAs('sistema.auditoria.ler')))).toEqual([
      'Painel',
      '# Sistema',
      'Auditoria',
    ]);
  });
});
