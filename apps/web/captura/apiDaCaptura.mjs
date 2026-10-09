import { PREFIXO_DA_API } from './ambiente.mjs';
import { FIXTURES_DA_API } from './fixturesDaApi.mjs';

const STATUS_DE_SUCESSO = 200;

export const chaveDaRequisicao = (metodo, caminho) => `${metodo} ${caminho}`;

export function criarApiDaCaptura(falhas) {
  let respondidas = 0;
  let semFixture = 0;

  const respostaDaFixture = (chave, fixturesDaTela) => {
    if (fixturesDaTela[chave] !== undefined) return fixturesDaTela[chave];
    const corpo = FIXTURES_DA_API[chave];
    return corpo === undefined ? undefined : { status: STATUS_DE_SUCESSO, corpo };
  };

  const responderComAsFixturesDe = (fixturesDaTela) => async (rota) => {
    const requisicao = rota.request();
    const url = new URL(requisicao.url());
    const resposta = respostaDaFixture(chaveDaRequisicao(requisicao.method(), url.pathname), fixturesDaTela);
    try {
      if (resposta === undefined) {
        semFixture += 1;
        falhas.registrar(`requisição /api sem fixture: ${requisicao.method()} ${url.pathname}${url.search}`);
        await rota.abort();
        return;
      }
      await rota.fulfill({
        status: resposta.status,
        contentType: 'application/json',
        body: JSON.stringify(resposta.corpo),
      });
      respondidas += 1;
    } catch (erro) {
      falhas.registrar(`resposta de /api falhou: ${erro.message}`);
    }
  };

  return {
    ehDaApi: (url) => url.pathname.startsWith(PREFIXO_DA_API),
    responder: responderComAsFixturesDe({}),
    responderComAsFixturesDe,
    contagem: () => ({ respondidas, semFixture }),
  };
}
