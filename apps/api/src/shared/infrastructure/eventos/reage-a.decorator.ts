import 'reflect-metadata';

export const METADADOS_REAGE_A = Symbol('ReageA');

export interface MetadadosReageA {
  readonly tipo: string;
  readonly consumidor: string;
}

export function ReageA(tipo: string, consumidor: string): MethodDecorator {
  return (alvo, chave) => {
    const metadados: MetadadosReageA = { tipo, consumidor };
    Reflect.defineMetadata(METADADOS_REAGE_A, metadados, alvo, chave);
  };
}

export function lerMetadadosReageA(prototipo: object, nomeDoMetodo: string): MetadadosReageA | undefined {
  return Reflect.getMetadata(METADADOS_REAGE_A, prototipo, nomeDoMetodo) as MetadadosReageA | undefined;
}
