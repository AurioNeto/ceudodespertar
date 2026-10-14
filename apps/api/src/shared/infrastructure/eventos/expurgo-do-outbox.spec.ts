import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { ContextoDaRequisicao } from '../contexto-da-requisicao.js';
import type { ContextoDaTransacao, ModoDeTransacao, UnidadeDeTrabalho } from '../banco/unidade-de-trabalho.js';
import { listarIdsDasInstituicoes } from '../banco/instituicoes.js';
import { apagarLoteDeDespachados, TAMANHO_DO_LOTE_DO_EXPURGO } from './expurgo-do-outbox.repositorio.js';
import {
  LOTES_POR_INSTITUICAO_POR_RODADA,
  RODADAS_COM_FALHA_ATE_O_ALERTA,
} from '../banco/expurgo-em-lotes-por-instituicao.js';
import {
  ExpurgoDoOutbox,
  INTERVALO_DO_EXPURGO_EM_MS,
  MENSAGEM_DE_DESPACHADOS_EXPURGADOS,
  MENSAGEM_DE_EXPURGO_FALHANDO,
  MENSAGEM_DE_EXPURGO_RECUPERADO,
  MENSAGEM_DE_FALHA_AO_LISTAR_INSTITUICOES,
  MENSAGEM_DE_FALHA_NO_EXPURGO,
} from './expurgo-do-outbox.js';
import type { ModoDoProcesso } from './modo-do-processo.js';

vi.mock('../banco/instituicoes.js', () => ({
  listarIdsDasInstituicoes: vi.fn(),
}));

vi.mock('./expurgo-do-outbox.repositorio.js', () => ({
  apagarLoteDeDespachados: vi.fn(),
  TAMANHO_DO_LOTE_DO_EXPURGO: 1_000,
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

describe('ExpurgoDoOutbox', () => {
  let avisos: MockInstance;
  let informacoes: MockInstance;
  let erros: MockInstance;
  let chamadas: ChamadaDeTransacao[];
  let expurgo: ExpurgoDoOutbox;

  function novoExpurgo(modo: ModoDoProcesso = 'api'): ExpurgoDoOutbox {
    return new ExpurgoDoOutbox(unidadeQueRegistra(chamadas), modo);
  }

  beforeEach(() => {
    avisos = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    informacoes = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    erros = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    vi.mocked(listarIdsDasInstituicoes).mockReset();
    vi.mocked(apagarLoteDeDespachados).mockReset();
    chamadas = [];
    expurgo = novoExpurgo();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('rodada', () => {
    it('abre uma transação de escrita por lote, com o contexto da instituição do lote', async () => {
      vi.mocked(listarIdsDasInstituicoes).mockResolvedValue(['inst-a', 'inst-b']);
      vi.mocked(apagarLoteDeDespachados).mockResolvedValue(0);

      await expurgo.expurgar();

      expect(chamadas).toStrictEqual([
        { modo: 'leitura', instituicaoId: undefined },
        { modo: 'escrita', instituicaoId: 'inst-a' },
        { modo: 'escrita', instituicaoId: 'inst-b' },
      ]);
    });

    it('passa explicitamente o id de cada instituição ao apagar', async () => {
      vi.mocked(listarIdsDasInstituicoes).mockResolvedValue(['inst-a', 'inst-b']);
      vi.mocked(apagarLoteDeDespachados).mockResolvedValue(0);

      await expurgo.expurgar();

      expect(vi.mocked(apagarLoteDeDespachados).mock.calls.map(([, instituicaoId]) => instituicaoId)).toStrictEqual([
        'inst-a',
        'inst-b',
      ]);
    });

    it('encadeia lotes cheios e para no primeiro lote incompleto', async () => {
      vi.mocked(listarIdsDasInstituicoes).mockResolvedValue(['inst-a']);
      vi.mocked(apagarLoteDeDespachados)
        .mockResolvedValueOnce(TAMANHO_DO_LOTE_DO_EXPURGO)
        .mockResolvedValueOnce(TAMANHO_DO_LOTE_DO_EXPURGO)
        .mockResolvedValueOnce(7);

      await expurgo.expurgar();

      expect(apagarLoteDeDespachados).toHaveBeenCalledTimes(3);
      expect(chamadas.filter(({ modo }) => modo === 'escrita')).toHaveLength(3);
      expect(informacoes).toHaveBeenCalledWith(
        { apagados: 2 * TAMANHO_DO_LOTE_DO_EXPURGO + 7, instituicoes: 1 },
        MENSAGEM_DE_DESPACHADOS_EXPURGADOS,
      );
    });

    it('não passa do teto de lotes por instituição numa rodada e segue para a próxima instituição', async () => {
      vi.mocked(listarIdsDasInstituicoes).mockResolvedValue(['inst-a', 'inst-b']);
      vi.mocked(apagarLoteDeDespachados).mockImplementation((_kysely, instituicaoId) =>
        Promise.resolve(instituicaoId === 'inst-a' ? TAMANHO_DO_LOTE_DO_EXPURGO : 0),
      );

      await expurgo.expurgar();

      const porInstituicao = vi.mocked(apagarLoteDeDespachados).mock.calls.map(([, instituicaoId]) => instituicaoId);
      expect(porInstituicao.filter((id) => id === 'inst-a')).toHaveLength(LOTES_POR_INSTITUICAO_POR_RODADA);
      expect(porInstituicao.filter((id) => id === 'inst-b')).toHaveLength(1);
    });

    it('loga info com o total apagado e as instituições afetadas quando apaga algo', async () => {
      vi.mocked(listarIdsDasInstituicoes).mockResolvedValue(['inst-a', 'inst-b', 'inst-c']);
      vi.mocked(apagarLoteDeDespachados).mockResolvedValueOnce(2).mockResolvedValueOnce(0).mockResolvedValueOnce(5);

      await expurgo.expurgar();

      expect(informacoes).toHaveBeenCalledTimes(1);
      expect(informacoes).toHaveBeenCalledWith({ apagados: 7, instituicoes: 2 }, MENSAGEM_DE_DESPACHADOS_EXPURGADOS);
    });

    it('não loga nada quando não há o que apagar', async () => {
      vi.mocked(listarIdsDasInstituicoes).mockResolvedValue(['inst-a']);
      vi.mocked(apagarLoteDeDespachados).mockResolvedValue(0);

      await expurgo.expurgar();

      expect(informacoes).not.toHaveBeenCalled();
      expect(avisos).not.toHaveBeenCalled();
      expect(erros).not.toHaveBeenCalled();
    });

    it('uma instituição que falha gera warn só com o nome do erro e não impede as demais', async () => {
      vi.mocked(listarIdsDasInstituicoes).mockResolvedValue(['inst-a', 'inst-b']);
      vi.mocked(apagarLoteDeDespachados)
        .mockRejectedValueOnce(new ErroDoDriver('detalhe sensível do driver'))
        .mockResolvedValueOnce(4);

      await expurgo.expurgar();

      expect(avisos).toHaveBeenCalledTimes(1);
      expect(avisos).toHaveBeenCalledWith({ erro: 'ErroDoDriver', instituicaoId: 'inst-a' }, MENSAGEM_DE_FALHA_NO_EXPURGO);
      expect(JSON.stringify(avisos.mock.calls)).not.toContain('detalhe sensível');
      expect(informacoes).toHaveBeenCalledWith({ apagados: 4, instituicoes: 1 }, MENSAGEM_DE_DESPACHADOS_EXPURGADOS);
    });

    it('falha num lote do meio conta o que já foi apagado e interrompe só aquela instituição', async () => {
      vi.mocked(listarIdsDasInstituicoes).mockResolvedValue(['inst-a', 'inst-b']);
      vi.mocked(apagarLoteDeDespachados)
        .mockResolvedValueOnce(TAMANHO_DO_LOTE_DO_EXPURGO)
        .mockRejectedValueOnce(new ErroDoDriver('caiu'))
        .mockResolvedValueOnce(3);

      await expurgo.expurgar();

      expect(apagarLoteDeDespachados).toHaveBeenCalledTimes(3);
      expect(informacoes).toHaveBeenCalledWith(
        { apagados: TAMANHO_DO_LOTE_DO_EXPURGO + 3, instituicoes: 2 },
        MENSAGEM_DE_DESPACHADOS_EXPURGADOS,
      );
    });

    it('falha ao listar as instituições gera warn e não tenta expurgar', async () => {
      vi.mocked(listarIdsDasInstituicoes).mockRejectedValue(new ErroDoDriver('conexão caiu'));

      await expect(expurgo.expurgar()).resolves.toBeUndefined();

      expect(avisos).toHaveBeenCalledWith({ erro: 'ErroDoDriver' }, MENSAGEM_DE_FALHA_AO_LISTAR_INSTITUICOES);
      expect(apagarLoteDeDespachados).not.toHaveBeenCalled();
    });
  });

  describe('alerta de falha recorrente', () => {
    async function rodadasComFalha(quantidade: number): Promise<void> {
      vi.mocked(listarIdsDasInstituicoes).mockResolvedValue(['inst-a']);
      vi.mocked(apagarLoteDeDespachados).mockRejectedValue(new ErroDoDriver('caiu'));
      for (let rodada = 0; rodada < quantidade; rodada += 1) {
        // eslint-disable-next-line no-await-in-loop -- rodadas em sequência, como no temporizador
        await expurgo.expurgar();
      }
    }

    it('rodadas com falha abaixo do limite só geram warn', async () => {
      await rodadasComFalha(RODADAS_COM_FALHA_ATE_O_ALERTA - 1);

      expect(erros).not.toHaveBeenCalled();
    });

    it('ao atingir o limite de rodadas seguidas com falha loga error uma única vez', async () => {
      await rodadasComFalha(RODADAS_COM_FALHA_ATE_O_ALERTA + 2);

      expect(erros).toHaveBeenCalledTimes(1);
      expect(erros).toHaveBeenCalledWith({ rodadasComFalha: RODADAS_COM_FALHA_ATE_O_ALERTA }, MENSAGEM_DE_EXPURGO_FALHANDO);
    });

    it('falha ao listar instituições também conta como rodada com falha', async () => {
      vi.mocked(listarIdsDasInstituicoes).mockRejectedValue(new ErroDoDriver('conexão caiu'));
      for (let rodada = 0; rodada < RODADAS_COM_FALHA_ATE_O_ALERTA; rodada += 1) {
        // eslint-disable-next-line no-await-in-loop -- rodadas em sequência, como no temporizador
        await expurgo.expurgar();
      }

      expect(erros).toHaveBeenCalledWith({ rodadasComFalha: RODADAS_COM_FALHA_ATE_O_ALERTA }, MENSAGEM_DE_EXPURGO_FALHANDO);
    });

    it('uma rodada sem falha no meio zera a contagem', async () => {
      await rodadasComFalha(RODADAS_COM_FALHA_ATE_O_ALERTA - 1);
      vi.mocked(apagarLoteDeDespachados).mockResolvedValue(0);
      await expurgo.expurgar();
      await rodadasComFalha(RODADAS_COM_FALHA_ATE_O_ALERTA - 1);

      expect(erros).not.toHaveBeenCalled();
    });

    it('depois do alerta, a primeira rodada sem falha loga a recuperação', async () => {
      await rodadasComFalha(RODADAS_COM_FALHA_ATE_O_ALERTA);
      vi.mocked(apagarLoteDeDespachados).mockResolvedValue(0);

      await expurgo.expurgar();

      expect(informacoes).toHaveBeenCalledWith(
        { rodadasComFalha: RODADAS_COM_FALHA_ATE_O_ALERTA },
        MENSAGEM_DE_EXPURGO_RECUPERADO,
      );
    });

    it('sem alerta anterior, rodada sem falha não loga recuperação', async () => {
      await rodadasComFalha(RODADAS_COM_FALHA_ATE_O_ALERTA - 1);
      vi.mocked(apagarLoteDeDespachados).mockResolvedValue(0);

      await expurgo.expurgar();

      expect(informacoes).not.toHaveBeenCalledWith(expect.anything(), MENSAGEM_DE_EXPURGO_RECUPERADO);
    });
  });

  describe('agendamento', () => {
    it('agenda o expurgo a cada intervalo e para ao destruir o módulo', async () => {
      vi.useFakeTimers();
      vi.mocked(listarIdsDasInstituicoes).mockResolvedValue([]);

      expurgo.onModuleInit();
      await vi.advanceTimersByTimeAsync(INTERVALO_DO_EXPURGO_EM_MS * 2);
      await expurgo.onModuleDestroy();
      await vi.advanceTimersByTimeAsync(INTERVALO_DO_EXPURGO_EM_MS * 2);

      expect(listarIdsDasInstituicoes).toHaveBeenCalledTimes(2);
    });

    it('no processo de CLI não agenda nem expurga na subida', async () => {
      vi.useFakeTimers();
      vi.mocked(listarIdsDasInstituicoes).mockResolvedValue([]);
      const daCli = novoExpurgo('cli');

      daCli.onModuleInit();
      daCli.onApplicationBootstrap();
      await vi.advanceTimersByTimeAsync(INTERVALO_DO_EXPURGO_EM_MS * 2);
      await daCli.onModuleDestroy();

      expect(listarIdsDasInstituicoes).not.toHaveBeenCalled();
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
      await expurgo.onModuleDestroy();

      expect(contextoVisto).toBeUndefined();
    });

    it('na subida expurga uma vez sem esperar o intervalo e sem bloquear o boot', async () => {
      let concluirListagem: (ids: string[]) => void = () => undefined;
      vi.mocked(listarIdsDasInstituicoes).mockReturnValue(
        new Promise<string[]>((resolver) => {
          concluirListagem = resolver;
        }),
      );

      const retorno = expurgo.onApplicationBootstrap();
      await new Promise((resolver) => setImmediate(resolver));

      expect(retorno).toBeUndefined();
      expect(listarIdsDasInstituicoes).toHaveBeenCalledTimes(1);
      concluirListagem([]);
      await expurgo.onModuleDestroy();
    });

    it('falha inesperada na rodada não vira rejeição não tratada e conta como rodada com falha', async () => {
      vi.spyOn(expurgo, 'expurgar').mockRejectedValue(new ErroDoDriver('falha inesperada'));

      for (let rodada = 0; rodada < RODADAS_COM_FALHA_ATE_O_ALERTA; rodada += 1) {
        expurgo.onApplicationBootstrap();
      }
      await expurgo.onModuleDestroy();

      expect(avisos).toHaveBeenCalledWith({ erro: 'ErroDoDriver' }, MENSAGEM_DE_FALHA_NO_EXPURGO);
      expect(erros).toHaveBeenCalledWith({ rodadasComFalha: RODADAS_COM_FALHA_ATE_O_ALERTA }, MENSAGEM_DE_EXPURGO_FALHANDO);
    });

    it('rodadas disparadas em sequência não se sobrepõem', async () => {
      let emAndamento = 0;
      let maximoSimultaneo = 0;
      vi.mocked(listarIdsDasInstituicoes).mockImplementation(async () => {
        emAndamento += 1;
        maximoSimultaneo = Math.max(maximoSimultaneo, emAndamento);
        await new Promise((resolver) => setImmediate(resolver));
        emAndamento -= 1;
        return [];
      });

      expurgo.onApplicationBootstrap();
      expurgo.onApplicationBootstrap();
      expurgo.onApplicationBootstrap();
      await expurgo.onModuleDestroy();

      expect(listarIdsDasInstituicoes).toHaveBeenCalledTimes(3);
      expect(maximoSimultaneo).toBe(1);
    });

    it('ao destruir o módulo aguarda a rodada em andamento terminar', async () => {
      let concluirListagem: (ids: string[]) => void = () => undefined;
      vi.mocked(listarIdsDasInstituicoes).mockReturnValue(
        new Promise<string[]>((resolver) => {
          concluirListagem = resolver;
        }),
      );
      expurgo.onApplicationBootstrap();
      await new Promise((resolver) => setImmediate(resolver));
      let destruido = false;

      const destruicao = expurgo.onModuleDestroy().then(() => {
        destruido = true;
      });
      await new Promise((resolver) => setImmediate(resolver));
      expect(destruido).toBe(false);
      concluirListagem([]);
      await destruicao;

      expect(destruido).toBe(true);
    });
  });
});
