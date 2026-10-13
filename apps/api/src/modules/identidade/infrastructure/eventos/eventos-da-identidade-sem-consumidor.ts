import { Injectable } from '@nestjs/common';
import { EventosSemConsumidor } from '../../../../shared/infrastructure/eventos/eventos-sem-consumidor.decorator.js';
import type { TipoDeEventoDaIdentidade } from '../../domain/eventos-da-identidade.js';

const USUARIO_CONVIDADO: TipoDeEventoDaIdentidade = 'USUARIO_CONVIDADO';

@Injectable()
@EventosSemConsumidor(USUARIO_CONVIDADO)
export class EventosDaIdentidadeSemConsumidor {}
