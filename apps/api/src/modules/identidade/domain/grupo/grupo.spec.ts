import type { CodigoGrupo, GrupoId, UsuarioId } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import { ehErr, ehOk, type Result } from '../../../../shared/kernel/result.js';
import { Grupo } from './grupo.js';

const GRUPO_ID = 'grupo-1' as GrupoId;
const AUTOR = 'usuario-1' as UsuarioId;
const INSTANTE = new Date('2026-03-01T12:00:00Z');
const PERMISSAO_INVENTADA = 'financeiro.lancamento.inventar';

interface Opcoes {
  readonly codigoSistema?: CodigoGrupo | null;
  readonly permissoes?: readonly string[];
  readonly protegido?: boolean;
}

function criarGrupo(opcoes: Opcoes = {}): Grupo {
  const resultado = Grupo.criar({
    id: GRUPO_ID,
    codigoSistema: opcoes.codigoSistema === undefined ? 'LEITURA' : opcoes.codigoSistema,
    nome: 'Leitura',
    descricao: 'Consulta painéis',
    permissoes: opcoes.permissoes ?? ['estoque.saldo.ler'],
    protegido: opcoes.protegido ?? true,
  });
  if (!ehOk(resultado)) throw new Error('fixture inválida');
  return resultado.valor;
}

function codigoDoErro(resultado: Result<unknown, { codigo: string }>): string | null {
  return ehErr(resultado) ? resultado.erro.codigo : null;
}

describe('Grupo.criar', () => {
  it('nasce ativo, na versão 1, com os dados informados', () => {
    const grupo = criarGrupo();

    expect(grupo.id).toBe(GRUPO_ID);
    expect(grupo.codigoSistema).toBe('LEITURA');
    expect(grupo.nome).toBe('Leitura');
    expect(grupo.descricao).toBe('Consulta painéis');
    expect(grupo.permissoes).toStrictEqual(['estoque.saldo.ler']);
    expect(grupo.protegido).toBe(true);
    expect(grupo.ativo).toBe(true);
    expect(grupo.versao).toBe(1);
  });

  it('não registra evento ao nascer', () => {
    expect(criarGrupo().retirarEventos()).toStrictEqual([]);
  });

  it('G4: recusa permissão fora do catálogo', () => {
    const resultado = Grupo.criar({
      id: GRUPO_ID,
      codigoSistema: null,
      nome: 'Custom',
      descricao: '',
      permissoes: ['estoque.saldo.ler', PERMISSAO_INVENTADA],
      protegido: false,
    });

    expect(codigoDoErro(resultado)).toBe('PERMISSAO_INEXISTENTE');
  });

  it('aceita grupo customizado sem código de sistema', () => {
    expect(criarGrupo({ codigoSistema: null, protegido: false }).codigoSistema).toBeNull();
  });

  it('ignora permissão repetida e expõe a lista ordenada', () => {
    const grupo = criarGrupo({ permissoes: ['pessoas.pessoa.ler', 'estoque.saldo.ler', 'pessoas.pessoa.ler'] });

    expect(grupo.permissoes).toStrictEqual(['estoque.saldo.ler', 'pessoas.pessoa.ler']);
  });
});

describe('Grupo.reconstituir', () => {
  it('restaura estado e versão sem registrar eventos', () => {
    const grupo = Grupo.reconstituir({
      id: GRUPO_ID,
      codigoSistema: 'TESOURARIA',
      nome: 'Tesouraria',
      descricao: 'Dinheiro',
      permissoes: ['financeiro.dre.ler'],
      protegido: true,
      ativo: false,
      versao: 7,
    });

    expect(grupo.versao).toBe(7);
    expect(grupo.ativo).toBe(false);
    expect(grupo.permissoes).toStrictEqual(['financeiro.dre.ler']);
    expect(grupo.retirarEventos()).toStrictEqual([]);
  });
});

describe('G1: codigoSistema imutável', () => {
  it('o código não muda depois de renomear nem de alterar permissões', () => {
    const grupo = criarGrupo();

    grupo.renomear('Outro nome', 'Outra descrição');
    grupo.concederPermissao('pessoas.pessoa.ler', AUTOR, INSTANTE);

    expect(grupo.codigoSistema).toBe('LEITURA');
  });

  it('o código não é reatribuível', () => {
    const grupo = criarGrupo();

    expect(() => {
      (grupo as unknown as { codigoSistema: string }).codigoSistema = 'ADMINISTRADOR';
    }).toThrow(TypeError);
  });
});

describe('Grupo.renomear', () => {
  it('G2: permite renomear o rótulo de grupo protegido', () => {
    const grupo = criarGrupo({ protegido: true });

    const resultado = grupo.renomear('Consulta', 'Só leitura');

    expect(ehOk(resultado)).toBe(true);
    expect(grupo.nome).toBe('Consulta');
    expect(grupo.descricao).toBe('Só leitura');
  });

  it('grupo excluído dá GRUPO_INEXISTENTE e mantém nome e descrição', () => {
    const grupo = criarGrupo({ protegido: false });
    grupo.excluir(0, AUTOR, INSTANTE);

    expect(codigoDoErro(grupo.renomear('Outro', 'Outra'))).toBe('GRUPO_INEXISTENTE');
    expect(grupo.nome).toBe('Leitura');
    expect(grupo.descricao).toBe('Consulta painéis');
  });
});

describe('Grupo.concederPermissao', () => {
  it('adiciona a permissão e registra o evento com autor e instante', () => {
    const grupo = criarGrupo();

    const resultado = grupo.concederPermissao('pessoas.pessoa.ler', AUTOR, INSTANTE);

    expect(ehOk(resultado)).toBe(true);
    expect(grupo.permissoes).toStrictEqual(['estoque.saldo.ler', 'pessoas.pessoa.ler']);
    const [evento, ...restantes] = grupo.retirarEventos();
    expect(restantes).toStrictEqual([]);
    expect(evento).toMatchObject({
      tipo: 'GRUPO_ALTERADO',
      agregadoTipo: 'Grupo',
      agregadoId: GRUPO_ID,
      ocorridoEm: INSTANTE,
      dados: { permissao: 'pessoas.pessoa.ler', acao: 'CONCEDIDA', autorId: AUTOR, codigoSistema: 'LEITURA' },
    });
    expect(evento?.eventoId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('G4: permissão fora do catálogo dá PERMISSAO_INEXISTENTE e não altera o grupo', () => {
    const grupo = criarGrupo();

    const resultado = grupo.concederPermissao(PERMISSAO_INVENTADA, AUTOR, INSTANTE);

    expect(codigoDoErro(resultado)).toBe('PERMISSAO_INEXISTENTE');
    expect(grupo.permissoes).toStrictEqual(['estoque.saldo.ler']);
    expect(grupo.retirarEventos()).toStrictEqual([]);
  });

  it('G5: grupo protegido aceita alteração de permissões', () => {
    const grupo = criarGrupo({ protegido: true });

    expect(ehOk(grupo.concederPermissao('pessoas.pessoa.ler', AUTOR, INSTANTE))).toBe(true);
  });

  it('é idempotente: conceder o que o grupo já tem não muda nada nem emite evento', () => {
    const grupo = criarGrupo();

    const resultado = grupo.concederPermissao('estoque.saldo.ler', AUTOR, INSTANTE);

    expect(ehOk(resultado)).toBe(true);
    expect(grupo.permissoes).toStrictEqual(['estoque.saldo.ler']);
    expect(grupo.retirarEventos()).toStrictEqual([]);
  });

  it('grupo excluído dá GRUPO_INEXISTENTE', () => {
    const grupo = criarGrupo({ protegido: false });
    grupo.excluir(0, AUTOR, INSTANTE);

    expect(codigoDoErro(grupo.concederPermissao('pessoas.pessoa.ler', AUTOR, INSTANTE))).toBe('GRUPO_INEXISTENTE');
  });
});

describe('Grupo.revogarPermissao', () => {
  it('remove a permissão e registra o evento com autor e instante', () => {
    const grupo = criarGrupo();

    const resultado = grupo.revogarPermissao('estoque.saldo.ler', AUTOR, INSTANTE);

    expect(ehOk(resultado)).toBe(true);
    expect(grupo.permissoes).toStrictEqual([]);
    expect(grupo.retirarEventos()).toMatchObject([
      {
        tipo: 'GRUPO_ALTERADO',
        agregadoTipo: 'Grupo',
        agregadoId: GRUPO_ID,
        ocorridoEm: INSTANTE,
        dados: { permissao: 'estoque.saldo.ler', acao: 'REVOGADA', autorId: AUTOR, codigoSistema: 'LEITURA' },
      },
    ]);
  });

  it('G4: permissão fora do catálogo dá PERMISSAO_INEXISTENTE', () => {
    expect(codigoDoErro(criarGrupo().revogarPermissao(PERMISSAO_INVENTADA, AUTOR, INSTANTE))).toBe(
      'PERMISSAO_INEXISTENTE',
    );
  });

  it('G5: grupo protegido aceita revogação', () => {
    const grupo = criarGrupo({ protegido: true });

    expect(ehOk(grupo.revogarPermissao('estoque.saldo.ler', AUTOR, INSTANTE))).toBe(true);
  });

  it('é idempotente: revogar o que o grupo não tem não muda nada nem emite evento', () => {
    const grupo = criarGrupo();

    const resultado = grupo.revogarPermissao('pessoas.pessoa.ler', AUTOR, INSTANTE);

    expect(ehOk(resultado)).toBe(true);
    expect(grupo.permissoes).toStrictEqual(['estoque.saldo.ler']);
    expect(grupo.retirarEventos()).toStrictEqual([]);
  });

  it('grupo excluído dá GRUPO_INEXISTENTE', () => {
    const grupo = criarGrupo({ protegido: false });
    grupo.excluir(0, AUTOR, INSTANTE);

    expect(codigoDoErro(grupo.revogarPermissao('estoque.saldo.ler', AUTOR, INSTANTE))).toBe('GRUPO_INEXISTENTE');
  });
});

describe('Grupo.excluir', () => {
  it('G2: grupo protegido não pode ser excluído', () => {
    const grupo = criarGrupo({ protegido: true });

    const resultado = grupo.excluir(0, AUTOR, INSTANTE);

    expect(codigoDoErro(resultado)).toBe('GRUPO_PROTEGIDO');
    expect(grupo.ativo).toBe(true);
    expect(grupo.retirarEventos()).toStrictEqual([]);
  });

  it('G3: grupo com usuário ativo não pode ser excluído', () => {
    const grupo = criarGrupo({ protegido: false });

    const resultado = grupo.excluir(2, AUTOR, INSTANTE);

    expect(codigoDoErro(resultado)).toBe('GRUPO_COM_USUARIOS_ATIVOS');
    expect(resultado).toMatchObject({ erro: { detalhes: { usuariosAtivos: 2 } } });
    expect(grupo.ativo).toBe(true);
  });

  it('G3: grupo com exatamente um usuário ativo não pode ser excluído', () => {
    const grupo = criarGrupo({ protegido: false });

    const resultado = grupo.excluir(1, AUTOR, INSTANTE);

    expect(codigoDoErro(resultado)).toBe('GRUPO_COM_USUARIOS_ATIVOS');
    expect(resultado).toMatchObject({ erro: { detalhes: { usuariosAtivos: 1 } } });
    expect(grupo.ativo).toBe(true);
  });

  it.each([Number.NaN, -1, 1.5, Number.POSITIVE_INFINITY])(
    'quantidade de usuários ativos inválida (%s) é erro de programação',
    (quantidade) => {
      const grupo = criarGrupo({ protegido: false });

      expect(() => grupo.excluir(quantidade, AUTOR, INSTANTE)).toThrow(RangeError);
      expect(grupo.ativo).toBe(true);
    },
  );

  it('G2 vence G3: grupo protegido com usuários dá GRUPO_PROTEGIDO', () => {
    expect(codigoDoErro(criarGrupo({ protegido: true }).excluir(3, AUTOR, INSTANTE))).toBe('GRUPO_PROTEGIDO');
  });

  it('grupo customizado sem usuários ativos é excluído e emite o evento', () => {
    const grupo = criarGrupo({ codigoSistema: null, protegido: false });

    const resultado = grupo.excluir(0, AUTOR, INSTANTE);

    expect(ehOk(resultado)).toBe(true);
    expect(grupo.ativo).toBe(false);
    expect(grupo.retirarEventos()).toMatchObject([
      {
        tipo: 'GRUPO_ALTERADO',
        agregadoTipo: 'Grupo',
        agregadoId: GRUPO_ID,
        ocorridoEm: INSTANTE,
        dados: { acao: 'EXCLUIDO', autorId: AUTOR, codigoSistema: null },
      },
    ]);
  });

  it('excluir grupo já excluído dá GRUPO_INEXISTENTE', () => {
    const grupo = criarGrupo({ protegido: false });
    grupo.excluir(0, AUTOR, INSTANTE);

    expect(codigoDoErro(grupo.excluir(0, AUTOR, INSTANTE))).toBe('GRUPO_INEXISTENTE');
  });
});

describe('Grupo.possui', () => {
  it('responde pela presença da permissão', () => {
    const grupo = criarGrupo();

    expect(grupo.possui('estoque.saldo.ler')).toBe(true);
    expect(grupo.possui('pessoas.pessoa.ler')).toBe(false);
  });
});
