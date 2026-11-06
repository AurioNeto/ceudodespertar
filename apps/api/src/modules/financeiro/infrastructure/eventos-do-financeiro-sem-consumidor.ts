import { Injectable } from '@nestjs/common';
import { EventosSemConsumidor } from '../../../shared/infrastructure/eventos/eventos-sem-consumidor.decorator.js';

@Injectable()
@EventosSemConsumidor('LANCAMENTO_REGISTRADO', 'LANCAMENTO_EDITADO', 'LANCAMENTO_CONFIRMADO', 'LANCAMENTO_DESCARTADO', 'LANCAMENTO_ESTORNADO', 'PENDENCIA_ABERTA', 'PENDENCIA_RESPONDIDA')
export class EventosDoFinanceiroSemConsumidor {}
