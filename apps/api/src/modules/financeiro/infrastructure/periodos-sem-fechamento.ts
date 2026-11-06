import { Injectable } from '@nestjs/common';
import { SituacaoDoPeriodo } from '../application/lancamentos/situacao-do-periodo.js';

@Injectable()
export class PeriodosSemFechamento extends SituacaoDoPeriodo {
  estaAberto(): Promise<boolean> { return Promise.resolve(true); }
}
