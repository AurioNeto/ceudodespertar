import { describe, expect, it } from 'vitest';
import {
  CPF_REDIGIDO,
  PROFUNDIDADE_EXCEDIDA,
  PROFUNDIDADE_MAXIMA,
  REFERENCIA_CIRCULAR,
  VALOR_BINARIO_OMITIDO,
  VALOR_REDIGIDO,
  ehChaveProibida,
  mascararCpf,
  redigir,
  LINHA_DE_LOG_ILEGIVEL,
  redigirLinhaDeLog,
} from './redacao.js';

const SEGREDO = 'valor-que-nunca-pode-aparecer';

const CHAVES_PROIBIDAS = [
  'authorization',
  'Authorization',
  'AUTHORIZATION',
  'proxy-authorization',
  'cookie',
  'Cookie',
  'set-cookie',
  'Set-Cookie',
  'cookies',
  'body',
  'Body',
  'rawBody',
  'corpo',
  'senha',
  'SENHA',
  'novaSenha',
  'senha_atual',
  'password',
  'PassWord',
  'passwd',
  'token',
  'Token',
  'accessToken',
  'refresh_token',
  'tokenDoLink',
  'segredo',
  'clientSecret',
  'client_secret',
  'x-api-key',
  'apiKey',
  'credencial',
  'cpf',
  'CPF',
  'cpfDoTitular',
  'documento',
  'anamnese',
  'Anamnese',
  'respostasDaAnamnese',
  'pass',
  'Pass',
  'jwt',
  'JWT',
  'idJwt',
  'bearer',
  'Bearer',
  'sessionId',
  'session_id',
  'sessao',
  'sessaoAtual',
  'saude',
  'dadosDeSaude',
  'saúde',
  'diagnostico',
  'diagnósticos',
  'medicamento',
  'medicamentosEmUso',
  'queixa',
  'queixaPrincipal',
  'alergia',
  'alergias',
  'restricao',
  'restrição',
  'restricoesAlimentares',
] as const;

function textoSerializado(valor: unknown): string {
  return JSON.stringify(redigir(valor));
}

describe('redação de log', () => {
  it.each(CHAVES_PROIBIDAS)('reconhece "%s" como chave proibida', (chave) => {
    expect(ehChaveProibida(chave)).toBe(true);
  });

  it.each(['correlacaoId', 'instituicaoId', 'method', 'url', 'statusCode', 'user-agent', 'motivo'])(
    'não redige a chave inofensiva "%s"',
    (chave) => {
      expect(ehChaveProibida(chave)).toBe(false);
    },
  );

  it.each(CHAVES_PROIBIDAS)('troca o valor de "%s" no primeiro nível e mantém o resto', (chave) => {
    const redigido = redigir({ [chave]: SEGREDO, method: 'POST' });

    expect(redigido).toStrictEqual({ [chave]: VALOR_REDIGIDO, method: 'POST' });
    expect(JSON.stringify(redigido)).not.toContain(SEGREDO);
  });

  it.each(CHAVES_PROIBIDAS)('troca o valor de "%s" aninhado em objetos e listas', (chave) => {
    const entrada = {
      req: { headers: { [chave]: SEGREDO, host: 'api.local' } },
      itens: [{ fundo: { [chave]: SEGREDO } }],
    };

    expect(redigir(entrada)).toStrictEqual({
      req: { headers: { [chave]: VALOR_REDIGIDO, host: 'api.local' } },
      itens: [{ fundo: { [chave]: VALOR_REDIGIDO } }],
    });
    expect(textoSerializado(entrada)).not.toContain(SEGREDO);
  });

  it('redige o objeto inteiro sob uma chave proibida, não só as folhas', () => {
    const entrada = { body: { nome: 'Fulana', cpf: '123.456.789-09', queixa: SEGREDO } };

    expect(redigir(entrada)).toStrictEqual({ body: VALOR_REDIGIDO });
  });

  it('mascara um CPF que aparece no valor de uma chave inofensiva', () => {
    const entrada = { mensagem: 'falhou para 123.456.789-09 e 98765432100', status: 404 };

    expect(redigir(entrada)).toStrictEqual({
      mensagem: `falhou para ${CPF_REDIGIDO} e ${CPF_REDIGIDO}`,
      status: 404,
    });
  });

  it('não mascara números de outro tamanho', () => {
    expect(mascararCpf('pedido 1234567890 e 123456789012')).toBe('pedido 1234567890 e 123456789012');
  });

  it('mascara um CPF escrito com espaços', () => {
    expect(mascararCpf('cpf 123 456 789 09 recusado')).toBe(`cpf ${CPF_REDIGIDO} recusado`);
  });

  it.each([12345678909, 98765432100, 10_000_000_000, 99_999_999_999])(
    'mascara o número inteiro de 11 dígitos %d',
    (numero) => {
      expect(redigir({ valor: numero })).toStrictEqual({ valor: CPF_REDIGIDO });
    },
  );

  it.each([9_999_999_999, 100_000_000_000, 12345678909.5, 1_234, 200])(
    'mantém o número %d, que não tem 11 dígitos inteiros',
    (numero) => {
      expect(redigir({ valor: numero })).toStrictEqual({ valor: numero });
    },
  );

  it('serializa um Error e redige os campos dele', () => {
    const erro = Object.assign(new Error('cpf 123.456.789-09 rejeitado'), { token: SEGREDO });

    const redigido = redigir({ causa: erro }) as { causa: Record<string, unknown> };

    expect(redigido.causa).toMatchObject({
      type: 'Error',
      message: `cpf ${CPF_REDIGIDO} rejeitado`,
      token: VALOR_REDIGIDO,
    });
    expect(JSON.stringify(redigido)).not.toContain(SEGREDO);
  });

  it('corta referência circular sem estourar a pilha', () => {
    const circular: Record<string, unknown> = { nome: 'raiz' };
    circular.eu = circular;

    expect(redigir(circular)).toStrictEqual({ nome: 'raiz', eu: REFERENCIA_CIRCULAR });
  });

  it('corta a profundidade excessiva', () => {
    let fundo: Record<string, unknown> = { folha: 'x' };
    for (let nivel = 0; nivel < PROFUNDIDADE_MAXIMA + 2; nivel += 1) {
      fundo = { dentro: fundo };
    }

    expect(JSON.stringify(redigir(fundo))).toContain(PROFUNDIDADE_EXCEDIDA);
  });

  it('não serializa conteúdo binário', () => {
    expect(redigir({ arquivo: Buffer.from(SEGREDO) })).toStrictEqual({ arquivo: VALOR_BINARIO_OMITIDO });
  });

  it('redige a linha JSON já serializada que vai para o destino', () => {
    const linha = `${JSON.stringify({ level: 'info', msg: 'ok', headers: { AUTHORIZATION: SEGREDO } })}\n`;

    const redigida = redigirLinhaDeLog(linha);

    expect(JSON.parse(redigida)).toStrictEqual({
      level: 'info',
      msg: 'ok',
      headers: { AUTHORIZATION: VALOR_REDIGIDO },
    });
    expect(redigida.endsWith('\n')).toBe(true);
    expect(redigida).not.toContain(SEGREDO);
  });

  it('descarta a linha que não é JSON em vez de repassá-la crua', () => {
    expect(redigirLinhaDeLog(`authorization: ${SEGREDO}`)).toBe(LINHA_DE_LOG_ILEGIVEL);
  });
});
