import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { lerAmbienteDoAceite } from './ambiente-do-aceite.js';
import type { AmbienteDoAceite } from './ambiente-do-aceite.js';
import { ClienteDaApi } from './cliente-da-api.js';
import { ClienteDoKeycloak, conviteDaUrlDeRetorno, conviteDoLinkDoEmail, subDoToken } from './cliente-do-keycloak.js';
import type { UsuarioDoKeycloak } from './cliente-do-keycloak.js';
import { aguardarAte } from './espera.js';
import { extrairLinks, Mailpit } from './mailpit.js';
import { lerUsuarioNoBanco, recuarCriacaoDoConviteVigente, semearInstituicaoComGestor } from './semeadura.js';

const SENHA_DO_GESTOR = 'Gestor-Aceite-1x';
const SENHA_DA_CONVIDADA = 'Senha-Maria-1x';
const OUTRA_SENHA = 'Outra-Senha-1x';
const INTERVALO_MINIMO_DO_REENVIO_EM_S = 120;
const FORMATO_DO_TOKEN_DE_CONVITE = /^[A-Za-z0-9_-]{43}$/;

interface ConvidadaEmCurso {
  readonly id: string;
  readonly email: string;
  readonly link: string;
}

let ambiente: AmbienteDoAceite;
let keycloak: ClienteDoKeycloak;
let api: ClienteDaApi;
let mailpit: Mailpit;
let instituicaoId: string;
let tokenDoGestor: string;

function textoDe(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

function emailNovo(prefixo: string): string {
  return `${prefixo}-${randomUUID()}@aceite.cdd.local`;
}

async function convidar(nome: string): Promise<ConvidadaEmCurso> {
  const email = emailNovo('convidada');
  const convite = await api.pedir('POST', '/identidade/usuarios', {
    token: tokenDoGestor,
    corpo: { nome, email },
    comChaveDeIdempotencia: true,
  });
  expect(convite.status).toBe(201);
  const [mensagem] = await mailpit.aguardarMensagensPara(email, 1);
  const link = extrairLinks(mensagem?.texto ?? '')[0] ?? '';
  return { id: textoDe(convite.corpo?.['id']), email, link };
}

async function comoGestor(metodo: string, caminho: string, usuarioId: string, corpo?: unknown): Promise<number> {
  const { versao } = await lerUsuarioNoBanco(ambiente.urlDoBancoDoDono, instituicaoId, usuarioId);
  const resposta = await api.pedir(metodo, caminho, {
    token: tokenDoGestor,
    versaoEsperada: versao,
    comChaveDeIdempotencia: true,
    ...(corpo === undefined ? {} : { corpo }),
  });
  return resposta.status;
}

async function entrar(email: string, senha: string): Promise<{ accessToken: string; refreshToken: string }> {
  const resposta = await keycloak.entrarComSenha(email, senha);
  expect(resposta.status).toBe(200);
  return { accessToken: textoDe(resposta.corpo['access_token']), refreshToken: textoDe(resposta.corpo['refresh_token']) };
}

function instantaneoDoPerfil(usuario: UsuarioDoKeycloak): Record<string, unknown> {
  return {
    username: usuario.username,
    email: usuario.email,
    firstName: usuario.firstName,
    lastName: usuario.lastName,
    emailVerified: usuario.emailVerified,
    attributes: usuario.attributes ?? {},
    requiredActions: usuario.requiredActions ?? [],
  };
}

beforeAll(async () => {
  ambiente = lerAmbienteDoAceite();
  keycloak = new ClienteDoKeycloak(ambiente);
  api = new ClienteDaApi(ambiente.urlDaApi);
  mailpit = new Mailpit(ambiente.urlDoMailpit);

  const emailDoGestor = emailNovo('gestor');
  const criacao = await keycloak.admin('/users', {
    metodo: 'POST',
    corpo: {
      username: emailDoGestor,
      email: emailDoGestor,
      firstName: 'Gestor',
      lastName: 'Aceite',
      enabled: true,
      emailVerified: true,
      credentials: [{ type: 'password', value: SENHA_DO_GESTOR, temporary: false }],
    },
  });
  expect(criacao.status).toBe(201);
  const { accessToken } = await entrar(emailDoGestor, SENHA_DO_GESTOR);
  tokenDoGestor = accessToken;
  const semeado = await semearInstituicaoComGestor(ambiente.urlDoBancoDoDono, {
    subjectId: subDoToken(accessToken),
    email: emailDoGestor,
    nome: 'Gestor Aceite',
  });
  instituicaoId = semeado.instituicaoId;
});

describe('aceite do convite contra o Keycloak e o Mailpit reais — ciclo de vida da convidada', () => {
  const convidada = {
    id: '',
    email: '',
    link: '',
    token: '',
    sub: '',
    refreshAntigo: '',
    perfilAntesDeSuspender: {} as Record<string, unknown>,
    emailVerificadoAntesDoLink: true,
  };

  it('convidar pela API — cria CONVITE_PENDENTE e o Mailpit recebe o e-mail do tema cdd com o link de definir senha', async () => {
    const emCurso = await convidar('Maria Silva');
    convidada.id = emCurso.id;
    convidada.email = emCurso.email;
    convidada.link = emCurso.link;
    const [mensagem] = await mailpit.mensagensPara(emCurso.email);
    const noKeycloak = await keycloak.usuarioPorEmail(emCurso.email);
    convidada.emailVerificadoAntesDoLink = noKeycloak?.emailVerified ?? true;

    expect(mensagem?.assunto).toBe('Defina sua senha no Céu do Despertar');
    expect(mensagem?.para).toEqual([emCurso.email]);
    expect(emCurso.link.startsWith(`${ambiente.emissor}/login-actions/action-token?key=`)).toBe(true);
    expect(conviteDoLinkDoEmail(emCurso.link)).toMatch(FORMATO_DO_TOKEN_DE_CONVITE);
    expect(noKeycloak).toMatchObject({ firstName: 'Maria', lastName: 'Silva', enabled: true });
    expect((await lerUsuarioNoBanco(ambiente.urlDoBancoDoDono, instituicaoId, emCurso.id)).situacao).toBe('CONVITE_PENDENTE');
  });

  it('seguir o link e definir a senha — o tema cdd conclui e devolve ao SPA em /entrar?convite= com o mesmo token do e-mail', async () => {
    const resultado = await keycloak.definirSenhaPeloLink(convidada.link, SENHA_DA_CONVIDADA);

    expect(resultado.formularioApresentado).toBe(true);
    expect(resultado.statusDoEnvio).toBe(200);
    expect(resultado.corpoDoEnvio).toContain('/login/cdd/css/cdd.css');
    expect(resultado.linkDeRetorno?.startsWith('http://localhost:5173/entrar?convite=')).toBe(true);
    expect(conviteDaUrlDeRetorno(resultado.linkDeRetorno ?? '')).toBe(conviteDoLinkDoEmail(convidada.link));
    convidada.token = conviteDaUrlDeRetorno(resultado.linkDeRetorno ?? '');
  });

  it('definir a senha pelo link — marca o e-mail como verificado no Keycloak (antes do link era falso)', async () => {
    const depois = await keycloak.usuarioPorEmail(convidada.email);

    expect(convidada.emailVerificadoAntesDoLink).toBe(false);
    expect(depois?.emailVerified).toBe(true);
  });

  it('login com a senha definida — devolve access e refresh, mas /eu ainda recusa por usuário desconhecido', async () => {
    const { accessToken, refreshToken } = await entrar(convidada.email, SENHA_DA_CONVIDADA);
    convidada.sub = subDoToken(accessToken);
    convidada.refreshAntigo = refreshToken;
    const eu = await api.pedir('GET', '/eu', { token: accessToken });

    expect(eu.status).toBe(401);
    expect(eu.corpo?.['erro']).toBe('USUARIO_DESCONHECIDO');
  });

  it('POST /eu/ativacao com o token do convite — 200 ATIVO, banco grava subject_id e ativado_em, GET /eu passa a 200', async () => {
    const { accessToken, refreshToken } = await entrar(convidada.email, SENHA_DA_CONVIDADA);
    convidada.refreshAntigo = refreshToken;

    const ativacao = await api.pedir('POST', '/eu/ativacao', {
      token: accessToken,
      corpo: { convite: convidada.token },
      comChaveDeIdempotencia: true,
    });
    const eu = await api.pedir('GET', '/eu', { token: accessToken });
    const noBanco = await lerUsuarioNoBanco(ambiente.urlDoBancoDoDono, instituicaoId, convidada.id);

    expect(ativacao.status).toBe(200);
    expect(ativacao.corpo).toEqual({ situacao: 'ATIVO' });
    expect(eu.status).toBe(200);
    expect(eu.corpo?.['usuario']).toMatchObject({ id: convidada.id });
    expect(noBanco).toMatchObject({ situacao: 'ATIVO', subject_id: convidada.sub });
    expect(noBanco.ativado_em).toBeInstanceOf(Date);
  });

  it('desativar pela API — GET /eu recusa com USUARIO_SUSPENSO e, por polling do despachante, o refresh vivo vira invalid_grant', async () => {
    const idNoKeycloak = (await keycloak.usuarioPorEmail(convidada.email))?.id ?? '';
    await keycloak.definirAtributosDoPerfil(idNoKeycloak, { locale: ['pt-BR'] });
    convidada.perfilAntesDeSuspender = instantaneoDoPerfil(await keycloak.usuarioPorId(idNoKeycloak));
    const { accessToken } = await entrar(convidada.email, SENHA_DA_CONVIDADA);
    const refreshVivo = await keycloak.renovar(convidada.refreshAntigo);

    const status = await comoGestor('POST', `/identidade/usuarios/${convidada.id}/desativar`, convidada.id, {
      motivo: 'aceite contra o Keycloak real',
    });
    const euSuspenso = await api.pedir('GET', '/eu', { token: accessToken });
    const refreshRecusado = await aguardarAte('refresh vivo recusado pelo Keycloak', async () => {
      const resposta = await keycloak.renovar(textoDe(refreshVivo.corpo['refresh_token']));
      return resposta.status === 200 ? undefined : resposta;
    });

    expect(convidada.perfilAntesDeSuspender['attributes']).toEqual({ locale: ['pt-BR'] });
    expect(refreshVivo.status).toBe(200);
    expect(status).toBe(200);
    expect(euSuspenso.status).toBe(401);
    expect(euSuspenso.corpo?.['erro']).toBe('USUARIO_SUSPENSO');
    expect(refreshRecusado.status).toBe(400);
    expect(refreshRecusado.corpo['error']).toBe('invalid_grant');
    expect((await keycloak.usuarioPorId(idNoKeycloak)).enabled).toBe(false);
  });

  it('login durante a suspensão — o Keycloak recusa com a conta desabilitada', async () => {
    const resposta = await keycloak.entrarComSenha(convidada.email, SENHA_DA_CONVIDADA);

    expect(resposta.status).toBe(400);
    expect(resposta.corpo['error']).toBe('invalid_grant');
  });

  it('reativar pela API — o login volta e nome, sobrenome, e-mail, atributos e verificação ficam como antes', async () => {
    const status = await comoGestor('POST', `/identidade/usuarios/${convidada.id}/reativar`, convidada.id, {
      motivo: 'aceite contra o Keycloak real',
    });
    const novoLogin = await aguardarAte('login da reativada voltando a funcionar', async () => {
      const resposta = await keycloak.entrarComSenha(convidada.email, SENHA_DA_CONVIDADA);
      return resposta.status === 200 ? resposta : undefined;
    });
    const depois = await keycloak.usuarioPorEmail(convidada.email);
    const eu = await api.pedir('GET', '/eu', { token: textoDe(novoLogin.corpo['access_token']) });

    expect(status).toBe(200);
    expect(depois?.enabled).toBe(true);
    expect(instantaneoDoPerfil(depois as UsuarioDoKeycloak)).toEqual(convidada.perfilAntesDeSuspender);
    expect(eu.status).toBe(200);
  });

  it('usuário não consegue editar o próprio e-mail nem o username pela Account API — 400 e o e-mail segue o do convite', async () => {
    const redirectDoConsole = `${ambiente.emissor}/account/`;
    const { corpo } = await keycloak.entrarPorCodigoComPkce('account-console', redirectDoConsole, convidada.email, SENHA_DA_CONVIDADA);
    const novoEmail = emailNovo('troca');

    const edicao = await keycloak.pedirComToken(`${ambiente.emissor}/account`, textoDe(corpo['access_token']), {
      metodo: 'POST',
      corpo: { username: novoEmail, email: novoEmail, firstName: 'Maria', lastName: 'Silva' },
    });

    expect(edicao.status).toBe(400);
    expect(await keycloak.usuarioPorEmail(novoEmail)).toBeUndefined();
    expect((await keycloak.usuarioPorEmail(convidada.email))?.username).toBe(convidada.email);
  });

  it('reuso do link do Keycloak — recusa com a página de link expirado e a senha segue a primeira definida', async () => {
    const reuso = await keycloak.definirSenhaPeloLink(convidada.link, OUTRA_SENHA);
    const comNovaSenha = await keycloak.entrarComSenha(convidada.email, OUTRA_SENHA);
    const comSenhaOriginal = await keycloak.entrarComSenha(convidada.email, SENHA_DA_CONVIDADA);

    expect(reuso.statusDoLink).toBe(400);
    expect(reuso.formularioApresentado).toBe(false);
    expect(reuso.corpoDoEnvio).toContain('Este link expirou');
    expect(comNovaSenha.status).toBe(401);
    expect(comSenhaOriginal.status).toBe(200);
  });
});

describe('aceite do convite contra o Keycloak e o Mailpit reais — convite revogado pelo reenvio', () => {
  it('link antigo do Keycloak abre a tela de senha mas o token revogado não ativa; o token do reenvio ativa', async () => {
    const convidado = await convidar('Joana Souza');
    const tokenAntigo = conviteDoLinkDoEmail(convidado.link);
    await recuarCriacaoDoConviteVigente(ambiente.urlDoBancoDoDono, instituicaoId, convidado.id, INTERVALO_MINIMO_DO_REENVIO_EM_S);

    const statusDoReenvio = await comoGestor('POST', `/identidade/usuarios/${convidado.id}/convite/reenviar`, convidado.id);
    const [, reenvio] = await mailpit.aguardarMensagensPara(convidado.email, 2);
    const tokenNovo = conviteDoLinkDoEmail(extrairLinks(reenvio?.texto ?? '')[0] ?? '');
    const definicaoPeloLinkAntigo = await keycloak.definirSenhaPeloLink(convidado.link, SENHA_DA_CONVIDADA);
    const { accessToken } = await entrar(convidado.email, SENHA_DA_CONVIDADA);
    const ativacaoComTokenAntigo = await api.pedir('POST', '/eu/ativacao', { token: accessToken, corpo: { convite: tokenAntigo } });
    const euAindaPendente = await api.pedir('GET', '/eu', { token: accessToken });
    const ativacaoComTokenNovo = await api.pedir('POST', '/eu/ativacao', { token: accessToken, corpo: { convite: tokenNovo } });

    expect(statusDoReenvio).toBe(200);
    expect(tokenNovo).not.toBe(tokenAntigo);
    expect(definicaoPeloLinkAntigo.formularioApresentado).toBe(true);
    expect(definicaoPeloLinkAntigo.statusDoEnvio).toBe(200);
    expect(ativacaoComTokenAntigo.status).toBe(400);
    expect(ativacaoComTokenAntigo.corpo?.['erro']).toBe('CONVITE_INVALIDO');
    expect(euAindaPendente.status).toBe(401);
    expect(ativacaoComTokenNovo.status).toBe(200);
  });
});

describe('aceite do convite contra o Keycloak e o Mailpit reais — contrato do Admin REST', () => {
  it('conta de serviço com só manage-users — GET /users?email=&exact=true e GET /users/{id} respondem 200 com o usuário', async () => {
    const convidado = await convidar('Rita Lopes');

    const porEmail = await keycloak.admin(`/users?${new URLSearchParams({ email: convidado.email, exact: 'true' })}`);
    const encontrados = (await porEmail.json()) as UsuarioDoKeycloak[];
    const porId = await keycloak.admin(`/users/${encontrados[0]?.id}`);
    const usuario = (await porId.json()) as UsuarioDoKeycloak;

    expect(porEmail.status).toBe(200);
    expect(encontrados).toHaveLength(1);
    expect(porId.status).toBe(200);
    expect(usuario.email).toBe(convidado.email);
  });

  it('execute-actions-email com redirect_uri fora dos válidos do client — 400', async () => {
    const convidado = await convidar('Paulo Reis');
    const idNoKeycloak = (await keycloak.usuarioPorEmail(convidado.email))?.id ?? '';
    const parametros = new URLSearchParams({
      client_id: 'cdd-web',
      redirect_uri: 'https://intruso.example.com/entrar?convite=x',
      lifespan: '3600',
    });

    const resposta = await keycloak.admin(`/users/${idNoKeycloak}/execute-actions-email?${parametros}`, {
      metodo: 'PUT',
      corpo: ['UPDATE_PASSWORD'],
    });

    expect(resposta.status).toBe(400);
  });
});
