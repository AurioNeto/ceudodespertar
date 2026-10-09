import { describe, expect, it } from 'vitest';
import type { GrupoId } from '@cdd/contracts';
import { SEM_FILTRO, caminhoDaListagemDeUsuarios, temFiltroAplicado } from './consultasDeAcessos';

describe('caminhoDaListagemDeUsuarios', () => {
  it('sem filtro pede só o limite padrão', () => {
    expect(caminhoDaListagemDeUsuarios(SEM_FILTRO, null)).toBe('/identidade/usuarios?limite=50');
  });

  it('leva situação, grupo, busca e cursor na query string', () => {
    const caminho = caminhoDaListagemDeUsuarios(
      { situacao: 'SUSPENSO', grupoId: 'g-9' as GrupoId, busca: '  ana  ' },
      'cursor-1',
    );
    const [rota, consulta] = caminho.split('?');
    const parametros = new URLSearchParams(consulta);
    expect(rota).toBe('/identidade/usuarios');
    expect(Object.fromEntries(parametros)).toEqual({
      situacao: 'SUSPENSO',
      grupoId: 'g-9',
      busca: 'ana',
      depois: 'cursor-1',
      limite: '50',
    });
  });

  it('busca só com espaços não vai na query string', () => {
    expect(caminhoDaListagemDeUsuarios({ ...SEM_FILTRO, busca: '   ' }, null)).toBe('/identidade/usuarios?limite=50');
  });

  it('escapa caracteres especiais da busca', () => {
    expect(caminhoDaListagemDeUsuarios({ ...SEM_FILTRO, busca: 'a&b=c' }, null)).toContain('busca=a%26b%3Dc');
  });
});

describe('temFiltroAplicado', () => {
  it('é falso sem filtro e com busca em branco', () => {
    expect(temFiltroAplicado(SEM_FILTRO)).toBe(false);
    expect(temFiltroAplicado({ ...SEM_FILTRO, busca: '  ' })).toBe(false);
  });

  it.each([
    { ...SEM_FILTRO, situacao: 'ATIVO' as const },
    { ...SEM_FILTRO, grupoId: 'g-1' as GrupoId },
    { ...SEM_FILTRO, busca: 'x' },
  ])('é verdadeiro com %o', (filtro) => {
    expect(temFiltroAplicado(filtro)).toBe(true);
  });
});
