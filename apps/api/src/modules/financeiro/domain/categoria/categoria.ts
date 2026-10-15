import type { CategoriaId, Natureza, RegimeDaUnidade, TipoCategoria, UnidadeId } from '@cdd/contracts';
import { erroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { RaizDeAgregado } from '../../../../shared/kernel/raiz-de-agregado.js';
import { err, ok } from '../../../../shared/kernel/result.js';
import type { Result } from '../../../../shared/kernel/result.js';
import { formaInvalida } from '../forma-invalida.js';

export interface DadosEditaveisDaCategoria {
  readonly nome: string;
  readonly regimesPermitidos: readonly RegimeDaUnidade[];
  readonly unidadePadraoId: UnidadeId | null;
  readonly linhaRelatorio: string;
}

export interface DadosParaCriarCategoria extends DadosEditaveisDaCategoria {
  readonly id: CategoriaId;
  readonly codigoSistema: string;
  readonly natureza: Natureza;
  readonly tipo: TipoCategoria;
}

export interface DadosParaReconstituirCategoria extends DadosParaCriarCategoria {
  readonly ativa: boolean;
  readonly versao: number;
}

export interface AlteracaoDaCategoria extends DadosEditaveisDaCategoria {
  readonly ativa: boolean;
}

export class Categoria extends RaizDeAgregado<CategoriaId> {
  readonly #codigoSistema: string;
  readonly #natureza: Natureza;
  #nome: string;
  readonly #tipo: TipoCategoria;
  #regimesPermitidos: readonly RegimeDaUnidade[];
  #unidadePadraoId: UnidadeId | null;
  #linhaRelatorio: string;
  #ativa: boolean;

  private constructor(dados: DadosParaReconstituirCategoria) {
    super(dados.id, dados.versao);
    this.#codigoSistema = dados.codigoSistema;
    this.#natureza = dados.natureza;
    this.#nome = dados.nome;
    this.#tipo = dados.tipo;
    this.#regimesPermitidos = dados.regimesPermitidos;
    this.#unidadePadraoId = dados.unidadePadraoId;
    this.#linhaRelatorio = dados.linhaRelatorio;
    this.#ativa = dados.ativa;
  }

  static criar(dados: DadosParaCriarCategoria): Result<Categoria, ErroDeDominio> {
    const invalida = conferirForma(dados, true);
    if (invalida !== undefined) return err(invalida);
    return ok(new Categoria({ ...dados, ativa: true, versao: 1 }));
  }

  static reconstituir(dados: DadosParaReconstituirCategoria): Categoria {
    return new Categoria(dados);
  }

  get codigoSistema(): string {
    return this.#codigoSistema;
  }

  get natureza(): Natureza {
    return this.#natureza;
  }

  get nome(): string {
    return this.#nome;
  }

  get tipo(): TipoCategoria {
    return this.#tipo;
  }

  get regimesPermitidos(): readonly RegimeDaUnidade[] {
    return this.#regimesPermitidos;
  }

  get unidadePadraoId(): UnidadeId | null {
    return this.#unidadePadraoId;
  }

  get linhaRelatorio(): string {
    return this.#linhaRelatorio;
  }

  get ativa(): boolean {
    return this.#ativa;
  }

  alterar(alteracao: AlteracaoDaCategoria): Result<void, ErroDeDominio> {
    const invalida = conferirForma(alteracao, alteracao.ativa);
    if (invalida !== undefined) return err(invalida);
    this.#nome = alteracao.nome;
    this.#regimesPermitidos = alteracao.regimesPermitidos;
    this.#unidadePadraoId = alteracao.unidadePadraoId;
    this.#linhaRelatorio = alteracao.linhaRelatorio;
    this.#ativa = alteracao.ativa;
    return ok();
  }

  conferirUsoNoRegime(regime: RegimeDaUnidade): Result<void, ErroDeDominio> {
    return this.#regimesPermitidos.includes(regime)
      ? ok()
      : err(erroDeDominio('CATEGORIA_FORA_DO_REGIME', { codigoSistema: this.#codigoSistema, regime }));
  }
}

function conferirForma(dados: DadosEditaveisDaCategoria, ativa: boolean): ErroDeDominio | undefined {
  if (dados.regimesPermitidos.length === 0) return formaInvalida('regimesPermitidos', 'regimes_obrigatorios');
  if (new Set(dados.regimesPermitidos).size !== dados.regimesPermitidos.length) {
    return formaInvalida('regimesPermitidos', 'sem_duplicados');
  }
  if (ativa && dados.linhaRelatorio.trim() === '') return formaInvalida('linhaRelatorio', 'linha_relatorio_obrigatoria');
  return undefined;
}
