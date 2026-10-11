import { describe, expect, it } from 'vitest';
import { corDoDelta, textoDoDelta } from './delta';

type Comparacao = Parameters<typeof textoDoDelta>[2];

const COR_NEUTRA = 'var(--text-meta)';
const COR_BOA = 'var(--color-confirmed)';
const COR_DE_ATENCAO = 'var(--color-attention)';

describe('textoDoDelta: texto da variação contra a base de comparação', () => {
  it.each<{ nome: string; atual: number; base: number | null; comparar: Comparacao; texto: string }>([
    { nome: 'sem comparação, mesmo com base válida', atual: 150, base: 100, comparar: 'nenhum', texto: '' },
    { nome: 'sem comparação e sem base', atual: 150, base: null, comparar: 'nenhum', texto: '' },
    { nome: 'base ausente', atual: 150, base: null, comparar: 'anterior', texto: 'sem base de comparação' },
    { nome: 'base zero, mesmo com valor atual', atual: 150, base: 0, comparar: 'ano_passado', texto: 'sem base de comparação' },
    { nome: 'alta contra o período anterior', atual: 150, base: 100, comparar: 'anterior', texto: '+50% vs período anterior' },
    { nome: 'queda contra o ano passado', atual: 50, base: 100, comparar: 'ano_passado', texto: '-50% vs ano passado' },
    { nome: 'valor igual à base', atual: 100, base: 100, comparar: 'anterior', texto: '+0% vs período anterior' },
    { nome: 'base negativa: a variação usa o módulo da base', atual: 50, base: -100, comparar: 'anterior', texto: '+150% vs período anterior' },
    { nome: 'valor atual negativo contra base positiva', atual: -50, base: 100, comparar: 'anterior', texto: '-150% vs período anterior' },
    { nome: 'alta menor que meio por cento arredonda para zero', atual: 100.4, base: 100, comparar: 'anterior', texto: '+0% vs período anterior' },
    { nome: 'queda menor que meio por cento arredonda para zero negativo', atual: 99.6, base: 100, comparar: 'anterior', texto: '-0% vs período anterior' },
  ])('textoDoDelta com $nome — devolve "$texto"', ({ atual, base, comparar, texto }) => {
    expect(textoDoDelta(atual, base, comparar)).toBe(texto);
  });
});

describe('corDoDelta: cor da variação segundo o que é bom subir', () => {
  it.each<{ nome: string; atual: number; base: number | null; bomSeSobe: boolean; comparar: Comparacao; cor: string }>([
    { nome: 'sem comparação', atual: 150, base: 100, bomSeSobe: true, comparar: 'nenhum', cor: COR_NEUTRA },
    { nome: 'base ausente', atual: 150, base: null, bomSeSobe: true, comparar: 'anterior', cor: COR_NEUTRA },
    { nome: 'base zero', atual: 150, base: 0, bomSeSobe: false, comparar: 'anterior', cor: COR_NEUTRA },
    { nome: 'alta de algo que é bom subir', atual: 150, base: 100, bomSeSobe: true, comparar: 'anterior', cor: COR_BOA },
    { nome: 'alta de algo que é ruim subir', atual: 150, base: 100, bomSeSobe: false, comparar: 'anterior', cor: COR_DE_ATENCAO },
    { nome: 'queda de algo que é bom subir', atual: 50, base: 100, bomSeSobe: true, comparar: 'ano_passado', cor: COR_DE_ATENCAO },
    { nome: 'queda de algo que é ruim subir', atual: 50, base: 100, bomSeSobe: false, comparar: 'ano_passado', cor: COR_BOA },
    { nome: 'valor igual à base, bom subir', atual: 100, base: 100, bomSeSobe: true, comparar: 'anterior', cor: COR_BOA },
    { nome: 'valor igual à base, ruim subir', atual: 100, base: 100, bomSeSobe: false, comparar: 'anterior', cor: COR_DE_ATENCAO },
  ])('corDoDelta com $nome — devolve a cor esperada', ({ atual, base, bomSeSobe, comparar, cor }) => {
    expect(corDoDelta(atual, base, bomSeSobe, comparar)).toBe(cor);
  });
});
