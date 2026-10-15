import { describe, expect, it } from 'vitest';
import type { SemeadorDaInstituicao } from './semeador-da-instituicao.js';
import { SemeadoresDaInstituicao } from './semeadores-da-instituicao.js';

function semeadorQueAnota(anotacoes: string[], nome: string): SemeadorDaInstituicao {
  return {
    semear: async (instituicaoId) => {
      anotacoes.push(`${nome}:${instituicaoId}`);
    },
  };
}

describe('SemeadoresDaInstituicao', () => {
  it('sem nenhum registrado, semear não faz nada', async () => {
    await expect(new SemeadoresDaInstituicao().semear('instituicao-1')).resolves.toBeUndefined();
  });

  it('semeia a instituição com cada registrado, na ordem do registro', async () => {
    const anotacoes: string[] = [];
    const semeadores = new SemeadoresDaInstituicao();
    semeadores.registrar(semeadorQueAnota(anotacoes, 'a'));
    semeadores.registrar(semeadorQueAnota(anotacoes, 'b'));

    await semeadores.semear('instituicao-1');

    expect(anotacoes).toEqual(['a:instituicao-1', 'b:instituicao-1']);
  });

  it('registrar o mesmo semeador duas vezes não o executa duas vezes', async () => {
    const anotacoes: string[] = [];
    const semeador = semeadorQueAnota(anotacoes, 'a');
    const semeadores = new SemeadoresDaInstituicao();
    semeadores.registrar(semeador);
    semeadores.registrar(semeador);

    await semeadores.semear('instituicao-1');

    expect(anotacoes).toEqual(['a:instituicao-1']);
  });

  it('a falha de um semeador interrompe os seguintes e chega a quem chamou', async () => {
    const anotacoes: string[] = [];
    const semeadores = new SemeadoresDaInstituicao();
    semeadores.registrar({ semear: () => Promise.reject(new Error('falhou')) });
    semeadores.registrar(semeadorQueAnota(anotacoes, 'b'));

    await expect(semeadores.semear('instituicao-1')).rejects.toThrow('falhou');
    expect(anotacoes).toEqual([]);
  });
});
