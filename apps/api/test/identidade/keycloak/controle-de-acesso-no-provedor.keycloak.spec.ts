import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TIMEOUT_PADRAO_DO_CONSUMIDOR_EM_MS } from '../../../src/shared/infrastructure/eventos/despachante.js';
import { ClienteAdminDoKeycloak } from '../../../src/modules/identidade/infrastructure/keycloak/cliente-admin-do-keycloak.js';
import {
  ORCAMENTO_DA_OPERACAO_EM_MS,
  TIMEOUT_POR_CHAMADA_EM_MS,
} from '../../../src/modules/identidade/infrastructure/keycloak/configuracao-do-keycloak.js';
import type { ConfiguracaoDoKeycloak } from '../../../src/modules/identidade/infrastructure/keycloak/configuracao-do-keycloak.js';
import { ControleDeAcessoNoProvedorKeycloak } from '../../../src/modules/identidade/infrastructure/keycloak/controle-de-acesso-no-provedor.keycloak.js';
import {
  KeycloakIndisponivel,
  KeycloakRecusou,
} from '../../../src/modules/identidade/infrastructure/keycloak/erros-do-keycloak.js';
import { CAMINHO_DO_TOKEN, CAMINHO_DOS_USUARIOS, RelogioManual, ServidorKeycloakFalso } from './servidor-keycloak-falso.js';

const SUJEITO = '7f1c0d2e-3a4b-4c5d-8e6f-a1b2c3d4e5f6';
const CAMINHO_DO_SUJEITO = `${CAMINHO_DOS_USUARIOS}/${SUJEITO}`;
const CAMINHO_DO_LOGOUT = `${CAMINHO_DO_SUJEITO}/logout`;
const TIMEOUT_CURTO_EM_MS = 300;

describe('ControleDeAcessoNoProvedorKeycloak', () => {
  let servidor: ServidorKeycloakFalso;
  let configuracao: ConfiguracaoDoKeycloak;

  beforeEach(async () => {
    servidor = new ServidorKeycloakFalso();
    configuracao = {
      urlBase: await servidor.iniciar(),
      realm: 'cdd',
      clientId: 'cdd-api-admin',
      segredo: 'segredo-da-conta-de-servico',
      timeoutPorChamadaEmMs: TIMEOUT_CURTO_EM_MS,
      orcamentoDaOperacaoEmMs: 2_000,
    };
    servidor.definir('PUT', CAMINHO_DO_SUJEITO, { status: 204 });
    servidor.definir('POST', CAMINHO_DO_LOGOUT, { status: 204 });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await servidor.derrubar();
  });

  function controle(): ControleDeAcessoNoProvedorKeycloak {
    return new ControleDeAcessoNoProvedorKeycloak(new ClienteAdminDoKeycloak(configuracao, new RelogioManual()));
  }

  function chamadasAdministrativas(): string[] {
    return servidor.requisicoes
      .filter(({ caminho }) => caminho !== CAMINHO_DO_TOKEN)
      .map(({ metodo, caminho }) => `${metodo} ${caminho}`);
  }

  describe('bloquear', () => {
    it('desabilita o usuário e depois derruba as sessões, nessa ordem', async () => {
      await controle().bloquear(SUJEITO);

      expect(chamadasAdministrativas()).toEqual([`PUT ${CAMINHO_DO_SUJEITO}`, `POST ${CAMINHO_DO_LOGOUT}`]);
      const [desabilitacao] = servidor.chamadasA('PUT', CAMINHO_DO_SUJEITO);
      expect(JSON.parse(desabilitacao!.corpo)).toEqual({ enabled: false });
      expect(desabilitacao!.cabecalhos.authorization).toBe('Bearer token-1');
      expect(servidor.chamadasA('POST', CAMINHO_DO_TOKEN)).toHaveLength(1);
    });

    it('não derruba sessões quando a desabilitação falha', async () => {
      servidor.definir('PUT', CAMINHO_DO_SUJEITO, { status: 503 });

      await expect(controle().bloquear(SUJEITO)).rejects.toBeInstanceOf(KeycloakIndisponivel);

      expect(servidor.chamadasA('POST', CAMINHO_DO_LOGOUT)).toHaveLength(0);
    });

    it('falha no logout relança como indisponível para o despachante repetir', async () => {
      servidor.definir('POST', CAMINHO_DO_LOGOUT, { status: 502 });

      await expect(controle().bloquear(SUJEITO)).rejects.toBeInstanceOf(KeycloakIndisponivel);
    });

    it('usuário inexistente na desabilitação (404) é sucesso com aviso, sem logout e sem dado pessoal no log', async () => {
      servidor.definir('PUT', CAMINHO_DO_SUJEITO, { status: 404 });
      const aviso = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

      await expect(controle().bloquear(SUJEITO)).resolves.toBeUndefined();

      expect(servidor.chamadasA('POST', CAMINHO_DO_LOGOUT)).toHaveLength(0);
      expect(aviso).toHaveBeenCalledTimes(1);
      expect(String(aviso.mock.calls[0]![0])).not.toContain(SUJEITO);
    });

    it('usuário inexistente no logout (404) também é sucesso', async () => {
      servidor.definir('POST', CAMINHO_DO_LOGOUT, { status: 404 });
      vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

      await expect(controle().bloquear(SUJEITO)).resolves.toBeUndefined();
    });

    it('codifica o sujeito no caminho, sem permitir sair de /users/', async () => {
      const malicioso = '../../clients?x=1#';
      const caminho = `${CAMINHO_DOS_USUARIOS}/${encodeURIComponent(malicioso)}`;
      servidor.definir('PUT', caminho, { status: 204 });
      servidor.definir('POST', `${caminho}/logout`, { status: 204 });

      await controle().bloquear(malicioso);

      expect(chamadasAdministrativas()).toEqual([`PUT ${caminho}`, `POST ${caminho}/logout`]);
    });
  });

  describe('liberar', () => {
    it('só habilita o usuário, sem derrubar sessões', async () => {
      await controle().liberar(SUJEITO);

      expect(chamadasAdministrativas()).toEqual([`PUT ${CAMINHO_DO_SUJEITO}`]);
      const [habilitacao] = servidor.chamadasA('PUT', CAMINHO_DO_SUJEITO);
      expect(JSON.parse(habilitacao!.corpo)).toEqual({ enabled: true });
    });

    it('usuário inexistente (404) é sucesso com aviso', async () => {
      servidor.definir('PUT', CAMINHO_DO_SUJEITO, { status: 404 });
      const aviso = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

      await expect(controle().liberar(SUJEITO)).resolves.toBeUndefined();

      expect(aviso).toHaveBeenCalledTimes(1);
    });
  });

  describe.each([
    ['bloquear', (alvo: ControleDeAcessoNoProvedorKeycloak) => alvo.bloquear(SUJEITO)],
    ['liberar', (alvo: ControleDeAcessoNoProvedorKeycloak) => alvo.liberar(SUJEITO)],
  ])('falhas de %s', (_nome, operar) => {
    it.each([
      ['5xx', { status: 503 }],
      ['timeout do servidor', { status: 408 }],
      ['excesso de requisições', { status: 429 }],
    ])('%s é transitório', async (_descricao, resposta) => {
      servidor.definir('PUT', CAMINHO_DO_SUJEITO, resposta);

      await expect(operar(controle())).rejects.toBeInstanceOf(KeycloakIndisponivel);
    });

    it('resposta que estoura o timeout por chamada é transitória', async () => {
      servidor.definir('PUT', CAMINHO_DO_SUJEITO, { status: 204, atrasoEmMs: TIMEOUT_CURTO_EM_MS * 3 });

      await expect(operar(controle())).rejects.toMatchObject({ motivo: 'timeout' });
    });

    it('recusa do Keycloak (400) é permanente', async () => {
      servidor.definir('PUT', CAMINHO_DO_SUJEITO, { status: 400 });

      await expect(operar(controle())).rejects.toBeInstanceOf(KeycloakRecusou);
    });

    it('401 não é repetido no consumidor: invalida o cache do token e lança transitório', async () => {
      servidor.definir('PUT', CAMINHO_DO_SUJEITO, { status: 401 });
      const alvo = controle();

      await expect(operar(alvo)).rejects.toBeInstanceOf(KeycloakIndisponivel);

      expect(servidor.chamadasA('PUT', CAMINHO_DO_SUJEITO)).toHaveLength(1);
      expect(servidor.chamadasA('POST', CAMINHO_DO_TOKEN)).toHaveLength(1);

      servidor.definir('PUT', CAMINHO_DO_SUJEITO, { status: 204 });
      await operar(alvo);

      expect(servidor.chamadasA('POST', CAMINHO_DO_TOKEN)).toHaveLength(2);
      expect(servidor.chamadasA('PUT', CAMINHO_DO_SUJEITO)[1]!.cabecalhos.authorization).toBe('Bearer token-2');
    });
  });

  it('o orçamento da operação cabe com folga no timeout do consumidor do despachante', () => {
    expect(TIMEOUT_POR_CHAMADA_EM_MS).toBeLessThan(ORCAMENTO_DA_OPERACAO_EM_MS);
    expect(ORCAMENTO_DA_OPERACAO_EM_MS * 2).toBeLessThanOrEqual(TIMEOUT_PADRAO_DO_CONSUMIDOR_EM_MS);
  });
});
