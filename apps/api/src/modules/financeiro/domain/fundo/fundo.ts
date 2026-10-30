import type { ContaId, Dinheiro, FundoId } from '@cdd/contracts';
import { erroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { RaizDeAgregado } from '../../../../shared/kernel/raiz-de-agregado.js';
import { err, ok } from '../../../../shared/kernel/result.js';
import type { Result } from '../../../../shared/kernel/result.js';
import { formaInvalida } from '../forma-invalida.js';

export interface DadosEditaveisDoFundo {
  readonly nome: string;
  readonly contaVinculadaId: ContaId;
  readonly nota: string;
  readonly meta: Dinheiro | null;
  readonly categoriasPermitidas: readonly string[];
}

export interface DadosParaCriarFundo extends DadosEditaveisDoFundo {
  readonly id: FundoId;
  readonly codigoSistema: string;
}

export interface DadosParaReconstituirFundo extends DadosParaCriarFundo {
  readonly ativo: boolean;
  readonly versao: number;
}

export interface AlteracaoDoFundo extends DadosEditaveisDoFundo {
  readonly ativo: boolean;
}

export class Fundo extends RaizDeAgregado<FundoId> {
  readonly #codigoSistema: string;
  #contaVinculadaId: ContaId;
  #nome: string;
  #nota: string;
  #meta: Dinheiro | null;
  #categoriasPermitidas: readonly string[];
  #ativo: boolean;

  private constructor(dados: DadosParaReconstituirFundo) {
    super(dados.id, dados.versao);
    this.#codigoSistema = dados.codigoSistema;
    this.#contaVinculadaId = dados.contaVinculadaId;
    this.#nome = dados.nome;
    this.#nota = dados.nota;
    this.#meta = dados.meta;
    this.#categoriasPermitidas = [...dados.categoriasPermitidas];
    this.#ativo = dados.ativo;
  }

  static criar(dados: DadosParaCriarFundo): Result<Fundo, ErroDeDominio> {
    const invalida = conferirForma(dados);
    if (invalida !== undefined) return err(invalida);
    return ok(new Fundo({ ...dados, ativo: true, versao: 1 }));
  }

  static reconstituir(dados: DadosParaReconstituirFundo): Fundo {
    return new Fundo(dados);
  }

  get codigoSistema(): string {
    return this.#codigoSistema;
  }

  get contaVinculadaId(): ContaId {
    return this.#contaVinculadaId;
  }

  get nome(): string {
    return this.#nome;
  }

  get nota(): string {
    return this.#nota;
  }

  get meta(): Dinheiro | null {
    return this.#meta;
  }

  get categoriasPermitidas(): readonly string[] {
    return this.#categoriasPermitidas;
  }

  get ativo(): boolean {
    return this.#ativo;
  }

  alterar(alteracao: AlteracaoDoFundo): Result<void, ErroDeDominio> {
    const invalida = conferirForma(alteracao);
    if (invalida !== undefined) return err(invalida);
    this.#nome = alteracao.nome;
    this.#contaVinculadaId = alteracao.contaVinculadaId;
    this.#nota = alteracao.nota;
    this.#meta = alteracao.meta;
    this.#categoriasPermitidas = [...alteracao.categoriasPermitidas];
    this.#ativo = alteracao.ativo;
    return ok();
  }

  conferirSaidaParaCategoria(codigoDaCategoria: string): Result<void, ErroDeDominio> {
    return this.#categoriasPermitidas.includes(codigoDaCategoria)
      ? ok()
      : err(erroDeDominio('CATEGORIA_FORA_DO_FUNDO', { codigoSistema: this.#codigoSistema, categoria: codigoDaCategoria }));
  }
}

function conferirForma(dados: DadosEditaveisDoFundo): ErroDeDominio | undefined {
  if (dados.meta !== null && dados.meta <= 0) return formaInvalida('meta', 'meta_positiva');
  if (new Set(dados.categoriasPermitidas).size !== dados.categoriasPermitidas.length) {
    return formaInvalida('categoriasPermitidas', 'sem_duplicados');
  }
  return undefined;
}
