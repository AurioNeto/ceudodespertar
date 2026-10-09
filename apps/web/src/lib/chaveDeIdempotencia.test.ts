import { describe, expect, it } from 'vitest';
import { criarGuardiaoDeChave } from './chaveDeIdempotencia';

function geradorSequencial() {
  let contador = 0;
  return () => `chave-${++contador}`;
}

describe('criarGuardiaoDeChave', () => {
  it('reaproveita a chave quando o conteúdo é o mesmo', () => {
    const { chavePara } = criarGuardiaoDeChave(geradorSequencial());
    const primeira = chavePara({ motivo: 'saiu', versao: 3 });
    expect(chavePara({ motivo: 'saiu', versao: 3 })).toBe(primeira);
    expect(chavePara({ motivo: 'saiu', versao: 3 })).toBe(primeira);
  });

  it('gera chave nova quando o conteúdo muda', () => {
    const { chavePara } = criarGuardiaoDeChave(geradorSequencial());
    const primeira = chavePara({ motivo: 'saiu', versao: 3 });
    const segunda = chavePara({ motivo: 'saiu da tesouraria', versao: 3 });
    expect(segunda).not.toBe(primeira);
    expect(chavePara({ motivo: 'saiu da tesouraria', versao: 3 })).toBe(segunda);
  });

  it('versão nova com o mesmo texto também gera chave nova', () => {
    const { chavePara } = criarGuardiaoDeChave(geradorSequencial());
    expect(chavePara({ motivo: 'x', versao: 1 })).not.toBe(chavePara({ motivo: 'x', versao: 2 }));
  });

  it('voltar ao conteúdo anterior depois de mudar não recupera a chave antiga', () => {
    const { chavePara } = criarGuardiaoDeChave(geradorSequencial());
    const inicial = chavePara({ motivo: 'a' });
    chavePara({ motivo: 'b' });
    expect(chavePara({ motivo: 'a' })).not.toBe(inicial);
  });

  it('guardiões diferentes não compartilham chave', () => {
    const gerar = geradorSequencial();
    const um = criarGuardiaoDeChave(gerar);
    const outro = criarGuardiaoDeChave(gerar);
    expect(um.chavePara({ a: 1 })).not.toBe(outro.chavePara({ a: 1 }));
  });
});
