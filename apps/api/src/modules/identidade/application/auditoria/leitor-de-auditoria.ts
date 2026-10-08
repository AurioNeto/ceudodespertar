import type { OperacaoAuditada, RegistroDeAuditoria } from '@cdd/contracts';
import type { ContextoDaTransacao } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import type { PosicaoDaTrilha } from './cursor-de-auditoria.js';

export interface ConsultaDaTrilha {
  readonly de?: Date;
  readonly ate?: Date;
  readonly operacao?: OperacaoAuditada;
  readonly depois: PosicaoDaTrilha | null;
  readonly limite: number;
}

export abstract class LeitorDeAuditoria {
  abstract ler(contexto: ContextoDaTransacao, consulta: ConsultaDaTrilha): Promise<RegistroDeAuditoria[]>;
}
