import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { User, UserManager } from 'oidc-client-ts';
import {
  CAMINHO_DE_RETORNO,
  ErroDeConfiguracaoOidc,
  ErroDeEntrada,
  configuracaoOidc,
  criarServicoDeEntrada,
  lerAmbienteOidc,
} from './oidc';
import type { AmbienteOidc, GerenciadorDeEntrada } from './oidc';

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

  it('desliga a renovação automática, que furaria a renovação única', () => {
    expect(configuracao.automaticSilentRenew).toBe(false);
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

  it('informa se há usuário em memória', async () => {
    const falso = criarFalso();
    const servico = criarServicoDeEntrada(falso);
    expect(await servico.existeUsuario()).toBe(false);

    falso.getUser.mockResolvedValue(usuarioLogado());
    expect(await servico.existeUsuario()).toBe(true);
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
  });
});
