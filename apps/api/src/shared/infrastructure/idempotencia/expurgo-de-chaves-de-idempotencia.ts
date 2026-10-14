import { Injectable } from '@nestjs/common';
import { UnidadeDeTrabalho } from '../banco/unidade-de-trabalho.js';
import { ExpurgoEmLotesPorInstituicao } from '../banco/expurgo-em-lotes-por-instituicao.js';
import { apagarLoteDeChavesVencidas, TAMANHO_DO_LOTE_DO_EXPURGO } from './chave-de-idempotencia.repositorio.js';

export const MENSAGEM_DE_CHAVES_EXPURGADAS = 'idempotência: chaves vencidas expurgadas';
export const MENSAGEM_DE_FALHA_AO_LISTAR_INSTITUICOES = 'idempotência: falha ao listar instituições para o expurgo';
export const MENSAGEM_DE_FALHA_NO_EXPURGO = 'idempotência: falha ao expurgar chaves vencidas';
export const MENSAGEM_DE_EXPURGO_FALHANDO = 'idempotência: expurgo falhando em rodadas seguidas';
export const MENSAGEM_DE_EXPURGO_RECUPERADO = 'idempotência: expurgo voltou a funcionar';
export const INTERVALO_DO_EXPURGO_EM_MS = 3_600_000;

@Injectable()
export class ExpurgoDeChavesDeIdempotencia extends ExpurgoEmLotesPorInstituicao {
  constructor(unidadeDeTrabalho: UnidadeDeTrabalho) {
    super(
      unidadeDeTrabalho,
      {
        mensagens: {
          apagados: MENSAGEM_DE_CHAVES_EXPURGADAS,
          falhaAoListarInstituicoes: MENSAGEM_DE_FALHA_AO_LISTAR_INSTITUICOES,
          falhaNoExpurgo: MENSAGEM_DE_FALHA_NO_EXPURGO,
          falhando: MENSAGEM_DE_EXPURGO_FALHANDO,
          recuperado: MENSAGEM_DE_EXPURGO_RECUPERADO,
        },
        intervaloEmMs: INTERVALO_DO_EXPURGO_EM_MS,
        tamanhoDoLote: TAMANHO_DO_LOTE_DO_EXPURGO,
        apagarLote: apagarLoteDeChavesVencidas,
      },
      true,
    );
  }
}
