import { PREFIXO_DA_API } from './ambiente.mjs';
import { FIXTURES_DA_API } from './fixturesDaApi.mjs';

const chaveDaRequisicao = (metodo, caminho) => `${metodo} ${caminho}`;

export function criarApiDaCaptura(falhas) {
  let respondidas = 0;
  let semFixture = 0;

  const responderComFixture = (rota, fixture) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture) });

  return {
    ehDaApi: (url) => url.pathname.startsWith(PREFIXO_DA_API),
    async responder(rota) {
      const requisicao = rota.request();
      const url = new URL(requisicao.url());
      const fixture = FIXTURES_DA_API[chaveDaRequisicao(requisicao.method(), url.pathname)];
      try {
        if (fixture === undefined) {
          semFixture += 1;
          falhas.registrar(`requisição /api sem fixture: ${requisicao.method()} ${url.pathname}${url.search}`);
          await rota.abort();
          return;
        }
        await responderComFixture(rota, fixture);
        respondidas += 1;
      } catch (erro) {
        falhas.registrar(`resposta de /api falhou: ${erro.message}`);
      }
    },
    contagem: () => ({ respondidas, semFixture }),
  };
}
