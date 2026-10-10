import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ClienteAdminDoKeycloak } from '../../../src/modules/identidade/infrastructure/keycloak/cliente-admin-do-keycloak.js';
import type { SessaoNoKeycloak } from '../../../src/modules/identidade/infrastructure/keycloak/cliente-admin-do-keycloak.js';
import {
  configuracaoDoKeycloakDe,
  ORCAMENTO_DA_OPERACAO_EM_MS,
  TIMEOUT_POR_CHAMADA_EM_MS,
} from '../../../src/modules/identidade/infrastructure/keycloak/configuracao-do-keycloak.js';
import type { ConfiguracaoDoKeycloak } from '../../../src/modules/identidade/infrastructure/keycloak/configuracao-do-keycloak.js';
import {
  KeycloakIndisponivel,
  UsuarioNaoExisteNoKeycloak,
} from '../../../src/modules/identidade/infrastructure/keycloak/erros-do-keycloak.js';
import { analisarAmbiente } from '../../../src/shared/infrastructure/configuracao/esquema-de-ambiente.js';
import { AMBIENTE_DO_KEYCLOAK_DE_TESTE } from '../../ambiente-de-teste.js';
import { CAMINHO_DO_TOKEN, CAMINHO_DOS_USUARIOS, RelogioManual, ServidorKeycloakFalso } from './servidor-keycloak-falso.js';

const MARGEM_DO_TOKEN_EM_MS = 30_000;
const COM_RETRY = { renovarTokenEm401: true };
const SEM_RETRY = { renovarTokenEm401: false };
const PEDIDO = { metodo: 'GET', caminho: '/users/abc' } as const;

describe('ClienteAdminDoKeycloak', () => {
  let servidor: ServidorKeycloakFalso;
  let relogio: RelogioManual;
  let configuracao: ConfiguracaoDoKeycloak;

  beforeEach(async () => {
    servidor = new ServidorKeycloakFalso();
    relogio = new RelogioManual();
    configuracao = {
      urlBase: await servidor.iniciar(),
      realm: 'cdd',
      clientId: 'cdd-api-admin',
      segredo: 'segredo-da-conta',
      timeoutPorChamadaEmMs: 1_000,
      orcamentoDaOperacaoEmMs: 5_000,
    };
  });

  afterEach(async () => {
    await servidor.derrubar();
  });

  function cliente(): ClienteAdminDoKeycloak {
    return new ClienteAdminDoKeycloak(configuracao, relogio);
  }

  function chamar(opcoes = COM_RETRY, pedido: Parameters<SessaoNoKeycloak['requisitar']>[0] = PEDIDO) {
    return cliente().executar(opcoes, (sessao) => sessao.requisitar(pedido));
  }

  it('usa os limites de 3 s por chamada e 15 s por operação', () => {
    const ambiente = analisarAmbiente({
      OIDC_EMISSOR: 'http://localhost:8080/realms/cdd',
      OIDC_AUDIENCIA: 'cdd-api',
      ...AMBIENTE_DO_KEYCLOAK_DE_TESTE,
    });

    expect(configuracaoDoKeycloakDe(ambiente)).toMatchObject({
      timeoutPorChamadaEmMs: 3_000,
      orcamentoDaOperacaoEmMs: 15_000,
    });
    expect(TIMEOUT_POR_CHAMADA_EM_MS).toBe(3_000);
    expect(ORCAMENTO_DA_OPERACAO_EM_MS).toBe(15_000);
  });

  it('pede o token por client_credentials e o envia como bearer', async () => {
    servidor.definir('GET', '/admin/realms/cdd/users/abc', { status: 200, corpo: {} });

    await chamar();

    const [pedidoDeToken] = servidor.chamadasA('POST', CAMINHO_DO_TOKEN);
    expect(Object.fromEntries(new URLSearchParams(pedidoDeToken!.corpo))).toEqual({
      grant_type: 'client_credentials',
      client_id: 'cdd-api-admin',
      client_secret: 'segredo-da-conta',
    });
    expect(servidor.chamadasA('GET', '/admin/realms/cdd/users/abc')[0]!.cabecalhos.authorization).toBe('Bearer token-1');
  });

  it('reaproveita o token em cache sem nova chamada', async () => {
    servidor.definir('GET', '/admin/realms/cdd/users/abc', { status: 200, corpo: {} });
    const compartilhado = cliente();

    await compartilhado.executar(COM_RETRY, (sessao) => sessao.requisitar(PEDIDO));
    await compartilhado.executar(COM_RETRY, (sessao) => sessao.requisitar(PEDIDO));

    expect(servidor.chamadasA('POST', CAMINHO_DO_TOKEN)).toHaveLength(1);
  });

  it('renova o token quando falta menos que a margem de 30 s para expirar', async () => {
    servidor.definir('GET', '/admin/realms/cdd/users/abc', { status: 200, corpo: {} });
    const compartilhado = cliente();
    const validadeEmMs = servidor.expiraEmSegundos * 1_000 - MARGEM_DO_TOKEN_EM_MS;

    await compartilhado.executar(COM_RETRY, (sessao) => sessao.requisitar(PEDIDO));
    relogio.avancarEmMs(validadeEmMs - 1);
    await compartilhado.executar(COM_RETRY, (sessao) => sessao.requisitar(PEDIDO));
    expect(servidor.chamadasA('POST', CAMINHO_DO_TOKEN)).toHaveLength(1);

    relogio.avancarEmMs(1);
    await compartilhado.executar(COM_RETRY, (sessao) => sessao.requisitar(PEDIDO));
    expect(servidor.chamadasA('POST', CAMINHO_DO_TOKEN)).toHaveLength(2);
  });

  it('mantém uma só requisição de token em voo para operações simultâneas', async () => {
    servidor.definir('GET', '/admin/realms/cdd/users/abc', { status: 200, corpo: {} });
    servidor.definir('POST', CAMINHO_DO_TOKEN, { status: 200, corpo: { access_token: 'unico', expires_in: 300 }, atrasoEmMs: 50 });
    const compartilhado = cliente();

    await Promise.all([
      compartilhado.executar(COM_RETRY, (sessao) => sessao.requisitar(PEDIDO)),
      compartilhado.executar(COM_RETRY, (sessao) => sessao.requisitar(PEDIDO)),
      compartilhado.executar(COM_RETRY, (sessao) => sessao.requisitar(PEDIDO)),
    ]);

    expect(servidor.chamadasA('POST', CAMINHO_DO_TOKEN)).toHaveLength(1);
  });

  it('no 401 do convite, renova o token e repete uma vez', async () => {
    servidor.definir('GET', '/admin/realms/cdd/users/abc', (requisicao) =>
      requisicao.cabecalhos.authorization === 'Bearer token-2' ? { status: 200, corpo: {} } : { status: 401 },
    );

    const resposta = await chamar(COM_RETRY);

    expect(resposta.status).toBe(200);
    expect(servidor.chamadasA('POST', CAMINHO_DO_TOKEN)).toHaveLength(2);
    expect(servidor.chamadasA('GET', '/admin/realms/cdd/users/abc')).toHaveLength(2);
  });

  it('não repete mais de uma vez quando o 401 persiste', async () => {
    servidor.definir('GET', '/admin/realms/cdd/users/abc', { status: 401 });

    await expect(chamar(COM_RETRY)).rejects.toMatchObject({ name: 'KeycloakRecusou', status: 401 });

    expect(servidor.chamadasA('GET', '/admin/realms/cdd/users/abc')).toHaveLength(2);
  });

  it('descarta o token quando o 401 persiste após a repetição', async () => {
    servidor.definir('GET', '/admin/realms/cdd/users/abc', { status: 401 });
    const compartilhado = cliente();

    await expect(compartilhado.executar(COM_RETRY, (sessao) => sessao.requisitar(PEDIDO))).rejects.toMatchObject({
      status: 401,
    });
    await expect(compartilhado.executar(COM_RETRY, (sessao) => sessao.requisitar(PEDIDO))).rejects.toMatchObject({
      status: 401,
    });

    expect(servidor.chamadasA('POST', CAMINHO_DO_TOKEN)).toHaveLength(4);
  });

  it('sem retry, o 401 descarta o token e lança transitório', async () => {
    servidor.definir('GET', '/admin/realms/cdd/users/abc', { status: 401 });
    const compartilhado = cliente();

    await expect(compartilhado.executar(SEM_RETRY, (sessao) => sessao.requisitar(PEDIDO))).rejects.toBeInstanceOf(
      KeycloakIndisponivel,
    );
    expect(servidor.chamadasA('GET', '/admin/realms/cdd/users/abc')).toHaveLength(1);

    await expect(compartilhado.executar(SEM_RETRY, (sessao) => sessao.requisitar(PEDIDO))).rejects.toBeInstanceOf(
      KeycloakIndisponivel,
    );
    expect(servidor.chamadasA('POST', CAMINHO_DO_TOKEN)).toHaveLength(2);
  });

  it.each([500, 502, 503, 408, 429])('trata o status %i como indisponibilidade transitória', async (status) => {
    servidor.definir('GET', '/admin/realms/cdd/users/abc', { status });

    await expect(chamar()).rejects.toBeInstanceOf(KeycloakIndisponivel);
  });

  it.each([400, 403, 409, 422])('trata o status %i como recusa permanente', async (status) => {
    servidor.definir('GET', '/admin/realms/cdd/users/abc', { status });

    await expect(chamar()).rejects.toMatchObject({ name: 'KeycloakRecusou', status });
  });

  it('trata redirecionamento como recusa sem segui-lo', async () => {
    servidor.definir('GET', '/admin/realms/cdd/users/abc', { status: 302, cabecalhos: { location: '/alhures' } });

    await expect(chamar()).rejects.toMatchObject({ name: 'KeycloakRecusou', status: 302 });
    expect(servidor.chamadasA('GET', '/alhures')).toHaveLength(0);
  });

  it('trata 404 como usuário que não existe', async () => {
    servidor.definir('GET', '/admin/realms/cdd/users/abc', { status: 404 });

    await expect(chamar()).rejects.toBeInstanceOf(UsuarioNaoExisteNoKeycloak);
  });

  it('devolve o status aceito pelo chamador em vez de lançar', async () => {
    servidor.definir('POST', CAMINHO_DOS_USUARIOS, { status: 409 });

    const resposta = await chamar(COM_RETRY, { metodo: 'POST', caminho: '/users', corpo: {}, aceitar: [409] });

    expect(resposta.status).toBe(409);
  });

  it('lê o Location e o corpo JSON da resposta', async () => {
    servidor.definir('POST', CAMINHO_DOS_USUARIOS, { status: 201, cabecalhos: { location: '/users/novo' }, corpo: { ok: 1 } });

    const resposta = await chamar(COM_RETRY, { metodo: 'POST', caminho: '/users', corpo: {} });

    expect(resposta.location).toBe('/users/novo');
    expect(resposta.json()).toEqual({ ok: 1 });
  });

  it('recusa o pedido de token que o servidor rejeita', async () => {
    servidor.definir('POST', CAMINHO_DO_TOKEN, { status: 401 });

    await expect(chamar()).rejects.toMatchObject({ name: 'KeycloakRecusou', status: 401 });
  });

  it('trata 404 do endpoint de token como recusa, não como usuário ausente', async () => {
    servidor.definir('POST', CAMINHO_DO_TOKEN, { status: 404 });

    await expect(chamar()).rejects.toMatchObject({ name: 'KeycloakRecusou', status: 404 });
  });

  it('trata resposta de token malformada como transitória', async () => {
    servidor.definir('POST', CAMINHO_DO_TOKEN, { status: 200, corpo: { access_token: '' } });

    await expect(chamar()).rejects.toBeInstanceOf(KeycloakIndisponivel);
  });

  it('estoura o timeout de uma chamada lenta como indisponibilidade', async () => {
    configuracao = { ...configuracao, timeoutPorChamadaEmMs: 80 };
    servidor.definir('GET', '/admin/realms/cdd/users/abc', { status: 200, corpo: {}, atrasoEmMs: 400 });

    await expect(chamar()).rejects.toMatchObject({ name: 'KeycloakIndisponivel', motivo: 'timeout' });
  });

  it('estoura o timeout do pedido de token', async () => {
    configuracao = { ...configuracao, timeoutPorChamadaEmMs: 80 };
    servidor.definir('POST', CAMINHO_DO_TOKEN, { status: 200, corpo: { access_token: 'a', expires_in: 300 }, atrasoEmMs: 400 });

    await expect(chamar()).rejects.toMatchObject({ name: 'KeycloakIndisponivel', motivo: 'timeout' });
  });

  it('trata falha de rede como indisponibilidade', async () => {
    configuracao = { ...configuracao, urlBase: 'http://127.0.0.1:1' };

    await expect(chamar()).rejects.toMatchObject({ name: 'KeycloakIndisponivel', motivo: 'rede' });
  });

  it('esgota o orçamento da operação mesmo quando cada chamada cabe no seu timeout', async () => {
    configuracao = { ...configuracao, timeoutPorChamadaEmMs: 400, orcamentoDaOperacaoEmMs: 300 };
    servidor.definir('POST', CAMINHO_DO_TOKEN, { status: 200, corpo: { access_token: 'a', expires_in: 300 }, atrasoEmMs: 120 });
    servidor.definir('GET', '/admin/realms/cdd/users/abc', { status: 200, corpo: {}, atrasoEmMs: 120 });

    await expect(
      cliente().executar(COM_RETRY, async (sessao) => {
        await sessao.requisitar(PEDIDO);
        await sessao.requisitar(PEDIDO);
        await sessao.requisitar(PEDIDO);
      }),
    ).rejects.toMatchObject({ name: 'KeycloakIndisponivel', motivo: 'timeout' });
  });

  it('interrompe a espera pelo token quando o orçamento esgota antes do fim do pedido de token', async () => {
    const atrasoDoTokenEmMs = 800;
    configuracao = { ...configuracao, timeoutPorChamadaEmMs: 2_000, orcamentoDaOperacaoEmMs: 100 };
    servidor.definir('POST', CAMINHO_DO_TOKEN, {
      status: 200,
      corpo: { access_token: 'a', expires_in: 300 },
      atrasoEmMs: atrasoDoTokenEmMs,
    });
    const inicio = Date.now();

    await expect(chamar()).rejects.toMatchObject({ name: 'KeycloakIndisponivel', motivo: 'timeout' });

    expect(Date.now() - inicio).toBeLessThan(atrasoDoTokenEmMs / 2);
  });

  it('recusa de imediato um pedido feito depois de esgotado o orçamento, sem pedir novo token', async () => {
    const orcamentoEmMs = 60;
    configuracao = { ...configuracao, timeoutPorChamadaEmMs: 2_000, orcamentoDaOperacaoEmMs: orcamentoEmMs };
    servidor.definir('GET', '/admin/realms/cdd/users/abc', { status: 200, corpo: {} });
    const inicio = Date.now();

    await expect(
      cliente().executar(COM_RETRY, async (sessao) => {
        await sessao.requisitar(PEDIDO);
        await new Promise((pronto) => setTimeout(pronto, orcamentoEmMs * 2));
        relogio.avancarEmMs(servidor.expiraEmSegundos * 1_000);
        servidor.definir('POST', CAMINHO_DO_TOKEN, { status: 200, corpo: { access_token: 'b', expires_in: 300 }, atrasoEmMs: 800 });
        await sessao.requisitar(PEDIDO);
      }),
    ).rejects.toMatchObject({ name: 'KeycloakIndisponivel', motivo: 'timeout' });

    expect(Date.now() - inicio).toBeLessThan(500);
  });

  it('não vaza segredo, token nem URL nas mensagens de erro', async () => {
    servidor.definir('GET', '/admin/realms/cdd/users/abc', { status: 503 });

    const erro = await chamar().then(
      () => new Error('não falhou'),
      (motivo: unknown) => motivo as Error,
    );

    const texto = `${erro.name} ${erro.message} ${JSON.stringify(erro)}`;
    expect(texto).not.toContain('segredo-da-conta');
    expect(texto).not.toContain('token-1');
    expect(texto).not.toContain(configuracao.urlBase);
    expect(texto).not.toContain('/users/abc');
  });
});
