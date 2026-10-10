import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Eu } from '@cdd/contracts';
import { lerAmbienteDoAceite } from './ambiente-do-aceite.js';
import type { AmbienteDoAceite } from './ambiente-do-aceite.js';
import { ClienteDaApi } from './cliente-da-api.js';
import { executarBootstrapPeloCli } from './cli-da-identidade.js';
import type { SaidaDoCliReal } from './cli-da-identidade.js';
import { ClienteDoKeycloak, conviteDaUrlDeRetorno, conviteDoLinkDoEmail, subDoToken } from './cliente-do-keycloak.js';
import { extrairLinks, Mailpit } from './mailpit.js';

const SENHA_DO_ADMINISTRADOR = 'Admin-Bootstrap-1x';
const FORMATO_DO_TOKEN_DE_CONVITE = /^[A-Za-z0-9_-]{43}$/;

let ambiente: AmbienteDoAceite;
let keycloak: ClienteDoKeycloak;
let api: ClienteDaApi;
let mailpit: Mailpit;
let emailDoAdministrador: string;
let saidaDoCli: SaidaDoCliReal;

async function contarInstituicoes(): Promise<number> {
  const cliente = new Client({ connectionString: ambiente.urlDoBancoDoDono });
  await cliente.connect();
  try {
    const { rows } = await cliente.query<{ total: number }>('select count(*)::int as total from shared.instituicao');
    return (rows[0] as { total: number }).total;
  } finally {
    await cliente.end();
  }
}

beforeAll(async () => {
  ambiente = lerAmbienteDoAceite();
  keycloak = new ClienteDoKeycloak(ambiente);
  api = new ClienteDaApi(ambiente.urlDaApi);
  mailpit = new Mailpit(ambiente.urlDoMailpit);
  emailDoAdministrador = `admin-${randomUUID()}@aceite.cdd.local`;
  expect(await contarInstituicoes(), 'o bootstrap exige banco sem instituição; este arquivo precisa rodar antes dos demais').toBe(0);
});

describe('aceite do bootstrap da identidade por convite contra o Keycloak e o Mailpit reais', () => {
  it('CLI bootstrap — sai 0, imprime os ids e o próximo passo, e o e-mail do convite chega ao Mailpit', async () => {
    saidaDoCli = await executarBootstrapPeloCli(ambiente, [
      '--instituicao-nome',
      'Casa do Bootstrap',
      '--admin-nome',
      'Administradora Inicial',
      '--admin-email',
      emailDoAdministrador,
    ]);
    const [mensagem] = await mailpit.aguardarMensagensPara(emailDoAdministrador, 1);
    const link = extrairLinks(mensagem?.texto ?? '')[0] ?? '';

    expect(saidaDoCli.codigo).toBe(0);
    expect(saidaDoCli.stderr).toBe('');
    expect(saidaDoCli.stdout).toContain('Próximo passo');
    expect(mensagem?.assunto).toBe('Defina sua senha no Céu do Despertar');
    expect(conviteDoLinkDoEmail(link)).toMatch(FORMATO_DO_TOKEN_DE_CONVITE);
    expect(saidaDoCli.stdout).not.toContain(conviteDoLinkDoEmail(link));
  });

  it('link do e-mail, senha, login, POST /eu/ativacao e GET /eu — o administrador entra com o grupo ADMINISTRADOR', async () => {
    const [mensagem] = await mailpit.aguardarMensagensPara(emailDoAdministrador, 1);
    const link = extrairLinks(mensagem?.texto ?? '')[0] ?? '';

    const definicao = await keycloak.definirSenhaPeloLink(link, SENHA_DO_ADMINISTRADOR);
    const convite = conviteDaUrlDeRetorno(definicao.linkDeRetorno ?? '');
    const login = await keycloak.entrarComSenha(emailDoAdministrador, SENHA_DO_ADMINISTRADOR);
    const token = String(login.corpo['access_token']);
    const ativacao = await api.pedir('POST', '/eu/ativacao', {
      token,
      corpo: { convite },
      comChaveDeIdempotencia: true,
    });
    const eu = await api.pedir('GET', '/eu', { token });
    const corpo = eu.corpo as unknown as Eu;

    expect(definicao.statusDoEnvio).toBe(200);
    expect(login.status).toBe(200);
    expect(subDoToken(token)).not.toBe('');
    expect(ativacao.status).toBe(200);
    expect(ativacao.corpo).toEqual({ situacao: 'ATIVO' });
    expect(eu.status).toBe(200);
    expect(corpo.usuario.email).toBe(emailDoAdministrador);
    expect(corpo.instituicao.nome).toBe('Casa do Bootstrap');
    expect(corpo.grupos.map((grupo) => grupo.nome)).toEqual(['Administrador']);
    expect(corpo.permissoes).toContain('sistema.usuario.gerenciar');
  });

  it('segunda execução do CLI — recusada com código de regra', async () => {
    const segunda = await executarBootstrapPeloCli(ambiente, [
      '--instituicao-nome',
      'Outra Casa',
      '--admin-nome',
      'Outra Pessoa',
      '--admin-email',
      `outra-${randomUUID()}@aceite.cdd.local`,
    ]);

    expect(segunda.codigo).toBe(3);
    expect(segunda.stderr).toContain('já foi executado');
    expect(await contarInstituicoes()).toBe(1);
  });
});
