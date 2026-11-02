import type { ConfirmadoPor, DadosDoLancamento, DataHora, DataLocal, Etiqueta, LancamentoId, OrigemLancamento, PendenciaDoLancamento, PendenciaId, RegistroDeLancamento, UsuarioId, Competencia } from '@cdd/contracts';
import { erroDeDominio, type ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { gerarUuidV7 } from '../../../../shared/kernel/ids.js';
import { RaizDeAgregado } from '../../../../shared/kernel/raiz-de-agregado.js';
import { err, ok, type Result } from '../../../../shared/kernel/result.js';
import { conferirEtiquetas, dataValida, textoValido, validarLancamento } from './validar-lancamento.js';

type Estado = Omit<RegistroDeLancamento, 'estornadoPorId' | 'pendencias'>;
const falha = (codigo: Parameters<typeof erroDeDominio>[0]) => err(erroDeDominio(codigo));

export class Lancamento extends RaizDeAgregado<LancamentoId> {
  #estado: Estado;
  #pendencias: PendenciaDoLancamento[];

  private constructor(estado: Estado, pendencias: readonly PendenciaDoLancamento[] = []) {
    super(estado.id, estado.versao);
    this.#estado = structuredClone(estado);
    this.#pendencias = structuredClone([...pendencias]);
  }

  static reconstituir(estado: Estado, pendencias: readonly PendenciaDoLancamento[] = []): Lancamento {
    return new Lancamento(estado, pendencias);
  }

  static registrar(id: LancamentoId, dados: DadosDoLancamento, etiquetas: readonly Etiqueta[], autor: UsuarioId, em: Date, periodoAberto: boolean, origem: OrigemLancamento = 'REGISTRO_RAPIDO'): Result<Lancamento, ErroDeDominio> {
    if (!periodoAberto) return falha('PERIODO_FECHADO');
    const valido = validarLancamento(dados, etiquetas);
    if (valido.tipo === 'erro') return valido;
    const l = new Lancamento({ ...dados, etiquetas, id, motivo: dados.motivo.trim(), origem, status: 'A_CONFERIR',
      competencia: competenciaDe(dados.dataCompetencia), registradoPor: autor, registradoEm: em.toISOString() as DataHora,
      confirmadoPor: null, confirmadoEm: null, estornoDeId: null, versao: 1 });
    l.emitir('LANCAMENTO_REGISTRADO', autor, em);
    return ok(l);
  }

  get estado(): Estado { return structuredClone(this.#estado); }
  get pendencias(): readonly PendenciaDoLancamento[] { return structuredClone(this.#pendencias); }

  editar(dados: DadosDoLancamento, etiquetas: readonly Etiqueta[], autor: UsuarioId, em: Date, periodoAberto: boolean): Result<void, ErroDeDominio> {
    const editavel = this.conferirEditavel(periodoAberto);
    if (editavel.tipo === 'erro') return editavel;
    const valido = validarLancamento(dados, etiquetas);
    if (valido.tipo === 'erro') return valido;
    this.#estado = structuredClone({ ...this.#estado, ...dados, motivo: dados.motivo.trim(), etiquetas, competencia: competenciaDe(dados.dataCompetencia) });
    this.emitir('LANCAMENTO_EDITADO', autor, em);
    return ok();
  }

  confirmar(autor: ConfirmadoPor, em: Date, periodoAberto: boolean): Result<void, ErroDeDominio> {
    if (!periodoAberto) return falha('PERIODO_FECHADO');
    if (this.#estado.status === 'CONFIRMADO') return falha('LANCAMENTO_JA_CONFIRMADO');
    if (this.#estado.unidadeId === null || this.#estado.contaId === null || this.#estado.dataCompetencia === null || this.#pendencias.some((p) => p.resolvidaEm === null)) return falha('LANCAMENTO_INCOMPLETO');
    const etiquetas = conferirEtiquetas(this.#estado.natureza, this.#estado.valor, this.#estado.etiquetas);
    if (etiquetas.tipo === 'erro') return etiquetas;
    this.#estado = { ...this.#estado, status: 'CONFIRMADO', confirmadoPor: autor, confirmadoEm: em.toISOString() as DataHora };
    this.emitir('LANCAMENTO_CONFIRMADO', autor.autorId, em);
    return ok();
  }

  descartar(autor: UsuarioId, em: Date, periodoAberto: boolean): Result<void, ErroDeDominio> {
    const editavel = this.conferirEditavel(periodoAberto);
    if (editavel.tipo === 'erro') return editavel;
    this.emitir('LANCAMENTO_DESCARTADO', autor, em);
    return ok();
  }

  estornar(id: LancamentoId, motivo: string, autor: UsuarioId, em: Date, data: DataLocal, periodoAberto: boolean, jaEstornado: boolean): Result<Lancamento, ErroDeDominio> {
    if (this.#estado.status !== 'CONFIRMADO') return falha('LANCAMENTO_NAO_CONFIRMADO');
    if (jaEstornado || this.#estado.estornoDeId !== null) return falha('LANCAMENTO_JA_ESTORNADO');
    if (!periodoAberto) return falha('PERIODO_FECHADO');
    if (!textoValido(motivo)) return falha('MOTIVO_OBRIGATORIO');
    if (!dataValida(data)) return falha('CORPO_INVALIDO');
    const estorno = new Lancamento({ ...this.#estado, id, motivo: motivo.trim(), estornoDeId: this.id,
      dataCompetencia: data, competencia: competenciaDe(data), dataCaixa: data, origem: 'MANUAL',
      registradoPor: autor, registradoEm: em.toISOString() as DataHora, confirmadoPor: { autorTipo: 'USUARIO', autorId: autor },
      confirmadoEm: em.toISOString() as DataHora, versao: 1 });
    estorno.emitir('LANCAMENTO_ESTORNADO', autor, em);
    return ok(estorno);
  }

  abrirPendencia(texto: string, autor: UsuarioId, em: Date, periodoAberto: boolean): Result<PendenciaDoLancamento, ErroDeDominio> {
    const editavel = this.conferirEditavel(periodoAberto);
    if (editavel.tipo === 'erro') return editavel;
    if (!textoValido(texto)) return falha('CORPO_INVALIDO');
    if (autor === this.#estado.registradoPor) return falha('PENDENCIA_PARA_SI_MESMO');
    if (this.#pendencias.some((p) => p.resolvidaEm === null)) return falha('PENDENCIA_JA_ABERTA');
    const p: PendenciaDoLancamento = { id: gerarUuidV7() as PendenciaId, texto: texto.trim(), abertaPor: autor,
      destinatario: this.#estado.registradoPor, abertaEm: em.toISOString() as DataHora, resposta: null, resolvidaEm: null };
    this.#pendencias.push(p);
    this.emitir('PENDENCIA_ABERTA', autor, em);
    return ok(structuredClone(p));
  }

  responderPendencia(id: PendenciaId, texto: string, autor: UsuarioId, em: Date, periodoAberto: boolean): Result<void, ErroDeDominio> {
    const editavel = this.conferirEditavel(periodoAberto);
    if (editavel.tipo === 'erro') return editavel;
    const p = this.#pendencias.find((pendencia) => pendencia.id === id);
    if (p === undefined || p.resolvidaEm !== null) return falha('RECURSO_NAO_ENCONTRADO');
    if (p.destinatario !== autor) return falha('PENDENCIA_SO_DO_DESTINATARIO');
    if (!textoValido(texto)) return falha('CORPO_INVALIDO');
    this.#pendencias = this.#pendencias.map((item) => item.id === id ? { ...item, resposta: texto.trim(), resolvidaEm: em.toISOString() as DataHora } : item);
    this.emitir('PENDENCIA_RESPONDIDA', autor, em);
    return ok();
  }

  private conferirEditavel(periodoAberto: boolean): Result<void, ErroDeDominio> {
    if (!periodoAberto) return falha('PERIODO_FECHADO');
    if (this.#estado.status === 'CONFIRMADO') return falha('LANCAMENTO_JA_CONFIRMADO');
    if (this.#estado.origem === 'INTEGRACAO_EVENTOS') return falha('ORIGEM_NAO_EDITAVEL');
    return ok();
  }

  private emitir(tipo: string, autorId: UsuarioId | null, em: Date): void {
    this.registrarEvento({ eventoId: gerarUuidV7(), tipo, ocorridoEm: em, agregadoTipo: 'Lancamento', agregadoId: this.id, dados: { autorId, lancamentoId: this.id } });
  }
}

export function competenciaDe(data: DataLocal | null): Competencia | null {
  return data === null ? null : data.slice(0, 7) as Competencia;
}
