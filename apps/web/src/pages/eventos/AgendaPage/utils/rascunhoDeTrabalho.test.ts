import { describe, expect, it } from 'vitest';
import type { Trabalho } from '../tipos';
import { rascunhoDe, rascunhoVazio } from './rascunhoDeTrabalho';

const umTrabalho = (sobrescritas: Partial<Trabalho> = {}): Trabalho => ({
  id: 7,
  nome: 'Trabalho de teste',
  tipo: 'Concentração',
  ano: 2026,
  mes: 9,
  dia: 5,
  horario: '20:00 às 04:00',
  local: 'Salão principal',
  dirigente: 'Aurio Neto',
  previstos: 40,
  confirmados: 0,
  visitantes: 0,
  litros: 0,
  contribuicoes: [],
  situacao: 'planejada',
  equipe: [],
  preparo: [],
  previstoGasto: 0,
  realizadoGasto: 0,
  arrecadado: 0,
  observacoes: '',
  ...sobrescritas,
});

const TRABALHO_EXISTENTE = umTrabalho({
  id: 42,
  nome: 'Mãe Divina',
  tipo: 'Trabalho de cura',
  dia: 5,
  mes: 9,
  ano: 2026,
  horario: '20:00 às 04:00',
  local: 'Salão principal',
  dirigente: 'Aurio Neto',
  previstos: 84,
  litros: 9.5,
  contribuicoes: [40, 60, 90],
  observacoes: 'Chegada até 19h30.',
  preparo: [
    { titulo: 'Limpeza do salão', responsavel: 'Chico Aguiar' },
    { titulo: 'Compra de mantimentos', responsavel: 'Dona Rosa' },
  ],
});

describe('rascunhoVazio', () => {
  it('rascunho novo — sem id, tipo Concentração, horário e local padrão e duas tarefas sem responsável', () => {
    expect(rascunhoVazio()).toEqual({
      editId: null,
      nome: '',
      tipo: 'Concentração',
      data: '',
      horario: '20:00 às 04:00',
      local: 'Salão principal',
      dirigente: '',
      previstos: '',
      litros: '',
      contribuicoes: '',
      observacoes: '',
      preparo: [
        { titulo: 'Limpeza do salão', responsavel: '' },
        { titulo: 'Compra de mantimentos', responsavel: '' },
      ],
    });
  });

  it('duas chamadas — devolvem listas de preparo independentes', () => {
    const primeiro = rascunhoVazio();
    const segundo = rascunhoVazio();

    expect(primeiro.preparo).not.toBe(segundo.preparo);
    expect(primeiro.preparo[0]).not.toBe(segundo.preparo[0]);
  });
});

describe('rascunhoDe', () => {
  it('trabalho existente — vira texto de formulário: data dd/mm/aaaa, números como texto, contribuições em lista', () => {
    expect(rascunhoDe(TRABALHO_EXISTENTE)).toEqual({
      editId: 42,
      nome: 'Mãe Divina',
      tipo: 'Trabalho de cura',
      data: '05/09/2026',
      horario: '20:00 às 04:00',
      local: 'Salão principal',
      dirigente: 'Aurio Neto',
      previstos: '84',
      litros: '9.5',
      contribuicoes: '40, 60, 90',
      observacoes: 'Chegada até 19h30.',
      preparo: [
        { titulo: 'Limpeza do salão', responsavel: 'Chico Aguiar' },
        { titulo: 'Compra de mantimentos', responsavel: 'Dona Rosa' },
      ],
    });
  });

  it.each([
    { dia: 1, mes: 1, ano: 2027, data: '01/01/2027' },
    { dia: 31, mes: 12, ano: 2026, data: '31/12/2026' },
  ])('data $dia/$mes/$ano — o rascunho leva $data com dois dígitos', ({ dia, mes, ano, data }) => {
    expect(rascunhoDe(umTrabalho({ dia, mes, ano })).data).toBe(data);
  });

  it('sem contribuições e sem litros — a lista vira texto vazio e os litros viram "0"', () => {
    const rascunho = rascunhoDe(umTrabalho({ contribuicoes: [], litros: 0 }));

    expect([rascunho.contribuicoes, rascunho.litros]).toEqual(['', '0']);
  });

  it('tarefas — o rascunho leva cópias, não as mesmas referências do trabalho', () => {
    const rascunho = rascunhoDe(TRABALHO_EXISTENTE);

    expect(rascunho.preparo).not.toBe(TRABALHO_EXISTENTE.preparo);
    expect(rascunho.preparo[0]).not.toBe(TRABALHO_EXISTENTE.preparo[0]);
  });
});
