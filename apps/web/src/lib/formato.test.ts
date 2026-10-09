import { describe, expect, it } from 'vitest';
import {
  competenciaPorExtenso,
  diaDaSemana,
  formatarBRL,
  formatarCompetencia,
  formatarData,
  formatarDataHora,
  formatarDiaMes,
  formatarDinheiro,
  formatarInteiro,
  formatarLitros,
  formatarValor,
  iniciais,
  nomeDoMes,
  paraData,
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

describe('formatarValor', () => {
  it.each([
    [1234.56, '1.234,56'],
    [0, '0,00'],
    [7, '7,00'],
    [1000, '1.000,00'],
    [1234567.891, '1.234.567,89'],
  ])('reais %s viram %s', (reais, esperado) => {
    expect(formatarValor(reais)).toBe(esperado);
  });

  it.each([
    [0.004, '0,00'],
    [0.005, '0,01'],
    [1.005, '1,01'],
    [999.995, '1.000,00'],
  ])('arredonda %s para duas casas, o meio sobe: %s', (reais, esperado) => {
    expect(formatarValor(reais)).toBe(esperado);
  });

  it.each([
    [-5, '-5,00'],
    [-0, '-0,00'],
    [Number.NaN, 'NaN'],
    [Number.POSITIVE_INFINITY, '∞'],
  ])('valor %s sai como %s, sem proteção contra o que não é dinheiro', (reais, esperado) => {
    expect(formatarValor(reais)).toBe(esperado);
  });
});

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

describe('paraData', () => {
  const partesLocais = (d: Date) => [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()];

  it('lê o dia como meia-noite local, mês contado de zero', () => {
    expect(partesLocais(paraData('2026-09-05'))).toEqual([2026, 8, 5, 0, 0]);
  });

  it('dia que o mês não tem transborda para o mês seguinte', () => {
    expect(partesLocais(paraData('2026-02-29'))).toEqual([2026, 2, 1, 0, 0]);
  });

  it('29 de fevereiro de ano bissexto fica em fevereiro', () => {
    expect(partesLocais(paraData('2028-02-29'))).toEqual([2028, 1, 29, 0, 0]);
  });

  it('dia zero volta ao último dia do mês anterior', () => {
    expect(partesLocais(paraData('2026-09-00'))).toEqual([2026, 7, 31, 0, 0]);
  });

  it('mês zero volta a dezembro do ano anterior', () => {
    expect(partesLocais(paraData('2026-00-10'))).toEqual([2025, 11, 10, 0, 0]);
  });

  it('sem o dia assume o dia 1', () => {
    expect(partesLocais(paraData('2026-09'))).toEqual([2026, 8, 1, 0, 0]);
  });

  it('só com o ano assume 1º de janeiro', () => {
    expect(partesLocais(paraData('2026'))).toEqual([2026, 0, 1, 0, 0]);
  });

  it('texto vazio cai em 1º de janeiro de 1900', () => {
    expect(partesLocais(paraData(''))).toEqual([1900, 0, 1, 0, 0]);
  });

  it('ano com quatro dígitos abaixo de 100 cai no século 20', () => {
    expect(paraData('0026-01-01').getFullYear()).toBe(1926);
  });

  it('texto que não é data dá data inválida', () => {
    expect(Number.isNaN(paraData('abc').getTime())).toBe(true);
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

describe('diaDaSemana', () => {
  it.each([
    ['2026-10-05', 'segunda'],
    ['2026-10-06', 'terça'],
    ['2026-10-07', 'quarta'],
    ['2026-10-08', 'quinta'],
    ['2026-10-09', 'sexta'],
    ['2026-10-10', 'sábado'],
    ['2026-10-11', 'domingo'],
  ])('%s cai em %s', (iso, esperado) => {
    expect(diaDaSemana(iso)).toBe(esperado);
  });

  it('data inválida devolve texto vazio', () => {
    expect(diaDaSemana('abc')).toBe('');
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

describe('nomeDoMes', () => {
  it.each(mesesNumerados)('índice %s (de zero) é %s', (indice, nome) => {
    expect(nomeDoMes(indice)).toBe(nome);
  });

  it.each([[12], [-1], [1.5], [Number.NaN]])('índice %s fora de 0 a 11 devolve vazio', (indice) => {
    expect(nomeDoMes(indice)).toBe('');
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

describe('iniciais', () => {
  it('usa a primeira letra do primeiro e do último nome', () => {
    expect(iniciais('Maria das Graças Souza')).toBe('MS');
  });

  it('usa só a primeira letra quando há um nome', () => {
    expect(iniciais('  Joana  ')).toBe('J');
  });

  it('ignora palavras que não começam com letra', () => {
    expect(iniciais('Aurio Neto (demonstração)')).toBe('AN');
    expect(iniciais('Élida - 2')).toBe('É');
  });

  it('devolve vazio para nome sem letras', () => {
    expect(iniciais('   ')).toBe('');
  });

  it('devolve vazio para texto vazio', () => {
    expect(iniciais('')).toBe('');
  });

  it('devolve vazio quando nenhuma palavra começa com letra', () => {
    expect(iniciais('123 456')).toBe('');
  });

  it('passa para caixa alta o que veio em minúsculas', () => {
    expect(iniciais('ana beatriz costa')).toBe('AC');
  });

  it('nome com hífen conta como uma palavra só', () => {
    expect(iniciais('Ana-Maria Souza')).toBe('AS');
  });

  it('mantém o acento da inicial', () => {
    expect(iniciais("ângela d'Ávila")).toBe('ÂD');
  });

  it('palavra que abre com parêntese fica de fora mesmo com letras depois', () => {
    expect(iniciais('(Ana) Souza')).toBe('S');
  });

  it('palavra que começa com número fica de fora no meio do nome', () => {
    expect(iniciais('Ana 2 Souza')).toBe('AS');
  });

  it('palavra que começa com emoji fica de fora', () => {
    expect(iniciais('🙂 Ana')).toBe('A');
  });

  it('separa as palavras por tabulação e quebra de linha', () => {
    expect(iniciais('Ana\tSouza\n')).toBe('AS');
  });

  it('descarta espaço inseparável no começo', () => {
    expect(iniciais(' Ana')).toBe('A');
  });

  it('a caixa alta expande o ß em SS e a inicial ganha duas letras', () => {
    expect(iniciais('ßeta ónix')).toBe('SSÓ');
  });
});

describe('formatarDataHora', () => {
  it('converte o instante para data e hora de São Paulo', () => {
    expect(formatarDataHora('2026-10-09T17:30:00.000Z')).toBe('09/10/2026 14:30');
  });

  it('vira o dia pelo fuso da casa', () => {
    expect(formatarDataHora('2026-10-10T02:05:00.000Z')).toBe('09/10/2026 23:05');
  });

  it('vira o ano pelo fuso da casa', () => {
    expect(formatarDataHora('2027-01-01T01:59:00.000Z')).toBe('31/12/2026 22:59');
  });

  it('meia-noite sai como 00:00, nunca 24:00', () => {
    expect(formatarDataHora('2026-10-09T03:00:00.000Z')).toBe('09/10/2026 00:00');
  });

  it('um minuto depois da meia-noite sai como 00:01', () => {
    expect(formatarDataHora('2026-10-09T03:01:00.000Z')).toBe('09/10/2026 00:01');
  });

  it('hora e minuto de um dígito saem com zero à esquerda', () => {
    expect(formatarDataHora('2026-03-05T11:05:00Z')).toBe('05/03/2026 08:05');
  });

  it('descarta os segundos', () => {
    expect(formatarDataHora('2026-10-09T17:30:59.999Z')).toBe('09/10/2026 14:30');
  });

  it('respeita o deslocamento informado no texto', () => {
    expect(formatarDataHora('2026-10-09T14:30:00-03:00')).toBe('09/10/2026 14:30');
  });

  it('data sem hora é lida como meia-noite UTC e aparece como 21:00 do dia anterior', () => {
    expect(formatarDataHora('2026-10-09')).toBe('08/10/2026 21:00');
  });

  it.each([['abc'], ['']])('texto %j que não é data lança RangeError', (iso) => {
    expect(() => formatarDataHora(iso)).toThrow(RangeError);
  });
});
