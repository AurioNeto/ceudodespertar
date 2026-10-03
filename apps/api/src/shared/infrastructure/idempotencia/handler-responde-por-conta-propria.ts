import { RESPONSE_PASSTHROUGH_METADATA, ROUTE_ARGS_METADATA, RouteParamtypes } from '@nestjs/common/internal';
import type { ExecutionContext } from '@nestjs/common';

const SEPARADOR_DA_CHAVE_DE_PARAMETRO = ':';

function tipoDoParametro(chaveDeParametro: string): number {
  return Number(chaveDeParametro.split(SEPARADOR_DA_CHAVE_DE_PARAMETRO)[0]);
}

export function handlerRespondePorContaPropria(contexto: ExecutionContext): boolean {
  const controlador = contexto.getClass();
  const nomeDoHandler = contexto.getHandler().name;
  const parametros: Record<string, unknown> = Reflect.getMetadata(ROUTE_ARGS_METADATA, controlador, nomeDoHandler) ?? {};
  const injetaRespostaOuProximo = Object.keys(parametros)
    .map(tipoDoParametro)
    .some((tipo) => tipo === RouteParamtypes.RESPONSE || tipo === RouteParamtypes.NEXT);
  const passthroughHabilitado = Reflect.getMetadata(RESPONSE_PASSTHROUGH_METADATA, controlador, nomeDoHandler) === true;
  return injetaRespostaOuProximo && !passthroughHabilitado;
}
