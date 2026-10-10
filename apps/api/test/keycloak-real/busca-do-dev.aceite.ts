import { beforeAll, describe, expect, it } from 'vitest';
import { ClienteAdminDoKeycloak } from '../../src/modules/identidade/infrastructure/keycloak/cliente-admin-do-keycloak.js';
import {
  ORCAMENTO_DA_OPERACAO_EM_MS,
  TIMEOUT_POR_CHAMADA_EM_MS,
} from '../../src/modules/identidade/infrastructure/keycloak/configuracao-do-keycloak.js';
import { ControleDeAcessoNoProvedorKeycloak } from '../../src/modules/identidade/infrastructure/keycloak/controle-de-acesso-no-provedor.keycloak.js';
import { LocalizadorDeSujeitoKeycloak } from '../../src/modules/identidade/infrastructure/keycloak/localizador-de-sujeito.keycloak.js';
import { RelogioDoSistema } from '../../src/shared/infrastructure/relogio.js';
import { lerAmbienteDoAceite } from './ambiente-do-aceite.js';
import type { AmbienteDoAceite } from './ambiente-do-aceite.js';
import { ClienteDoKeycloak, subDoToken } from './cliente-do-keycloak.js';

const USERNAME_DO_DEV = 'dev@cdd.local';
const SUB_FICTICIO_SUSPENSO = 'demo:suspenso';

let ambiente: AmbienteDoAceite;
let clienteAdmin: ClienteAdminDoKeycloak;
let subDoDevPeloLogin: string;

beforeAll(async () => {
  ambiente = lerAmbienteDoAceite();
  clienteAdmin = new ClienteAdminDoKeycloak(
    {
      urlBase: ambiente.urlDoKeycloak,
      realm: ambiente.realm,
      clientId: 'cdd-api-admin',
      segredo: ambiente.segredoDaContaDeServico,
      timeoutPorChamadaEmMs: TIMEOUT_POR_CHAMADA_EM_MS,
      orcamentoDaOperacaoEmMs: ORCAMENTO_DA_OPERACAO_EM_MS,
    },
    new RelogioDoSistema(),
  );
  const login = await new ClienteDoKeycloak(ambiente).entrarComSenha(USERNAME_DO_DEV, ambiente.senhaDoUsuarioDev);
  subDoDevPeloLogin = subDoToken(String(login.corpo['access_token']));
});

describe('aceite da busca do dev e da suspensão do fictício contra o Keycloak real', () => {
  it('GET /users?username=dev@cdd.local&exact=true com cdd-api-admin devolve o mesmo sub que o token do login do dev', async () => {
    const sub = await new LocalizadorDeSujeitoKeycloak(clienteAdmin).subDoUsuario(USERNAME_DO_DEV);

    expect(subDoDevPeloLogin).not.toBe('');
    expect(sub).toBe(subDoDevPeloLogin);
  });

  it('o username é comparado sem diferenciar caixa, como o realm o normaliza', async () => {
    const sub = await new LocalizadorDeSujeitoKeycloak(clienteAdmin).subDoUsuario('DEV@CDD.LOCAL');

    expect(sub).toBe(subDoDevPeloLogin);
  });

  it('username inexistente: lista vazia vira undefined', async () => {
    const sub = await new LocalizadorDeSujeitoKeycloak(clienteAdmin).subDoUsuario('ninguem@cdd.local');

    expect(sub).toBeUndefined();
  });

  it('busca exata: um prefixo do username não encontra o dev', async () => {
    const sub = await new LocalizadorDeSujeitoKeycloak(clienteAdmin).subDoUsuario('dev@cdd');

    expect(sub).toBeUndefined();
  });

  it('bloquear e liberar o sub fictício demo: convergem sem erro, pois o provedor não conhece esse usuário', async () => {
    const controle = new ControleDeAcessoNoProvedorKeycloak(clienteAdmin);

    await expect(controle.bloquear(SUB_FICTICIO_SUSPENSO)).resolves.toBeUndefined();
    await expect(controle.liberar(SUB_FICTICIO_SUSPENSO)).resolves.toBeUndefined();
  });
});
