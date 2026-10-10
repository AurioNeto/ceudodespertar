import { describe, expect, it } from 'vitest';
import { diaDaSemana, formatarDataHora, formatarValor, iniciais, paraData } from './formato';

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

  it('usa o fuso nomeado da casa, com o horário de verão de antes de 2019', () => {
    expect(formatarDataHora('2018-12-01T12:00:00Z')).toBe('01/12/2018 10:00');
  });

  it('data sem hora é lida como meia-noite UTC e aparece como 21:00 do dia anterior', () => {
    expect(formatarDataHora('2026-10-09')).toBe('08/10/2026 21:00');
  });

  it.each([['abc'], ['']])('texto %j que não é data lança RangeError', (iso) => {
    expect(() => formatarDataHora(iso)).toThrow(RangeError);
  });
});
