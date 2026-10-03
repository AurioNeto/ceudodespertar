import { erroDeDominio, type ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { err, ok, type Result } from '../../../../shared/kernel/result.js';

export interface DadosDoConvite {
  readonly hashDoToken: string;
  readonly expiraEm: Date;
  readonly usadoEm: Date | null;
  readonly revogadoEm: Date | null;
}

export class Convite {
  private constructor(private readonly dados: DadosDoConvite) {}

  static criar(hashDoToken: string, expiraEm: Date): Convite {
    if (Number.isNaN(expiraEm.getTime())) throw new RangeError('data de expiração do convite inválida');
    return new Convite({ hashDoToken, expiraEm, usadoEm: null, revogadoEm: null });
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
