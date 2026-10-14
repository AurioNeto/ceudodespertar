import { describe, expect, it } from 'vitest';
import type { RascunhoDeMovimento } from '../tipos';
import { MENSAGEM_DE_LITROS_COM_MAIS_DE_DUAS_CASAS } from './litros';
import { erroDoFormulario } from './validarMovimento';

const feitio = (litros: string): RascunhoDeMovimento => ({
  modo: 'feitio',
  codigo: 'Lote 01/2027',
  origem: '',
  forca: 'Força 2',
  loteId: '',
  litros,
  destino: '',
});

describe('erroDoFormulario — litros de feitio', () => {
  it.each(['0,255', '1,2345'])('%s, com três casas ou mais — recusa sem arredondar', (litros) => {
    expect(erroDoFormulario(feitio(litros), [])).toBe(MENSAGEM_DE_LITROS_COM_MAIS_DE_DUAS_CASAS);
  });

  it.each(['12', '12,5', '12,25'])('%s, com até duas casas — aceita', (litros) => {
    expect(erroDoFormulario(feitio(litros), [])).toBeNull();
  });
});
