import { describe, expect, it } from 'vitest';
import { RaizDeAgregado } from './raiz-de-agregado.js';
import type { EventoDeDominio } from './evento-de-dominio.js';

class AgregadoDeTeste extends RaizDeAgregado<string> {
  constructor(id: string, versao?: number) {
    super(id, versao);
  }

  emitir(evento: EventoDeDominio): void {
    this.registrarEvento(evento);
  }
}

function criarEvento(tipo: string): EventoDeDominio {
  return {
    eventoId: 'evento-1',
    tipo,
    ocorridoEm: new Date('2026-01-01T00:00:00Z'),
    agregadoTipo: 'AgregadoDeTeste',
    agregadoId: 'id-1',
    dados: {},
  };
}

describe('RaizDeAgregado', () => {
  it('nasce na versão 1 quando nenhuma versão é informada', () => {
    expect(new AgregadoDeTeste('id-1').versao).toBe(1);
  });

  it('assume a versão vinda da persistência quando informada', () => {
    expect(new AgregadoDeTeste('id-1', 5).versao).toBe(5);
  });

  it.each([0, -3, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('recusa a versão %s vinda da persistência', (versao) => {
    expect(() => new AgregadoDeTeste('id-1', versao)).toThrow(RangeError);
  });

  it('informa se há eventos pendentes, e deixa de haver depois de retirá-los', () => {
    const agregado = new AgregadoDeTeste('id-1');
    expect(agregado.possuiEventosPendentes).toBe(false);

    agregado.emitir(criarEvento('X'));
    expect(agregado.possuiEventosPendentes).toBe(true);

    agregado.retirarEventos();
    expect(agregado.possuiEventosPendentes).toBe(false);
  });

  it('acumula eventos registrados', () => {
    const agregado = new AgregadoDeTeste('id-1');

    agregado.emitir(criarEvento('EventoA'));
    agregado.emitir(criarEvento('EventoB'));

    expect(agregado.retirarEventos().map((evento) => evento.tipo)).toEqual(['EventoA', 'EventoB']);
  });

  it('retirarEventos esvazia a lista', () => {
    const agregado = new AgregadoDeTeste('id-1');
    agregado.emitir(criarEvento('EventoA'));

    agregado.retirarEventos();

    expect(agregado.retirarEventos()).toEqual([]);
  });
});
