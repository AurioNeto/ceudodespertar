import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProvedorDeIdentidadeIndisponivel } from '../../../src/modules/identidade/application/convite/conferidor-de-sujeito.js';
import { ClienteAdminDoKeycloak } from '../../../src/modules/identidade/infrastructure/keycloak/cliente-admin-do-keycloak.js';
import type { ConfiguracaoDoKeycloak } from '../../../src/modules/identidade/infrastructure/keycloak/configuracao-do-keycloak.js';
import { ConferidorDeSujeitoKeycloak } from '../../../src/modules/identidade/infrastructure/keycloak/conferidor-de-sujeito.keycloak.js';
import { CAMINHO_DO_TOKEN, CAMINHO_DOS_USUARIOS, RelogioManual, ServidorKeycloakFalso } from './servidor-keycloak-falso.js';

const SUJEITO = '7f1c0d2e-3a4b-4c5d-8e6f-a1b2c3d4e5f6';
const CAMINHO_DO_SUJEITO = `${CAMINHO_DOS_USUARIOS}/${SUJEITO}`;

describe('ConferidorDeSujeitoKeycloak', () => {
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
    servidor.definir('GET', CAMINHO_DO_SUJEITO, { status: 200, corpo: { id: SUJEITO, email: 'maria@casa.org' } });
  });

  afterEach(async () => {
    await servidor.derrubar();
  });

  function conferidor(): ConferidorDeSujeitoKeycloak {
    return new ConferidorDeSujeitoKeycloak(new ClienteAdminDoKeycloak(configuracao, new RelogioManual()));
  }

  it('devolve o e-mail do usuário do Keycloak pelo GET /users/{sub} com token da conta de serviço', async () => {
    expect(await conferidor().emailDo(SUJEITO)).toBe('maria@casa.org');

    const [consulta] = servidor.chamadasA('GET', CAMINHO_DO_SUJEITO);
    expect(consulta!.cabecalhos.authorization).toBe('Bearer token-1');
    expect(servidor.chamadasA('POST', CAMINHO_DO_TOKEN)).toHaveLength(1);
  });

  it('codifica o sub no caminho, sem permitir sair de /users/', async () => {
    const malicioso = '../../clients?x=1#';
    servidor.definir('GET', `${CAMINHO_DOS_USUARIOS}/${encodeURIComponent(malicioso)}`, { status: 404 });

    expect(await conferidor().emailDo(malicioso)).toBeUndefined();

    expect(servidor.requisicoes.filter(({ metodo }) => metodo === 'GET').map(({ caminho }) => caminho)).toEqual([
      `${CAMINHO_DOS_USUARIOS}/${encodeURIComponent(malicioso)}`,
    ]);
  });

  it('usuário inexistente no Keycloak (404) segue sendo e-mail ausente, que a aplicação trata como outro sujeito, não como indisponibilidade', async () => {
    servidor.definir('GET', CAMINHO_DO_SUJEITO, { status: 404 });

    expect(await conferidor().emailDo(SUJEITO)).toBeUndefined();
  });

  it('usuário sem e-mail no Keycloak vira e-mail ausente', async () => {
    servidor.definir('GET', CAMINHO_DO_SUJEITO, { status: 200, corpo: { id: SUJEITO } });

    expect(await conferidor().emailDo(SUJEITO)).toBeUndefined();
  });

  it.each([
    ['e-mail de tipo errado', { email: 42 }],
    ['corpo que é lista', [{ email: 'maria@casa.org' }]],
    ['corpo nulo', null],
    ['corpo que é texto', 'maria@casa.org'],
  ])('resposta fora do formato (%s) vira ProvedorDeIdentidadeIndisponivel, não e-mail ausente', async (_descricao, corpo) => {
    servidor.definir('GET', CAMINHO_DO_SUJEITO, { status: 200, corpo });

    await expect(conferidor().emailDo(SUJEITO)).rejects.toBeInstanceOf(ProvedorDeIdentidadeIndisponivel);
  });

  it.each([
    ['5xx', { status: 503 }],
    ['timeout do servidor', { status: 408 }],
    ['excesso de requisições', { status: 429 }],
    ['permissão negada', { status: 403 }],
    ['requisição recusada', { status: 400 }],
    ['atraso acima do timeout', { status: 200, corpo: { email: 'maria@casa.org' }, atrasoEmMs: 900 }],
  ])('%s vira ProvedorDeIdentidadeIndisponivel', async (_descricao, resposta) => {
    servidor.definir('GET', CAMINHO_DO_SUJEITO, resposta);

    await expect(conferidor().emailDo(SUJEITO)).rejects.toBeInstanceOf(ProvedorDeIdentidadeIndisponivel);
  });

  it('corpo que não é JSON vira ProvedorDeIdentidadeIndisponivel', async () => {
    servidor.definir('GET', CAMINHO_DO_SUJEITO, { status: 200, corpo: undefined });

    await expect(conferidor().emailDo(SUJEITO)).rejects.toBeInstanceOf(ProvedorDeIdentidadeIndisponivel);
  });

  it('falha ao obter o token vira ProvedorDeIdentidadeIndisponivel', async () => {
    servidor.definir('POST', CAMINHO_DO_TOKEN, { status: 401 });

    await expect(conferidor().emailDo(SUJEITO)).rejects.toBeInstanceOf(ProvedorDeIdentidadeIndisponivel);
    expect(servidor.chamadasA('GET', CAMINHO_DO_SUJEITO)).toHaveLength(0);
  });

  it('renova o token e repete uma vez quando o Admin API responde 401', async () => {
    servidor.definir('GET', CAMINHO_DO_SUJEITO, (requisicao) =>
      requisicao.cabecalhos.authorization === 'Bearer token-1'
        ? { status: 401 }
        : { status: 200, corpo: { email: 'maria@casa.org' } },
    );

    expect(await conferidor().emailDo(SUJEITO)).toBe('maria@casa.org');
    expect(servidor.chamadasA('GET', CAMINHO_DO_SUJEITO)).toHaveLength(2);
  });

  it('o diagnóstico do erro não carrega o sub nem o segredo', async () => {
    servidor.definir('GET', CAMINHO_DO_SUJEITO, { status: 503 });

    const erro = (await conferidor().emailDo(SUJEITO).catch((motivo: unknown) => motivo)) as Error;

    expect(erro.message).not.toContain(SUJEITO);
    expect(erro.message).not.toContain(configuracao.segredo);
  });
});
