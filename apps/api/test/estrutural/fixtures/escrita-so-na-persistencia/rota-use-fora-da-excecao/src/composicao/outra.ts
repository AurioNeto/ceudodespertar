import type { INestApplication } from '@nestjs/common';

export function montar(app: INestApplication, middleware: () => void) {
  app.use(middleware);
}
