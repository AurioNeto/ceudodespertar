import { createHash, randomBytes } from 'node:crypto';

const [, , clientId, redirectUri, username, password] = process.argv;
const emissor = process.env.OIDC_EMISSOR ?? 'http://localhost:8080/realms/cdd';

function base64url(buffer) {
  return buffer.toString('base64url');
}

function extrairCookies(resposta, jarro) {
  for (const linha of resposta.headers.getSetCookie?.() ?? []) {
    const [par] = linha.split(';');
    const indice = par.indexOf('=');
    jarro.set(par.slice(0, indice), par.slice(indice + 1));
  }
}

function cabecalhoCookie(jarro) {
  return [...jarro.entries()].map(([nome, valor]) => `${nome}=${valor}`).join('; ');
}

async function obterTokenComCodigoEPkce() {
  const codeVerifier = base64url(randomBytes(32));
  const codeChallenge = base64url(createHash('sha256').update(codeVerifier).digest());
  const cookies = new Map();

  const urlAutorizacao = new URL(`${emissor}/protocol/openid-connect/auth`);
  urlAutorizacao.searchParams.set('client_id', clientId);
  urlAutorizacao.searchParams.set('response_type', 'code');
  urlAutorizacao.searchParams.set('redirect_uri', redirectUri);
  urlAutorizacao.searchParams.set('scope', 'openid');
  urlAutorizacao.searchParams.set('code_challenge', codeChallenge);
  urlAutorizacao.searchParams.set('code_challenge_method', 'S256');

  const respostaFormulario = await fetch(urlAutorizacao, { redirect: 'manual' });
  extrairCookies(respostaFormulario, cookies);
  const html = await respostaFormulario.text();
  const acaoDoFormulario = html.match(/action="([^"]+)"/)?.[1]?.replace(/&amp;/g, '&');
  if (!acaoDoFormulario) {
    throw new Error(`não encontrou o formulário de login (status ${respostaFormulario.status})`);
  }

  const respostaLogin = await fetch(acaoDoFormulario, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      cookie: cabecalhoCookie(cookies),
    },
    body: new URLSearchParams({ username, password }),
  });

  const localizacao = respostaLogin.headers.get('location');
  const codigo = localizacao ? new URL(localizacao).searchParams.get('code') : null;
  if (!codigo) {
    throw new Error(`login não devolveu "code" (status ${respostaLogin.status}, location ${localizacao})`);
  }

  const respostaToken = await fetch(`${emissor}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code: codigo,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  return respostaToken.json();
}

const corpoDoToken = await obterTokenComCodigoEPkce();
process.stdout.write(JSON.stringify(corpoDoToken));
