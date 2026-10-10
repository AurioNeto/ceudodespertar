import type { HttpServer } from '@nestjs/common';

export function registrar(adaptador: HttpServer, tratador: () => void) {
  adaptador.post('/x', tratador);
  adaptador.get(['/a', '/b'], tratador);
  adaptador.delete(/^\/y/, tratador);
}
