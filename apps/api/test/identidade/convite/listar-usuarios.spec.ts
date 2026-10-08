import type { DataHora, GrupoId, UsuarioId } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import {
  codificarCursorDeUsuarios,
  decodificarCursorDeUsuarios,
  ErroDeCursorDeUsuariosInvalido,
} from '../../../src/modules/identidade/application/usuarios/cursor-de-usuarios.js';
import { LeitorDeUsuarios } from '../../../src/modules/identidade/application/usuarios/leitor-de-usuarios.js';
import type {
  ConsultaDeUsuarios,
  UsuarioComPosicao,
} from '../../../src/modules/identidade/application/usuarios/leitor-de-usuarios.js';
import { ListarUsuarios } from '../../../src/modules/identidade/application/usuarios/listar-usuarios.js';
import { escaparCuringasDoLike } from '../../../src/modules/identidade/infrastructure/usuarios/leitor-de-usuarios.kysely.js';
import { ErroDeDominioException } from '../../../src/shared/kernel/erro-de-dominio.js';

const ID_A = 'a1000000-0000-7000-8000-000000000001';
const ID_B = 'a1000000-0000-7000-8000-000000000002';
const ID_C = 'a1000000-0000-7000-8000-000000000003';

class LeitorQueRegistra extends LeitorDeUsuarios {
  consultas: ConsultaDeUsuarios[] = [];

  constructor(private readonly lidos: readonly UsuarioComPosicao[]) {
    super();
  }

  ler(consulta: ConsultaDeUsuarios): Promise<UsuarioComPosicao[]> {
    this.consultas.push(consulta);
    return Promise.resolve([...this.lidos]);
  }
}

function lido(id: string, nome: string): UsuarioComPosicao {
  return {
    usuario: {
      id: id as UsuarioId,
      nome,
      email: `${nome}@casa.org`,
      situacao: 'ATIVO',
      grupos: [],
      versao: 1,
      ultimoAcessoEm: null as DataHora | null,
    },
    posicao: { chaveDeNome: nome.toLowerCase(), id },
  };
}

describe('ListarUsuarios', () => {
  it('pede ao leitor uma linha além do limite para saber se há próxima página', async () => {
    const leitor = new LeitorQueRegistra([]);

    await new ListarUsuarios(leitor).executar({ limite: 2 });

    expect(leitor.consultas).toEqual([{ depois: null, limite: 3 }]);
  });

  it('repassa os filtros e a posição decodificada do cursor', async () => {
    const leitor = new LeitorQueRegistra([]);
    const depois = codificarCursorDeUsuarios({ chaveDeNome: 'ana', id: ID_A });

    await new ListarUsuarios(leitor).executar({
      situacao: 'SUSPENSO',
      grupoId: ID_B as GrupoId,
      busca: 'ana',
      depois,
      limite: 10,
    });

    expect(leitor.consultas).toEqual([
      { situacao: 'SUSPENSO', grupoId: ID_B, busca: 'ana', depois: { chaveDeNome: 'ana', id: ID_A }, limite: 11 },
    ]);
  });

  it('devolve a página cheia com cursor para a posição do último item quando sobra linha', async () => {
    const leitor = new LeitorQueRegistra([lido(ID_A, 'Ana'), lido(ID_B, 'Bia'), lido(ID_C, 'Caio')]);

    const pagina = await new ListarUsuarios(leitor).executar({ limite: 2 });

    expect(pagina.itens.map(({ id }) => id)).toEqual([ID_A, ID_B]);
    expect(decodificarCursorDeUsuarios(pagina.proxima!)).toEqual({ chaveDeNome: 'bia', id: ID_B });
  });

  it('na última página a próxima é nula', async () => {
    const leitor = new LeitorQueRegistra([lido(ID_A, 'Ana'), lido(ID_B, 'Bia')]);

    const pagina = await new ListarUsuarios(leitor).executar({ limite: 2 });

    expect(pagina.itens).toHaveLength(2);
    expect(pagina.proxima).toBeNull();
  });

  it('cursor inválido vira CORPO_INVALIDO apontando o parâmetro depois', async () => {
    const consulta = new ListarUsuarios(new LeitorQueRegistra([])).executar({ depois: 'lixo', limite: 2 });

    await expect(consulta).rejects.toMatchObject({
      erroDeDominio: { codigo: 'CORPO_INVALIDO', detalhes: { problemas: [{ caminho: 'depois' }] } },
    });
    await expect(consulta).rejects.toBeInstanceOf(ErroDeDominioException);
  });
});

describe('cursor de usuários', () => {
  it('é opaco e faz ida e volta preservando a chave de nome', () => {
    const posicao = { chaveDeNome: 'zé da silva', id: ID_A };

    const cursor = codificarCursorDeUsuarios(posicao);

    expect(cursor).not.toContain('silva');
    expect(decodificarCursorDeUsuarios(cursor)).toEqual(posicao);
  });

  it.each([
    ['base64 que não é JSON', Buffer.from('não é json').toString('base64url')],
    ['JSON sem os campos', Buffer.from('{}').toString('base64url')],
    ['id que não é uuid', Buffer.from(JSON.stringify({ chaveDeNome: 'a', id: 'x' })).toString('base64url')],
  ])('rejeita %s', (_descricao, cursor) => {
    expect(() => decodificarCursorDeUsuarios(cursor)).toThrow(ErroDeCursorDeUsuariosInvalido);
  });
});

describe('escaparCuringasDoLike', () => {
  it.each([
    ['100%', '100\\%'],
    ['a_b', 'a\\_b'],
    ['c:\\x', 'c:\\\\x'],
    ['texto simples', 'texto simples'],
  ])('escapa %s como %s', (entrada, esperado) => {
    expect(escaparCuringasDoLike(entrada)).toBe(esperado);
  });
});
