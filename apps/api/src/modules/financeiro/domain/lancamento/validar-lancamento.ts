import type { DadosDoLancamento, Etiqueta } from '@cdd/contracts';
import { erroDeDominio, type ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { err, ok, type Result } from '../../../../shared/kernel/result.js';
import { formaInvalida } from '../forma-invalida.js';

const MAXIMO_EM_CENTAVOS = 100_000_000_000_000;
const MAXIMO_DE_ETIQUETAS = 20;
const valorValido = (valor: number) => Number.isSafeInteger(valor) && valor > 0 && valor <= MAXIMO_EM_CENTAVOS;

export function validarLancamento(dados: DadosDoLancamento, etiquetas: readonly Etiqueta[]): Result<void, ErroDeDominio> {
  if (!valorValido(dados.valor)) return err(formaInvalida('valor', 'centavos_positivos'));
  if (!['RECEITA', 'DESPESA'].includes(dados.natureza)) return err(formaInvalida('natureza', 'formato'));
  if (!textoValido(dados.motivo)) return err(formaInvalida('motivo', 'formato'));
  if (etiquetas.length > MAXIMO_DE_ETIQUETAS || new Set(etiquetas.map((e) => e.categoriaId)).size !== etiquetas.length) {
    return err(formaInvalida('etiquetas', 'sem_duplicados_ate_20'));
  }
  if (etiquetas.some((e) => !valorValido(e.valor) || !['RECEITA', 'DESPESA'].includes(e.natureza))) {
    return err(formaInvalida('etiquetas', 'formato'));
  }
  if (dados.pessoaId !== null && dados.contraparteTexto !== null) return err(formaInvalida('contraparteTexto', 'contraparte_unica'));
  if ((dados.dataCompetencia !== null && !dataValida(dados.dataCompetencia)) || (dados.dataCaixa !== null && !dataValida(dados.dataCaixa))) {
    return err(formaInvalida('dataCompetencia', 'formato'));
  }
  if (dados.dataCompetencia !== null && dados.dataCaixa !== null && dados.dataCaixa < dados.dataCompetencia) {
    return err(erroDeDominio('CAIXA_ANTES_DA_COMPETENCIA'));
  }
  return ok();
}

export function conferirEtiquetas(natureza: string, valor: number, etiquetas: readonly Etiqueta[]): Result<void, ErroDeDominio> {
  if (etiquetas.length === 0) return err(erroDeDominio('CATEGORIA_OBRIGATORIA'));
  const liquido = etiquetas.reduce((soma, e) => soma + (e.natureza === natureza ? e.valor : -e.valor), 0);
  return liquido === valor ? ok() : err(erroDeDominio('ETIQUETAS_NAO_FECHAM'));
}

export function textoValido(texto: string): boolean {
  return texto.trim().length > 0 && texto.length <= 500 && !texto.includes('\0');
}

export function dataValida(data: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(data) && Number.isFinite(Date.parse(data)) && new Date(data).toISOString().slice(0, 10) === data;
}
