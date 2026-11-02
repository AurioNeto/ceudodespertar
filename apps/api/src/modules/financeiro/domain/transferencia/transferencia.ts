import type { Competencia, DataHora, DataLocal, RegistrarTransferencia, Transferencia as TransferenciaDoContrato, TransferenciaId, UsuarioId } from '@cdd/contracts';
import { erroDeDominio, type ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { gerarUuidV7 } from '../../../../shared/kernel/ids.js';
import { RaizDeAgregado } from '../../../../shared/kernel/raiz-de-agregado.js';
import { err, ok, type Result } from '../../../../shared/kernel/result.js';
import { dataDaTransferenciaValida, motivoDaTransferenciaValido, validarTransferencia } from './validar-transferencia.js';

type Estado = Omit<TransferenciaDoContrato, 'estornadaPorId'>;
const falha = (codigo: Parameters<typeof erroDeDominio>[0]) => err(erroDeDominio(codigo));

export class Transferencia extends RaizDeAgregado<TransferenciaId> {
  #estado: Estado;

  private constructor(estado: Estado) {
    super(estado.id, estado.versao);
    this.#estado = structuredClone(estado);
  }

  static reconstituir(estado: Estado): Transferencia {
    return new Transferencia(estado);
  }

  static registrar(id: TransferenciaId, dados: RegistrarTransferencia, autor: UsuarioId, em: Date, periodoAberto: boolean): Result<Transferencia, ErroDeDominio> {
    if (!periodoAberto) return falha('PERIODO_FECHADO');
    const valido = validarTransferencia(dados);
    if (valido.tipo === 'erro') return valido;
    const t = new Transferencia({ ...dados, motivo: dados.motivo.trim(), id, registradoPor: autor, registradoEm: em.toISOString() as DataHora,
      status: 'A_CONFERIR', confirmadoPor: null, confirmadoEm: null, estornoDeId: null, versao: 1 });
    t.emitir('TRANSFERENCIA_REGISTRADA', autor, em);
    return ok(t);
  }

  get estado(): Estado { return structuredClone(this.#estado); }
  get competencia(): Competencia { return this.#estado.data.slice(0, 7) as Competencia; }

  editar(dados: RegistrarTransferencia, autor: UsuarioId, em: Date, periodoAberto: boolean): Result<void, ErroDeDominio> {
    const editavel = this.conferirPendente(periodoAberto);
    if (editavel.tipo === 'erro') return editavel;
    if (this.#estado.estornoDeId !== null) return falha('ORIGEM_NAO_EDITAVEL');
    const valido = validarTransferencia(dados);
    if (valido.tipo === 'erro') return valido;
    this.#estado = structuredClone({ ...this.#estado, ...dados, motivo: dados.motivo.trim() });
    this.emitir('TRANSFERENCIA_EDITADA', autor, em);
    return ok();
  }

  confirmar(autor: UsuarioId, em: Date, periodoAberto: boolean): Result<void, ErroDeDominio> {
    const pendente = this.conferirPendente(periodoAberto);
    if (pendente.tipo === 'erro') return pendente;
    if (autor === this.#estado.registradoPor) return falha('CONFERENTE_E_O_AUTOR');
    this.#estado = { ...this.#estado, status: 'CONFIRMADO', confirmadoPor: autor, confirmadoEm: em.toISOString() as DataHora };
    this.emitir('TRANSFERENCIA_CONFIRMADA', autor, em);
    return ok();
  }

  descartar(autor: UsuarioId, em: Date, periodoAberto: boolean): Result<void, ErroDeDominio> {
    const pendente = this.conferirPendente(periodoAberto);
    if (pendente.tipo === 'erro') return pendente;
    this.emitir('TRANSFERENCIA_DESCARTADA', autor, em);
    return ok();
  }

  estornar(id: TransferenciaId, motivo: string, autor: UsuarioId, em: Date, data: DataLocal, periodoAberto: boolean): Result<Transferencia, ErroDeDominio> {
    if (this.#estado.status !== 'CONFIRMADO') return falha('TRANSFERENCIA_NAO_CONFIRMADA');
    if (this.#estado.estornoDeId !== null) return falha('TRANSFERENCIA_JA_ESTORNADA');
    if (!periodoAberto) return falha('PERIODO_FECHADO');
    if (!motivoDaTransferenciaValido(motivo)) return falha('MOTIVO_OBRIGATORIO');
    if (!dataDaTransferenciaValida(data)) return falha('CORPO_INVALIDO');
    const t = new Transferencia({ ...this.#estado, id, motivo: motivo.trim(), data, estornoDeId: this.id, status: 'A_CONFERIR',
      registradoPor: autor, registradoEm: em.toISOString() as DataHora, confirmadoPor: null, confirmadoEm: null, versao: 1 });
    t.emitir('TRANSFERENCIA_ESTORNO_REGISTRADO', autor, em);
    return ok(t);
  }

  private conferirPendente(periodoAberto: boolean): Result<void, ErroDeDominio> {
    if (!periodoAberto) return falha('PERIODO_FECHADO');
    return this.#estado.status === 'A_CONFERIR' ? ok() : falha('TRANSFERENCIA_JA_CONFIRMADA');
  }

  private emitir(tipo: string, autorId: UsuarioId, em: Date): void {
    this.registrarEvento({ eventoId: gerarUuidV7(), tipo, ocorridoEm: em, agregadoTipo: 'Transferencia', agregadoId: this.id, dados: { transferenciaId: this.id, autorId } });
  }
}
