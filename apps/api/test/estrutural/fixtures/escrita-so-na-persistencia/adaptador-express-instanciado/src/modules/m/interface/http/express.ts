import { ExpressAdapter } from '@nestjs/platform-express';

export function registrar(tratador: () => void) {
  const adaptador = new ExpressAdapter();
  adaptador.get('/x', tratador);
  adaptador.use(tratador);
}
