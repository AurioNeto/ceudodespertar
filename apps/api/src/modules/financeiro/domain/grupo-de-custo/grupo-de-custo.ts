import type { GrupoDeCustoId } from '@cdd/contracts';
import { RaizDeAgregado } from '../../../../shared/kernel/raiz-de-agregado.js';

export interface DadosParaCriarGrupoDeCusto {
  readonly id: GrupoDeCustoId;
  readonly codigoSistema: string;
  readonly nome: string;
}

export interface DadosParaReconstituirGrupoDeCusto extends DadosParaCriarGrupoDeCusto {
  readonly ativo: boolean;
  readonly versao: number;
}

export interface AlteracaoDoGrupoDeCusto {
  readonly nome: string;
  readonly ativo: boolean;
}

export class GrupoDeCusto extends RaizDeAgregado<GrupoDeCustoId> {
  readonly #codigoSistema: string;
  #nome: string;
  #ativo: boolean;

  private constructor(dados: DadosParaReconstituirGrupoDeCusto) {
    super(dados.id, dados.versao);
    this.#codigoSistema = dados.codigoSistema;
    this.#nome = dados.nome;
    this.#ativo = dados.ativo;
  }

  static criar(dados: DadosParaCriarGrupoDeCusto): GrupoDeCusto {
    return new GrupoDeCusto({ ...dados, ativo: true, versao: 1 });
  }

  static reconstituir(dados: DadosParaReconstituirGrupoDeCusto): GrupoDeCusto {
    return new GrupoDeCusto(dados);
  }

  get codigoSistema(): string {
    return this.#codigoSistema;
  }

  get nome(): string {
    return this.#nome;
  }

  get ativo(): boolean {
    return this.#ativo;
  }

  alterar({ nome, ativo }: AlteracaoDoGrupoDeCusto): void {
    this.#nome = nome;
    this.#ativo = ativo;
  }
}
