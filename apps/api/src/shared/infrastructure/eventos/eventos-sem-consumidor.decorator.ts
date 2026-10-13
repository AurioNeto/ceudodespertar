import 'reflect-metadata';

export const METADADOS_EVENTOS_SEM_CONSUMIDOR = Symbol('EventosSemConsumidor');

export function EventosSemConsumidor(...tipos: readonly string[]): ClassDecorator {
  return (alvo) => {
    Reflect.defineMetadata(METADADOS_EVENTOS_SEM_CONSUMIDOR, tipos, alvo);
  };
}

export function lerEventosSemConsumidor(classe: object): readonly string[] {
  return (Reflect.getMetadata(METADADOS_EVENTOS_SEM_CONSUMIDOR, classe) as readonly string[] | undefined) ?? [];
}
