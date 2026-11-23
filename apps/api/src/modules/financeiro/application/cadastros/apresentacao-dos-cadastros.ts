import type { CategoriaDoPlano, GrupoDeCusto as GrupoDeCustoDoContrato, UnidadeDoPlano, UnidadeId } from '@cdd/contracts';
import type { Categoria } from '../../domain/categoria/categoria.js';
import type { GrupoDeCusto } from '../../domain/grupo-de-custo/grupo-de-custo.js';
import type { Unidade } from '../../domain/unidade/unidade.js';

export interface UnidadeApresentada extends UnidadeDoPlano {
  readonly versao: number;
}

export interface CategoriaApresentada extends CategoriaDoPlano {
  readonly unidadePadraoId: UnidadeId | null;
  readonly versao: number;
}

export interface UnidadesDoPlano {
  readonly itens: readonly UnidadeApresentada[];
}

export interface CategoriasDoPlano {
  readonly itens: readonly CategoriaApresentada[];
}

const LANCAMENTOS_SEM_PRODUTOR = 0;

export function apresentarUnidade(unidade: Unidade, versao: number = unidade.versao): UnidadeApresentada {
  return {
    id: unidade.id,
    codigoSistema: unidade.codigoSistema,
    nome: unidade.nome,
    regime: unidade.regime,
    documentoFiscal: null,
    tetoFaturamentoAnual: unidade.tetoAnual,
    faturamentoNoAno: null,
    ativa: unidade.ativa,
    nota: null,
    versao,
  };
}

export function apresentarGrupoDeCusto(grupo: GrupoDeCusto, versao: number = grupo.versao): GrupoDeCustoDoContrato {
  return {
    id: grupo.id,
    codigoSistema: grupo.codigoSistema,
    nome: grupo.nome,
    ativo: grupo.ativo,
    versao,
  };
}

export function apresentarCategoria(categoria: Categoria, versao: number = categoria.versao): CategoriaApresentada {
  return {
    id: categoria.id,
    codigoSistema: categoria.codigoSistema,
    nome: categoria.nome,
    natureza: categoria.natureza,
    tipo: categoria.tipo,
    regimesPermitidos: categoria.regimesPermitidos,
    linhaRelatorio: categoria.linhaRelatorio,
    ativa: categoria.ativa,
    lancamentos: LANCAMENTOS_SEM_PRODUTOR,
    nota: null,
    unidadePadraoId: categoria.unidadePadraoId,
    versao,
  };
}
