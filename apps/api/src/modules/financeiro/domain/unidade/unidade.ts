import type { Dinheiro, RegimeDaUnidade, UnidadeId } from '@cdd/contracts';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { RaizDeAgregado } from '../../../../shared/kernel/raiz-de-agregado.js';
import { err, ok } from '../../../../shared/kernel/result.js';
import type { Result } from '../../../../shared/kernel/result.js';
import { formaInvalida } from '../forma-invalida.js';

export interface DadosEditaveisDaUnidade {
  readonly nome: string;
  readonly regime: RegimeDaUnidade;
  readonly tetoAnual: Dinheiro | null;
}

export interface DadosParaCriarUnidade extends DadosEditaveisDaUnidade {
  readonly id: UnidadeId;
  readonly codigoSistema: string;
}

export interface DadosParaReconstituirUnidade extends DadosParaCriarUnidade {
  readonly ativa: boolean;
  readonly versao: number;
}

export interface AlteracaoDaUnidade extends DadosEditaveisDaUnidade {
  readonly ativa: boolean;
}

export class Unidade extends RaizDeAgregado<UnidadeId> {
  readonly #codigoSistema: string;
  #nome: string;
  #regime: RegimeDaUnidade;
  #tetoAnual: Dinheiro | null;
  #ativa: boolean;

  private constructor(dados: DadosParaReconstituirUnidade) {
    super(dados.id, dados.versao);
    this.#codigoSistema = dados.codigoSistema;
    this.#nome = dados.nome;
    this.#regime = dados.regime;
    this.#tetoAnual = dados.tetoAnual;
    this.#ativa = dados.ativa;
  }

  static criar(dados: DadosParaCriarUnidade): Result<Unidade, ErroDeDominio> {
    const invalida = conferirTetoSoNaComercial(dados);
    if (invalida !== undefined) return err(invalida);
    return ok(new Unidade({ ...dados, ativa: true, versao: 1 }));
  }

  static reconstituir(dados: DadosParaReconstituirUnidade): Unidade {
    return new Unidade(dados);
  }

  get codigoSistema(): string {
    return this.#codigoSistema;
  }

  get nome(): string {
    return this.#nome;
  }

  get regime(): RegimeDaUnidade {
    return this.#regime;
  }

  get tetoAnual(): Dinheiro | null {
    return this.#tetoAnual;
  }

  get ativa(): boolean {
    return this.#ativa;
  }

  alterar(alteracao: AlteracaoDaUnidade): Result<void, ErroDeDominio> {
    const invalida = conferirTetoSoNaComercial(alteracao);
    if (invalida !== undefined) return err(invalida);
    this.#nome = alteracao.nome;
    this.#regime = alteracao.regime;
    this.#tetoAnual = alteracao.tetoAnual;
    this.#ativa = alteracao.ativa;
    return ok();
  }
}

function conferirTetoSoNaComercial({ regime, tetoAnual }: DadosEditaveisDaUnidade): ErroDeDominio | undefined {
  return regime === 'COMERCIAL' || tetoAnual === null ? undefined : formaInvalida('tetoAnual', 'teto_so_na_comercial');
}
