import type { Categoria as CategoriaDoContrato, GrupoDeCusto as GrupoDeCustoDoContrato, Unidade as UnidadeDoContrato } from '@cdd/contracts';
import type { Categoria } from '../../domain/categoria/categoria.js';
import type { GrupoDeCusto } from '../../domain/grupo-de-custo/grupo-de-custo.js';
import type { Unidade } from '../../domain/unidade/unidade.js';

export function apresentarUnidade(unidade: Unidade, versao: number = unidade.versao): UnidadeDoContrato {
  return {
    id: unidade.id,
    codigoSistema: unidade.codigoSistema,
    nome: unidade.nome,
    regime: unidade.regime,
    tetoAnual: unidade.tetoAnual,
    ativa: unidade.ativa,
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

export function apresentarCategoria(categoria: Categoria, versao: number = categoria.versao): CategoriaDoContrato {
  return {
    id: categoria.id,
    codigoSistema: categoria.codigoSistema,
    nome: categoria.nome,
    natureza: categoria.natureza,
    tipo: categoria.tipo,
    regimesPermitidos: categoria.regimesPermitidos,
    unidadePadraoId: categoria.unidadePadraoId,
    linhaRelatorio: categoria.linhaRelatorio,
    ativa: categoria.ativa,
    versao,
  };
}
