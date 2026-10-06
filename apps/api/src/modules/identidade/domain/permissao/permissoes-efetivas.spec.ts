import type { Permissao } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import { PermissoesEfetivas } from './permissoes-efetivas.js';

function grupo(ativo: boolean, permissoes: readonly Permissao[]) {
  return { ativo, permissoes };
}

describe('PermissoesEfetivas', () => {
  it('US3: usuário sem grupo não tem nenhuma permissão', () => {
    const efetivas = PermissoesEfetivas.dosGrupos([]);

    expect(efetivas.lista).toStrictEqual([]);
    expect(efetivas.pode('financeiro.dre.ler')).toBe(false);
  });

  it('é a união das permissões dos grupos ativos, sem repetição e ordenada', () => {
    const efetivas = PermissoesEfetivas.dosGrupos([
      grupo(true, ['financeiro.dre.ler', 'estoque.saldo.ler']),
      grupo(true, ['estoque.saldo.ler', 'pessoas.pessoa.ler']),
    ]);

    expect(efetivas.lista).toStrictEqual(['estoque.saldo.ler', 'financeiro.dre.ler', 'pessoas.pessoa.ler']);
  });

  it('grupo inativo não contribui com permissões', () => {
    const efetivas = PermissoesEfetivas.dosGrupos([
      grupo(true, ['estoque.saldo.ler']),
      grupo(false, ['financeiro.dre.ler']),
    ]);

    expect(efetivas.lista).toStrictEqual(['estoque.saldo.ler']);
    expect(efetivas.pode('financeiro.dre.ler')).toBe(false);
  });

  it('pode responde verdadeiro para permissão de grupo ativo', () => {
    const efetivas = PermissoesEfetivas.dosGrupos([grupo(true, ['estoque.saldo.ler'])]);

    expect(efetivas.pode('estoque.saldo.ler')).toBe(true);
  });

  it('a lista exposta não altera o estado interno', () => {
    const efetivas = PermissoesEfetivas.dosGrupos([grupo(true, ['estoque.saldo.ler'])]);

    (efetivas.lista as Permissao[]).push('financeiro.dre.ler');

    expect(efetivas.lista).toStrictEqual(['estoque.saldo.ler']);
  });
});
