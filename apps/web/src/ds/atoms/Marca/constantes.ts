export const FONTE_DAS_LINHAS = {
  pequeno: '700 16px/1.05 var(--font-display)',
  medio: '700 24px/1.02 var(--font-display)',
  grande: '700 36px/1.02 var(--font-display)',
} satisfies Record<string, string>;

export const RESPIRO_DA_LEGENDA = {
  pequeno: 7,
  medio: 9,
  grande: 12,
} satisfies Record<string, number>;

export const CAMINHO_DA_MERKABA = '/marca/merkaba.png';

export const MEDIDA_DA_MERKABA = {
  pequeno: { largura: 30, altura: 35 },
  medio: { largura: 40, altura: 47 },
  grande: { largura: 56, altura: 65 },
} satisfies Record<string, { largura: number; altura: number }>;
