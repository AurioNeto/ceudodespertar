import { randomUUID } from 'node:crypto';
import type { INestApplicationContext } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ResolvedorDeSujeito } from '../../../src/modules/identidade/application/convite/resolvedor-de-sujeito.js';
import { ResolvedorDeSujeitoKysely } from '../../../src/modules/identidade/infrastructure/convite/resolvedor-de-sujeito.kysely.js';
import { VARIAVEL_DE_SESSAO_DA_INSTITUICAO } from '../../../src/shared/infrastructure/banco/unidade-de-trabalho.mikro-orm.js';
import {
  encerrarContextoDeEventos,
  INSTITUICAO_A,
  INSTITUICAO_B,
  semearInstituicoes,
  subirContextoDeEventos,
} from '../../eventos/apoio.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../../integracao/banco-de-teste.js';

const USUARIO_DE_A = '11111111-1111-4111-8111-111111111111';
const USUARIO_DE_B = '22222222-2222-4222-8222-222222222222';
const USUARIO_SEM_SUJEITO = '33333333-3333-4333-8333-333333333333';
const SUJEITO_DE_A = 'sub-do-usuario-de-a';
const SUJEITO_DE_B = 'sub-do-usuario-de-b';

async function semearUsuario(
  banco: BancoDeTeste,
  instituicaoId: string,
  usuarioId: string,
  sujeito: string | null,
): Promise<void> {
  await banco.owner.query('begin');
  try {
    await banco.owner.query('select set_config($1, $2, true)', [VARIAVEL_DE_SESSAO_DA_INSTITUICAO, instituicaoId]);
    await banco.owner.query(
      `insert into identidade.usuario (id, instituicao_id, nome, email, situacao, subject_id)
       values ($1, $2, 'Pessoa', $3, $4, $5)`,
      [usuarioId, instituicaoId, `${randomUUID()}@casa.org`, sujeito === null ? 'CONVITE_PENDENTE' : 'ATIVO', sujeito],
    );
    await banco.owner.query('commit');
  } catch (erro) {
    await banco.owner.query('rollback');
    throw erro;
  }
}

describe('resolução do sujeito do provedor, sem instituição no contexto', () => {
  let banco: BancoDeTeste;
  let app: INestApplicationContext;
  let resolvedor: ResolvedorDeSujeito;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
    await semearUsuario(banco, INSTITUICAO_A, USUARIO_DE_A, SUJEITO_DE_A);
    await semearUsuario(banco, INSTITUICAO_B, USUARIO_DE_B, SUJEITO_DE_B);
    await semearUsuario(banco, INSTITUICAO_A, USUARIO_SEM_SUJEITO, null);
    app = await subirContextoDeEventos(banco, [{ provide: ResolvedorDeSujeito, useClass: ResolvedorDeSujeitoKysely }]);
    resolvedor = app.get(ResolvedorDeSujeito);
  });

  afterEach(async () => {
    await encerrarContextoDeEventos(app);
    await derrubarBancoDeTeste(banco);
  });

  it('resolve o sujeito para a instituição e o usuário donos dele', async () => {
    expect(await resolvedor.resolver(SUJEITO_DE_A)).toEqual({ instituicaoId: INSTITUICAO_A, usuarioId: USUARIO_DE_A });
  });

  it('resolve o sujeito de outra instituição sem depender de contexto', async () => {
    expect(await resolvedor.resolver(SUJEITO_DE_B)).toEqual({ instituicaoId: INSTITUICAO_B, usuarioId: USUARIO_DE_B });
  });

  it('sujeito desconhecido não resolve', async () => {
    expect(await resolvedor.resolver('sub-que-nao-existe')).toBeUndefined();
  });
});
