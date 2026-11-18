import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { PeriodosController } from '../../src/modules/financeiro/interface/http/periodos.controller.js';
import { TransferenciasController } from '../../src/modules/financeiro/interface/http/transferencias.controller.js';
import { LancamentosController } from '../../src/modules/financeiro/interface/http/lancamentos.controller.js';
import { PendenciasController } from '../../src/modules/financeiro/interface/http/pendencias.controller.js';
import { CHAVE_DA_RESPOSTA_SEM_CORPO_NO_REPLAY } from '../../src/shared/infrastructure/idempotencia/resposta-sem-corpo-no-replay.decorator.js';

describe('privacidade dos comandos financeiros', () => {
  it.each([LancamentosController, PendenciasController, TransferenciasController, PeriodosController])('%s não guarda corpo com texto livre em replay', (controller) => {
    expect(Reflect.getMetadata(CHAVE_DA_RESPOSTA_SEM_CORPO_NO_REPLAY, controller)).toBe(true);
  });
});
