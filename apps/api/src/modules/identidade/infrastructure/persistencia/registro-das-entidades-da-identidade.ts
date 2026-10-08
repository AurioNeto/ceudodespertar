import { Injectable } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/postgresql';
import { ENTIDADES_DA_IDENTIDADE } from './entidades-da-identidade.js';

@Injectable()
export class RegistroDasEntidadesDaIdentidade implements OnModuleInit {
  constructor(private readonly orm: MikroORM) {}

  onModuleInit(): void {
    this.orm.discoverEntity(ENTIDADES_DA_IDENTIDADE);
  }
}
