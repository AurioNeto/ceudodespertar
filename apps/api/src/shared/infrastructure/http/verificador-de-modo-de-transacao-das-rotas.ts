import { Injectable, RequestMethod } from '@nestjs/common';
import type { OnModuleInit, Type } from '@nestjs/common';
import { METHOD_METADATA } from '@nestjs/common/internal';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import type { ModoDeTransacao } from '../banco/unidade-de-trabalho.js';
import { CHAVE_DO_MODO_DE_TRANSACAO } from './modo-de-transacao.decorator.js';
import { CHAVE_DE_SEM_TRANSACAO_NA_BORDA } from './sem-transacao-na-borda.decorator.js';

const METODOS_QUE_MUDAM_ESTADO: ReadonlySet<RequestMethod> = new Set([
  RequestMethod.POST,
  RequestMethod.PUT,
  RequestMethod.PATCH,
  RequestMethod.DELETE,
  RequestMethod.ALL,
]);
const MODOS_GRAVAVEIS: ReadonlySet<ModoDeTransacao | undefined> = new Set(['escrita', 'leitura-que-grava']);

export class ErroDeRotaQueMudaEstadoSemModoGravavel extends Error {
  constructor(rotas: readonly string[]) {
    super(
      `rotas que mudam estado sem @ModoDeTransacao('escrita' | 'leitura-que-grava') no método ou na classe: ${rotas.join(', ')} — ` +
        'sem o modo gravável a borda abre transação somente leitura e a idempotência falha em tempo de requisição',
    );
    this.name = 'ErroDeRotaQueMudaEstadoSemModoGravavel';
  }
}

@Injectable()
export class VerificadorDeModoDeTransacaoDasRotas implements OnModuleInit {
  constructor(
    private readonly descoberta: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly reflector: Reflector,
  ) {}

  onModuleInit(): void {
    const rotasInvalidas = this.descoberta
      .getControllers()
      .flatMap((wrapper) => (typeof wrapper.metatype === 'function' ? this.rotasInvalidasDe(wrapper.metatype as Type) : []));
    if (rotasInvalidas.length > 0) {
      throw new ErroDeRotaQueMudaEstadoSemModoGravavel(rotasInvalidas);
    }
  }

  private rotasInvalidasDe(controlador: Type): string[] {
    const prototipo = controlador.prototype as Record<string, Function>;
    return this.scanner.getAllMethodNames(prototipo).flatMap((nomeDoMetodo) => {
      const handler = prototipo[nomeDoMetodo]!;
      const metodoHttp = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod | undefined;
      if (metodoHttp === undefined || !METODOS_QUE_MUDAM_ESTADO.has(metodoHttp)) return [];
      const semTransacao = this.reflector.getAllAndOverride<boolean | undefined>(CHAVE_DE_SEM_TRANSACAO_NA_BORDA, [
        handler,
        controlador,
      ]);
      if (semTransacao === true) return [];
      const modo = this.reflector.getAllAndOverride<ModoDeTransacao | undefined>(CHAVE_DO_MODO_DE_TRANSACAO, [
        handler,
        controlador,
      ]);
      return MODOS_GRAVAVEIS.has(modo) ? [] : [`${controlador.name}.${nomeDoMetodo} (${RequestMethod[metodoHttp]})`];
    });
  }
}
