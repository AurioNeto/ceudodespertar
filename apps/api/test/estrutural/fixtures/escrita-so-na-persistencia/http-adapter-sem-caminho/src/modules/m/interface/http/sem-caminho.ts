import type { HttpServer } from '@nestjs/common';

export function registrar(adaptador: HttpServer, tratador: (requisicao: unknown, resposta: unknown) => void) {
  adaptador.get(tratador);
}
