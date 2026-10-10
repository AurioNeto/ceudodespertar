import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProvedorDeIdentidadeIndisponivel } from '../../../src/modules/identidade/application/convite/conferidor-de-sujeito.js';
import { ClienteAdminDoKeycloak } from '../../../src/modules/identidade/infrastructure/keycloak/cliente-admin-do-keycloak.js';
import type { ConfiguracaoDoKeycloak } from '../../../src/modules/identidade/infrastructure/keycloak/configuracao-do-keycloak.js';
import { LocalizadorDeSujeitoKeycloak } from '../../../src/modules/identidade/infrastructure/keycloak/localizador-de-sujeito.keycloak.js';
import { CAMINHO_DO_TOKEN, CAMINHO_DOS_USUARIOS, RelogioManual, ServidorKeycloakFalso } from './servidor-keycloak-falso.js';

const USERNAME = 'dev@cdd.local';
const SUB = '7f1c0d2e-3a4b-4c5d-8e6f-a1b2c3d4e5f6';

describe('LocalizadorDeSujeitoKeycloak', () => {
  let servidor: ServidorKeycloakFalso;
  let configuracao: ConfiguracaoDoKeycloak;

  beforeEach(async () => {
    servidor = new ServidorKeycloakFalso();
    configuracao = {
      urlBase: await servidor.iniciar(),
      realm: 'cdd',
      clientId: 'cdd-api-admin',
      segredo: 'segredo-da-conta-de-servico',
      timeoutPorChamadaEmMs: 300,
      orcamentoDaOperacaoEmMs: 2_000,
    };
    servidor.definir('GET', CAMINHO_DOS_USUARIOS, { status: 200, corpo: [{ id: SUB, username: USERNAME }] });
  });

  afterEach(async () => {
    await servidor.derrubar();
  });

  function localizador(): LocalizadorDeSujeitoKeycloak {
    return new LocalizadorDeSujeitoKeycloak(new ClienteAdminDoKeycloak(configuracao, new RelogioManual()));
  }

  it('devolve o id do usuário pelo GET /users?username=<u>&exact=true com o token da conta de serviço', async () => {
    expect(await localizador().subDoUsuario(USERNAME)).toBe(SUB);

    const [consulta] = servidor.chamadasA('GET', CAMINHO_DOS_USUARIOS);
    expect(consulta!.consulta.get('username')).toBe(USERNAME);
    expect(consulta!.consulta.get('exact')).toBe('true');
    expect(consulta!.cabecalhos.authorization).toBe('Bearer token-1');
    expect(servidor.chamadasA('POST', CAMINHO_DO_TOKEN)).toHaveLength(1);
  });

  it('lista vazia: usuário não encontrado', async () => {
    servidor.definir('GET', CAMINHO_DOS_USUARIOS, { status: 200, corpo: [] });

    expect(await localizador().subDoUsuario(USERNAME)).toBeUndefined();
  });

  it('ignora resultado cujo username não é o pedido, mesmo que o servidor devolva parciais', async () => {
    servidor.definir('GET', CAMINHO_DOS_USUARIOS, {
      status: 200,
      corpo: [{ id: 'outro-id', username: 'dev@cdd.local.evil' }],
    });

    expect(await localizador().subDoUsuario(USERNAME)).toBeUndefined();
  });

  it('compara o username sem diferenciar caixa, como o Keycloak o normaliza', async () => {
    servidor.definir('GET', CAMINHO_DOS_USUARIOS, { status: 200, corpo: [{ id: SUB, username: 'DEV@cdd.local' }] });

    expect(await localizador().subDoUsuario(USERNAME)).toBe(SUB);
  });

  it.each([
    ['corpo que é objeto', { id: SUB, username: USERNAME }],
    ['item sem id', [{ username: USERNAME }]],
    ['id vazio', [{ id: '', username: USERNAME }]],
    ['corpo nulo', null],
  ])('resposta fora do formato (%s) vira ProvedorDeIdentidadeIndisponivel', async (_descricao, corpo) => {
    servidor.definir('GET', CAMINHO_DOS_USUARIOS, { status: 200, corpo });

    await expect(localizador().subDoUsuario(USERNAME)).rejects.toBeInstanceOf(ProvedorDeIdentidadeIndisponivel);
  });

  it.each([
    ['5xx', { status: 503 }],
    ['excesso de requisições', { status: 429 }],
    ['permissão negada', { status: 403 }],
    ['404 na listagem', { status: 404 }],
    ['atraso acima do timeout', { status: 200, corpo: [], atrasoEmMs: 900 }],
  ])('%s vira ProvedorDeIdentidadeIndisponivel', async (_descricao, resposta) => {
    servidor.definir('GET', CAMINHO_DOS_USUARIOS, resposta);

    await expect(localizador().subDoUsuario(USERNAME)).rejects.toBeInstanceOf(ProvedorDeIdentidadeIndisponivel);
  });

  it('falha ao obter o token vira ProvedorDeIdentidadeIndisponivel e a listagem nem é chamada', async () => {
    servidor.definir('POST', CAMINHO_DO_TOKEN, { status: 401 });

    await expect(localizador().subDoUsuario(USERNAME)).rejects.toBeInstanceOf(ProvedorDeIdentidadeIndisponivel);
    expect(servidor.chamadasA('GET', CAMINHO_DOS_USUARIOS)).toHaveLength(0);
  });

  it('renova o token e repete uma vez quando o Admin API responde 401', async () => {
    servidor.definir('GET', CAMINHO_DOS_USUARIOS, (requisicao) =>
      requisicao.cabecalhos.authorization === 'Bearer token-1'
        ? { status: 401 }
        : { status: 200, corpo: [{ id: SUB, username: USERNAME }] },
    );

    expect(await localizador().subDoUsuario(USERNAME)).toBe(SUB);
    expect(servidor.chamadasA('GET', CAMINHO_DOS_USUARIOS)).toHaveLength(2);
  });

  it('o diagnóstico do erro não carrega o sub nem o segredo', async () => {
    servidor.definir('GET', CAMINHO_DOS_USUARIOS, { status: 503 });

    const erro = (await localizador().subDoUsuario(USERNAME).catch((motivo: unknown) => motivo)) as Error;

    expect(erro.message).not.toContain(SUB);
    expect(erro.message).not.toContain(configuracao.segredo);
  });
});
