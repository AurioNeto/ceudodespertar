import type { INestApplication } from '@nestjs/common';

export function montar(app: INestApplication, middleware: () => void, roteador: () => void) {
  app.use(middleware);
  app.use('/admin', roteador);
}
