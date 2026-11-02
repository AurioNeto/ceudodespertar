import type { RegistrarTransferencia } from '@cdd/contracts';
import { erroDeDominio, type ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { err, ok, type Result } from '../../../../shared/kernel/result.js';
import { formaInvalida } from '../forma-invalida.js';

const MAXIMO_EM_CENTAVOS = 100_000_000_000_000;
const FINALIDADES_B1 = new Set(['MOVIMENTACAO_SIMPLES', 'APORTE_A_FUNDO', 'REPASSE_ENTRE_UNIDADES']);

export function validarTransferencia(dados: RegistrarTransferencia): Result<void, ErroDeDominio> {
  if (!FINALIDADES_B1.has(dados.finalidade)) return err(formaInvalida('finalidade', 'finalidade_disponivel_na_B1'));
  if (!Number.isSafeInteger(dados.valor) || dados.valor <= 0 || dados.valor > MAXIMO_EM_CENTAVOS) return err(formaInvalida('valor', 'centavos_positivos'));
  if (!dataDaTransferenciaValida(dados.data)) return err(formaInvalida('data', 'formato'));
  if (!motivoDaTransferenciaValido(dados.motivo)) return err(formaInvalida('motivo', 'formato'));
  if (dados.unidadeId === null || dados.contaOrigemId === null || dados.contaDestinoId === null || dados.contaOrigemId === dados.contaDestinoId) {
    return err(formaInvalida('contaDestinoId', 'contas_distintas_e_unidade_obrigatorias'));
  }
  if ((dados.finalidade === 'APORTE_A_FUNDO') !== (dados.fundoId !== null)) return err(formaInvalida('fundoId', 'referencia_da_finalidade'));
  if ((dados.finalidade === 'REPASSE_ENTRE_UNIDADES') !== (dados.unidadeDestinoId !== null)) return err(formaInvalida('unidadeDestinoId', 'referencia_da_finalidade'));
  if (dados.finalidade === 'REPASSE_ENTRE_UNIDADES' && dados.unidadeId === dados.unidadeDestinoId) return err(erroDeDominio('REPASSE_NA_MESMA_UNIDADE'));
  if (dados.faturaId !== null || dados.emprestimoId !== null || dados.adiantamentoId !== null) return err(formaInvalida('finalidade', 'referencia_indisponivel_na_B1'));
  return ok();
}

export function motivoDaTransferenciaValido(motivo: string): boolean {
  return motivo.trim().length > 0 && motivo.length <= 500 && !motivo.includes('\0');
}

export function dataDaTransferenciaValida(data: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(data) && Number.isFinite(Date.parse(data)) && new Date(data).toISOString().slice(0, 10) === data;
}
