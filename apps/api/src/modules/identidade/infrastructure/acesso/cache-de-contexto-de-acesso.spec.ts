import type { InstituicaoId, UsuarioId } from '@cdd/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { criarContextoDeAcesso, recusarAcesso } from '../../../../shared/infrastructure/autenticacao/contexto-de-acesso.js';
import { Relogio } from '../../../../shared/infrastructure/relogio.js';
import { CacheDeContextoDeAcesso, TTL_DO_CACHE_DE_ACESSO_EM_MS } from './cache-de-contexto-de-acesso.js';

class RelogioManual extends Relogio {
  constructor(private instante: number) {
    super();
  }

  avancar(ms: number): void {
    this.instante += ms;
  }

  agora(): Date {
    return new Date(this.instante);
  }
}

const USUARIO_A = 'usuario-a' as UsuarioId;
const USUARIO_B = 'usuario-b' as UsuarioId;
const CASA_1 = 'casa-1' as InstituicaoId;
const CASA_2 = 'casa-2' as InstituicaoId;

const donoDe = (usuarioId: UsuarioId, instituicaoId: InstituicaoId) => ({ usuarioId, instituicaoId });
const contextoDe = (usuarioId: UsuarioId, instituicaoId: InstituicaoId) =>
  criarContextoDeAcesso({ usuarioId, instituicaoId, permissoes: new Set() });

describe('CacheDeContextoDeAcesso', () => {
  let relogio: RelogioManual;
  let cache: CacheDeContextoDeAcesso;

  beforeEach(() => {
    relogio = new RelogioManual(Date.parse('2026-10-08T12:00:00.000Z'));
    cache = new CacheDeContextoDeAcesso(relogio);
  });

  function guardarUsuario(sujeito: string, usuarioId: UsuarioId, instituicaoId: InstituicaoId) {
    cache.guardar(sujeito, donoDe(usuarioId, instituicaoId), contextoDe(usuarioId, instituicaoId), cache.geracaoAtual());
  }

  it('o TTL padrão é de 60 segundos', () => {
    expect(TTL_DO_CACHE_DE_ACESSO_EM_MS).toBe(60_000);
  });

  it('devolve o resultado guardado enquanto o TTL não vence', () => {
    guardarUsuario('sub-a', USUARIO_A, CASA_1);

    relogio.avancar(TTL_DO_CACHE_DE_ACESSO_EM_MS - 1);

    expect(cache.obter('sub-a')).toEqual(contextoDe(USUARIO_A, CASA_1));
  });

  it('esquece o resultado exatamente no vencimento do TTL', () => {
    guardarUsuario('sub-a', USUARIO_A, CASA_1);

    relogio.avancar(TTL_DO_CACHE_DE_ACESSO_EM_MS);

    expect(cache.obter('sub-a')).toBeUndefined();
  });

  it('guarda também a recusa', () => {
    const recusa = recusarAcesso('USUARIO_SUSPENSO');
    cache.guardar('sub-a', donoDe(USUARIO_A, CASA_1), recusa, cache.geracaoAtual());

    expect(cache.obter('sub-a')).toBe(recusa);
  });

  it('invalidar o usuário esquece só as entradas dele', () => {
    guardarUsuario('sub-a', USUARIO_A, CASA_1);
    guardarUsuario('sub-b', USUARIO_B, CASA_1);

    cache.invalidarUsuario(USUARIO_A);

    expect(cache.obter('sub-a')).toBeUndefined();
    expect(cache.obter('sub-b')).toBeDefined();
  });

  it('invalidar a instituição esquece todos os usuários dela e preserva os de outra', () => {
    guardarUsuario('sub-a', USUARIO_A, CASA_1);
    guardarUsuario('sub-b', USUARIO_B, CASA_1);
    guardarUsuario('sub-c', 'usuario-c' as UsuarioId, CASA_2);

    cache.invalidarInstituicao(CASA_1);

    expect(cache.obter('sub-a')).toBeUndefined();
    expect(cache.obter('sub-b')).toBeUndefined();
    expect(cache.obter('sub-c')).toBeDefined();
  });

  it('invalidar tudo esquece todas as entradas', () => {
    guardarUsuario('sub-a', USUARIO_A, CASA_1);
    guardarUsuario('sub-c', 'usuario-c' as UsuarioId, CASA_2);

    cache.invalidarTudo();

    expect(cache.obter('sub-a')).toBeUndefined();
    expect(cache.obter('sub-c')).toBeUndefined();
  });

  it('descarta a gravação de uma leitura iniciada antes de uma invalidação', () => {
    const geracaoDaLeitura = cache.geracaoAtual();

    cache.invalidarUsuario(USUARIO_B);
    cache.guardar('sub-a', donoDe(USUARIO_A, CASA_1), contextoDe(USUARIO_A, CASA_1), geracaoDaLeitura);

    expect(cache.obter('sub-a')).toBeUndefined();
  });

  it('respeita o TTL informado no construtor', () => {
    const curto = new CacheDeContextoDeAcesso(relogio, 10);
    curto.guardar('sub-a', donoDe(USUARIO_A, CASA_1), contextoDe(USUARIO_A, CASA_1), curto.geracaoAtual());

    relogio.avancar(10);

    expect(curto.obter('sub-a')).toBeUndefined();
  });
});
