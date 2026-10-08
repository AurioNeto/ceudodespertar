import type { UsuarioId } from '@cdd/contracts';
import { erroDeDominio, type ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { err, ok, type Result } from '../../../../shared/kernel/result.js';

export const VALIDADE_MAXIMA_DO_CONVITE_EM_HORAS = 72;
const MILISSEGUNDOS_POR_HORA = 3_600_000;

export interface DadosDoConvite {
  readonly hashDoToken: string;
  readonly expiraEm: Date;
  readonly criadoPor: UsuarioId;
  readonly criadoEm: Date;
  readonly usadoEm: Date | null;
  readonly revogadoEm: Date | null;
}

export class Convite {
  private constructor(private readonly dados: DadosDoConvite) {}

  static criar(hashDoToken: string, expiraEm: Date, criadoPor: UsuarioId, em: Date): Convite {
    if (Number.isNaN(expiraEm.getTime())) throw new RangeError('data de expiração do convite inválida');
    if (Number.isNaN(em.getTime())) throw new RangeError('instante de criação do convite inválido');
    if (expiraEm <= em) throw new RangeError('convite não pode expirar no passado');
    if (expiraEm > limiteDeValidade(em)) {
      throw new RangeError(`convite não pode valer mais que ${VALIDADE_MAXIMA_DO_CONVITE_EM_HORAS} horas`);
    }
    return new Convite({ hashDoToken, expiraEm, criadoPor, criadoEm: em, usadoEm: null, revogadoEm: null });
  }

  static reconstituir(dados: DadosDoConvite): Convite {
    return new Convite(dados);
  }

  get hashDoToken(): string {
    return this.dados.hashDoToken;
  }

  get expiraEm(): Date {
    return this.dados.expiraEm;
  }

  get criadoPor(): UsuarioId {
    return this.dados.criadoPor;
  }

  get criadoEm(): Date {
    return this.dados.criadoEm;
  }

  get usadoEm(): Date | null {
    return this.dados.usadoEm;
  }

  get revogadoEm(): Date | null {
    return this.dados.revogadoEm;
  }

  validar(hashApresentado: string, em: Date): Result<void, ErroDeDominio> {
    if (hashApresentado !== this.dados.hashDoToken || this.dados.revogadoEm !== null) {
      return err(erroDeDominio('CONVITE_INVALIDO'));
    }
    if (this.dados.usadoEm !== null) return err(erroDeDominio('CONVITE_JA_USADO'));
    if (em > this.dados.expiraEm) return err(erroDeDominio('CONVITE_EXPIRADO'));
    return ok();
  }

  usar(em: Date): Convite {
    return new Convite({ ...this.dados, usadoEm: em });
  }

  revogar(em: Date): Convite {
    return new Convite({ ...this.dados, revogadoEm: em });
  }
}

function limiteDeValidade(em: Date): Date {
  return new Date(em.getTime() + VALIDADE_MAXIMA_DO_CONVITE_EM_HORAS * MILISSEGUNDOS_POR_HORA);
}
