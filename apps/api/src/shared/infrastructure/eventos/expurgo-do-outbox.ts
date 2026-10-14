import { Inject, Injectable } from '@nestjs/common';
import { UnidadeDeTrabalho } from '../banco/unidade-de-trabalho.js';
import { ExpurgoEmLotesPorInstituicao } from '../banco/expurgo-em-lotes-por-instituicao.js';
import { apagarLoteDeDespachados, TAMANHO_DO_LOTE_DO_EXPURGO } from './expurgo-do-outbox.repositorio.js';
import { MODO_DO_PROCESSO } from './modo-do-processo.js';
import type { ModoDoProcesso } from './modo-do-processo.js';

export const MENSAGEM_DE_DESPACHADOS_EXPURGADOS = 'outbox: eventos despachados expurgados';
export const MENSAGEM_DE_FALHA_AO_LISTAR_INSTITUICOES = 'outbox: falha ao listar instituições para o expurgo';
export const MENSAGEM_DE_FALHA_NO_EXPURGO = 'outbox: falha ao expurgar eventos despachados';
export const MENSAGEM_DE_EXPURGO_FALHANDO = 'outbox: expurgo falhando em rodadas seguidas';
export const MENSAGEM_DE_EXPURGO_RECUPERADO = 'outbox: expurgo voltou a funcionar';
export const INTERVALO_DO_EXPURGO_EM_MS = 3_600_000;

@Injectable()
export class ExpurgoDoOutbox extends ExpurgoEmLotesPorInstituicao {
  constructor(unidadeDeTrabalho: UnidadeDeTrabalho, @Inject(MODO_DO_PROCESSO) modoDoProcesso: ModoDoProcesso) {
    super(
      unidadeDeTrabalho,
      {
        mensagens: {
          apagados: MENSAGEM_DE_DESPACHADOS_EXPURGADOS,
          falhaAoListarInstituicoes: MENSAGEM_DE_FALHA_AO_LISTAR_INSTITUICOES,
          falhaNoExpurgo: MENSAGEM_DE_FALHA_NO_EXPURGO,
          falhando: MENSAGEM_DE_EXPURGO_FALHANDO,
          recuperado: MENSAGEM_DE_EXPURGO_RECUPERADO,
        },
        intervaloEmMs: INTERVALO_DO_EXPURGO_EM_MS,
        tamanhoDoLote: TAMANHO_DO_LOTE_DO_EXPURGO,
        apagarLote: apagarLoteDeDespachados,
      },
      modoDoProcesso !== 'cli',
    );
  }
}
