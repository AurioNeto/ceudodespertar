import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Permissao } from '@cdd/contracts';
import { agruparPermissoes } from './permissoesAgrupadas';

describe('agruparPermissoes', () => {
  it('ordena os módulos por nome com outras por último e os códigos dentro de cada módulo', () => {
    const grupos = agruparPermissoes([
      'x.y.z',
      'financeiro.lancamento.registrar',
      'eventos.evento.criar',
      'financeiro.conta.ler',
    ] as Permissao[]);
    expect(grupos.map((g) => g.modulo)).toEqual(['eventos', 'financeiro', 'outras']);
    expect(grupos[1]?.permissoes.map((p) => p.codigo)).toEqual([
      'financeiro.conta.ler',
      'financeiro.lancamento.registrar',
    ]);
  });

  it.each(['constructor', 'toString', '__proto__'])(
    'código %s herdado de Object cai em outras sem descrição',
    (codigo) => {
      const grupos = agruparPermissoes([codigo as Permissao]);
      expect(grupos).toEqual([{ modulo: 'outras', permissoes: [{ codigo, descricao: null }] }]);
    },
  );

  describe('com propriedades herdadas de Object.prototype', () => {
    beforeEach(() => {
      Object.defineProperty(Object.prototype, 'modulo', { value: 'herdado', configurable: true });
      Object.defineProperty(Object.prototype, 'descricao', { value: 'herdada', configurable: true });
    });

    afterEach(() => {
      Reflect.deleteProperty(Object.prototype, 'modulo');
      Reflect.deleteProperty(Object.prototype, 'descricao');
    });

    it('código herdado não pega módulo nem descrição de fora do catálogo', () => {
      const grupos = agruparPermissoes(['constructor' as Permissao]);
      expect(grupos).toEqual([{ modulo: 'outras', permissoes: [{ codigo: 'constructor', descricao: null }] }]);
    });
  });
});
