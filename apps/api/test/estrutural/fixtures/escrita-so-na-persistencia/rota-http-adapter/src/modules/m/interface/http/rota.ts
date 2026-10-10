import type { AbstractHttpAdapter } from '@nestjs/core';

export function registrar(adaptador: AbstractHttpAdapter, tratador: () => void) {
  adaptador.post('/x', tratador);
  adaptador.get(['/a', '/b'], tratador);
  adaptador.delete(/^\/y/, tratador);
}
