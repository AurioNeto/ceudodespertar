import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { User, UserManager } from 'oidc-client-ts';
import type { IWindow } from 'oidc-client-ts';
import {
  CAMINHO_DE_RETORNO,
  ErroDeConfiguracaoOidc,
  ErroDeEntrada,
  configuracaoOidc,
  criarServicoDeEntrada,
  lerAmbienteOidc,
} from './oidc';
import type { AmbienteOidc, GerenciadorDeEntrada } from './oidc';
import { criarCredencialOidc } from './credencialOidc';

const AMBIENTE: AmbienteOidc = {
  emissor: 'http://localhost:8080/realms/cdd',
  cliente: 'cdd-web',
  origem: 'http://localhost:5173',
};

const TOKEN_SECRETO = 'token-que-nao-pode-ir-para-o-disco';

function usuarioLogado(): User {
  return new User({
    access_token: TOKEN_SECRETO,
    refresh_token: 'refresh-que-nao-pode-ir-para-o-disco',
    token_type: 'Bearer',
    profile: { sub: 'u-1', iss: AMBIENTE.emissor, aud: AMBIENTE.cliente, exp: 0, iat: 0 },
    expires_at: Math.floor(Date.now() / 1000) + 300,
  });
}

function conteudoDoArmazenamento(armazenamento: Storage): string {
  return Array.from({ length: armazenamento.length }, (_, i) => {
    const chave = armazenamento.key(i) ?? '';
    return `${chave}=${armazenamento.getItem(chave) ?? ''}`;
  }).join('\n');
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('configuracaoOidc', () => {
  const configuracao = configuracaoOidc(AMBIENTE);

  it('usa o fluxo de código, que o cliente aplica com PKCE S256', () => {
    expect(configuracao.response_type).toBe('code');
    expect(configuracao.client_id).toBe('cdd-web');
    expect(configuracao.authority).toBe('http://localhost:8080/realms/cdd');
  });

  it('pede só o escopo openid, sem offline_access', () => {
    expect(configuracao.scope).toBe('openid');
  });

  it('volta para a rota de retorno dentro do padrão de redirect do realm', () => {
    expect(configuracao.redirect_uri).toBe(`http://localhost:5173${CAMINHO_DE_RETORNO}`);
    expect(configuracao.redirect_uri?.startsWith('http://localhost:5173/')).toBe(true);
  });

  it('volta para a entrada depois do logout', () => {
    expect(configuracao.post_logout_redirect_uri).toBe('http://localhost:5173/entrar');
  });

  it('declara a página mínima que recebe a renovação silenciosa, dentro do padrão de redirect do realm', () => {
    expect(configuracao.silent_redirect_uri).toBe('http://localhost:5173/silencioso.html');
    expect(configuracao.silentRequestTimeoutInSeconds).toBe(5);
  });

  it('desliga a renovação automática, que furaria a renovação única', () => {
    expect(configuracao.automaticSilentRenew).toBe(false);
  });

  it('não monitora a sessão do provedor: o fim da sessão chega pelo 401 e pela renovação', () => {
    expect(configuracao.monitorSession).toBe(false);
  });
});

describe('armazenamento da requisição de login', () => {
  const METADADOS = {
    issuer: AMBIENTE.emissor,
    authorization_endpoint: `${AMBIENTE.emissor}/protocol/openid-connect/auth`,
    token_endpoint: `${AMBIENTE.emissor}/protocol/openid-connect/token`,
  };

  const navegadorQueNaoNavega = {
    prepare: (): Promise<IWindow> =>
      Promise.resolve({ navigate: () => Promise.resolve({ url: '' }), close: () => undefined }),
    callback: () => Promise.resolve(),
  };

  async function iniciarLogin(): Promise<void> {
    const gerenciador = new UserManager(
      { ...configuracaoOidc(AMBIENTE), metadata: METADADOS },
      navegadorQueNaoNavega,
    );
    await gerenciador.signinRedirect({ state: '/lancamentos' });
  }

  it('guarda o verifier e o state só no sessionStorage', async () => {
    await iniciarLogin();

    const guardado = conteudoDoArmazenamento(sessionStorage);
    expect(guardado).toContain('code_verifier');
    expect(guardado).toContain('/lancamentos');
    expect(localStorage.length).toBe(0);
    expect(conteudoDoArmazenamento(localStorage)).not.toContain('code_verifier');
  });
});

describe('renovação contra um token endpoint pendurado', () => {
  const METADADOS = {
    issuer: AMBIENTE.emissor,
    authorization_endpoint: `${AMBIENTE.emissor}/protocol/openid-connect/auth`,
    token_endpoint: `${AMBIENTE.emissor}/protocol/openid-connect/token`,
  };
  const PRAZO_CURTO_EM_SEGUNDOS = 0.05;

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function penduraOTokenEndpoint() {
    const sinais: Array<AbortSignal | null | undefined> = [];
    const fetchPendurado = vi.fn((_entrada: unknown, init?: RequestInit) => {
      sinais.push(init?.signal);
      return new Promise<Response>((_resolver, rejeitar) => {
        init?.signal?.addEventListener('abort', () => {
          rejeitar(new DOMException('aborted', 'AbortError'));
        });
      });
    });
    vi.stubGlobal('fetch', fetchPendurado);
    return { sinais, fetchPendurado };
  }

  async function montarCredencial() {
    const gerenciador = new UserManager({ ...configuracaoOidc(AMBIENTE), metadata: METADADOS });
    await gerenciador.storeUser(usuarioLogado());
    const credencial = criarCredencialOidc(gerenciador, { esperaDaRenovacaoEmSegundos: PRAZO_CURTO_EM_SEGUNDOS });
    return { gerenciador, credencial };
  }

  it('a requisição de token sai com signal', async () => {
    const { sinais } = penduraOTokenEndpoint();
    const { credencial } = await montarCredencial();

    await credencial.renovar();

    expect(sinais).toHaveLength(1);
    expect(sinais[0]).toBeInstanceOf(AbortSignal);
  });

  it('o token endpoint pendurado vira indisponível dentro do prazo e mantém o usuário', async () => {
    penduraOTokenEndpoint();
    const { gerenciador, credencial } = await montarCredencial();
    const inicio = Date.now();

    const resultado = await credencial.renovar();

    expect(resultado).toBe('indisponivel');
    expect(Date.now() - inicio).toBeLessThan(2000);
    expect(await gerenciador.getUser()).not.toBeNull();
  });
});

describe('armazenamento do token', () => {
  it('guarda o usuário só em memória: nada de token no sessionStorage nem no localStorage', async () => {
    const gerenciador = new UserManager(configuracaoOidc(AMBIENTE));

    await gerenciador.storeUser(usuarioLogado());

    expect((await gerenciador.getUser())?.access_token).toBe(TOKEN_SECRETO);
    expect(conteudoDoArmazenamento(sessionStorage)).not.toContain(TOKEN_SECRETO);
    expect(conteudoDoArmazenamento(localStorage)).not.toContain(TOKEN_SECRETO);
    expect(sessionStorage.length + localStorage.length).toBe(0);
  });

  it('um recarregamento começa sem usuário', async () => {
    await new UserManager(configuracaoOidc(AMBIENTE)).storeUser(usuarioLogado());

    const aposRecarregar = new UserManager(configuracaoOidc(AMBIENTE));

    expect(await aposRecarregar.getUser()).toBeNull();
  });
});

describe('lerAmbienteOidc', () => {
  it('lê emissor e cliente do ambiente', () => {
    const ambiente = lerAmbienteOidc(
      { VITE_OIDC_EMISSOR: AMBIENTE.emissor, VITE_OIDC_CLIENTE: AMBIENTE.cliente } as ImportMetaEnv,
      AMBIENTE.origem,
    );
    expect(ambiente).toEqual(AMBIENTE);
  });

  it('falha alto quando falta o emissor', () => {
    expect(() => lerAmbienteOidc({ VITE_OIDC_CLIENTE: 'cdd-web' } as ImportMetaEnv, AMBIENTE.origem)).toThrow(
      ErroDeConfiguracaoOidc,
    );
  });

  it('falha alto quando falta o cliente', () => {
    expect(() => lerAmbienteOidc({ VITE_OIDC_EMISSOR: AMBIENTE.emissor } as ImportMetaEnv, AMBIENTE.origem)).toThrow(
      ErroDeConfiguracaoOidc,
    );
  });
});

describe('criarServicoDeEntrada', () => {
  interface GerenciadorDeEntradaFalso extends GerenciadorDeEntrada {
    readonly signinRedirect: ReturnType<typeof vi.fn<GerenciadorDeEntrada['signinRedirect']>>;
    readonly signinCallback: ReturnType<typeof vi.fn<GerenciadorDeEntrada['signinCallback']>>;
    readonly signoutRedirect: ReturnType<typeof vi.fn<GerenciadorDeEntrada['signoutRedirect']>>;
    readonly getUser: ReturnType<typeof vi.fn<GerenciadorDeEntrada['getUser']>>;
    readonly signinSilent: ReturnType<typeof vi.fn<GerenciadorDeEntrada['signinSilent']>>;
  }

  function criarFalso(): GerenciadorDeEntradaFalso {
    return {
      getUser: vi.fn(() => Promise.resolve(null)),
      signinSilent: vi.fn(() => Promise.resolve(null)),
      removeUser: vi.fn(() => Promise.resolve()),
      signinRedirect: vi.fn(() => Promise.resolve()),
      signinCallback: vi.fn(() => Promise.resolve(usuarioLogado())),
      signoutRedirect: vi.fn(() => Promise.resolve()),
    };
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('manda o destino como estado da requisição de login', async () => {
    const falso = criarFalso();
    await criarServicoDeEntrada(falso).iniciarEntrada('/lancamentos?pagina=2');
    expect(falso.signinRedirect).toHaveBeenCalledWith({ state: '/lancamentos?pagina=2' });
  });

  it('recupera a sessão da memória sem abrir iframe', async () => {
    const falso = criarFalso();
    falso.getUser.mockResolvedValue(usuarioLogado());

    expect(await criarServicoDeEntrada(falso).recuperarSessao()).toBe(true);
    expect(falso.signinSilent).not.toHaveBeenCalled();
  });

  it('sem usuário em memória, recupera a sessão pelo SSO do provedor', async () => {
    const falso = criarFalso();
    falso.signinSilent.mockResolvedValue(usuarioLogado());

    expect(await criarServicoDeEntrada(falso).recuperarSessao()).toBe(true);
    expect(falso.signinSilent).toHaveBeenCalledTimes(1);
  });

  it('sem SSO no provedor, a sessão não existe', async () => {
    const falso = criarFalso();
    falso.signinSilent.mockResolvedValue(null);
    expect(await criarServicoDeEntrada(falso).recuperarSessao()).toBe(false);
  });

  it('login_required ou timeout do iframe significam sem sessão, não erro', async () => {
    const falso = criarFalso();
    falso.signinSilent.mockRejectedValue(new Error('login_required'));
    expect(await criarServicoDeEntrada(falso).recuperarSessao()).toBe(false);
  });

  it('na rota de retorno do login não abre iframe: o código do retorno é quem entra', async () => {
    const falso = criarFalso();
    falso.signinSilent.mockResolvedValue(usuarioLogado());
    const servico = criarServicoDeEntrada(falso, { caminhoAtual: () => '/entrar/retorno' });

    expect(await servico.recuperarSessao()).toBe(false);
    expect(falso.signinSilent).not.toHaveBeenCalled();
  });

  it('recuperações simultâneas abrem um só iframe', async () => {
    const falso = criarFalso();
    falso.signinSilent.mockResolvedValue(usuarioLogado());
    const servico = criarServicoDeEntrada(falso);

    await Promise.all([servico.recuperarSessao(), servico.recuperarSessao()]);

    expect(falso.signinSilent).toHaveBeenCalledTimes(1);
  });

  it('devolve o estado guardado no login ao concluir o retorno', async () => {
    const falso = criarFalso();
    falso.signinCallback.mockResolvedValue(
      Object.assign(usuarioLogado(), { state: '/lancamentos' }),
    );
    expect(await criarServicoDeEntrada(falso).concluirEntrada('http://x/entrar/retorno?code=1')).toBe('/lancamentos');
  });

  it('concluir o mesmo retorno duas vezes consome o código uma só vez', async () => {
    const falso = criarFalso();
    const servico = criarServicoDeEntrada(falso);

    await Promise.all([
      servico.concluirEntrada('http://x/entrar/retorno?code=1'),
      servico.concluirEntrada('http://x/entrar/retorno?code=1'),
    ]);

    expect(falso.signinCallback).toHaveBeenCalledTimes(1);
  });

  it('embrulha a recusa do provedor em ErroDeEntrada', async () => {
    const falso = criarFalso();
    falso.signinCallback.mockRejectedValue(new Error('access_denied'));
    await expect(criarServicoDeEntrada(falso).concluirEntrada('http://x/entrar/retorno?error=1')).rejects.toBeInstanceOf(
      ErroDeEntrada,
    );
  });

  it('trata retorno sem usuário como falha de entrada', async () => {
    const falso = criarFalso();
    falso.signinCallback.mockResolvedValue(undefined);
    await expect(criarServicoDeEntrada(falso).concluirEntrada('http://x/entrar/retorno')).rejects.toBeInstanceOf(
      ErroDeEntrada,
    );
  });

  it('sair faz o logout OIDC', async () => {
    const falso = criarFalso();
    await criarServicoDeEntrada(falso).sair();
    expect(falso.signoutRedirect).toHaveBeenCalledTimes(1);
    expect(falso.removeUser).not.toHaveBeenCalled();
  });

  it('se o logout remoto falha, descarta o usuário local e repassa a falha', async () => {
    const falso = criarFalso();
    falso.signoutRedirect.mockRejectedValue(new Error('keycloak fora'));

    await expect(criarServicoDeEntrada(falso).sair()).rejects.toThrow('keycloak fora');
    expect(falso.removeUser).toHaveBeenCalledTimes(1);
  });
});
