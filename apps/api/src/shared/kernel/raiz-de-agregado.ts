import { Entidade } from './entidade.js';
import type { EventoDeDominio } from './evento-de-dominio.js';

const VERSAO_INICIAL = 1;

function ehVersaoValida(versao: number): boolean {
  return Number.isInteger(versao) && versao >= VERSAO_INICIAL;
}

export abstract class RaizDeAgregado<Id> extends Entidade<Id> {
  private readonly eventosPendentes: EventoDeDominio[] = [];
  readonly versao: number;

  protected constructor(id: Id, versao: number = VERSAO_INICIAL) {
    super(id);
    if (!ehVersaoValida(versao)) {
      throw new RangeError(`versão de agregado inválida: ${versao}`);
    }
    this.versao = versao;
  }

  protected registrarEvento(evento: EventoDeDominio): void {
    this.eventosPendentes.push(evento);
  }

  retirarEventos(): EventoDeDominio[] {
    return this.eventosPendentes.splice(0, this.eventosPendentes.length);
  }
}
