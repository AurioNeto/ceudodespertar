import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { ContextoDaRequisicao } from '../contexto-da-requisicao.js';
import type { ContextoDaTransacao, ModoDeTransacao, UnidadeDeTrabalho } from '../banco/unidade-de-trabalho.js';
import { apagarChavesVencidas, listarIdsDasInstituicoes } from './chave-de-idempotencia.repositorio.js';
import {
  ExpurgoDeChavesDeIdempotencia,
  INTERVALO_DO_EXPURGO_EM_MS,
  MENSAGEM_DE_CHAVES_EXPURGADAS,
  MENSAGEM_DE_FALHA_AO_LISTAR_INSTITUICOES,
  MENSAGEM_DE_FALHA_NO_EXPURGO,
} from './expurgo-de-chaves-de-idempotencia.js';

vi.mock('./chave-de-idempotencia.repositorio.js', () => ({
  apagarChavesVencidas: vi.fn(),
  listarIdsDasInstituicoes: vi.fn(),
}));

interface ChamadaDeTransacao {
  readonly modo: ModoDeTransacao;
  readonly instituicaoId: string | undefined;
}

class ErroDoDriver extends Error {}

function unidadeQueRegistra(chamadas: ChamadaDeTransacao[]): UnidadeDeTrabalho {
  return {
    transacao: (modo: ModoDeTransacao, fn: (contexto: ContextoDaTransacao) => Promise<unknown>) => {
      chamadas.push({ modo, instituicaoId: ContextoDaRequisicao.atual()?.instituicaoId });
      return fn({ kysely: {} } as unknown as ContextoDaTransacao);
    },
  } as unknown as UnidadeDeTrabalho;
}

describe('ExpurgoDeChavesDeIdempotencia', () => {
  let avisos: MockInstance;
  let informacoes: MockInstance;
  let chamadas: ChamadaDeTransacao[];
  let expurgo: ExpurgoDeChavesDeIdempotencia;

  beforeEach(() => {
    avisos = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    informacoes = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    vi.mocked(listarIdsDasInstituicoes).mockReset();
    vi.mocked(apagarChavesVencidas).mockReset();
    chamadas = [];
    expurgo = new ExpurgoDeChavesDeIdempotencia(unidadeQueRegistra(chamadas));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('abre uma transação de escrita por instituição, com o contexto daquela instituição', async () => {
    vi.mocked(listarIdsDasInstituicoes).mockResolvedValue(['inst-a', 'inst-b']);
    vi.mocked(apagarChavesVencidas).mockResolvedValue(0);

    await expurgo.expurgar();

    expect(chamadas).toStrictEqual([
      { modo: 'leitura', instituicaoId: undefined },
      { modo: 'escrita', instituicaoId: 'inst-a' },
      { modo: 'escrita', instituicaoId: 'inst-b' },
    ]);
  });

  it('loga info com o total apagado e as instituições afetadas quando apaga algo', async () => {
    vi.mocked(listarIdsDasInstituicoes).mockResolvedValue(['inst-a', 'inst-b', 'inst-c']);
    vi.mocked(apagarChavesVencidas).mockResolvedValueOnce(2).mockResolvedValueOnce(0).mockResolvedValueOnce(5);

    await expurgo.expurgar();

    expect(informacoes).toHaveBeenCalledTimes(1);
    expect(informacoes).toHaveBeenCalledWith({ apagadas: 7, instituicoes: 2 }, MENSAGEM_DE_CHAVES_EXPURGADAS);
  });

  it('não loga nada quando não há o que apagar', async () => {
    vi.mocked(listarIdsDasInstituicoes).mockResolvedValue(['inst-a']);
    vi.mocked(apagarChavesVencidas).mockResolvedValue(0);

    await expurgo.expurgar();

    expect(informacoes).not.toHaveBeenCalled();
    expect(avisos).not.toHaveBeenCalled();
  });

  it('uma instituição que falha gera warn só com o nome do erro e não impede as demais', async () => {
    vi.mocked(listarIdsDasInstituicoes).mockResolvedValue(['inst-a', 'inst-b']);
    vi.mocked(apagarChavesVencidas)
      .mockRejectedValueOnce(new ErroDoDriver('detalhe sensível do driver'))
      .mockResolvedValueOnce(4);

    await expurgo.expurgar();

    expect(avisos).toHaveBeenCalledTimes(1);
    expect(avisos).toHaveBeenCalledWith({ erro: 'ErroDoDriver', instituicaoId: 'inst-a' }, MENSAGEM_DE_FALHA_NO_EXPURGO);
    expect(JSON.stringify(avisos.mock.calls)).not.toContain('detalhe sensível');
    expect(informacoes).toHaveBeenCalledWith({ apagadas: 4, instituicoes: 1 }, MENSAGEM_DE_CHAVES_EXPURGADAS);
  });

  it('falha ao listar as instituições gera warn e não tenta expurgar', async () => {
    vi.mocked(listarIdsDasInstituicoes).mockRejectedValue(new ErroDoDriver('conexão caiu'));

    await expect(expurgo.expurgar()).resolves.toBeUndefined();

    expect(avisos).toHaveBeenCalledWith({ erro: 'ErroDoDriver' }, MENSAGEM_DE_FALHA_AO_LISTAR_INSTITUICOES);
    expect(apagarChavesVencidas).not.toHaveBeenCalled();
  });

  it('agenda o expurgo a cada intervalo e para ao destruir o módulo', async () => {
    vi.useFakeTimers();
    vi.mocked(listarIdsDasInstituicoes).mockResolvedValue([]);

    expurgo.onModuleInit();
    await vi.advanceTimersByTimeAsync(INTERVALO_DO_EXPURGO_EM_MS * 2);
    expurgo.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(INTERVALO_DO_EXPURGO_EM_MS * 2);

    expect(listarIdsDasInstituicoes).toHaveBeenCalledTimes(2);
  });

  it('roda fora do contexto da requisição que o agendou', async () => {
    vi.useFakeTimers();
    let contextoVisto: unknown = 'não chamado';
    vi.mocked(listarIdsDasInstituicoes).mockImplementation(() => {
      contextoVisto = ContextoDaRequisicao.atual();
      return Promise.resolve([]);
    });

    ContextoDaRequisicao.executar({ correlacaoId: 'requisicao-que-agendou', instituicaoId: 'inst-x' }, () => {
      expurgo.onModuleInit();
    });
    await vi.advanceTimersByTimeAsync(INTERVALO_DO_EXPURGO_EM_MS);
    expurgo.onModuleDestroy();

    expect(contextoVisto).toBeUndefined();
  });

  it('na subida da aplicação expurga uma vez sem esperar o intervalo e sem bloquear o boot', async () => {
    vi.useFakeTimers();
    let concluirListagem: (ids: string[]) => void = () => undefined;
    vi.mocked(listarIdsDasInstituicoes).mockReturnValue(
      new Promise<string[]>((resolver) => {
        concluirListagem = resolver;
      }),
    );

    expurgo.onModuleInit();
    const retorno = expurgo.onApplicationBootstrap();
    await Promise.resolve();

    expect(retorno).toBeUndefined();
    expect(listarIdsDasInstituicoes).toHaveBeenCalledTimes(1);
    concluirListagem([]);
    expurgo.onModuleDestroy();
  });

  it('falha na primeira rodada da subida não derruba a aplicação nem vira rejeição não tratada', async () => {
    vi.spyOn(expurgo, 'expurgar').mockRejectedValue(new ErroDoDriver('falha inesperada'));

    expect(() => expurgo.onApplicationBootstrap()).not.toThrow();
    await new Promise((resolver) => setImmediate(resolver));

    expect(avisos).toHaveBeenCalledWith({ erro: 'ErroDoDriver' }, MENSAGEM_DE_FALHA_NO_EXPURGO);
  });

  it('a rodada da subida roda fora do contexto de quem inicializou o módulo', async () => {
    let contextoVisto: unknown = 'não chamado';
    vi.mocked(listarIdsDasInstituicoes).mockImplementation(() => {
      contextoVisto = ContextoDaRequisicao.atual();
      return Promise.resolve([]);
    });

    ContextoDaRequisicao.executar({ correlacaoId: 'quem-subiu', instituicaoId: 'inst-x' }, () => {
      expurgo.onApplicationBootstrap();
    });
    await new Promise((resolver) => setImmediate(resolver));

    expect(contextoVisto).toBeUndefined();
  });
});
