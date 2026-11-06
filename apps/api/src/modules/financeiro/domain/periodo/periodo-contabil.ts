import type { Competencia, DataHora, PeriodoContabil as Estado, PeriodoContabilId, UnidadeId, UsuarioId } from '@cdd/contracts';
import { RaizDeAgregado } from '../../../../shared/kernel/raiz-de-agregado.js';
import { erroDeDominio, type ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { gerarUuidV7 } from '../../../../shared/kernel/ids.js';
import { err, ok, type Result } from '../../../../shared/kernel/result.js';

export class PeriodoContabil extends RaizDeAgregado<PeriodoContabilId> {
  #estado: Estado;
  private constructor(estado: Estado) { super(estado.id, estado.versao); this.#estado = structuredClone(estado); }
  static abrir(id: PeriodoContabilId, unidadeId: UnidadeId, competencia: Competencia): PeriodoContabil {
    return new PeriodoContabil({ id, unidadeId, competencia, fechado: false, fechadoPor: null, fechadoEm: null, hash: null, reaberturas: [], versao: 1 });
  }
  static reconstituir(estado: Estado): PeriodoContabil { return new PeriodoContabil(estado); }
  get estado(): Estado { return structuredClone(this.#estado); }

  fechar(pendentes: number, anteriorFechado: boolean, hash: string, autor: UsuarioId, em: Date): Result<void, ErroDeDominio> {
    if (this.#estado.fechado) return err(erroDeDominio('PERIODO_JA_FECHADO'));
    if (pendentes > 0) return err(erroDeDominio('PERIODO_COM_PENDENCIAS', { quantidade: pendentes }));
    if (!anteriorFechado) return err(erroDeDominio('PERIODO_ANTERIOR_ABERTO'));
    this.#estado = { ...this.#estado, fechado: true, fechadoPor: autor, fechadoEm: em.toISOString() as DataHora, hash };
    this.emitir('PERIODO_FECHADO', autor, em);
    return ok();
  }

  reabrir(motivo: string, autor: UsuarioId, em: Date): Result<void, ErroDeDominio> {
    if (!this.#estado.fechado) return err(erroDeDominio('PERIODO_NAO_FECHADO'));
    if (motivo.trim().length < 10 || motivo.length > 500 || motivo.includes('\0')) return err(erroDeDominio('MOTIVO_OBRIGATORIO'));
    const reabertura = { motivo: motivo.trim(), reabertoPor: autor, reabertoEm: em.toISOString() as DataHora, hashAnterior: this.#estado.hash! };
    this.#estado = { ...this.#estado, fechado: false, fechadoPor: null, fechadoEm: null, hash: null, reaberturas: [...this.#estado.reaberturas, reabertura] };
    this.emitir('PERIODO_REABERTO', autor, em);
    return ok();
  }

  private emitir(tipo: string, autorId: UsuarioId, em: Date): void {
    this.registrarEvento({ eventoId: gerarUuidV7(), tipo, ocorridoEm: em, agregadoTipo: 'PeriodoContabil', agregadoId: this.id,
      dados: { periodoId: this.id, unidadeId: this.#estado.unidadeId, competencia: this.#estado.competencia, autorId } });
  }
}
