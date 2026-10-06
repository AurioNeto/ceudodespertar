import { describe, expect, it, vi } from 'vitest';
import { ErrorResponse, ErrorTimeout } from 'oidc-client-ts';
import { criarCredencialOidc, MARGEM_DE_RENOVACAO_EM_SEGUNDOS } from './credencialOidc';
import type { ArgumentosDaRenovacaoSilenciosa, GerenciadorDeUsuario, UsuarioOidc } from './credencialOidc';
import { ESPERA_DA_RENOVACAO_SILENCIOSA_EM_SEGUNDOS } from './oidc';
import { criarClienteHttp } from './clienteHttp';
import { ErroDeRede } from './erros';
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
  readonly signinSilent: ReturnType<
    typeof vi.fn<(argumentos?: ArgumentosDaRenovacaoSilenciosa) => Promise<UsuarioOidc | null>>
  >;
  readonly removeUser: ReturnType<typeof vi.fn<() => Promise<void>>>;
}

type Renovacao = (argumentos?: ArgumentosDaRenovacaoSilenciosa) => Promise<UsuarioOidc | null>;

const recusaDoTokenEndpoint = () => new ErrorResponse({ error: 'invalid_grant' });
const recusaDoSso = () => new ErrorResponse({ error: 'login_required' });
const falhaDeRede = () => new TypeError('Failed to fetch');
const prazoEsgotado = () => new ErrorTimeout('Network timed out');

function criarGerenciadorFalso(inicial: UsuarioOidc | null, renovacao?: Renovacao) {
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
    const gerenciador = criarGerenciadorFalso(usuario({ expires_in: 1 }), (argumentos) =>
      argumentos?.forceIframeAuth ? Promise.reject(recusaDoSso()) : Promise.reject(recusaDoTokenEndpoint()),
    );
    const credencial = criarCredencialOidc(gerenciador);
    const aoEncerrar = vi.fn();
    credencial.aoEncerrar(aoEncerrar);

    expect(await credencial.tokenAtual()).toBeNull();
    expect(aoEncerrar).toHaveBeenCalledTimes(1);
  });

  it('com a rede indisponível mantém a sessão e entrega o token que ainda existe', async () => {
    const gerenciador = criarGerenciadorFalso(usuario({ expires_in: 10 }), () => Promise.reject(falhaDeRede()));
    const credencial = criarCredencialOidc(gerenciador);
    const aoEncerrar = vi.fn();
    credencial.aoEncerrar(aoEncerrar);

    expect(await credencial.tokenAtual()).toBe('token-valido');
    expect(aoEncerrar).not.toHaveBeenCalled();
    expect(gerenciador.removeUser).not.toHaveBeenCalled();
  });
});

describe('renovar', () => {
  it('troca o token pela sessão SSO e informa que renovou', async () => {
    const gerenciador = criarGerenciadorFalso(usuario());
    const credencial = criarCredencialOidc(gerenciador);

    expect(await credencial.renovar()).toBe('renovado');
    expect(await credencial.tokenAtual()).toBe('token-renovado');
  });

  it('passa o prazo explicitamente, para não herdar um timeout indefinido', async () => {
    const gerenciador = criarGerenciadorFalso(usuario());

    await criarCredencialOidc(gerenciador).renovar();

    expect(gerenciador.signinSilent).toHaveBeenCalledWith({
      silentRequestTimeoutInSeconds: ESPERA_DA_RENOVACAO_SILENCIOSA_EM_SEGUNDOS,
    });
  });

  it('respeita o prazo configurado', async () => {
    const gerenciador = criarGerenciadorFalso(usuario());

    await criarCredencialOidc(gerenciador, { esperaDaRenovacaoEmSegundos: 2 }).renovar();

    expect(gerenciador.signinSilent).toHaveBeenCalledWith({ silentRequestTimeoutInSeconds: 2 });
  });

  it.each([
    ['o prazo esgotado', prazoEsgotado],
    ['a falha de rede', falhaDeRede],
  ])('com %s mantém o usuário e diz que está indisponível', async (_nome, criarErro) => {
    const gerenciador = criarGerenciadorFalso(usuario(), () => Promise.reject(criarErro()));
    const credencial = criarCredencialOidc(gerenciador);
    const aoEncerrar = vi.fn();
    credencial.aoEncerrar(aoEncerrar);

    expect(await credencial.renovar()).toBe('indisponivel');

    expect(gerenciador.removeUser).not.toHaveBeenCalled();
    expect(aoEncerrar).not.toHaveBeenCalled();
    expect(gerenciador.signinSilent).toHaveBeenCalledTimes(1);
  });

  it('erro que não é do token endpoint nem de rede também não encerra a sessão', async () => {
    const gerenciador = criarGerenciadorFalso(usuario(), () => Promise.reject(new Error('Bad Gateway (502)')));
    const credencial = criarCredencialOidc(gerenciador);

    expect(await credencial.renovar()).toBe('indisponivel');
    expect(gerenciador.removeUser).not.toHaveBeenCalled();
  });

  it('recusa do token endpoint tenta recuperar pelo SSO antes de encerrar', async () => {
    let chamadas = 0;
    const gerenciador = criarGerenciadorFalso(usuario(), (argumentos) => {
      chamadas += 1;
      if (!argumentos?.forceIframeAuth) return Promise.reject(recusaDoTokenEndpoint());
      return Promise.resolve(usuario({ access_token: 'token-do-sso', refresh_token: 'refresh-do-sso' }));
    });
    const credencial = criarCredencialOidc(gerenciador);
    const aoEncerrar = vi.fn();
    credencial.aoEncerrar(aoEncerrar);

    expect(await credencial.renovar()).toBe('renovado');

    expect(chamadas).toBe(2);
    expect(gerenciador.signinSilent).toHaveBeenLastCalledWith({
      forceIframeAuth: true,
      silentRequestTimeoutInSeconds: ESPERA_DA_RENOVACAO_SILENCIOSA_EM_SEGUNDOS,
    });
    expect(gerenciador.removeUser).not.toHaveBeenCalled();
    expect(aoEncerrar).not.toHaveBeenCalled();
  });

  it('recusa do token endpoint e do SSO encerra a sessão', async () => {
    const gerenciador = criarGerenciadorFalso(usuario(), (argumentos) =>
      Promise.reject(argumentos?.forceIframeAuth ? recusaDoSso() : recusaDoTokenEndpoint()),
    );
    const credencial = criarCredencialOidc(gerenciador);
    const aoEncerrar = vi.fn();
    credencial.aoEncerrar(aoEncerrar);

    expect(await credencial.renovar()).toBe('sessao-encerrada');

    expect(gerenciador.removeUser).toHaveBeenCalledTimes(1);
    expect(aoEncerrar).toHaveBeenCalledTimes(1);
  });

  it('recusa do token endpoint e SSO sem resposta de rede mantém a sessão', async () => {
    const gerenciador = criarGerenciadorFalso(usuario(), (argumentos) =>
      Promise.reject(argumentos?.forceIframeAuth ? prazoEsgotado() : recusaDoTokenEndpoint()),
    );
    const credencial = criarCredencialOidc(gerenciador);

    expect(await credencial.renovar()).toBe('indisponivel');
    expect(gerenciador.removeUser).not.toHaveBeenCalled();
  });

  it('SSO que não devolve usuário encerra a sessão', async () => {
    const gerenciador = criarGerenciadorFalso(usuario(), (argumentos) =>
      argumentos?.forceIframeAuth ? Promise.resolve(null) : Promise.reject(recusaDoTokenEndpoint()),
    );

    expect(await criarCredencialOidc(gerenciador).renovar()).toBe('sessao-encerrada');
  });

  it('renovação que não devolve usuário encerra a sessão', async () => {
    const gerenciador = criarGerenciadorFalso(usuario(), () => Promise.resolve(null));
    const credencial = criarCredencialOidc(gerenciador);
    const aoEncerrar = vi.fn();
    credencial.aoEncerrar(aoEncerrar);

    expect(await credencial.renovar()).toBe('sessao-encerrada');
    expect(aoEncerrar).toHaveBeenCalledTimes(1);
  });

  it('não tenta renovar sem refresh token, nem abre iframe, e encerra a sessão', async () => {
    const gerenciador = criarGerenciadorFalso(usuario({ refresh_token: undefined }));
    const credencial = criarCredencialOidc(gerenciador);
    const aoEncerrar = vi.fn();
    credencial.aoEncerrar(aoEncerrar);

    expect(await credencial.renovar()).toBe('sessao-encerrada');
    expect(gerenciador.signinSilent).not.toHaveBeenCalled();
    expect(aoEncerrar).toHaveBeenCalledTimes(1);
  });

  it('junta renovações simultâneas numa só, para não reusar o refresh token rotacionado', async () => {
    const gerenciador = criarGerenciadorFalso(usuario());
    const credencial = criarCredencialOidc(gerenciador);

    const resultados = await Promise.all([credencial.renovar(), credencial.renovar(), credencial.renovar()]);

    expect(resultados).toEqual(['renovado', 'renovado', 'renovado']);
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
  it('um 401 cuja renovação e cujo SSO são recusados encerra a sessão e entrega o erro', async () => {
    const gerenciador = criarGerenciadorFalso(usuario(), (argumentos) =>
      Promise.reject(argumentos?.forceIframeAuth ? recusaDoSso() : recusaDoTokenEndpoint()),
    );
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

  it('um 401 com a rede fora do ar mantém a sessão e entrega erro de rede', async () => {
    const gerenciador = criarGerenciadorFalso(usuario(), () => Promise.reject(falhaDeRede()));
    const credencial = criarCredencialOidc(gerenciador);
    const aoEncerrar = vi.fn();
    credencial.aoEncerrar(aoEncerrar);
    const fetchFalso = criarFetchFalso(respostaDeErro(401, 'NAO_AUTENTICADO'));
    const cliente = criarClienteHttp({ credencial, fetch: fetchFalso });

    await expect(cliente.requisitar({ metodo: 'GET', caminho: '/eu' })).rejects.toBeInstanceOf(ErroDeRede);
    expect(aoEncerrar).not.toHaveBeenCalled();
    expect(gerenciador.removeUser).not.toHaveBeenCalled();
  });

  it('um 401 cujo refresh velho é recusado repete a chamada com o token que o SSO devolveu', async () => {
    let atual = usuario();
    const gerenciador = criarGerenciadorFalso(atual, (argumentos) => {
      if (!argumentos?.forceIframeAuth) return Promise.reject(recusaDoTokenEndpoint());
      atual = usuario({ access_token: 'token-do-sso', refresh_token: 'refresh-do-sso' });
      return Promise.resolve(atual);
    });
    gerenciador.getUser.mockImplementation(() => Promise.resolve(atual));
    const credencial = criarCredencialOidc(gerenciador);
    const fetchFalso = criarFetchFalso(respostaDeErro(401, 'NAO_AUTENTICADO'), respostaJson(200, { ok: true }));
    const cliente = criarClienteHttp({ credencial, fetch: fetchFalso });

    await expect(cliente.requisitar({ metodo: 'GET', caminho: '/eu' })).resolves.toEqual({ ok: true });
    expect(new Headers(fetchFalso.mock.calls[1]?.[1]?.headers).get('Authorization')).toBe('Bearer token-do-sso');
  });
});
