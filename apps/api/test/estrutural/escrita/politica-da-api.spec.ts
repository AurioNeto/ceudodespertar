import { describe, expect, it } from 'vitest';
import {
  ARQUIVOS_QUE_ENCERRAM_TRANSACAO_EM_SQL_CRU,
  ARQUIVOS_QUE_PODEM_AJUSTAR_A_SESSAO,
  EXCECOES_DE_ROTA_FORA_DO_NEST,
  EXCECOES_DE_SQL_INDETERMINADO,
  exigirMotivos,
  exigirMotivosPorMembro,
} from './politica-da-api.js';
import type { MotivoNomeado } from './politica-da-api.js';

const MOTIVOS_INVALIDOS = [
  { descricao: 'vazio', motivo: '' },
  { descricao: 'palavra solta', motivo: 'motivo' },
  { descricao: 'prosa com espaços', motivo: 'porque sim' },
  { descricao: 'maiúsculas', motivo: 'Encerra-Transacao' },
];

describe('T28a · api · política · exceções com motivo nomeado', () => {
  it.each(MOTIVOS_INVALIDOS)('exigirMotivos — entrada com motivo $descricao — falha apontando o caminho', ({ motivo }) => {
    const tabela = { 'a/b.ts': motivo as MotivoNomeado };

    expect(() => exigirMotivos(tabela)).toThrow('a/b.ts');
  });

  it.each(MOTIVOS_INVALIDOS)(
    'exigirMotivosPorMembro — membro com motivo $descricao — falha',
    ({ motivo }) => {
      const tabela = { 'a/b.ts': { use: motivo as MotivoNomeado } };

      expect(() => exigirMotivosPorMembro(tabela)).toThrow('entradas sem motivo nomeado');
    },
  );

  it('exigirMotivos — motivo nomeado em kebab-case — devolve a própria tabela', () => {
    const tabela = { 'a/b.ts': 'encerra-a-transacao' } as const;

    expect(exigirMotivos(tabela)).toBe(tabela);
  });

  it('tipo da tabela — entrada sem motivo — não compila', () => {
    // @ts-expect-error motivo vazio não é MotivoNomeado
    const semMotivo: Record<string, MotivoNomeado> = { 'a/b.ts': '' };

    expect(Object.keys(semMotivo)).toEqual(['a/b.ts']);
  });

  it('tabelas reais — todas as entradas — carregam motivo nomeado', () => {
    const entradas = [
      ...Object.values(ARQUIVOS_QUE_PODEM_AJUSTAR_A_SESSAO),
      ...Object.values(ARQUIVOS_QUE_ENCERRAM_TRANSACAO_EM_SQL_CRU),
      ...Object.values(EXCECOES_DE_SQL_INDETERMINADO),
      ...Object.values(EXCECOES_DE_ROTA_FORA_DO_NEST).flatMap((membros) => Object.values(membros)),
    ];

    expect(entradas.length).toBeGreaterThan(0);
    expect(entradas).toEqual(entradas.filter((motivo) => /^[a-z0-9]+(-[a-z0-9]+)+$/.test(motivo)));
  });
});
