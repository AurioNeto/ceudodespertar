import type { FormaDaOcorrencia } from './detector-de-nome-de-grupo.js';

export interface CasoDeNomeDeGrupo {
  readonly caso: string;
  readonly ocorrencias: readonly string[];
}

export function ocorrencia(arquivo: string, linha: number, forma: FormaDaOcorrencia): string {
  return `${arquivo}:${linha}|${forma}`;
}

export const CASOS_POSITIVOS: readonly CasoDeNomeDeGrupo[] = [
  {
    caso: 'comparacao-com-codigo',
    ocorrencias: [3, 4, 5, 6].map((linha) => ocorrencia('comparar.ts', linha, 'comparacao')),
  },
  { caso: 'case-com-codigo', ocorrencias: [ocorrencia('escolher.ts', 3, 'case')] },
  {
    caso: 'colecao-com-codigo',
    ocorrencias: [3, 4, 5].map((linha) => ocorrencia('pertence.ts', linha, 'colecao')),
  },
  { caso: 'comparacao-com-nome-de-exibicao', ocorrencias: [ocorrencia('nome.ts', 2, 'comparacao')] },
  {
    caso: 'comparacao-tipada',
    ocorrencias: [
      ocorrencia('tipada.ts', 4, 'comparacao'),
      ocorrencia('tipada.ts', 8, 'colecao'),
    ],
  },
];

export const CASOS_NEGATIVOS: readonly CasoDeNomeDeGrupo[] = [
  { caso: 'busca-por-codigo', ocorrencias: [] },
  { caso: 'comentario', ocorrencias: [] },
  { caso: 'propriedade-de-objeto', ocorrencias: [] },
  { caso: 'caixa-diferente', ocorrencias: [] },
  { caso: 'consulta-por-chave-tipada', ocorrencias: [] },
];
