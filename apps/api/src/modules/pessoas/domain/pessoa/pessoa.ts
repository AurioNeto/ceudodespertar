import type { PessoaId, TipoPessoa, UsuarioId } from '@cdd/contracts';
import { erroDeDominio, type ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { detalhesDeCorpoInvalido } from '../../../../shared/kernel/problemas-de-validacao.js';
import { gerarUuidV7 } from '../../../../shared/kernel/ids.js';
import { RaizDeAgregado } from '../../../../shared/kernel/raiz-de-agregado.js';
import { err, ok, type Result } from '../../../../shared/kernel/result.js';

export interface DadosDaPessoa {
  readonly tipo: TipoPessoa;
  readonly nome: string;
  readonly documento: string | null;
}

export interface EstadoDaPessoa extends DadosDaPessoa {
  readonly id: PessoaId;
  readonly ativa: boolean;
  readonly versao: number;
}

export class Pessoa extends RaizDeAgregado<PessoaId> {
  #tipo: TipoPessoa;
  #nome: string;
  #documento: string | null;
  readonly ativa: boolean;

  private constructor(estado: EstadoDaPessoa) {
    super(estado.id, estado.versao);
    this.#tipo = estado.tipo;
    this.#nome = estado.nome;
    this.#documento = estado.documento;
    this.ativa = estado.ativa;
  }

  static cadastrar(id: PessoaId, dados: DadosDaPessoa, autorId: UsuarioId, em: Date): Result<Pessoa, ErroDeDominio> {
    const validacao = conferirDados(dados);
    if (validacao.tipo === 'erro') return validacao;
    const pessoa = new Pessoa({ ...dados, nome: dados.nome.trim(), id, ativa: true, versao: 1 });
    pessoa.emitir('PESSOA_CADASTRADA', autorId, em);
    return ok(pessoa);
  }

  static reconstituir(estado: EstadoDaPessoa): Pessoa {
    return new Pessoa(estado);
  }

  get tipo(): TipoPessoa {
    return this.#tipo;
  }

  get nome(): string {
    return this.#nome;
  }

  get documento(): string | null {
    return this.#documento;
  }

  editar(dados: DadosDaPessoa, autorId: UsuarioId, em: Date): Result<void, ErroDeDominio> {
    const validacao = conferirDados(dados);
    if (validacao.tipo === 'erro') return validacao;
    this.#tipo = dados.tipo;
    this.#nome = dados.nome.trim();
    this.#documento = dados.documento;
    this.emitir('PESSOA_EDITADA', autorId, em);
    return ok();
  }

  private emitir(tipo: string, autorId: UsuarioId, em: Date): void {
    this.registrarEvento({
      eventoId: gerarUuidV7(), tipo, ocorridoEm: em,
      agregadoTipo: 'Pessoa', agregadoId: this.id,
      // O evento identifica a mudança sem copiar nome ou CPF/CNPJ para o outbox.
      dados: { pessoaId: this.id, autorId },
    });
  }
}

function conferirDados({ tipo, nome, documento }: DadosDaPessoa): Result<void, ErroDeDominio> {
  if (!['FISICA', 'JURIDICA'].includes(tipo)) return formaInvalida('tipo', 'formato');
  if (nome.trim().length === 0 || nome.trim().length > 200 || nome.includes('\0')) return formaInvalida('nome', 'formato');
  const formato = tipo === 'FISICA' ? /^\d{11}$/ : /^\d{14}$/;
  if (documento !== null && !formato.test(documento)) return formaInvalida('documento', 'documento_do_tipo');
  return ok();
}

function formaInvalida(campo: string, regra: string): Result<never, ErroDeDominio> {
  return err(erroDeDominio('CORPO_INVALIDO', detalhesDeCorpoInvalido([{ caminho: campo, regra }])));
}
