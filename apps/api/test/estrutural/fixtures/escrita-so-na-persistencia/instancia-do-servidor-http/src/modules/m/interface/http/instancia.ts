import type { INestApplication } from '@nestjs/common';

export function registrar(app: INestApplication, tratador: () => void) {
  app.getHttpAdapter().getInstance().get('/admin', tratador);
  app.getHttpAdapter().getInstance().use('/x', tratador);
}
