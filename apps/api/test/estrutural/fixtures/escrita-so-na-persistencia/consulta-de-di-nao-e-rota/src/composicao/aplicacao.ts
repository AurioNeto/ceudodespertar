import type { INestApplication } from '@nestjs/common';

class Logger {}

export function montar(app: INestApplication, middleware: () => void) {
  app.use(middleware);
  app.get(Logger);
  app.get<Logger>('TOKEN');
}
