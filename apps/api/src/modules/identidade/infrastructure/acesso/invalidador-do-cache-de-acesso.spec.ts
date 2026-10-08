import type { InstituicaoId, UsuarioId } from '@cdd/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { criarContextoDeAcesso } from '../../../../shared/infrastructure/autenticacao/contexto-de-acesso.js';
import { ContextoDaRequisicao } from '../../../../shared/infrastructure/contexto-da-requisicao.js';
import { lerMetadadosReageA } from '../../../../shared/infrastructure/eventos/reage-a.decorator.js';
import { Relogio } from '../../../../shared/infrastructure/relogio.js';
import type { EventoDeDominio } from '../../../../shared/kernel/evento-de-dominio.js';
import { CacheDeContextoDeAcesso } from './cache-de-contexto-de-acesso.js';
import { InvalidadorDoCacheDeAcesso } from './invalidador-do-cache-de-acesso.js';

class RelogioParado extends Relogio {
  agora(): Date {
    return new Date('2026-10-08T12:00:00.000Z');
  }
}

const USUARIO_A = 'usuario-a' as UsuarioId;
const USUARIO_B = 'usuario-b' as UsuarioId;
const CASA_1 = 'casa-1' as InstituicaoId;
const CASA_2 = 'casa-2' as InstituicaoId;

function evento(tipo: string, agregadoId: string): EventoDeDominio {
  return {
    eventoId: `evento-${tipo}`,
    tipo,
    ocorridoEm: new Date('2026-10-08T12:00:00.000Z'),
    agregadoTipo: 'Teste',
    agregadoId,
    dados: {},
  };
}

describe('InvalidadorDoCacheDeAcesso', () => {
  let cache: CacheDeContextoDeAcesso;
  let invalidador: InvalidadorDoCacheDeAcesso;

  const guardar = (sujeito: string, usuarioId: UsuarioId, instituicaoId: InstituicaoId) =>
    cache.guardar(
      sujeito,
      { usuarioId, instituicaoId },
      criarContextoDeAcesso({ usuarioId, instituicaoId, permissoes: new Set() }),
      cache.geracaoAtual(),
    );

  beforeEach(() => {
    cache = new CacheDeContextoDeAcesso(new RelogioParado());
    invalidador = new InvalidadorDoCacheDeAcesso(cache);
    guardar('sub-a', USUARIO_A, CASA_1);
    guardar('sub-b', USUARIO_B, CASA_1);
    guardar('sub-c', 'usuario-c' as UsuarioId, CASA_2);
  });

  it.each([
    ['GRUPO_ALTERADO', 'aoAlterarGruposDoUsuario'],
    ['USUARIO_ATIVADO', 'aoAtivarUsuario'],
    ['USUARIO_SUSPENSO', 'aoSuspenderUsuario'],
    ['USUARIO_REATIVADO', 'aoReativarUsuario'],
  ] as const)('%s esquece só o usuário do evento (%s)', async (tipo, metodo) => {
    await invalidador[metodo](evento(tipo, USUARIO_A));

    expect(cache.obter('sub-a')).toBeUndefined();
    expect(cache.obter('sub-b')).toBeDefined();
    expect(cache.obter('sub-c')).toBeDefined();
  });

  it('GRUPO_EDITADO esquece os usuários da instituição do contexto do evento', async () => {
    await ContextoDaRequisicao.executar({ correlacaoId: 'c', instituicaoId: CASA_1 }, () => invalidador.aoEditarGrupo());

    expect(cache.obter('sub-a')).toBeUndefined();
    expect(cache.obter('sub-b')).toBeUndefined();
    expect(cache.obter('sub-c')).toBeDefined();
  });

  it('GRUPO_EDITADO sem instituição no contexto esquece tudo, por segurança', async () => {
    await invalidador.aoEditarGrupo();

    expect(cache.obter('sub-a')).toBeUndefined();
    expect(cache.obter('sub-c')).toBeUndefined();
  });

  it.each([
    ['aoAlterarGruposDoUsuario', 'GRUPO_ALTERADO'],
    ['aoAtivarUsuario', 'USUARIO_ATIVADO'],
    ['aoSuspenderUsuario', 'USUARIO_SUSPENSO'],
    ['aoReativarUsuario', 'USUARIO_REATIVADO'],
    ['aoEditarGrupo', 'GRUPO_EDITADO'],
  ])('%s está declarado com @ReageA para %s e identidade própria', (metodo, tipo) => {
    expect(lerMetadadosReageA(InvalidadorDoCacheDeAcesso.prototype, metodo)).toEqual({
      tipo,
      consumidor: `InvalidadorDoCacheDeAcesso.${metodo}`,
    });
  });
});
