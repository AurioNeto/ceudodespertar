import { EventEmitter } from 'node:events';
import { Injectable } from '@nestjs/common';

const EVENTO_GRAVADO = 'evento-gravado';

@Injectable()
export class SinalizadorDeEventos {
  private readonly emissor = new EventEmitter();

  notificar(): void {
    this.emissor.emit(EVENTO_GRAVADO);
  }

  aoNotificar(ouvinte: () => void): () => void {
    this.emissor.on(EVENTO_GRAVADO, ouvinte);
    return () => this.emissor.off(EVENTO_GRAVADO, ouvinte);
  }
}
