import { describe, expect, it } from 'vitest';
import type { CodigoDeErro, Eu, GrupoId, InstituicaoId, UsuarioId } from '@cdd/contracts';
import { ErroDaApi, ErroDeRede } from '../dados/erros';
import { estadoDoErroDoEu, usuarioDaSessao } from './estadoDaSessao';

const erro = (status: number, codigo: CodigoDeErro) => new ErroDaApi({ status, codigo });

describe('estadoDoErroDoEu', () => {
  it.each([
    ['USUARIO_CONVITE_PENDENTE'],
    ['USUARIO_SUSPENSO'],
    ['USUARIO_REVOGADO'],
    ['USUARIO_DESCONHECIDO'],
  ] as const)('leva %s à recusa com o mesmo código', (codigo) => {
    expect(estadoDoErroDoEu(erro(401, codigo))).toEqual({ tipo: 'recusada', codigo });
  });

  it('trata 503 do provedor como indisponibilidade, sem recusa', () => {
    expect(estadoDoErroDoEu(erro(503, 'PROVEDOR_DE_IDENTIDADE_INDISPONIVEL'))).toEqual({ tipo: 'indisponivel' });
  });

  it('trata NAO_AUTENTICADO como sem sessão', () => {
    expect(estadoDoErroDoEu(erro(401, 'NAO_AUTENTICADO'))).toEqual({ tipo: 'sem-sessao' });
  });

  it('não confunde 403 SEM_PERMISSAO com recusa de acesso', () => {
    expect(estadoDoErroDoEu(erro(403, 'SEM_PERMISSAO'))).toEqual({ tipo: 'falha' });
  });

  it('só reconhece recusa de usuário quando vem como 401', () => {
    expect(estadoDoErroDoEu(erro(409, 'USUARIO_SUSPENSO'))).toEqual({ tipo: 'falha' });
  });

  it('trata erro de rede e erro desconhecido como falha, sem derrubar a sessão', () => {
    expect(estadoDoErroDoEu(new ErroDeRede(new Error('offline')))).toEqual({ tipo: 'falha' });
    expect(estadoDoErroDoEu(new Error('boom'))).toEqual({ tipo: 'falha' });
    expect(estadoDoErroDoEu(erro(500, 'ERRO_INTERNO'))).toEqual({ tipo: 'falha' });
  });
});

describe('usuarioDaSessao', () => {
  it('junta os nomes dos grupos', () => {
    const eu: Eu = {
      usuario: { id: 'u-1' as UsuarioId, nome: 'Ana', email: 'ana@cdd.local' },
      instituicao: { id: 'i-1' as InstituicaoId, nome: 'CDD' },
      grupos: [
        { id: 'g-1' as GrupoId, nome: 'Tesouraria' },
        { id: 'g-2' as GrupoId, nome: 'Governança' },
      ],
      permissoes: [],
    };
    expect(usuarioDaSessao(eu)).toEqual({
      id: 'u-1',
      nome: 'Ana',
      email: 'ana@cdd.local',
      grupoNome: 'Tesouraria, Governança',
    });
  });
});
