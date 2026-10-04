import { describe, expect, it, vi } from 'vitest';
import { criarCredencialOidc, MARGEM_DE_RENOVACAO_EM_SEGUNDOS } from './credencialOidc';
import type { GerenciadorDeUsuario, UsuarioOidc } from './credencialOidc';
import { criarClienteHttp } from './clienteHttp';
import { criarFetchFalso, respostaDeErro, respostaJson } from './apoioDeTeste';

const SEGUNDOS_FOLGADOS = MARGEM_DE_RENOVACAO_EM_SEGUNDOS + 100;

function usuario(sobrescritas: Partial<UsuarioOidc> = {}): UsuarioOidc {
  return {
    access_token: 'token-valido',
    refresh_token: 'refresh-1',
    expires_in: SEGUNDOS_FOLGADOS,
    ...sobrescritas,
  };
}

interface GerenciadorFalso extends GerenciadorDeUsuario {
  readonly getUser: ReturnType<typeof vi.fn<() => Promise<UsuarioOidc | null>>>;
  readonly signinSilent: ReturnType<typeof vi.fn<() => Promise<UsuarioOidc | null>>>;
  readonly removeUser: ReturnType<typeof vi.fn<() => Promise<void>>>;
}

function criarGerenciadorFalso(inicial: UsuarioOidc | null, renovacao?: () => Promise<UsuarioOidc | null>) {
  let atual = inicial;
  const gerenciador: GerenciadorFalso = {
    getUser: vi.fn(() => Promise.resolve(atual)),
    signinSilent: vi.fn(
      renovacao ??
        (() => {
          atual = usuario({ access_token: 'token-renovado', refresh_token: 'refresh-2' });
          return Promise.resolve(atual);
        }),
    ),
    removeUser: vi.fn(() => {
      atual = null;
      return Promise.resolve();
    }),
  };
  return gerenciador;
}

describe('tokenAtual', () => {
  it('entrega o token de acesso do usuário em memória', async () => {
    const credencial = criarCredencialOidc(criarGerenciadorFalso(usuario()));
    expect(await credencial.tokenAtual()).toBe('token-valido');
  });

  it('não entrega token quando não há usuário', async () => {
    const credencial = criarCredencialOidc(criarGerenciadorFalso(null));
    expect(await credencial.tokenAtual()).toBeNull();
  });

  it('não renova enquanto o token tem folga', async () => {
    const gerenciador = criarGerenciadorFalso(usuario());
    await criarCredencialOidc(gerenciador).tokenAtual();
    expect(gerenciador.signinSilent).not.toHaveBeenCalled();
  });

  it('renova antes de entregar um token que vence dentro da margem', async () => {
    const gerenciador = criarGerenciadorFalso(usuario({ expires_in: MARGEM_DE_RENOVACAO_EM_SEGUNDOS }));
    const credencial = criarCredencialOidc(gerenciador);

    expect(await credencial.tokenAtual()).toBe('token-renovado');
    expect(gerenciador.signinSilent).toHaveBeenCalledTimes(1);
  });

  it('renova um token já vencido', async () => {
    const gerenciador = criarGerenciadorFalso(usuario({ expires_in: -5 }));
    expect(await criarCredencialOidc(gerenciador).tokenAtual()).toBe('token-renovado');
  });

  it('não entrega token vencido quando a renovação falha e encerra a sessão', async () => {
    const gerenciador = criarGerenciadorFalso(usuario({ expires_in: 1 }), () => Promise.reject(new Error('invalid_grant')));
    const credencial = criarCredencialOidc(gerenciador);
    const aoEncerrar = vi.fn();
    credencial.aoEncerrar(aoEncerrar);

    expect(await credencial.tokenAtual()).toBeNull();
    expect(aoEncerrar).toHaveBeenCalledTimes(1);
  });
});

describe('renovar', () => {
  it('troca o token pela sessão SSO e informa sucesso', async () => {
    const gerenciador = criarGerenciadorFalso(usuario());
    const credencial = criarCredencialOidc(gerenciador);

    expect(await credencial.renovar()).toBe(true);
    expect(await credencial.tokenAtual()).toBe('token-renovado');
  });

  it('encerra a sessão quando a renovação é recusada', async () => {
    const gerenciador = criarGerenciadorFalso(usuario(), () => Promise.reject(new Error('invalid_grant')));
    const credencial = criarCredencialOidc(gerenciador);
    const aoEncerrar = vi.fn();
    credencial.aoEncerrar(aoEncerrar);

    expect(await credencial.renovar()).toBe(false);

    expect(gerenciador.removeUser).toHaveBeenCalledTimes(1);
    expect(aoEncerrar).toHaveBeenCalledTimes(1);
  });

  it('encerra a sessão quando a renovação não devolve usuário', async () => {
    const gerenciador = criarGerenciadorFalso(usuario(), () => Promise.resolve(null));
    const credencial = criarCredencialOidc(gerenciador);
    const aoEncerrar = vi.fn();
    credencial.aoEncerrar(aoEncerrar);

    expect(await credencial.renovar()).toBe(false);
    expect(aoEncerrar).toHaveBeenCalledTimes(1);
  });

  it('não tenta renovar sem refresh token, nem abre iframe, e encerra a sessão', async () => {
    const gerenciador = criarGerenciadorFalso(usuario({ refresh_token: undefined }));
    const credencial = criarCredencialOidc(gerenciador);
    const aoEncerrar = vi.fn();
    credencial.aoEncerrar(aoEncerrar);

    expect(await credencial.renovar()).toBe(false);
    expect(gerenciador.signinSilent).not.toHaveBeenCalled();
    expect(aoEncerrar).toHaveBeenCalledTimes(1);
  });

  it('junta renovações simultâneas numa só, para não reusar o refresh token rotacionado', async () => {
    const gerenciador = criarGerenciadorFalso(usuario());
    const credencial = criarCredencialOidc(gerenciador);

    const resultados = await Promise.all([credencial.renovar(), credencial.renovar(), credencial.renovar()]);

    expect(resultados).toEqual([true, true, true]);
    expect(gerenciador.signinSilent).toHaveBeenCalledTimes(1);
  });

  it('permite uma nova renovação depois que a anterior terminou', async () => {
    const gerenciador = criarGerenciadorFalso(usuario());
    const credencial = criarCredencialOidc(gerenciador);

    await credencial.renovar();
    await credencial.renovar();

    expect(gerenciador.signinSilent).toHaveBeenCalledTimes(2);
  });
});

describe('aoSessaoEncerrada', () => {
  it('descarta o usuário em memória e avisa quem ouve', async () => {
    const gerenciador = criarGerenciadorFalso(usuario());
    const credencial = criarCredencialOidc(gerenciador);
    const aoEncerrar = vi.fn();
    credencial.aoEncerrar(aoEncerrar);

    credencial.aoSessaoEncerrada();

    expect(gerenciador.removeUser).toHaveBeenCalledTimes(1);
    expect(aoEncerrar).toHaveBeenCalledTimes(1);
    expect(await credencial.tokenAtual()).toBeNull();
  });

  it('não avisa quem deixou de ouvir', () => {
    const credencial = criarCredencialOidc(criarGerenciadorFalso(usuario()));
    const aoEncerrar = vi.fn();
    const deixarDeOuvir = credencial.aoEncerrar(aoEncerrar);

    deixarDeOuvir();
    credencial.aoSessaoEncerrada();

    expect(aoEncerrar).not.toHaveBeenCalled();
  });

  it('segue avisando mesmo quando o descarte do usuário falha', () => {
    const gerenciador = criarGerenciadorFalso(usuario());
    gerenciador.removeUser.mockRejectedValueOnce(new Error('armazenamento indisponível'));
    const credencial = criarCredencialOidc(gerenciador);
    const aoEncerrar = vi.fn();
    credencial.aoEncerrar(aoEncerrar);

    credencial.aoSessaoEncerrada();

    expect(aoEncerrar).toHaveBeenCalledTimes(1);
  });
});

describe('junto do cliente HTTP', () => {
  it('um 401 cuja renovação falha encerra a sessão e entrega o erro', async () => {
    const gerenciador = criarGerenciadorFalso(usuario(), () => Promise.reject(new Error('invalid_grant')));
    const credencial = criarCredencialOidc(gerenciador);
    const aoEncerrar = vi.fn();
    credencial.aoEncerrar(aoEncerrar);
    const fetchFalso = criarFetchFalso(respostaDeErro(401, 'NAO_AUTENTICADO'));
    const cliente = criarClienteHttp({ credencial, fetch: fetchFalso });

    await expect(cliente.requisitar({ metodo: 'GET', caminho: '/eu' })).rejects.toMatchObject({
      codigo: 'NAO_AUTENTICADO',
    });
    expect(aoEncerrar).toHaveBeenCalled();
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it('um 401 cuja renovação funciona repete a chamada com o token novo', async () => {
    const credencial = criarCredencialOidc(criarGerenciadorFalso(usuario()));
    const aoEncerrar = vi.fn();
    credencial.aoEncerrar(aoEncerrar);
    const fetchFalso = criarFetchFalso(respostaDeErro(401, 'NAO_AUTENTICADO'), respostaJson(200, { ok: true }));
    const cliente = criarClienteHttp({ credencial, fetch: fetchFalso });

    await expect(cliente.requisitar({ metodo: 'GET', caminho: '/eu' })).resolves.toEqual({ ok: true });
    expect(new Headers(fetchFalso.mock.calls[1]?.[1]?.headers).get('Authorization')).toBe('Bearer token-renovado');
    expect(aoEncerrar).not.toHaveBeenCalled();
  });
});
