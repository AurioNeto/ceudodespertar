import type { EventoId, ResumoDeEvento } from '@cdd/contracts';

export abstract class EventosMinimos {
  abstract adicionar(evento: ResumoDeEvento): Promise<void>;
  abstract porId(id: EventoId): Promise<ResumoDeEvento | undefined>;
}
