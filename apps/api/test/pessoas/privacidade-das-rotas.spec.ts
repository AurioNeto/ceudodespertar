import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';
import { PessoasController } from '../../src/modules/pessoas/interface/http/pessoas.controller.js';
import { CHAVE_DA_RESPOSTA_SEM_CORPO_NO_REPLAY } from '../../src/shared/infrastructure/idempotencia/resposta-sem-corpo-no-replay.decorator.js';

describe('comandos de pessoas preservam privacidade no replay', () => {
  const metodos = Object.getOwnPropertyNames(PessoasController.prototype)
    .filter((nome) => nome !== 'constructor')
    .map((nome) => Reflect.get(PessoasController.prototype, nome) as object);

  it('todo endpoint de escrita evita persistir dados pessoais no corpo da chave de idempotência', () => {
    const escritas = metodos.filter((metodo) => [RequestMethod.POST, RequestMethod.PUT, RequestMethod.PATCH, RequestMethod.DELETE]
      .includes(Reflect.getMetadata(METHOD_METADATA, metodo) as RequestMethod));
    expect(escritas).toHaveLength(2);
    for (const metodo of escritas) expect(Reflect.getMetadata(CHAVE_DA_RESPOSTA_SEM_CORPO_NO_REPLAY, metodo)).toBe(true);
  });
});
