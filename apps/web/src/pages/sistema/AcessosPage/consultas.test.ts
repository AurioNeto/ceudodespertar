import { describe, expect, it, vi } from 'vitest';
import type { GrupoId, UsuarioId } from '@cdd/contracts';
import type { ClienteHttp } from '@/dados';
import { SEM_FILTRO, criarConsultasDeAcessos, caminhoDaListagemDeUsuarios } from './consultas';

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

describe('consulta usuario(id)', () => {
  const requisitar = vi.fn(() => Promise.resolve({ id: 'u-7' }));
  const consultas = criarConsultasDeAcessos({ requisitar: requisitar as ClienteHttp['requisitar'] });

  it('lê GET /identidade/usuarios/:id', async () => {
    const sinal = new AbortController().signal;
    await consultas.usuario('u-7' as UsuarioId).queryFn({ signal: sinal });
    expect(requisitar).toHaveBeenCalledWith({ metodo: 'GET', caminho: '/identidade/usuarios/u-7', sinal });
  });

  it('a chave fica sob o prefixo da lista, para a invalidação cobrir os dois', () => {
    const chaveDoUsuario = consultas.usuario('u-7' as UsuarioId).queryKey;
    const chaveDaLista = consultas.usuarios(SEM_FILTRO).queryKey;
    expect(chaveDoUsuario.slice(0, 2)).toEqual(['acessos', 'usuarios']);
    expect(chaveDaLista.slice(0, 2)).toEqual(['acessos', 'usuarios']);
    expect(chaveDoUsuario).toEqual(['acessos', 'usuarios', 'porId', 'u-7']);
  });
});
