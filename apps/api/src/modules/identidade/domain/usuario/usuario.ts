import type { CodigoDeErro, GrupoId, OperacaoAuditada, PessoaId, SituacaoUsuario, UsuarioId } from '@cdd/contracts';
import { erroDeDominio, type ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { gerarUuidV7 } from '../../../../shared/kernel/ids.js';
import { RaizDeAgregado } from '../../../../shared/kernel/raiz-de-agregado.js';
import { err, ok, type Result } from '../../../../shared/kernel/result.js';
import { Convite } from './convite.js';

const AGREGADO_TIPO = 'Usuario';

type SituacaoInativa = Exclude<SituacaoUsuario, 'ATIVO'>;

const CODIGO_DA_SITUACAO_INATIVA: Record<SituacaoInativa, CodigoDeErro> = {
  CONVITE_PENDENTE: 'USUARIO_CONVITE_PENDENTE',
  SUSPENSO: 'USUARIO_SUSPENSO',
  REVOGADO: 'USUARIO_REVOGADO',
};

export interface DadosParaConvidar {
  readonly id: UsuarioId;
  readonly nome: string;
  readonly email: string;
  readonly grupos: readonly GrupoId[];
  readonly hashDoConvite: string;
  readonly conviteExpiraEm: Date;
  readonly convidadoPor: UsuarioId;
  readonly em: Date;
}

export interface DadosDoUsuario {
  readonly id: UsuarioId;
  readonly pessoaId: PessoaId | null;
  readonly subjectId: string | null;
  readonly nome: string;
  readonly email: string;
  readonly situacao: SituacaoUsuario;
  readonly grupos: readonly GrupoId[];
  readonly ultimoAcessoEm: Date | null;
  readonly convite: Convite | null;
}

function semDuplicatas(grupos: readonly GrupoId[]): GrupoId[] {
  return [...new Set(grupos)];
}

function mesmoConjunto(a: readonly GrupoId[], b: readonly GrupoId[]): boolean {
  return a.length === b.length && a.every((grupoId) => b.includes(grupoId));
}

function erroDaSituacaoInativa(situacao: SituacaoInativa): ErroDeDominio {
  return erroDeDominio(CODIGO_DA_SITUACAO_INATIVA[situacao]);
}

function erroDaSituacao(situacao: SituacaoUsuario, codigoSeAtivo: CodigoDeErro): ErroDeDominio {
  return situacao === 'ATIVO' ? erroDeDominio(codigoSeAtivo) : erroDaSituacaoInativa(situacao);
}

export class Usuario extends RaizDeAgregado<UsuarioId> {
  private _pessoaId: PessoaId | null;
  private _subjectId: string | null;
  private _nome: string;
  private _email: string;
  private _situacao: SituacaoUsuario;
  private _grupos: GrupoId[];
  private _ultimoAcessoEm: Date | null;
  private _convite: Convite | null;
  private readonly _convitesSubstituidos: Convite[] = [];

  private constructor(dados: DadosDoUsuario, versao?: number) {
    super(dados.id, versao);
    this._pessoaId = dados.pessoaId;
    this._subjectId = dados.subjectId;
    this._nome = dados.nome;
    this._email = dados.email;
    this._situacao = dados.situacao;
    this._grupos = semDuplicatas(dados.grupos);
    this._ultimoAcessoEm = dados.ultimoAcessoEm;
    this._convite = dados.convite;
  }

  static convidar(dados: DadosParaConvidar): Usuario {
    const usuario = new Usuario({
      id: dados.id,
      pessoaId: null,
      subjectId: null,
      nome: dados.nome,
      email: dados.email,
      situacao: 'CONVITE_PENDENTE',
      grupos: dados.grupos,
      ultimoAcessoEm: null,
      convite: Convite.criar(dados.hashDoConvite, dados.conviteExpiraEm),
    });
    usuario.registrarOperacao('USUARIO_CONVIDADO', dados.em, { autorId: dados.convidadoPor, email: dados.email });
    return usuario;
  }

  static reconstituir(dados: DadosDoUsuario, versao?: number): Usuario {
    return new Usuario(dados, versao);
  }

  get pessoaId(): PessoaId | null {
    return this._pessoaId;
  }

  get subjectId(): string | null {
    return this._subjectId;
  }

  get nome(): string {
    return this._nome;
  }

  get email(): string {
    return this._email;
  }

  get situacao(): SituacaoUsuario {
    return this._situacao;
  }

  get grupos(): readonly GrupoId[] {
    return [...this._grupos];
  }

  get ultimoAcessoEm(): Date | null {
    return this._ultimoAcessoEm;
  }

  get convite(): Convite | null {
    return this._convite;
  }

  get convitesSubstituidos(): readonly Convite[] {
    return [...this._convitesSubstituidos];
  }

  validarConvite(hashApresentado: string, em: Date): Result<void, ErroDeDominio> {
    return this._convite === null
      ? err(erroDeDominio('CONVITE_INVALIDO'))
      : this._convite.validar(hashApresentado, em);
  }

  reenviarConvite(novoHash: string, novaExpiraEm: Date, por: UsuarioId, em: Date): Result<void, ErroDeDominio> {
    if (this._situacao !== 'CONVITE_PENDENTE') return err(erroDaSituacao(this._situacao, 'CONVITE_JA_USADO'));

    const novoConvite = Convite.criar(novoHash, novaExpiraEm);
    if (this._convite !== null) this._convitesSubstituidos.push(this._convite.revogar(em));
    this._convite = novoConvite;
    this.registrarOperacao('USUARIO_CONVIDADO', em, { autorId: por, email: this._email });
    return ok();
  }

  ativar(hashApresentado: string, subjectId: string, em: Date): Result<void, ErroDeDominio> {
    if (Number.isNaN(em.getTime())) throw new RangeError('instante de ativação inválido');
    if (subjectId.trim() === '') throw new RangeError('subjectId vazio na ativação');
    if (this._situacao !== 'CONVITE_PENDENTE') return err(erroDaSituacao(this._situacao, 'CONVITE_JA_USADO'));
    if (this._convite === null) return err(erroDeDominio('CONVITE_INVALIDO'));
    const conviteValido = this._convite.validar(hashApresentado, em);
    if (conviteValido.tipo === 'erro') return conviteValido;

    this._situacao = 'ATIVO';
    this._subjectId = subjectId;
    this._convite = this._convite.usar(em);
    this.registrarOperacao('USUARIO_ATIVADO', em, { autorId: this.id, subjectId });
    return ok();
  }

  desativar(por: UsuarioId, motivo: string, em: Date): Result<void, ErroDeDominio> {
    if (this._situacao === 'SUSPENSO') return ok();
    if (this._situacao !== 'ATIVO') return err(erroDaSituacaoInativa(this._situacao));
    if (motivo.trim() === '') return err(erroDeDominio('MOTIVO_OBRIGATORIO'));

    this._situacao = 'SUSPENSO';
    this.registrarOperacao('USUARIO_SUSPENSO', em, { autorId: por, motivo });
    return ok();
  }

  reativar(por: UsuarioId, em: Date): Result<void, ErroDeDominio> {
    if (this._situacao === 'ATIVO') return ok();
    if (this._situacao !== 'SUSPENSO') return err(erroDaSituacaoInativa(this._situacao));

    this._situacao = 'ATIVO';
    this.registrarOperacao('USUARIO_REATIVADO', em, { autorId: por });
    return ok();
  }

  verificarAcesso(): Result<void, ErroDeDominio> {
    return this._situacao === 'ATIVO' ? ok() : err(erroDaSituacaoInativa(this._situacao));
  }

  definirGrupos(grupoIds: readonly GrupoId[], por: UsuarioId, em: Date): Result<void, ErroDeDominio> {
    if (this._situacao === 'REVOGADO') return err(erroDaSituacaoInativa(this._situacao));

    const gruposAntes = this._grupos;
    const gruposDepois = semDuplicatas(grupoIds);
    if (mesmoConjunto(gruposAntes, gruposDepois)) return ok();

    this._grupos = gruposDepois;
    this.registrarOperacao('GRUPO_ALTERADO', em, { autorId: por, gruposAntes, gruposDepois });
    return ok();
  }

  private registrarOperacao(operacao: OperacaoAuditada, ocorridoEm: Date, dados: Record<string, unknown>): void {
    this.registrarEvento({
      eventoId: gerarUuidV7(),
      tipo: operacao,
      ocorridoEm,
      agregadoTipo: AGREGADO_TIPO,
      agregadoId: this.id,
      dados,
    });
  }
}
