import { Entidade } from './entidade.js';
import type { EventoDeDominio } from './evento-de-dominio.js';

const VERSAO_INICIAL = 1;

export abstract class RaizDeAgregado<Id> extends Entidade<Id> {
  private readonly eventosPendentes: EventoDeDominio[] = [];
  private versaoAtual: number;

  protected constructor(id: Id, versao: number = VERSAO_INICIAL) {
    super(id);
    this.versaoAtual = versao;
  }

  get versao(): number {
    return this.versaoAtual;
  }

  protected registrarEvento(evento: EventoDeDominio): void {
    this.eventosPendentes.push(evento);
  }

  retirarEventos(): EventoDeDominio[] {
    return this.eventosPendentes.splice(0, this.eventosPendentes.length);
  }
}
