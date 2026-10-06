import { describe, expect, it } from 'vitest';
import { criarClienteHttp } from './clienteHttp';
import { criarComando, criarConsulta } from './consultaEComando';
import {
  cabecalhosDaChamada,
  criarFetchFalso,
  criarFonteDeCredencialFalsa,
  respostaDeErro,
  respostaJson,
} from './apoioDeTeste';

function montar(...respostas: Array<Response | Error>) {
  const fetchFalso = criarFetchFalso(...respostas);
  const cliente = criarClienteHttp({ credencial: criarFonteDeCredencialFalsa(), fetch: fetchFalso });
  return { fetchFalso, comando: criarComando(cliente), consulta: criarConsulta(cliente) };
}

interface NovoLancamento {
  readonly valor: number;
}

describe('consulta', () => {
  it('monta chave e função de busca com o sinal de cancelamento', async () => {
    const { consulta, fetchFalso } = montar(respostaJson(200, [{ id: '1' }]));
    const controlador = new AbortController();

    const definicao = consulta<Array<{ id: string }>>('/lancamentos');
    const saida = await definicao.queryFn({ signal: controlador.signal });

    expect(definicao.queryKey).toEqual(['/lancamentos']);
    expect(saida).toEqual([{ id: '1' }]);
    expect(fetchFalso.mock.calls[0]?.[1]?.signal).toBe(controlador.signal);
    expect(fetchFalso.mock.calls[0]?.[1]?.method).toBe('GET');
  });
});

describe('comando', () => {
  it('cada execução é uma intenção com Idempotency-Key própria', async () => {
    const { comando, fetchFalso } = montar(respostaJson(201, {}), respostaJson(201, {}));
    const criar = comando<NovoLancamento, unknown>({
      metodo: 'POST',
      caminho: '/lancamentos',
      corpo: (entrada) => entrada,
    });

    await criar({ valor: 1 });
    await criar({ valor: 1 });

    expect(cabecalhosDaChamada(fetchFalso, 0).get('Idempotency-Key')).not.toBe(
      cabecalhosDaChamada(fetchFalso, 1).get('Idempotency-Key'),
    );
  });

  it('a mesma chave passada pelo chamador sobrevive a uma nova execução da mesma intenção', async () => {
    const { comando, fetchFalso } = montar(respostaJson(201, {}), respostaJson(201, {}));
    const criar = comando<NovoLancamento, unknown>({ metodo: 'POST', caminho: '/lancamentos' });

    await criar({ valor: 1 }, { chaveDeIdempotencia: 'intencao-1' });
    await criar({ valor: 1 }, { chaveDeIdempotencia: 'intencao-1' });

    expect(cabecalhosDaChamada(fetchFalso, 0).get('Idempotency-Key')).toBe('intencao-1');
    expect(cabecalhosDaChamada(fetchFalso, 1).get('Idempotency-Key')).toBe('intencao-1');
  });

  it('resolve caminho e versão a partir da entrada', async () => {
    const { comando, fetchFalso } = montar(respostaJson(200, {}));
    const confirmar = comando<{ id: string; versao: number }, unknown>({
      metodo: 'POST',
      caminho: (entrada) => `/lancamentos/${entrada.id}/confirmar`,
      versao: (entrada) => entrada.versao,
    });

    await confirmar({ id: 'abc', versao: 3 });

    expect(fetchFalso.mock.calls[0]?.[0]).toBe('/api/v1/lancamentos/abc/confirmar');
    expect(cabecalhosDaChamada(fetchFalso, 0).get('If-Match')).toBe('3');
  });

  it('propaga o ErroDaApi do cliente', async () => {
    const { comando } = montar(respostaDeErro(409, 'VERSAO_DESATUALIZADA'));
    const editar = comando<NovoLancamento, unknown>({ metodo: 'PUT', caminho: '/x' });

    await expect(editar({ valor: 1 })).rejects.toMatchObject({ codigo: 'VERSAO_DESATUALIZADA' });
  });
});
