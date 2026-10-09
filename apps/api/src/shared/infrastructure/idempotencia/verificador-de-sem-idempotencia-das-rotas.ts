import { Injectable } from '@nestjs/common';
import type { OnModuleInit, Type } from '@nestjs/common';
import { METHOD_METADATA } from '@nestjs/common/internal';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { lerMarcasProprias } from '../autenticacao/marcas-de-acesso.js';
import type { MarcaDeAcesso } from '../autenticacao/marcas-de-acesso.js';
import { CHAVE_DE_SEM_IDEMPOTENCIA } from './sem-idempotencia.decorator.js';

const MARCAS_SEM_INSTITUICAO: ReadonlySet<MarcaDeAcesso['tipo']> = new Set(['publico', 'apenas-identificado']);

export class ErroDeSemIdempotenciaEmRotaComInstituicao extends Error {
  constructor(rotas: readonly string[]) {
    super(
      `rotas marcadas com @SemIdempotencia fora de @Publico ou @ApenasIdentificado: ${rotas.join(', ')} — ` +
        'a marca só vale em rota sem instituição no contexto; rota com instituição precisa da idempotência da borda',
    );
    this.name = 'ErroDeSemIdempotenciaEmRotaComInstituicao';
  }
}

@Injectable()
export class VerificadorDeSemIdempotenciaDasRotas implements OnModuleInit {
  constructor(
    private readonly descoberta: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly reflector: Reflector,
  ) {}

  onModuleInit(): void {
    const invalidas = this.descoberta
      .getControllers()
      .flatMap((wrapper) => (typeof wrapper.metatype === 'function' ? this.rotasInvalidasDe(wrapper.metatype as Type) : []));
    if (invalidas.length > 0) {
      throw new ErroDeSemIdempotenciaEmRotaComInstituicao(invalidas);
    }
  }

  private rotasInvalidasDe(controlador: Type): string[] {
    const prototipo = controlador.prototype as Record<string, Function>;
    return this.scanner.getAllMethodNames(prototipo).flatMap((nomeDoMetodo) => {
      const handler = prototipo[nomeDoMetodo]!;
      if (Reflect.getMetadata(METHOD_METADATA, handler) === undefined) return [];
      const semIdempotencia = this.reflector.getAllAndOverride<boolean | undefined>(CHAVE_DE_SEM_IDEMPOTENCIA, [
        handler,
        controlador,
      ]);
      if (semIdempotencia !== true) return [];
      return this.semInstituicao(handler, controlador) ? [] : [`${controlador.name}.${nomeDoMetodo}`];
    });
  }

  private semInstituicao(handler: Function, controlador: Type): boolean {
    const doMetodo = lerMarcasProprias(handler);
    const marcas = doMetodo.length > 0 ? doMetodo : lerMarcasProprias(controlador);
    return marcas.length === 1 && MARCAS_SEM_INSTITUICAO.has(marcas[0]!.tipo);
  }
}
