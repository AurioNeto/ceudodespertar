import { createHash, randomBytes } from 'node:crypto';
import type { AmbienteDoAceite } from './ambiente-do-aceite.js';
import { lerFormulario, SessaoHttp } from './sessao-http.js';

const CLIENTE_DE_TESTE = 'cdd-teste';
const CLIENTE_DA_CONTA_DE_SERVICO = 'cdd-api-admin';
const MARGEM_DO_TOKEN_EM_MS = 30_000;

export interface RespostaDeToken {
  readonly status: number;
  readonly corpo: Record<string, unknown>;
}

export interface UsuarioDoKeycloak {
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly enabled: boolean;
  readonly emailVerified: boolean;
  readonly attributes?: Record<string, string[]>;
  readonly requiredActions?: string[];
}

export interface ResultadoDoLinkDeSenha {
  readonly statusDoLink: number;
  readonly formularioApresentado: boolean;
  readonly statusDoEnvio: number;
  readonly locationDoEnvio: string | null;
  readonly corpoDoEnvio: string;
  readonly linkDeRetorno: string | null;
}

function ehPaginaDeConfirmacao(html: string): boolean {
  return /id="continuarAcao"/.test(html);
}

function destinoDeContinuar(html: string): string {
  const link = /<a[^>]*id="continuarAcao"[^>]*href="([^"]+)"/.exec(html)?.[1];
  if (link === undefined) throw new Error('a página de confirmação não tem o link Continuar');
  return link.replaceAll('&amp;', '&');
}

function linkDeRetornoAoSistema(html: string): string | null {
  const link = /<a[^>]*id="voltarAoSistema"[^>]*href="([^"]+)"/.exec(html)?.[1];
  return link === undefined ? null : link.replaceAll('&amp;', '&');
}

function textoDe(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

export class ClienteDoKeycloak {
  private tokenDeServico: { valor: string; expiraEm: number } | undefined;

  constructor(private readonly ambiente: AmbienteDoAceite) {}

  private get urlDoToken(): string {
    return `${this.ambiente.emissor}/protocol/openid-connect/token`;
  }

  private get urlAdmin(): string {
    return `${this.ambiente.urlDoKeycloak}/admin/realms/${this.ambiente.realm}`;
  }

  async entrarComSenha(email: string, senha: string): Promise<RespostaDeToken> {
    return this.pedirToken({ grant_type: 'password', client_id: CLIENTE_DE_TESTE, username: email, password: senha });
  }

  async renovar(refreshToken: string): Promise<RespostaDeToken> {
    return this.pedirToken({ grant_type: 'refresh_token', client_id: CLIENTE_DE_TESTE, refresh_token: refreshToken });
  }

  async entrarPorCodigoComPkce(clienteId: string, redirectUri: string, email: string, senha: string): Promise<RespostaDeToken> {
    const verificador = randomBytes(32).toString('base64url');
    const desafio = createHash('sha256').update(verificador).digest('base64url');
    const sessao = new SessaoHttp(this.ambiente.urlDoKeycloak);
    const consulta = new URLSearchParams({
      client_id: clienteId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid',
      state: randomBytes(8).toString('hex'),
      code_challenge: desafio,
      code_challenge_method: 'S256',
    });
    const pagina = await sessao.pedir(`${this.ambiente.emissor}/protocol/openid-connect/auth?${consulta}`);
    const { acao, campos } = lerFormulario(pagina.corpo);
    campos.set('username', email);
    campos.set('password', senha);
    const envio = await sessao.pedir(acao, { metodo: 'POST', corpo: campos, seguirRedirecionamentos: false });
    const codigo = envio.location === null ? null : new URL(envio.location).searchParams.get('code');
    if (codigo === null) throw new Error(`login por código não devolveu code (status ${envio.status})`);
    return this.pedirToken({
      grant_type: 'authorization_code',
      client_id: clienteId,
      redirect_uri: redirectUri,
      code: codigo,
      code_verifier: verificador,
    });
  }

  async definirSenhaPeloLink(link: string, senha: string): Promise<ResultadoDoLinkDeSenha> {
    const sessao = new SessaoHttp(this.ambiente.urlDoKeycloak);
    const primeira = await sessao.pedir(link);
    const pagina = ehPaginaDeConfirmacao(primeira.corpo) ? await sessao.pedir(destinoDeContinuar(primeira.corpo)) : primeira;
    const formularioApresentado = /name="password-new"/.test(pagina.corpo);
    if (!formularioApresentado) {
      return {
        statusDoLink: pagina.status,
        formularioApresentado,
        statusDoEnvio: 0,
        locationDoEnvio: null,
        corpoDoEnvio: pagina.corpo,
        linkDeRetorno: null,
      };
    }
    const { acao, campos } = lerFormulario(pagina.corpo);
    campos.set('password-new', senha);
    campos.set('password-confirm', senha);
    const envio = await sessao.pedir(acao, { metodo: 'POST', corpo: campos, seguirRedirecionamentos: false });
    return {
      statusDoLink: pagina.status,
      formularioApresentado,
      statusDoEnvio: envio.status,
      locationDoEnvio: envio.location,
      corpoDoEnvio: envio.corpo,
      linkDeRetorno: linkDeRetornoAoSistema(envio.corpo),
    };
  }

  async admin(caminho: string, init: { metodo?: string; corpo?: unknown } = {}): Promise<Response> {
    const token = await this.obterTokenDeServico();
    return fetch(`${this.urlAdmin}${caminho}`, {
      method: init.metodo ?? 'GET',
      headers: {
        authorization: `Bearer ${token}`,
        ...(init.corpo === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(init.corpo === undefined ? {} : { body: JSON.stringify(init.corpo) }),
    });
  }

  async usuarioPorEmail(email: string): Promise<UsuarioDoKeycloak | undefined> {
    const resposta = await this.admin(`/users?${new URLSearchParams({ email, exact: 'true' })}`);
    if (!resposta.ok) throw new Error(`GET /users?email= respondeu ${resposta.status}`);
    const usuarios = (await resposta.json()) as UsuarioDoKeycloak[];
    return usuarios[0];
  }

  async usuarioPorId(id: string): Promise<UsuarioDoKeycloak> {
    const resposta = await this.admin(`/users/${id}`);
    if (!resposta.ok) throw new Error(`GET /users/{id} respondeu ${resposta.status}`);
    return (await resposta.json()) as UsuarioDoKeycloak;
  }

  async sessoesDoUsuario(id: string): Promise<unknown[]> {
    const resposta = await this.admin(`/users/${id}/sessions`);
    if (!resposta.ok) throw new Error(`GET /users/{id}/sessions respondeu ${resposta.status}`);
    return (await resposta.json()) as unknown[];
  }

  async definirAtributosDoPerfil(id: string, atributos: Record<string, string[]>): Promise<void> {
    const { userProfileMetadata: _metadados, ...representacao } = (await this.usuarioPorId(id)) as UsuarioDoKeycloak & {
      userProfileMetadata?: unknown;
    };
    const resposta = await this.admin(`/users/${id}`, { metodo: 'PUT', corpo: { ...representacao, attributes: atributos } });
    if (!resposta.ok) throw new Error(`PUT /users/{id} respondeu ${resposta.status}`);
  }

  async pedirComToken(caminhoAbsoluto: string, token: string, init: { metodo?: string; corpo?: unknown } = {}): Promise<Response> {
    return fetch(caminhoAbsoluto, {
      method: init.metodo ?? 'GET',
      headers: {
        authorization: `Bearer ${token}`,
        ...(init.corpo === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(init.corpo === undefined ? {} : { body: JSON.stringify(init.corpo) }),
    });
  }

  private async obterTokenDeServico(): Promise<string> {
    if (this.tokenDeServico !== undefined && this.tokenDeServico.expiraEm > Date.now()) return this.tokenDeServico.valor;
    const resposta = await this.pedirToken({
      grant_type: 'client_credentials',
      client_id: CLIENTE_DA_CONTA_DE_SERVICO,
      client_secret: this.ambiente.segredoDaContaDeServico,
    });
    const valor = textoDe(resposta.corpo['access_token']);
    if (valor === '') throw new Error(`token da conta de serviço recusado (${resposta.status})`);
    const duracaoEmMs = Number(resposta.corpo['expires_in']) * 1000;
    this.tokenDeServico = { valor, expiraEm: Date.now() + duracaoEmMs - MARGEM_DO_TOKEN_EM_MS };
    return valor;
  }

  private async pedirToken(parametros: Record<string, string>): Promise<RespostaDeToken> {
    const resposta = await fetch(this.urlDoToken, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(parametros),
    });
    return { status: resposta.status, corpo: (await resposta.json()) as Record<string, unknown> };
  }
}

export function subDoToken(accessToken: string): string {
  const [, carga = ''] = accessToken.split('.');
  return (JSON.parse(Buffer.from(carga, 'base64url').toString('utf8')) as { sub: string }).sub;
}

export function conviteDoLinkDoEmail(link: string): string {
  const chave = new URL(link).searchParams.get('key') ?? '';
  const [, carga = ''] = chave.split('.');
  const { reduri } = JSON.parse(Buffer.from(carga, 'base64url').toString('utf8')) as { reduri: string };
  return conviteDaUrlDeRetorno(reduri);
}

export function conviteDaUrlDeRetorno(url: string): string {
  return new URL(url).searchParams.get('convite') ?? '';
}
