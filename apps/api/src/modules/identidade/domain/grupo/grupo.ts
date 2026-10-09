import type { CodigoGrupo, GrupoId, Permissao, UsuarioId } from '@cdd/contracts';
import { erroDeDominio, type ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { RaizDeAgregado } from '../../../../shared/kernel/raiz-de-agregado.js';
import { err, ok, type Result } from '../../../../shared/kernel/result.js';
import { ehPermissaoDoCatalogo } from '../permissao/catalogo-de-permissoes.js';
import { grupoExcluido, grupoRenomeado, permissaoConcedida, permissaoRevogada } from './eventos-de-grupo.js';

export interface DadosDeGrupo {
  readonly id: GrupoId;
  readonly codigoSistema: CodigoGrupo | null;
  readonly nome: string;
  readonly descricao: string;
  readonly protegido: boolean;
}

export interface DadosParaCriarGrupo extends DadosDeGrupo {
  readonly permissoes: readonly string[];
}

export interface DadosParaReconstituirGrupo extends DadosDeGrupo {
  readonly permissoes: readonly Permissao[];
  readonly ativo: boolean;
  readonly versao: number;
}

export class Grupo extends RaizDeAgregado<GrupoId> {
  readonly #codigoSistema: CodigoGrupo | null;
  readonly #protegido: boolean;
  readonly #permissoes: Set<Permissao>;
  #nome: string;
  #descricao: string;
  #ativo: boolean;

  private constructor(dados: DadosParaReconstituirGrupo) {
    super(dados.id, dados.versao);
    this.#codigoSistema = dados.codigoSistema;
    this.#protegido = dados.protegido;
    this.#permissoes = new Set(dados.permissoes);
    this.#nome = dados.nome;
    this.#descricao = dados.descricao;
    this.#ativo = dados.ativo;
  }

  static criar(dados: DadosParaCriarGrupo): Result<Grupo, ErroDeDominio> {
    const inexistente = dados.permissoes.find((permissao) => !ehPermissaoDoCatalogo(permissao));
    if (inexistente !== undefined) return err(permissaoInexistente(inexistente));
    return ok(
      new Grupo({ ...dados, permissoes: dados.permissoes as readonly Permissao[], ativo: true, versao: 1 }),
    );
  }

  static reconstituir(dados: DadosParaReconstituirGrupo): Grupo {
    return new Grupo(dados);
  }

  get codigoSistema(): CodigoGrupo | null {
    return this.#codigoSistema;
  }

  get nome(): string {
    return this.#nome;
  }

  get descricao(): string {
    return this.#descricao;
  }

  get protegido(): boolean {
    return this.#protegido;
  }

  get ativo(): boolean {
    return this.#ativo;
  }

  get permissoes(): readonly Permissao[] {
    return [...this.#permissoes].toSorted();
  }

  conferirExistencia(): Result<void, ErroDeDominio> {
    return this.#ativo ? ok() : err(erroDeDominio('GRUPO_INEXISTENTE'));
  }

  possui(permissao: Permissao): boolean {
    return this.#permissoes.has(permissao);
  }

  renomear(nome: string, descricao: string, autorId: UsuarioId, em: Date): Result<void, ErroDeDominio> {
    const existente = this.conferirExistencia();
    if (existente.tipo === 'erro') return existente;
    if (nome === this.#nome && descricao === this.#descricao) return ok();
    const evento = grupoRenomeado(this.id, em, {
      nomeAnterior: this.#nome,
      nomeNovo: nome,
      descricaoAnterior: this.#descricao,
      descricaoNova: descricao,
      autorId,
      codigoSistema: this.#codigoSistema,
    });
    this.#nome = nome;
    this.#descricao = descricao;
    this.registrarEvento(evento);
    return ok();
  }

  concederPermissao(permissao: string, autorId: UsuarioId, em: Date): Result<void, ErroDeDominio> {
    const validada = this.validarAlteracaoDePermissao(permissao);
    if (validada.tipo === 'erro') return validada;
    if (this.#permissoes.has(validada.valor)) return ok();
    this.#permissoes.add(validada.valor);
    this.registrarEvento(
      permissaoConcedida(this.id, em, { permissao: validada.valor, autorId, codigoSistema: this.#codigoSistema }),
    );
    return ok();
  }

  revogarPermissao(permissao: string, autorId: UsuarioId, em: Date): Result<void, ErroDeDominio> {
    const validada = this.validarAlteracaoDePermissao(permissao);
    if (validada.tipo === 'erro') return validada;
    if (!this.#permissoes.delete(validada.valor)) return ok();
    this.registrarEvento(
      permissaoRevogada(this.id, em, { permissao: validada.valor, autorId, codigoSistema: this.#codigoSistema }),
    );
    return ok();
  }

  excluir(usuariosAtivos: number, autorId: UsuarioId, em: Date): Result<void, ErroDeDominio> {
    if (!Number.isInteger(usuariosAtivos) || usuariosAtivos < 0) {
      throw new RangeError(`quantidade de usuários ativos inválida: ${usuariosAtivos}`);
    }
    const existente = this.conferirExistencia();
    if (existente.tipo === 'erro') return existente;
    if (this.#protegido) return err(erroDeDominio('GRUPO_PROTEGIDO'));
    if (usuariosAtivos > 0) return err(erroDeDominio('GRUPO_COM_USUARIOS_ATIVOS', { usuariosAtivos }));
    this.#ativo = false;
    this.registrarEvento(grupoExcluido(this.id, em, { autorId, codigoSistema: this.#codigoSistema }));
    return ok();
  }

  private validarAlteracaoDePermissao(permissao: string): Result<Permissao, ErroDeDominio> {
    const existente = this.conferirExistencia();
    if (existente.tipo === 'erro') return existente;
    if (!ehPermissaoDoCatalogo(permissao)) return err(permissaoInexistente(permissao));
    return ok(permissao);
  }
}

function permissaoInexistente(permissao: string): ErroDeDominio {
  return erroDeDominio('PERMISSAO_INEXISTENTE', { permissao });
}
