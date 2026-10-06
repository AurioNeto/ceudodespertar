import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ArgumentsHost } from '@nestjs/common';
import type { CorpoDeErro } from '@cdd/contracts';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { ContextoDaRequisicao } from '../../src/shared/infrastructure/contexto-da-requisicao.js';
import { FiltroGlobalDeErros } from '../../src/shared/infrastructure/http/filtro-global-de-erros.js';

interface RespostaCapturada {
  status?: number;
  corpo?: CorpoDeErro;
}

function hostFalso(capturada: RespostaCapturada): ArgumentsHost {
  const resposta = {
    status(codigo: number) {
      capturada.status = codigo;
      return resposta;
    },
    json(corpo: CorpoDeErro) {
      capturada.corpo = corpo;
    },
  };

  return {
    switchToHttp: () => ({ getResponse: () => resposta, getRequest: () => ({ headers: {} }) }),
  } as unknown as ArgumentsHost;
}

const INSTITUICAO = randomUUID();

async function semearInstituicaoEUsuario(banco: BancoDeTeste, email: string): Promise<void> {
  await banco.owner.query('insert into shared.instituicao (id, nome) values ($1, $2)', [INSTITUICAO, 'Casa']);
  await banco.app.query("select set_config('app.instituicao_id', $1, false)", [INSTITUICAO]);
  await banco.app.query(
    'insert into identidade.usuario (instituicao_id, nome, email, situacao) values ($1, $2, $3, $4)',
    [INSTITUICAO, 'Primeiro Usuário', email, 'ATIVO'],
  );
}

describe('FiltroGlobalDeErros · violação real de restrição nomeada (integração)', () => {
  let banco: BancoDeTeste;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
  });

  afterEach(async () => {
    await derrubarBancoDeTeste(banco);
  });

  it('usuario_email_unico duplicado vira EMAIL_JA_CADASTRADO pelo filtro', async () => {
    const email = 'duplicado@casa.example';
    await semearInstituicaoEUsuario(banco, email);

    const violacao = await banco.app
      .query(
        'insert into identidade.usuario (instituicao_id, nome, email, situacao) values ($1, $2, $3, $4)',
        [INSTITUICAO, 'Segundo Usuário', email, 'ATIVO'],
      )
      .catch((erro: unknown) => erro);

    expect(violacao).toMatchObject({ code: '23505', constraint: 'usuario_email_unico' });

    const filtro = new FiltroGlobalDeErros();
    const capturada: RespostaCapturada = {};
    const correlacaoId = randomUUID();

    ContextoDaRequisicao.executar({ correlacaoId }, () => {
      filtro.catch(violacao, hostFalso(capturada));
    });

    expect(capturada.status).toBe(409);
    expect(capturada.corpo).toStrictEqual({ erro: 'EMAIL_JA_CADASTRADO', correlacaoId });
  });
});
