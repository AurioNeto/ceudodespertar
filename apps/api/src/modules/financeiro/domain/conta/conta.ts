import type { ContaId, PessoaId, TipoConta, Titularidade, UnidadeId } from '@cdd/contracts';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { RaizDeAgregado } from '../../../../shared/kernel/raiz-de-agregado.js';
import { err, ok } from '../../../../shared/kernel/result.js';
import type { Result } from '../../../../shared/kernel/result.js';
import { formaInvalida } from '../forma-invalida.js';

export interface DadosEditaveisDaConta {
  readonly nome: string;
  readonly descricao: string;
  readonly identificadorBancario: string | null;
  readonly unidadeId: UnidadeId | null;
}

export interface DadosParaCriarConta extends DadosEditaveisDaConta {
  readonly id: ContaId;
  readonly tipo: TipoConta;
  readonly titularidade: Titularidade;
  readonly pessoaTitularId: PessoaId | null;
}

export interface DadosParaReconstituirConta extends DadosParaCriarConta {
  readonly ativa: boolean;
  readonly versao: number;
}

export interface AlteracaoDaConta extends DadosEditaveisDaConta {
  readonly ativa: boolean;
}

export class Conta extends RaizDeAgregado<ContaId> {
  readonly #tipo: TipoConta;
  readonly #titularidade: Titularidade;
  readonly #pessoaTitularId: PessoaId | null;
  #nome: string;
  #descricao: string;
  #identificadorBancario: string | null;
  #unidadeId: UnidadeId | null;
  #ativa: boolean;

  private constructor(dados: DadosParaReconstituirConta) {
    super(dados.id, dados.versao);
    this.#tipo = dados.tipo;
    this.#titularidade = dados.titularidade;
    this.#pessoaTitularId = dados.pessoaTitularId;
    this.#nome = dados.nome;
    this.#descricao = dados.descricao;
    this.#identificadorBancario = dados.identificadorBancario;
    this.#unidadeId = dados.unidadeId;
    this.#ativa = dados.ativa;
  }

  static criar(dados: DadosParaCriarConta): Result<Conta, ErroDeDominio> {
    if (titularNaoCombinaComTitularidade(dados)) return err(formaInvalida('pessoaTitularId', 'titular_da_conta_pessoal'));
    return ok(new Conta({ ...dados, identificadorBancario: normalizarIdentificador(dados.identificadorBancario), ativa: true, versao: 1 }));
  }

  static reconstituir(dados: DadosParaReconstituirConta): Conta {
    return new Conta(dados);
  }

  get tipo(): TipoConta {
    return this.#tipo;
  }

  get titularidade(): Titularidade {
    return this.#titularidade;
  }

  get pessoaTitularId(): PessoaId | null {
    return this.#pessoaTitularId;
  }

  get nome(): string {
    return this.#nome;
  }

  get descricao(): string {
    return this.#descricao;
  }

  get identificadorBancario(): string | null {
    return this.#identificadorBancario;
  }

  get unidadeId(): UnidadeId | null {
    return this.#unidadeId;
  }

  get ativa(): boolean {
    return this.#ativa;
  }

  alterar(alteracao: AlteracaoDaConta): void {
    this.#nome = alteracao.nome;
    this.#descricao = alteracao.descricao;
    this.#identificadorBancario = normalizarIdentificador(alteracao.identificadorBancario);
    this.#unidadeId = alteracao.unidadeId;
    this.#ativa = alteracao.ativa;
  }
}

function titularNaoCombinaComTitularidade({ titularidade, pessoaTitularId }: DadosParaCriarConta): boolean {
  return (titularidade === 'PESSOAL_DE_TERCEIRO') !== (pessoaTitularId !== null);
}

const ESPACOS_VISIVEIS_E_INVISIVEIS = /[\s\u200B-\u200D\u2060\uFEFF]/gu;

function normalizarIdentificador(identificador: string | null): string | null {
  const canonico = identificador?.replace(ESPACOS_VISIVEIS_E_INVISIVEIS, '').toUpperCase() ?? '';
  return canonico === '' ? null : canonico;
}
