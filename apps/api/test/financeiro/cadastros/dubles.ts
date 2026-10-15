import type { CategoriaId, GrupoDeCustoId, UnidadeId } from '@cdd/contracts';
import { Categoria } from '../../../src/modules/financeiro/domain/categoria/categoria.js';
import type { DadosParaCriarCategoria } from '../../../src/modules/financeiro/domain/categoria/categoria.js';
import { RepositorioDeCategoria } from '../../../src/modules/financeiro/domain/categoria/categoria.repo.js';
import { GrupoDeCusto } from '../../../src/modules/financeiro/domain/grupo-de-custo/grupo-de-custo.js';
import { RepositorioDeGrupoDeCusto } from '../../../src/modules/financeiro/domain/grupo-de-custo/grupo-de-custo.repo.js';
import { Unidade } from '../../../src/modules/financeiro/domain/unidade/unidade.js';
import type { DadosParaCriarUnidade } from '../../../src/modules/financeiro/domain/unidade/unidade.js';
import { RepositorioDeUnidade } from '../../../src/modules/financeiro/domain/unidade/unidade.repo.js';
import { ehOk } from '../../../src/shared/kernel/result.js';
import type { Result } from '../../../src/shared/kernel/result.js';
import type { ErroDeDominio } from '../../../src/shared/kernel/erro-de-dominio.js';

export const VERSAO_DO_CADASTRO = 3;
export const UNIDADE_CONTRIBUICAO = '0198a3c0-0000-7000-8000-000000000001' as UnidadeId;
export const UNIDADE_COMERCIAL = '0198a3c0-0000-7000-8000-000000000002' as UnidadeId;
export const GRUPO_DE_CUSTO = '0198a3c0-0000-7000-8000-000000000003' as GrupoDeCustoId;
export const CATEGORIA = '0198a3c0-0000-7000-8000-000000000004' as CategoriaId;

function valorOuFalha<T>(resultado: Result<T, ErroDeDominio>): T {
  if (!ehOk(resultado)) throw new Error('fixture inválida');
  return resultado.valor;
}

export function unidadeEm(sobrescritas: Partial<DadosParaCriarUnidade> = {}): Unidade {
  const nova = valorOuFalha(
    Unidade.criar({
      id: UNIDADE_CONTRIBUICAO,
      codigoSistema: 'CDD',
      nome: 'CDD',
      regime: 'CONTRIBUICAO',
      tetoAnual: null,
      ...sobrescritas,
    }),
  );
  return Unidade.reconstituir({
    id: nova.id,
    codigoSistema: nova.codigoSistema,
    nome: nova.nome,
    regime: nova.regime,
    tetoAnual: nova.tetoAnual,
    ativa: nova.ativa,
    versao: VERSAO_DO_CADASTRO,
  });
}

export function grupoDeCustoEm(): GrupoDeCusto {
  return GrupoDeCusto.reconstituir({
    id: GRUPO_DE_CUSTO,
    codigoSistema: 'COZINHA',
    nome: 'Cozinha',
    ativo: true,
    versao: VERSAO_DO_CADASTRO,
  });
}

export function categoriaEm(sobrescritas: Partial<DadosParaCriarCategoria> = {}): Categoria {
  const nova = valorOuFalha(
    Categoria.criar({
      id: CATEGORIA,
      codigoSistema: 'HOSPEDAGEM',
      nome: 'Hospedagem',
      natureza: 'RECEITA',
      tipo: 'OPERACIONAL',
      regimesPermitidos: ['CONTRIBUICAO', 'COMERCIAL'],
      unidadePadraoId: null,
      linhaRelatorio: 'Receita de hospedagem',
      ...sobrescritas,
    }),
  );
  return Categoria.reconstituir({
    id: nova.id,
    codigoSistema: nova.codigoSistema,
    nome: nova.nome,
    natureza: nova.natureza,
    tipo: nova.tipo,
    regimesPermitidos: nova.regimesPermitidos,
    unidadePadraoId: nova.unidadePadraoId,
    linhaRelatorio: nova.linhaRelatorio,
    ativa: nova.ativa,
    versao: VERSAO_DO_CADASTRO,
  });
}

export class RepositorioDeUnidadeEmMemoria extends RepositorioDeUnidade {
  readonly adicionados: Unidade[] = [];
  readonly salvos: Unidade[] = [];

  constructor(private readonly existentes: readonly Unidade[] = []) {
    super();
  }

  porId(id: UnidadeId): Promise<Unidade | undefined> {
    return Promise.resolve(this.existentes.find((existente) => existente.id === id));
  }

  listar(): Promise<readonly Unidade[]> {
    return Promise.resolve(this.existentes);
  }

  adicionar(agregado: Unidade): Promise<void> {
    this.adicionados.push(agregado);
    return Promise.resolve();
  }

  salvar(agregado: Unidade): Promise<number> {
    this.salvos.push(agregado);
    return Promise.resolve(agregado.versao + 1);
  }
}

export class RepositorioDeGrupoDeCustoEmMemoria extends RepositorioDeGrupoDeCusto {
  readonly adicionados: GrupoDeCusto[] = [];
  readonly salvos: GrupoDeCusto[] = [];

  constructor(private readonly existentes: readonly GrupoDeCusto[] = []) {
    super();
  }

  porId(id: GrupoDeCustoId): Promise<GrupoDeCusto | undefined> {
    return Promise.resolve(this.existentes.find((existente) => existente.id === id));
  }

  listar(): Promise<readonly GrupoDeCusto[]> {
    return Promise.resolve(this.existentes);
  }

  adicionar(agregado: GrupoDeCusto): Promise<void> {
    this.adicionados.push(agregado);
    return Promise.resolve();
  }

  salvar(agregado: GrupoDeCusto): Promise<number> {
    this.salvos.push(agregado);
    return Promise.resolve(agregado.versao + 1);
  }
}

export class RepositorioDeCategoriaEmMemoria extends RepositorioDeCategoria {
  readonly adicionados: Categoria[] = [];
  readonly salvos: Categoria[] = [];

  constructor(private readonly existentes: readonly Categoria[] = []) {
    super();
  }

  porId(id: CategoriaId): Promise<Categoria | undefined> {
    return Promise.resolve(this.existentes.find((existente) => existente.id === id));
  }

  listar(): Promise<readonly Categoria[]> {
    return Promise.resolve(this.existentes);
  }

  adicionar(agregado: Categoria): Promise<void> {
    this.adicionados.push(agregado);
    return Promise.resolve();
  }

  salvar(agregado: Categoria): Promise<number> {
    this.salvos.push(agregado);
    return Promise.resolve(agregado.versao + 1);
  }
}
