import { describe, expect, it } from 'vitest';
import type { Eu, InstituicaoId, UsuarioId } from '@cdd/contracts';
import { ErroDeRede } from '@/dados';
import { erroDaApi } from '@/testes/fabricas';
import { INTERVALO_DE_NOVA_TENTATIVA_DO_EU_EM_MS, derivarEstado, intervaloDeNovaTentativaDoEu } from './derivarEstado';

const EU: Eu = {
  usuario: { id: 'u-1' as UsuarioId, nome: 'Ana', email: 'ana@cdd.local' },
  instituicao: { id: 'i-1' as InstituicaoId, nome: 'CDD' },
  grupos: [],
  permissoes: [],
};

const falhaDoRefetch = (error: unknown) => derivarEstado(true, { status: 'error', data: EU, error });
const falhaDaPrimeiraBusca = (error: unknown) => derivarEstado(true, { status: 'error', data: undefined, error });

describe('derivarEstado depois de uma falha do /eu', () => {
  it.each([
    ['indisponibilidade', erroDaApi(503, 'SERVICO_INDISPONIVEL')],
    ['erro interno', erroDaApi(500, 'ERRO_INTERNO')],
    ['rede', new ErroDeRede(new Error('offline'))],
    ['erro desconhecido', new Error('boom')],
  ])('com o acesso já carregado, %s mantém a sessão ativa com os dados que havia', (_caso, erro) => {
    expect(falhaDoRefetch(erro)).toEqual({ tipo: 'ativa', eu: EU });
  });

  it.each(['USUARIO_SUSPENSO', 'USUARIO_REVOGADO'] as const)('com o acesso já carregado, 401 %s leva à recusa', (codigo) => {
    expect(falhaDoRefetch(erroDaApi(401, codigo))).toEqual({ tipo: 'recusada', codigo });
  });

  it('com o acesso já carregado, sessão vencida leva a sem sessão', () => {
    expect(falhaDoRefetch(erroDaApi(401, 'NAO_AUTENTICADO'))).toEqual({ tipo: 'sem-sessao' });
  });

  it('sem acesso carregado, a falha passageira continua aparecendo', () => {
    expect(falhaDaPrimeiraBusca(erroDaApi(503, 'SERVICO_INDISPONIVEL'))).toEqual({ tipo: 'indisponivel' });
    expect(falhaDaPrimeiraBusca(new ErroDeRede(new Error('offline')))).toEqual({ tipo: 'falha' });
  });
});

describe('intervaloDeNovaTentativaDoEu', () => {
  it('tenta de novo depois de uma falha passageira com o acesso já carregado', () => {
    expect(intervaloDeNovaTentativaDoEu({ status: 'error', data: EU, error: erroDaApi(503, 'SERVICO_INDISPONIVEL') })).toBe(
      INTERVALO_DE_NOVA_TENTATIVA_DO_EU_EM_MS,
    );
  });

  it.each([
    ['recusa', { status: 'error', data: EU, error: erroDaApi(401, 'USUARIO_REVOGADO') }],
    ['sessão vencida', { status: 'error', data: EU, error: erroDaApi(401, 'NAO_AUTENTICADO') }],
    ['primeira busca sem dados', { status: 'error', data: undefined, error: erroDaApi(503, 'SERVICO_INDISPONIVEL') }],
    ['sucesso', { status: 'success', data: EU, error: null }],
  ])('não insiste em %s', (_caso, consulta) => {
    expect(intervaloDeNovaTentativaDoEu(consulta)).toBe(false);
  });
});
