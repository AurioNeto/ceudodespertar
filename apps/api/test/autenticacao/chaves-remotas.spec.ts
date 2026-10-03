import { errors } from 'jose';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  criarChavesRemotas,
  ErroDeChavesIndisponiveis,
  PADROES_DAS_CHAVES_REMOTAS,
} from '../../src/shared/infrastructure/autenticacao/chaves-remotas.js';
import type { OpcoesDasChavesRemotas } from '../../src/shared/infrastructure/autenticacao/chaves-remotas.js';
import { VerificadorDeToken } from '../../src/shared/infrastructure/autenticacao/verificador-de-token.js';
import { AUDIENCIA_DE_TESTE, criarChavesDeTeste, emitirToken, SUB_DE_TESTE } from './chaves-de-teste.js';
import type { ChavesDeTeste } from './chaves-de-teste.js';
import { ServidorDeJwks } from './servidor-de-jwks.js';

const VALIDADE_DO_CACHE_EM_MS = 120;
const LIMITE_DE_ESPERA_EM_MS = 250;
const PAUSA_APOS_FALHA_EM_MS = 400;
const IDADE_MAXIMA_DO_JWKS_VELHO_EM_MS = 5_000;
const MARGEM_DE_AGENDAMENTO_EM_MS = 1_500;

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms));
const passarDaValidadeDoCache = (): Promise<void> => esperar(VALIDADE_DO_CACHE_EM_MS + 60);

describe('padrões das chaves remotas', () => {
  it('fixa as durações adotadas em produção', () => {
    expect(PADROES_DAS_CHAVES_REMOTAS).toEqual({
      validadeDoCacheEmMs: 10 * 60_000,
      limiteDeEsperaEmMs: 5_000,
      esperaAposFalhaEmMs: 30_000,
      idadeMaximaDoJwksVelhoEmMs: 15 * 60_000,
    });
  });
});

describe('chaves remotas com tolerância a falha do provedor', () => {
  let atuais: ChavesDeTeste;
  let novas: ChavesDeTeste;
  let servidor: ServidorDeJwks;

  beforeAll(async () => {
    atuais = await criarChavesDeTeste('chave-atual');
    novas = await criarChavesDeTeste('chave-nova');
  });

  afterEach(async () => {
    await servidor.derrubar();
  });

  async function prepararVerificador(
    opcoes: OpcoesDasChavesRemotas = {},
    conjunto = atuais.conjunto,
  ): Promise<VerificadorDeToken> {
    servidor = new ServidorDeJwks(conjunto);
    await servidor.iniciar();
    return verificadorSobre(servidor.emissor, opcoes);
  }

  function verificadorSobre(emissor: string, opcoes: OpcoesDasChavesRemotas = {}): VerificadorDeToken {
    return new VerificadorDeToken({
      emissor,
      audiencia: AUDIENCIA_DE_TESTE,
      chaves: criarChavesRemotas(emissor, {
        validadeDoCacheEmMs: VALIDADE_DO_CACHE_EM_MS,
        limiteDeEsperaEmMs: LIMITE_DE_ESPERA_EM_MS,
        esperaAposFalhaEmMs: PAUSA_APOS_FALHA_EM_MS,
        idadeMaximaDoJwksVelhoEmMs: IDADE_MAXIMA_DO_JWKS_VELHO_EM_MS,
        ...opcoes,
      }),
    });
  }

  const tokenDe = (chaves: ChavesDeTeste, emissor: string): Promise<string> =>
    emitirToken(chaves, { payload: { iss: emissor } });

  describe('com o provedor fora do ar depois de ter servido as chaves', () => {
    it.each(['indisponivel', 'pendurado'] as const)(
      'segue aceitando token válido de kid conhecido depois da validade do cache: %s',
      async (modo) => {
        const verificador = await prepararVerificador();
        const token = await tokenDe(atuais, servidor.emissor);
        await verificador.verificar(token);
        servidor.modo = modo;
        await passarDaValidadeDoCache();

        const identidade = await verificador.verificar(token);

        expect(identidade.sub).toBe(SUB_DE_TESTE);
        expect(servidor.pedidos).toBeGreaterThan(1);
      },
    );

    it('segue aceitando token válido quando o servidor recusa a conexão', async () => {
      const verificador = await prepararVerificador();
      const token = await tokenDe(atuais, servidor.emissor);
      await verificador.verificar(token);
      await servidor.derrubar();
      await passarDaValidadeDoCache();

      await expect(verificador.verificar(token)).resolves.toMatchObject({ sub: SUB_DE_TESTE });
    });

    it('segue aceitando quando o provedor responde 200 com corpo que não é um JWKS', async () => {
      const verificador = await prepararVerificador();
      const token = await tokenDe(atuais, servidor.emissor);
      await verificador.verificar(token);
      servidor.modo = 'corpo-invalido';
      await passarDaValidadeDoCache();

      await expect(verificador.verificar(token)).resolves.toMatchObject({ sub: SUB_DE_TESTE });
    });

    it('kid novo durante a queda é indisponibilidade, não token inválido', async () => {
      const verificador = await prepararVerificador();
      await verificador.verificar(await tokenDe(atuais, servidor.emissor));
      servidor.modo = 'indisponivel';
      await passarDaValidadeDoCache();

      await expect(verificador.verificar(await tokenDe(novas, servidor.emissor))).rejects.toBeInstanceOf(
        ErroDeChavesIndisponiveis,
      );
    });

    it('kid desconhecido com o JWKS recém-buscado continua sendo recusa de token, mesmo com o servidor fora', async () => {
      const verificador = await prepararVerificador({ validadeDoCacheEmMs: 60_000 });
      await verificador.verificar(await tokenDe(atuais, servidor.emissor));
      servidor.modo = 'indisponivel';

      const erro: unknown = await verificador.verificar(await tokenDe(novas, servidor.emissor)).catch((e: unknown) => e);

      expect(erro).toBeInstanceOf(errors.JWKSNoMatchingKey);
    });

    it('assinatura inválida com kid conhecido continua sendo recusa de token durante a queda', async () => {
      const verificador = await prepararVerificador();
      await verificador.verificar(await tokenDe(atuais, servidor.emissor));
      servidor.modo = 'indisponivel';
      await passarDaValidadeDoCache();
      const forjado = await emitirToken(atuais, { chave: atuais.outraPrivada, payload: { iss: servidor.emissor } });

      const erro: unknown = await verificador.verificar(forjado).catch((e: unknown) => e);

      expect(erro).toBeInstanceOf(errors.JWSSignatureVerificationFailed);
    });

    it('claims inválidas continuam sendo recusa de token durante a queda', async () => {
      const verificador = await prepararVerificador();
      await verificador.verificar(await tokenDe(atuais, servidor.emissor));
      servidor.modo = 'indisponivel';
      await passarDaValidadeDoCache();
      const outraAudiencia = await emitirToken(atuais, { payload: { iss: servidor.emissor, aud: 'cdd-web' } });

      const erro: unknown = await verificador.verificar(outraAudiencia).catch((e: unknown) => e);

      expect(erro).toBeInstanceOf(errors.JWTClaimValidationFailed);
    });

    it('não insiste no provedor durante a pausa após a falha e volta a tentar depois dela', async () => {
      const verificador = await prepararVerificador();
      const token = await tokenDe(atuais, servidor.emissor);
      await verificador.verificar(token);
      servidor.modo = 'indisponivel';
      await passarDaValidadeDoCache();
      await verificador.verificar(token);
      const pedidosAposAPrimeiraFalha = servidor.pedidos;

      await Promise.all([1, 2, 3, 4, 5].map(() => verificador.verificar(token)));
      expect(servidor.pedidos).toBe(pedidosAposAPrimeiraFalha);

      await esperar(PAUSA_APOS_FALHA_EM_MS + 60);
      await verificador.verificar(token);
      expect(servidor.pedidos).toBe(pedidosAposAPrimeiraFalha + 1);
    });

    it('recusa o JWKS velho que passou da idade máxima', async () => {
      const verificador = await prepararVerificador({ idadeMaximaDoJwksVelhoEmMs: 300 });
      const token = await tokenDe(atuais, servidor.emissor);
      await verificador.verificar(token);
      servidor.modo = 'indisponivel';
      await esperar(400);

      await expect(verificador.verificar(token)).rejects.toBeInstanceOf(ErroDeChavesIndisponiveis);
    });

    it('aceita o JWKS velho enquanto ele está dentro da idade máxima', async () => {
      const verificador = await prepararVerificador({ idadeMaximaDoJwksVelhoEmMs: 2_000 });
      const token = await tokenDe(atuais, servidor.emissor);
      await verificador.verificar(token);
      servidor.modo = 'indisponivel';
      await esperar(400);

      await expect(verificador.verificar(token)).resolves.toMatchObject({ sub: SUB_DE_TESTE });
    });
  });

  describe('sem nenhuma chave obtida', () => {
    it.each(['indisponivel', 'corpo-invalido'] as const)('provedor respondendo mal é indisponibilidade: %s', async (modo) => {
      const verificador = await prepararVerificador();
      servidor.modo = modo;
      const token = await tokenDe(atuais, servidor.emissor);

      await expect(verificador.verificar(token)).rejects.toBeInstanceOf(ErroDeChavesIndisponiveis);
    });

    it('conexão recusada é indisponibilidade', async () => {
      const verificador = await prepararVerificador();
      const token = await tokenDe(atuais, servidor.emissor);
      await servidor.derrubar();

      await expect(verificador.verificar(token)).rejects.toBeInstanceOf(ErroDeChavesIndisponiveis);
    });

    it('provedor pendurado vira indisponibilidade dentro do limite de espera', async () => {
      const verificador = await prepararVerificador();
      servidor.modo = 'pendurado';
      const token = await tokenDe(atuais, servidor.emissor);
      const inicio = Date.now();

      await expect(verificador.verificar(token)).rejects.toBeInstanceOf(ErroDeChavesIndisponiveis);

      expect(Date.now() - inicio).toBeLessThan(LIMITE_DE_ESPERA_EM_MS + MARGEM_DE_AGENDAMENTO_EM_MS);
    });

    it('a indisponibilidade carrega a causa original da falha', async () => {
      const verificador = await prepararVerificador();
      servidor.modo = 'pendurado';
      const token = await tokenDe(atuais, servidor.emissor);

      const erro = (await verificador.verificar(token).catch((e: unknown) => e)) as ErroDeChavesIndisponiveis;

      expect(erro.causa).toBeInstanceOf(errors.JWKSTimeout);
    });

    it('o provedor de volta com a chave volta a aceitar o token', async () => {
      const verificador = await prepararVerificador();
      servidor.modo = 'indisponivel';
      const token = await tokenDe(atuais, servidor.emissor);
      await expect(verificador.verificar(token)).rejects.toBeInstanceOf(ErroDeChavesIndisponiveis);

      servidor.modo = 'responde';
      await esperar(PAUSA_APOS_FALHA_EM_MS + 60);

      await expect(verificador.verificar(token)).resolves.toMatchObject({ sub: SUB_DE_TESTE });
    });
  });

  describe('quando o provedor volta', () => {
    it('um kid novo, publicado durante a queda, passa a ser aceito', async () => {
      const verificador = await prepararVerificador();
      await verificador.verificar(await tokenDe(atuais, servidor.emissor));
      servidor.modo = 'indisponivel';
      await passarDaValidadeDoCache();
      const tokenNovo = await tokenDe(novas, servidor.emissor);
      await expect(verificador.verificar(tokenNovo)).rejects.toBeInstanceOf(ErroDeChavesIndisponiveis);

      servidor.conjunto = { keys: [...atuais.conjunto.keys, ...novas.conjunto.keys] };
      servidor.modo = 'responde';
      await esperar(PAUSA_APOS_FALHA_EM_MS + 60);

      await expect(verificador.verificar(tokenNovo)).resolves.toMatchObject({ sub: SUB_DE_TESTE });
      await expect(verificador.verificar(await tokenDe(atuais, servidor.emissor))).resolves.toBeDefined();
    });
  });

  describe('com o provedor no ar', () => {
    it('kid desconhecido é recusa de token, não indisponibilidade', async () => {
      const verificador = await prepararVerificador();

      const erro: unknown = await verificador.verificar(await tokenDe(novas, servidor.emissor)).catch((e: unknown) => e);

      expect(erro).toBeInstanceOf(errors.JWKSNoMatchingKey);
    });

    it('assinatura inválida é recusa de token, não indisponibilidade', async () => {
      const verificador = await prepararVerificador();
      const forjado = await emitirToken(atuais, { chave: atuais.outraPrivada, payload: { iss: servidor.emissor } });

      const erro: unknown = await verificador.verificar(forjado).catch((e: unknown) => e);

      expect(erro).toBeInstanceOf(errors.JWSSignatureVerificationFailed);
    });
  });
});
