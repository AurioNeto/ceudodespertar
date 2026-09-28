import { SetMetadata } from '@nestjs/common';
import type { ModoDeTransacao as ModoDeTransacaoValor } from '../banco/unidade-de-trabalho.js';

export const CHAVE_DO_MODO_DE_TRANSACAO = 'cdd:modo-de-transacao';

export const ModoDeTransacao = (modo: ModoDeTransacaoValor): MethodDecorator & ClassDecorator =>
  SetMetadata(CHAVE_DO_MODO_DE_TRANSACAO, modo);
