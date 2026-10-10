import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { diaDaSemana, formatarDataHora, paraData } from '@/lib/formato';
import {
  competenciaPorExtenso,
  formatarBRL,
  formatarCompetencia,
  formatarData,
  formatarDiaMes,
  formatarDinheiro,
  formatarInteiro,
  formatarLitros,
  pluralizar,
} from './formato';

const MESES_POR_EXTENSO = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

const mesesNumerados = MESES_POR_EXTENSO.map((nome, indice) => [indice, nome] as const);

const FUSO_PADRAO_DOS_TESTES = 'UTC';
const FUSO_DE_SAO_PAULO = 'America/Sao_Paulo';
const MINUTOS_DE_SAO_PAULO_ATRAS_DE_UTC = 180;

describe('formatarDinheiro', () => {
  it.each([
    [123456, '1.234,56'],
    [5, '0,05'],
    [0, '0,00'],
    [100, '1,00'],
    [-250, '-2,50'],
  ])('%s centavos viram %s', (centavos, esperado) => {
    expect(formatarDinheiro(centavos)).toBe(esperado);
  });

  it('centavo fracionário (150,5) arredonda para cima no formato', () => {
    expect(formatarDinheiro(150.5)).toBe('1,51');
  });
});

describe('formatarBRL', () => {
  it.each([
    [123456, 'R$ 1.234,56'],
    [0, 'R$ 0,00'],
    [5, 'R$ 0,05'],
  ])('%s centavos viram %s', (centavos, esperado) => {
    expect(formatarBRL(centavos)).toBe(esperado);
  });

  it('valor negativo põe o sinal depois do símbolo da moeda', () => {
    expect(formatarBRL(-250)).toBe('R$ -2,50');
  });
});

describe('formatarInteiro', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1000, '1.000'],
    [1234567, '1.234.567'],
    [-1234, '-1.234'],
  ])('%s vira %s', (n, esperado) => {
    expect(formatarInteiro(n)).toBe(esperado);
  });

  it.each([
    [0.4, '0'],
    [2.5, '3'],
    [3.5, '4'],
    [-0.4, '-0'],
  ])('arredonda %s para o inteiro, o meio sobe: %s', (n, esperado) => {
    expect(formatarInteiro(n)).toBe(esperado);
  });
});

describe('formatarLitros', () => {
  it.each([
    [12, '12,0'],
    [0, '0,0'],
    [12.34, '12,3'],
    [1234.5, '1.234,5'],
  ])('%s litros viram %s', (litros, esperado) => {
    expect(formatarLitros(litros)).toBe(esperado);
  });

  it.each([
    [12.35, '12,4'],
    [0.05, '0,1'],
    [0.04, '0,0'],
  ])('arredonda %s para uma casa, o meio sobe: %s', (litros, esperado) => {
    expect(formatarLitros(litros)).toBe(esperado);
  });

  it('valor que não é número sai como NaN', () => {
    expect(formatarLitros(Number.NaN)).toBe('NaN');
  });
});

describe('formatarDiaMes', () => {
  it.each([
    ['2026-09-05', '05/09'],
    ['2026-12-31', '31/12'],
    ['2026-01-01', '01/01'],
  ])('%s vira %s', (iso, esperado) => {
    expect(formatarDiaMes(iso)).toBe(esperado);
  });

  it.each([
    ['2026-02-30', '02/03'],
    ['2026-13-01', '01/01'],
    ['', '01/01'],
    ['abc', 'NaN/NaN'],
  ])('entrada fora do formato %j sai como %s', (iso, esperado) => {
    expect(formatarDiaMes(iso)).toBe(esperado);
  });
});

describe('formatarData', () => {
  it.each([
    ['2026-09-05', '05/09/2026'],
    ['1999-12-31', '31/12/1999'],
    ['2026-1-5', '05/01/2026'],
  ])('%s vira %s', (iso, esperado) => {
    expect(formatarData(iso)).toBe(esperado);
  });

  it.each([
    ['', '01/01/1900'],
    ['abc', 'NaN/NaN/NaN'],
    ['2026-09-05T10:00:00', 'NaN/NaN/NaN'],
  ])('entrada fora do formato %j sai como %s', (iso, esperado) => {
    expect(formatarData(iso)).toBe(esperado);
  });
});

describe('formatarCompetencia', () => {
  it.each([
    ['2026-08', '08/2026'],
    ['2026-12', '12/2026'],
    ['2026-08-15', '08/2026'],
  ])('%s vira %s', (comp, esperado) => {
    expect(formatarCompetencia(comp)).toBe(esperado);
  });

  it('mês sem zero à esquerda continua sem zero', () => {
    expect(formatarCompetencia('2026-8')).toBe('8/2026');
  });

  it.each([
    ['', 'undefined/'],
    ['2026', 'undefined/2026'],
  ])('entrada incompleta %j sai como %s', (comp, esperado) => {
    expect(formatarCompetencia(comp)).toBe(esperado);
  });
});

describe('competenciaPorExtenso', () => {
  it.each(mesesNumerados)('mês de índice %s é %s', (indice, nome) => {
    const mes = String(indice + 1).padStart(2, '0');
    expect(competenciaPorExtenso(`2026-${mes}`)).toBe(`${nome} de 2026`);
  });

  it('ignora o dia quando a competência vem com ele', () => {
    expect(competenciaPorExtenso('2026-08-15')).toBe('agosto de 2026');
  });

  it('aceita o mês sem zero à esquerda', () => {
    expect(competenciaPorExtenso('2026-8')).toBe('agosto de 2026');
  });

  it.each([
    ['2026-13', ' de 2026'],
    ['2026-00', ' de 2026'],
    ['2026', ' de 2026'],
    ['', ' de '],
  ])('mês ausente ou fora de 1 a 12 em %j deixa o nome em branco: %j', (comp, esperado) => {
    expect(competenciaPorExtenso(comp)).toBe(esperado);
  });
});

describe('pluralizar', () => {
  it('um usa o singular', () => {
    expect(pluralizar(1, 'lançamento')).toBe('1 lançamento');
  });

  it('zero usa o plural', () => {
    expect(pluralizar(0, 'lançamento')).toBe('0 lançamentos');
  });

  it('dois usa o plural', () => {
    expect(pluralizar(2, 'lançamento')).toBe('2 lançamentos');
  });

  it('o número leva separador de milhar', () => {
    expect(pluralizar(1234, 'lançamento')).toBe('1.234 lançamentos');
  });

  it('plural informado substitui o "s" no fim', () => {
    expect(pluralizar(2, 'mês', 'meses')).toBe('2 meses');
  });

  it('plural informado não interfere no singular', () => {
    expect(pluralizar(1, 'mês', 'meses')).toBe('1 mês');
  });

  it('negativo usa o plural', () => {
    expect(pluralizar(-1, 'dia')).toBe('-1 dias');
  });

  it.each([
    [0.5, '1 dias'],
    [1.5, '2 dias'],
  ])('fração %s usa o plural com o número arredondado: %s', (n, esperado) => {
    expect(pluralizar(n, 'dia')).toBe(esperado);
  });
});

describe('datas lidas com o fuso local atrás de UTC', () => {
  beforeAll(() => {
    process.env['TZ'] = FUSO_DE_SAO_PAULO;
  });

  afterAll(() => {
    process.env['TZ'] = FUSO_PADRAO_DOS_TESTES;
  });

  it('o fuso local do teste está três horas atrás de UTC', () => {
    expect(new Date(2026, 8, 5).getTimezoneOffset()).toBe(MINUTOS_DE_SAO_PAULO_ATRAS_DE_UTC);
  });

  it('paraData lê o dia como meia-noite local, sem escorregar para o dia anterior', () => {
    expect(paraData('2026-09-05').getHours()).toBe(0);
  });

  it('formatarData mostra o mesmo dia que veio no texto', () => {
    expect(formatarData('2026-09-05')).toBe('05/09/2026');
  });

  it('diaDaSemana mostra o dia da semana da data que veio no texto', () => {
    expect(diaDaSemana('2026-10-09')).toBe('sexta');
  });

  it('formatarDataHora continua lendo a data sem hora como meia-noite UTC', () => {
    expect(formatarDataHora('2026-10-09')).toBe('08/10/2026 21:00');
  });
});
