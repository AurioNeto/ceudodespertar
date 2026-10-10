import { Logger } from '@nestjs/common';
import type { InstituicaoId, UsuarioId } from '@cdd/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResolvedorDeSujeito } from '../../../src/modules/identidade/application/convite/resolvedor-de-sujeito.js';
import type { DonoDoSujeito } from '../../../src/modules/identidade/application/convite/resolvedor-de-sujeito.js';
import type { ConviteParaEnviar } from '../../../src/modules/identidade/application/convite/enviador-de-convite.js';
import { ClienteAdminDoKeycloak } from '../../../src/modules/identidade/infrastructure/keycloak/cliente-admin-do-keycloak.js';
import { EnviadorDeConviteKeycloak } from '../../../src/modules/identidade/infrastructure/keycloak/enviador-de-convite.keycloak.js';
import type { ConfiguracaoDoKeycloak } from '../../../src/modules/identidade/infrastructure/keycloak/configuracao-do-keycloak.js';
import { CAMINHO_DOS_USUARIOS, RelogioManual, ServidorKeycloakFalso } from './servidor-keycloak-falso.js';

const SEGREDO = 'segredo-da-conta-de-servico';
const TOKEN_DO_CONVITE = 'tokenDoConvite_-0123456789abcdefghijklmnopqrstuvw';
const ID_NO_KEYCLOAK = '7f1c0d2e-3a4b-4c5d-8e6f-a1b2c3d4e5f6';
const ID_EXISTENTE = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const ID_DO_USUARIO = 'a1000000-0000-7000-8000-000000000002' as UsuarioId;
const ID_DE_OUTRO_USUARIO = 'a2000000-0000-7000-8000-0000000000ff' as UsuarioId;
const ID_DE_OUTRA_INSTITUICAO = 'b2000000-0000-7000-8000-0000000000ee' as InstituicaoId;
const CAMINHO_DO_ENVIO = `${CAMINHO_DOS_USUARIOS}/${ID_NO_KEYCLOAK}/execute-actions-email`;
const SEGUNDOS_EM_72_HORAS = 72 * 60 * 60;

class ResolvedorDeSujeitoFalso extends ResolvedorDeSujeito {
  readonly consultados: string[] = [];
  dono: DonoDoSujeito | undefined;

  resolver(sujeito: string): Promise<DonoDoSujeito | undefined> {
    this.consultados.push(sujeito);
    return Promise.resolve(this.dono);
  }
}

describe('EnviadorDeConviteKeycloak', () => {
  let servidor: ServidorKeycloakFalso;
  let relogio: RelogioManual;
  let sujeitos: ResolvedorDeSujeitoFalso;
  let configuracao: ConfiguracaoDoKeycloak;
  let convite: ConviteParaEnviar;
  const logs: string[] = [];

  beforeEach(async () => {
    servidor = new ServidorKeycloakFalso();
    relogio = new RelogioManual();
    sujeitos = new ResolvedorDeSujeitoFalso();
    configuracao = {
      urlBase: await servidor.iniciar(),
      realm: 'cdd',
      clientId: 'cdd-api-admin',
      segredo: SEGREDO,
      timeoutPorChamadaEmMs: 1_000,
      orcamentoDaOperacaoEmMs: 5_000,
    };
    convite = {
      usuarioId: ID_DO_USUARIO,
      email: 'maria@casa.org',
      nome: 'Maria da Silva',
      token: TOKEN_DO_CONVITE,
      expiraEm: new Date(relogio.agora().getTime() + SEGUNDOS_EM_72_HORAS * 1_000),
    };
    logs.length = 0;
    for (const nivel of ['log', 'warn', 'error', 'debug', 'verbose', 'fatal'] as const) {
      vi.spyOn(Logger.prototype, nivel).mockImplementation((mensagem: unknown) => void logs.push(String(mensagem)));
    }
    servidor.definir('POST', CAMINHO_DOS_USUARIOS, {
      status: 201,
      cabecalhos: { location: `${configuracao.urlBase}${CAMINHO_DOS_USUARIOS}/${ID_NO_KEYCLOAK}` },
    });
    servidor.definir('PUT', CAMINHO_DO_ENVIO, { status: 204 });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await servidor.derrubar();
  });

  function enviar(): Promise<void> {
    const cliente = new ClienteAdminDoKeycloak(configuracao, relogio);
    const enviador = new EnviadorDeConviteKeycloak(cliente, sujeitos, relogio, {
      urlBaseDoApp: 'http://localhost:5173',
      clientIdDoConvite: 'cdd-web',
    });
    return enviador.enviar(convite);
  }

  function adotarUsuarioExistente(usuarios: unknown): void {
    servidor.definir('POST', CAMINHO_DOS_USUARIOS, { status: 409 });
    servidor.definir('GET', CAMINHO_DOS_USUARIOS, { status: 200, corpo: usuarios });
    servidor.definir('PUT', `${CAMINHO_DOS_USUARIOS}/${ID_EXISTENTE}/execute-actions-email`, { status: 204 });
  }

  it('cria o usuário com e-mail como username, nome separado e habilitado', async () => {
    await enviar();

    const [criacao] = servidor.chamadasA('POST', CAMINHO_DOS_USUARIOS);
    expect(JSON.parse(criacao!.corpo)).toEqual({
      username: 'maria@casa.org',
      email: 'maria@casa.org',
      firstName: 'Maria',
      lastName: 'da Silva',
      enabled: true,
    });
  });

  it('nome com espaços repetidos — separa o primeiro nome e junta o resto com um espaço só', async () => {
    convite = { ...convite, nome: '  Ana   Maria  Souza ' };

    await enviar();

    const [criacao] = servidor.chamadasA('POST', CAMINHO_DOS_USUARIOS);
    expect(JSON.parse(criacao!.corpo)).toMatchObject({ firstName: 'Ana', lastName: 'Maria Souza' });
  });

  it('envia o e-mail de ações com a URL exata, client_id do convite e redirect_uri para /entrar', async () => {
    await enviar();

    const [envio] = servidor.chamadasA('PUT', CAMINHO_DO_ENVIO);
    const redirecionamento = encodeURIComponent(`http://localhost:5173/entrar?convite=${TOKEN_DO_CONVITE}`);
    expect(envio!.consultaBruta).toBe(`client_id=cdd-web&redirect_uri=${redirecionamento}&lifespan=${SEGUNDOS_EM_72_HORAS}`);
    expect(envio!.consulta.get('redirect_uri')).toBe(`http://localhost:5173/entrar?convite=${TOKEN_DO_CONVITE}`);
    expect(envio!.consulta.get('redirect_uri')).not.toContain('/callback');
    expect(JSON.parse(envio!.corpo)).toEqual(['UPDATE_PASSWORD']);
    expect(envio!.cabecalhos['content-type']).toBe('application/json');
  });

  it.each([
    [60 * 60, 3_600],
    [60 * 60 + 0.4, 3_601],
    [1, 1],
  ])('deriva o lifespan de expiraEm: %d s restantes viram %d', async (restantes, esperado) => {
    convite = { ...convite, expiraEm: new Date(relogio.agora().getTime() + restantes * 1_000) };

    await enviar();

    expect(servidor.chamadasA('PUT', CAMINHO_DO_ENVIO)[0]!.consulta.get('lifespan')).toBe(String(esperado));
  });

  it.each([0, -1_000])('não dispara o e-mail de ações quando o convite expira %d ms antes de agora', async (atrasoEmMs) => {
    convite = { ...convite, expiraEm: new Date(relogio.agora().getTime() + atrasoEmMs) };

    await expect(enviar()).rejects.toMatchObject({ name: 'ConviteExpiradoAntesDoEnvio' });

    expect(servidor.chamadasA('PUT', CAMINHO_DO_ENVIO)).toHaveLength(0);
  });

  it('não vaza token, e-mail nem redirect_uri na mensagem do erro de convite expirado', async () => {
    convite = { ...convite, expiraEm: relogio.agora() };

    const erro = (await enviar().catch((motivo: unknown) => motivo)) as Error;

    for (const proibido of [TOKEN_DO_CONVITE, convite.email, 'redirect_uri']) {
      expect(erro.message).not.toContain(proibido);
    }
  });

  it('trata Location com percent-encoding malformado como transitório', async () => {
    servidor.definir('POST', CAMINHO_DOS_USUARIOS, {
      status: 201,
      cabecalhos: { location: `${configuracao.urlBase}${CAMINHO_DOS_USUARIOS}/%E0%A4%A` },
    });

    await expect(enviar()).rejects.toMatchObject({ name: 'KeycloakIndisponivel' });
  });

  it('usa o id do Location da criação no caminho do envio', async () => {
    servidor.definir('POST', CAMINHO_DOS_USUARIOS, {
      status: 201,
      cabecalhos: { location: `${configuracao.urlBase}${CAMINHO_DOS_USUARIOS}/${ID_EXISTENTE}` },
    });
    servidor.definir('PUT', `${CAMINHO_DOS_USUARIOS}/${ID_EXISTENTE}/execute-actions-email`, { status: 204 });

    await enviar();

    expect(servidor.chamadasA('PUT', `${CAMINHO_DOS_USUARIOS}/${ID_EXISTENTE}/execute-actions-email`)).toHaveLength(1);
    expect(servidor.chamadasA('GET', CAMINHO_DOS_USUARIOS)).toHaveLength(0);
  });

  it('falha como transitório quando a criação não devolve Location', async () => {
    servidor.definir('POST', CAMINHO_DOS_USUARIOS, { status: 201 });

    await expect(enviar()).rejects.toMatchObject({ name: 'KeycloakIndisponivel' });
    expect(servidor.chamadasA('PUT', CAMINHO_DO_ENVIO)).toHaveLength(0);
  });

  it('no 409, busca por e-mail exato e adota o usuário existente', async () => {
    adotarUsuarioExistente([{ id: ID_EXISTENTE, email: 'Maria@Casa.org' }]);

    await enviar();

    const [busca] = servidor.chamadasA('GET', CAMINHO_DOS_USUARIOS);
    expect(busca!.consultaBruta).toBe('email=maria%40casa.org&exact=true');
    expect(sujeitos.consultados).toEqual([ID_EXISTENTE]);
    expect(servidor.chamadasA('PUT', `${CAMINHO_DOS_USUARIOS}/${ID_EXISTENTE}/execute-actions-email`)).toHaveLength(1);
  });

  it('codifica o e-mail com sinal de mais na busca', async () => {
    convite = { ...convite, email: 'maria+convite@casa.org' };
    adotarUsuarioExistente([{ id: ID_EXISTENTE, email: 'maria+convite@casa.org' }]);

    await enviar();

    expect(servidor.chamadasA('GET', CAMINHO_DOS_USUARIOS)[0]!.consulta.get('email')).toBe('maria+convite@casa.org');
  });

  it('no 409 cujo usuário pertence a outro usuário, não envia e registra sem revelar a outra casa', async () => {
    adotarUsuarioExistente([{ id: ID_EXISTENTE, email: 'maria@casa.org' }]);
    sujeitos.dono = { instituicaoId: ID_DE_OUTRA_INSTITUICAO, usuarioId: ID_DE_OUTRO_USUARIO };

    await expect(enviar()).resolves.toBeUndefined();

    expect(servidor.chamadasA('PUT', `${CAMINHO_DOS_USUARIOS}/${ID_EXISTENTE}/execute-actions-email`)).toHaveLength(0);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toContain(ID_DO_USUARIO);
    for (const segredo of [ID_DE_OUTRA_INSTITUICAO, ID_DE_OUTRO_USUARIO, ID_EXISTENTE, convite.email, TOKEN_DO_CONVITE]) {
      expect(logs[0]).not.toContain(segredo);
    }
  });

  it('no 409 cujo usuário já é o do próprio convite, segue com o envio', async () => {
    adotarUsuarioExistente([{ id: ID_EXISTENTE, email: 'maria@casa.org' }]);
    sujeitos.dono = { instituicaoId: ID_DE_OUTRA_INSTITUICAO, usuarioId: ID_DO_USUARIO };

    await enviar();

    expect(servidor.chamadasA('PUT', `${CAMINHO_DOS_USUARIOS}/${ID_EXISTENTE}/execute-actions-email`)).toHaveLength(1);
  });

  it.each([
    ['lista vazia', []],
    ['e-mail diferente', [{ id: ID_EXISTENTE, email: 'outra@casa.org' }]],
    ['forma inválida', { erro: true }],
  ])('no 409 sem usuário correspondente (%s), recusa em definitivo', async (_caso, usuarios) => {
    adotarUsuarioExistente(usuarios);

    await expect(enviar()).rejects.toMatchObject({ name: 'KeycloakRecusou', status: 409 });
    expect(servidor.chamadasA('PUT', `${CAMINHO_DOS_USUARIOS}/${ID_EXISTENTE}/execute-actions-email`)).toHaveLength(0);
  });

  it('recusa em definitivo o 400 da criação e não envia e-mail', async () => {
    servidor.definir('POST', CAMINHO_DOS_USUARIOS, { status: 400 });

    await expect(enviar()).rejects.toMatchObject({ name: 'KeycloakRecusou', status: 400 });
    expect(servidor.chamadasA('PUT', CAMINHO_DO_ENVIO)).toHaveLength(0);
  });

  it('recusa em definitivo o 400 do envio (por exemplo redirect_uri inválido)', async () => {
    servidor.definir('PUT', CAMINHO_DO_ENVIO, { status: 400 });

    await expect(enviar()).rejects.toMatchObject({ name: 'KeycloakRecusou', status: 400 });
  });

  it.each([500, 503])('trata o %i da criação como transitório', async (status) => {
    servidor.definir('POST', CAMINHO_DOS_USUARIOS, { status });

    await expect(enviar()).rejects.toMatchObject({ name: 'KeycloakIndisponivel' });
  });

  it('trata o 5xx do envio como transitório', async () => {
    servidor.definir('PUT', CAMINHO_DO_ENVIO, { status: 502 });

    await expect(enviar()).rejects.toMatchObject({ name: 'KeycloakIndisponivel' });
  });

  it('trata o timeout do envio como transitório', async () => {
    configuracao = { ...configuracao, timeoutPorChamadaEmMs: 80 };
    servidor.definir('PUT', CAMINHO_DO_ENVIO, { status: 204, atrasoEmMs: 400 });

    await expect(enviar()).rejects.toMatchObject({ name: 'KeycloakIndisponivel', motivo: 'timeout' });
  });

  it('trata a falha de rede como transitória', async () => {
    configuracao = { ...configuracao, urlBase: 'http://127.0.0.1:1' };

    await expect(enviar()).rejects.toMatchObject({ name: 'KeycloakIndisponivel', motivo: 'rede' });
  });

  it('no 401 do envio, renova o token e repete o PUT uma vez sem recriar o usuário', async () => {
    servidor.definir('PUT', CAMINHO_DO_ENVIO, (requisicao) =>
      requisicao.cabecalhos.authorization === 'Bearer token-2' ? { status: 204 } : { status: 401 },
    );

    await enviar();

    expect(servidor.chamadasA('PUT', CAMINHO_DO_ENVIO)).toHaveLength(2);
    expect(servidor.chamadasA('POST', CAMINHO_DOS_USUARIOS)).toHaveLength(1);
  });

  it('não repete o POST de criação por conta própria quando ele falha com 5xx', async () => {
    servidor.definir('POST', CAMINHO_DOS_USUARIOS, { status: 503 });

    await enviar().catch(() => undefined);

    expect(servidor.chamadasA('POST', CAMINHO_DOS_USUARIOS)).toHaveLength(1);
  });

  it('não escreve segredo, token do convite nem redirect_uri em nenhum log, no sucesso nem nas falhas', async () => {
    await enviar();
    adotarUsuarioExistente([{ id: ID_EXISTENTE, email: 'maria@casa.org' }]);
    sujeitos.dono = { instituicaoId: ID_DE_OUTRA_INSTITUICAO, usuarioId: ID_DE_OUTRO_USUARIO };
    await enviar();
    servidor.definir('POST', CAMINHO_DOS_USUARIOS, { status: 503 });
    await enviar().catch(() => undefined);

    const tudo = logs.join('\n');
    for (const proibido of [SEGREDO, TOKEN_DO_CONVITE, 'redirect_uri', 'entrar?convite', 'token-1']) {
      expect(tudo).not.toContain(proibido);
    }
  });
});
