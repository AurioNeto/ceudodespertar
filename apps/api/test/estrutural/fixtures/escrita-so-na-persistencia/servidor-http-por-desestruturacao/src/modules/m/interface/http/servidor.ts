import type { INestApplication } from '@nestjs/common';

export function registrar(app: INestApplication, tratador: () => void) {
  app.getHttpServer().on('request', tratador);
  const adaptador = app.getHttpAdapter();
  const { getInstance } = adaptador;
  const { getInstance: outro } = adaptador;
  const guardado = adaptador.getInstance;
  return [getInstance, outro, guardado];
}
