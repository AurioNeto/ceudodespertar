import { Injectable } from '@nestjs/common';
import { recusarAcesso, ResolvedorDeContextoDeAcesso } from './contexto-de-acesso.js';
import type { RecusaDeAcesso } from './contexto-de-acesso.js';

@Injectable()
export class ResolvedorDeContextoDeAcessoVazio extends ResolvedorDeContextoDeAcesso {
  resolver(): Promise<RecusaDeAcesso> {
    return Promise.resolve(recusarAcesso('USUARIO_DESCONHECIDO'));
  }
}
