import { defineEntity, p } from '@mikro-orm/core';

export const Entidade = defineEntity({
  name: 'Entidade',
  properties: {
    id: p.uuid().primary(),
  },
});
