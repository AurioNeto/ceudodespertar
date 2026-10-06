import { describe, expect, it, vi } from 'vitest';
import { criarClienteHttp } from './clienteHttp';
import type { ResultadoDaRenovacao } from './credencial';
import { ErroDaApi, ErroDeRede } from './erros';
import {
  cabecalhosDaChamada,
  criarFetchFalso,
  criarFonteDeCredencialFalsa,
  respostaDeErro,
  respostaJson,
} from './apoioDeTeste';

function montar(...respostas: Array<Response | Error>) {
  const credencial = criarFonteDeCredencialFalsa();
  const fetchFalso = criarFetchFalso(...respostas);
  const cliente = criarClienteHttp({ credencial, fetch: fetchFalso });
  return { credencial, fetchFalso, cliente };
}

async function capturar(promessa: Promise<unknown>): Promise<unknown> {
  try {
    await promessa;
  } catch (erro) {
    return erro;
  }
  throw new Error('a promessa deveria ter rejeitado');
}

describe('cabeçalhos e corpo', () => {
  it('envia Bearer, Accept e a base /api/v1', async () => {
    const { cliente, fetchFalso } = montar(respostaJson(200, { ok: true }));

    const saida = await cliente.requisitar({ metodo: 'GET', caminho: '/lancamentos' });

    expect(saida).toEqual({ ok: true });
    expect(fetchFalso.mock.calls[0]?.[0]).toBe('/api/v1/lancamentos');
    const cabecalhos = cabecalhosDaChamada(fetchFalso, 0);
    expect(cabecalhos.get('Authorization')).toBe('Bearer token-velho');
    expect(cabecalhos.get('Accept')).toBe('application/json');
    expect(cabecalhos.get('Idempotency-Key')).toBeNull();
    expect(cabecalhos.get('If-Match')).toBeNull();
  });

  it('omite Authorization quando não há token', async () => {
    const credencial = criarFonteDeCredencialFalsa();
    credencial.tokenAtual.mockResolvedValue(null);
    const fetchFalso = criarFetchFalso(respostaJson(200, {}));
    const cliente = criarClienteHttp({ credencial, fetch: fetchFalso });

    await cliente.requisitar({ metodo: 'GET', caminho: '/x' });

    expect(cabecalhosDaChamada(fetchFalso, 0).get('Authorization')).toBeNull();
  });

  it('serializa o corpo como JSON com Content-Type', async () => {
    const { cliente, fetchFalso } = montar(respostaJson(201, { id: '1' }));

    await cliente.requisitar({ metodo: 'POST', caminho: '/x', corpo: { valor: 10 } });

    expect(fetchFalso.mock.calls[0]?.[1]?.body).toBe('{"valor":10}');
    expect(cabecalhosDaChamada(fetchFalso, 0).get('Content-Type')).toBe('application/json');
  });

  it('envia If-Match quando o chamador passa a versão', async () => {
    const { cliente, fetchFalso } = montar(respostaJson(200, {}));

    await cliente.requisitar({ metodo: 'PUT', caminho: '/x/1', corpo: {}, versao: 7 });

    expect(cabecalhosDaChamada(fetchFalso, 0).get('If-Match')).toBe('7');
  });

  it('gera Idempotency-Key em todo POST e em nenhum GET', async () => {
    const { cliente, fetchFalso } = montar(respostaJson(201, {}), respostaJson(201, {}));

    await cliente.requisitar({ metodo: 'POST', caminho: '/x', corpo: {} });
    await cliente.requisitar({ metodo: 'POST', caminho: '/x', corpo: {} });

    const primeira = cabecalhosDaChamada(fetchFalso, 0).get('Idempotency-Key');
    const segunda = cabecalhosDaChamada(fetchFalso, 1).get('Idempotency-Key');
    expect(primeira).toMatch(/^[0-9a-f-]{36}$/);
    expect(segunda).toMatch(/^[0-9a-f-]{36}$/);
    expect(primeira).not.toBe(segunda);
  });

  it('respeita a chave de idempotência passada pelo chamador', async () => {
    const { cliente, fetchFalso } = montar(respostaJson(201, {}));

    await cliente.requisitar({
      metodo: 'POST',
      caminho: '/x',
      corpo: {},
      chaveDeIdempotencia: 'minha-chave',
    });

    expect(cabecalhosDaChamada(fetchFalso, 0).get('Idempotency-Key')).toBe('minha-chave');
  });

  it('repassa o AbortSignal ao fetch', async () => {
    const { cliente, fetchFalso } = montar(respostaJson(200, {}));
    const controlador = new AbortController();

    await cliente.requisitar({ metodo: 'GET', caminho: '/x', sinal: controlador.signal });

    expect(fetchFalso.mock.calls[0]?.[1]?.signal).toBe(controlador.signal);
  });

  it('devolve undefined em resposta sem corpo', async () => {
    const { cliente } = montar(new Response(null, { status: 204 }));

    expect(await cliente.requisitar({ metodo: 'DELETE', caminho: '/x/1' })).toBeUndefined();
  });
});

describe('classes de erro', () => {
  it('traduz o corpo {erro, detalhes, correlacaoId} em ErroDaApi', async () => {
    const { cliente } = montar(
      respostaJson(409, {
        erro: 'VERSAO_DESATUALIZADA',
        detalhes: { versaoAtual: 8 },
        correlacaoId: 'abc',
      }),
    );

    const erro = await capturar(cliente.requisitar({ metodo: 'PUT', caminho: '/x', versao: 7 }));

    expect(erro).toBeInstanceOf(ErroDaApi);
    expect(erro).toMatchObject({
      status: 409,
      codigo: 'VERSAO_DESATUALIZADA',
      detalhes: { versaoAtual: 8 },
      correlacaoId: 'abc',
    });
  });

  it('propaga 428 VERSAO_OBRIGATORIA e 403 SEM_PERMISSAO sem renovar', async () => {
    const { cliente, credencial } = montar(
      respostaDeErro(428, 'VERSAO_OBRIGATORIA'),
      respostaDeErro(403, 'SEM_PERMISSAO'),
    );

    const primeiro = await capturar(cliente.requisitar({ metodo: 'PUT', caminho: '/x' }));
    const segundo = await capturar(cliente.requisitar({ metodo: 'GET', caminho: '/x' }));

    expect(primeiro).toMatchObject({ status: 428, codigo: 'VERSAO_OBRIGATORIA' });
    expect(segundo).toMatchObject({ status: 403, codigo: 'SEM_PERMISSAO' });
    expect(credencial.renovar).not.toHaveBeenCalled();
  });

  it('corpo não JSON em 500 vira ERRO_INTERNO', async () => {
    const { cliente } = montar(new Response('<html>boom</html>', { status: 500 }));

    const erro = await capturar(cliente.requisitar({ metodo: 'GET', caminho: '/x' }));

    expect(erro).toMatchObject({ status: 500, codigo: 'ERRO_INTERNO', correlacaoId: null });
  });

  it('corpo não JSON em 502 vira SERVICO_INDISPONIVEL', async () => {
    const { cliente } = montar(new Response('bad gateway', { status: 502 }));

    const erro = await capturar(cliente.requisitar({ metodo: 'GET', caminho: '/x' }));

    expect(erro).toMatchObject({ status: 502, codigo: 'SERVICO_INDISPONIVEL' });
  });

  it('corpo JSON fora do formato ou com código desconhecido cai no fallback', async () => {
    const { cliente } = montar(
      respostaJson(400, { mensagem: 'ruim' }),
      respostaJson(400, { erro: 'CODIGO_QUE_NAO_EXISTE', correlacaoId: 'x' }),
      respostaJson(503, [1, 2]),
    );

    const a = await capturar(cliente.requisitar({ metodo: 'GET', caminho: '/x' }));
    const b = await capturar(cliente.requisitar({ metodo: 'GET', caminho: '/x' }));
    const c = await capturar(cliente.requisitar({ metodo: 'GET', caminho: '/x' }));

    expect(a).toMatchObject({ codigo: 'ERRO_INTERNO' });
    expect(b).toMatchObject({ codigo: 'ERRO_INTERNO' });
    expect(c).toMatchObject({ codigo: 'SERVICO_INDISPONIVEL' });
  });

  it('sucesso com corpo inválido vira ErroDaApi, não SyntaxError', async () => {
    const { cliente } = montar(new Response('{quebrado', { status: 200 }));

    const erro = await capturar(cliente.requisitar({ metodo: 'GET', caminho: '/x' }));

    expect(erro).toBeInstanceOf(ErroDaApi);
    expect(erro).toMatchObject({ codigo: 'ERRO_INTERNO' });
  });

  it('falha de rede vira ErroDeRede, distinto de ErroDaApi', async () => {
    const { cliente } = montar(new TypeError('Failed to fetch'));

    const erro = await capturar(cliente.requisitar({ metodo: 'GET', caminho: '/x' }));

    expect(erro).toBeInstanceOf(ErroDeRede);
    expect(erro).not.toBeInstanceOf(ErroDaApi);
  });

  it('abort propaga o AbortError original, não ErroDeRede', async () => {
    const abortamento = new DOMException('cancelado', 'AbortError');
    const { cliente } = montar(abortamento);

    const erro = await capturar(cliente.requisitar({ metodo: 'GET', caminho: '/x' }));

    expect(erro).toBe(abortamento);
  });

  it('um sinal já abortado interrompe a requisição real', async () => {
    const credencial = criarFonteDeCredencialFalsa();
    const controlador = new AbortController();
    controlador.abort();
    const fetchQueRespeitaSinal = vi.fn<typeof globalThis.fetch>((_entrada, init) =>
      init?.signal?.aborted
        ? Promise.reject(new DOMException('cancelado', 'AbortError'))
        : Promise.resolve(respostaJson(200, {})),
    );
    const cliente = criarClienteHttp({ credencial, fetch: fetchQueRespeitaSinal });

    const erro = await capturar(
      cliente.requisitar({ metodo: 'GET', caminho: '/x', sinal: controlador.signal }),
    );

    expect(erro).toMatchObject({ name: 'AbortError' });
  });
});

describe('política de 401', () => {
  it('NAO_AUTENTICADO renova uma vez e repete com o token novo e a mesma Idempotency-Key', async () => {
    const { cliente, credencial, fetchFalso } = montar(
      respostaDeErro(401, 'NAO_AUTENTICADO'),
      respostaJson(201, { id: 'novo' }),
    );

    const saida = await cliente.requisitar({ metodo: 'POST', caminho: '/x', corpo: {} });

    expect(saida).toEqual({ id: 'novo' });
    expect(credencial.renovar).toHaveBeenCalledTimes(1);
    expect(fetchFalso).toHaveBeenCalledTimes(2);
    const primeira = cabecalhosDaChamada(fetchFalso, 0);
    const repeticao = cabecalhosDaChamada(fetchFalso, 1);
    expect(primeira.get('Authorization')).toBe('Bearer token-velho');
    expect(repeticao.get('Authorization')).toBe('Bearer token-novo');
    expect(repeticao.get('Idempotency-Key')).toBe(primeira.get('Idempotency-Key'));
    expect(primeira.get('Idempotency-Key')).not.toBeNull();
  });

  it('se a repetição também der 401, propaga sem renovar de novo', async () => {
    const { cliente, credencial, fetchFalso } = montar(
      respostaDeErro(401, 'NAO_AUTENTICADO'),
      respostaDeErro(401, 'NAO_AUTENTICADO'),
    );

    const erro = await capturar(cliente.requisitar({ metodo: 'GET', caminho: '/x' }));

    expect(erro).toMatchObject({ status: 401, codigo: 'NAO_AUTENTICADO' });
    expect(credencial.renovar).toHaveBeenCalledTimes(1);
    expect(fetchFalso).toHaveBeenCalledTimes(2);
    expect(credencial.aoSessaoEncerrada).not.toHaveBeenCalled();
  });

  it('requisições concorrentes compartilham uma única renovação', async () => {
    let concluirRenovacao: (resultado: ResultadoDaRenovacao) => void = () => undefined;
    const renovacao = new Promise<ResultadoDaRenovacao>((resolver) => {
      concluirRenovacao = resolver;
    });
    const credencial = criarFonteDeCredencialFalsa({ renovacao: () => renovacao });
    const fetchFalso = criarFetchFalso(
      respostaDeErro(401, 'NAO_AUTENTICADO'),
      respostaDeErro(401, 'NAO_AUTENTICADO'),
      respostaDeErro(401, 'NAO_AUTENTICADO'),
      respostaJson(200, { n: 1 }),
      respostaJson(200, { n: 2 }),
      respostaJson(200, { n: 3 }),
    );
    const cliente = criarClienteHttp({ credencial, fetch: fetchFalso });

    const todas = Promise.all([
      cliente.requisitar({ metodo: 'GET', caminho: '/a' }),
      cliente.requisitar({ metodo: 'GET', caminho: '/b' }),
      cliente.requisitar({ metodo: 'GET', caminho: '/c' }),
    ]);
    await vi.waitFor(() => expect(fetchFalso).toHaveBeenCalledTimes(3));
    await vi.waitFor(() => expect(credencial.renovar).toHaveBeenCalledTimes(1));
    concluirRenovacao('renovado');
    const resultados = await todas;

    expect(resultados).toHaveLength(3);
    expect(credencial.renovar).toHaveBeenCalledTimes(1);
    expect(fetchFalso).toHaveBeenCalledTimes(6);
  });

  it('401 defasado depois da renovação concluída repete com o token novo sem renovar de novo', async () => {
    const credencial = criarFonteDeCredencialFalsa();
    let liberarSegundo401: () => void = () => undefined;
    const segundo401Liberado = new Promise<void>((resolver) => {
      liberarSegundo401 = resolver;
    });
    const respostas = [
      () => Promise.resolve(respostaDeErro(401, 'NAO_AUTENTICADO')),
      () => segundo401Liberado.then(() => respostaDeErro(401, 'NAO_AUTENTICADO')),
      () => Promise.resolve(respostaJson(200, { n: 1 })),
      () => Promise.resolve(respostaJson(200, { n: 2 })),
    ];
    const fetchFalso = vi.fn<typeof globalThis.fetch>(() => {
      const proxima = respostas.shift();
      if (!proxima) return Promise.reject(new Error('fila de respostas esgotada'));
      return proxima();
    });
    const cliente = criarClienteHttp({ credencial, fetch: fetchFalso });

    const primeira = cliente.requisitar({ metodo: 'GET', caminho: '/a' });
    const segunda = cliente.requisitar({ metodo: 'GET', caminho: '/b' });
    await primeira;
    expect(credencial.renovar).toHaveBeenCalledTimes(1);
    liberarSegundo401();
    await segunda;

    expect(credencial.renovar).toHaveBeenCalledTimes(1);
    expect(fetchFalso).toHaveBeenCalledTimes(4);
    expect(cabecalhosDaChamada(fetchFalso, 1).get('Authorization')).toBe('Bearer token-velho');
    expect(cabecalhosDaChamada(fetchFalso, 3).get('Authorization')).toBe('Bearer token-novo');
  });

  it('renovação que encerra a sessão avisa uma vez e propaga o 401', async () => {
    const credencial = criarFonteDeCredencialFalsa({ renovacao: () => Promise.resolve('sessao-encerrada') });
    const fetchFalso = criarFetchFalso(
      respostaDeErro(401, 'NAO_AUTENTICADO'),
      respostaDeErro(401, 'NAO_AUTENTICADO'),
    );
    const cliente = criarClienteHttp({ credencial, fetch: fetchFalso });

    const resultados = await Promise.all([
      capturar(cliente.requisitar({ metodo: 'GET', caminho: '/a' })),
      capturar(cliente.requisitar({ metodo: 'GET', caminho: '/b' })),
    ]);

    for (const erro of resultados) {
      expect(erro).toMatchObject({ status: 401, codigo: 'NAO_AUTENTICADO' });
    }
    expect(credencial.renovar).toHaveBeenCalledTimes(1);
    expect(credencial.aoSessaoEncerrada).toHaveBeenCalledTimes(1);
    expect(fetchFalso).toHaveBeenCalledTimes(2);
  });

  it('renovação indisponível mantém a sessão e falha como erro de rede', async () => {
    const credencial = criarFonteDeCredencialFalsa({ renovacao: () => Promise.resolve('indisponivel') });
    const fetchFalso = criarFetchFalso(respostaDeErro(401, 'NAO_AUTENTICADO'));
    const cliente = criarClienteHttp({ credencial, fetch: fetchFalso });

    const erro = await capturar(cliente.requisitar({ metodo: 'GET', caminho: '/x' }));

    expect(erro).toBeInstanceOf(ErroDeRede);
    expect(credencial.aoSessaoEncerrada).not.toHaveBeenCalled();
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it('renovação que lança não encerra a sessão: o erro é tratado como indisponibilidade', async () => {
    const credencial = criarFonteDeCredencialFalsa({
      renovacao: () => Promise.reject(new Error('falha inesperada')),
    });
    const fetchFalso = criarFetchFalso(respostaDeErro(401, 'NAO_AUTENTICADO'));
    const cliente = criarClienteHttp({ credencial, fetch: fetchFalso });

    const erro = await capturar(cliente.requisitar({ metodo: 'GET', caminho: '/x' }));

    expect(erro).toBeInstanceOf(ErroDeRede);
    expect(credencial.aoSessaoEncerrada).not.toHaveBeenCalled();
  });

  it.each(['USUARIO_CONVITE_PENDENTE', 'USUARIO_SUSPENSO', 'USUARIO_REVOGADO'] as const)(
    '401 por situação (%s) não renova, não encerra a sessão e propaga o código',
    async (codigo) => {
      const { cliente, credencial, fetchFalso } = montar(respostaDeErro(401, codigo));

      const erro = await capturar(cliente.requisitar({ metodo: 'GET', caminho: '/x' }));

      expect(erro).toMatchObject({ status: 401, codigo });
      expect(credencial.renovar).not.toHaveBeenCalled();
      expect(credencial.aoSessaoEncerrada).not.toHaveBeenCalled();
      expect(fetchFalso).toHaveBeenCalledTimes(1);
    },
  );

  it('503 do provedor de identidade não renova nem encerra a sessão', async () => {
    const { cliente, credencial, fetchFalso } = montar(
      respostaDeErro(503, 'PROVEDOR_DE_IDENTIDADE_INDISPONIVEL'),
    );

    const erro = await capturar(cliente.requisitar({ metodo: 'GET', caminho: '/x' }));

    expect(erro).toMatchObject({ status: 503, codigo: 'PROVEDOR_DE_IDENTIDADE_INDISPONIVEL' });
    expect(credencial.renovar).not.toHaveBeenCalled();
    expect(credencial.aoSessaoEncerrada).not.toHaveBeenCalled();
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });
});
