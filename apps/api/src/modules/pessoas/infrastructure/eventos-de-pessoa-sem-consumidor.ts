import { Injectable } from '@nestjs/common';
import { EventosSemConsumidor } from '../../../shared/infrastructure/eventos/eventos-sem-consumidor.decorator.js';

@Injectable()
@EventosSemConsumidor('PESSOA_CADASTRADA', 'PESSOA_EDITADA')
export class EventosDePessoaSemConsumidor {}
