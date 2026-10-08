import { describe, expect, it } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import type { InstituicaoId, UsuarioId } from '@cdd/contracts';
import { criarContextoDeAcesso } from '../autenticacao/contexto-de-acesso.js';
import { guardarContexto, guardarIdentidade } from '../autenticacao/requisicao-autenticada.js';
import type { RequisicaoHttp } from '../autenticacao/requisicao-autenticada.js';
import { ProvedorDeContextoDeInstituicaoDoAcesso } from './provedor-de-contexto-de-instituicao.do-acesso.js';

const INSTITUICAO = 'a0000000-0000-0000-0000-000000000000' as InstituicaoId;
const USUARIO = '11111111-1111-1111-1111-111111111111' as UsuarioId;

function requisicaoVazia(): RequisicaoHttp {
  return { headers: {} };
}

function contextoDe(requisicao: RequisicaoHttp): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => requisicao }) } as unknown as ExecutionContext;
}

describe('ProvedorDeContextoDeInstituicaoDoAcesso', () => {
  it('devolve a instituição e o usuário do contexto de acesso que a guarda guardou', () => {
    const requisicao = requisicaoVazia();
    guardarContexto(
      requisicao,
      criarContextoDeAcesso({ usuarioId: USUARIO, instituicaoId: INSTITUICAO, permissoes: new Set() }),
    );

    const identidade = new ProvedorDeContextoDeInstituicaoDoAcesso().identidadeAtual(contextoDe(requisicao));

    expect(identidade).toStrictEqual({ instituicaoId: INSTITUICAO, usuarioId: USUARIO });
  });

  it('sem contexto de acesso (rota pública) devolve sem instituição', () => {
    const identidade = new ProvedorDeContextoDeInstituicaoDoAcesso().identidadeAtual(contextoDe(requisicaoVazia()));

    expect(identidade.instituicaoId).toBeUndefined();
    expect(identidade.usuarioId).toBeUndefined();
  });

  it('só identificado pelo token, sem contexto de acesso, devolve sem instituição', () => {
    const requisicao = requisicaoVazia();
    guardarIdentidade(requisicao, { sub: 'sub-1', expiraEm: 0 });

    const identidade = new ProvedorDeContextoDeInstituicaoDoAcesso().identidadeAtual(contextoDe(requisicao));

    expect(identidade.instituicaoId).toBeUndefined();
    expect(identidade.usuarioId).toBeUndefined();
  });
});
