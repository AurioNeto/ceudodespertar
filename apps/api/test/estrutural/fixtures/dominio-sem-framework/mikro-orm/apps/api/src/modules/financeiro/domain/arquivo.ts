import { MikroORM } from '@mikro-orm/core';

export function criar(): typeof MikroORM {
  return MikroORM;
}
