import type { FormaDaOcorrencia } from './detector-de-nome-de-grupo.js';

export interface CasoPlantadoDeNomeDeGrupo {
  readonly arquivo: string;
  readonly linhas: readonly string[];
  readonly ocorrencias: readonly `${number}|${FormaDaOcorrencia}`[];
}

const IMPORTA_O_ESTADO = "import { useReducer, useState } from 'react';";

export const CASOS_PLANTADOS_COM_OCORRENCIA: readonly CasoPlantadoDeNomeDeGrupo[] = [
  {
    arquivo: 'pages/plantadas/comparacoes.ts',
    linhas: [
      "import type { CodigoGrupo } from '@cdd/contracts';",
      "export const ehTesouraria = (codigo: string) => codigo === 'TESOURARIA';",
      "export const naoEhLeitura = (nome: string) => 'Leitura' !== nome;",
      "export const ehGovernanca = (codigo: CodigoGrupo, outro: string) => outro === codigo;",
      'export function rotulo(codigo: string) {',
      '  switch (codigo) {',
      "    case 'ADMINISTRADOR':",
      "      return 'adm';",
      '    default:',
      "      return '';",
      '  }',
      '}',
      "export const podeLancar = (codigo: string) => ['TESOURARIA', 'GOVERNANCA'].includes(codigo);",
    ],
    ocorrencias: ['2|comparacao', '3|comparacao', '4|comparacao', '7|case', '13|colecao'],
  },
  {
    arquivo: 'pages/plantadas/EstadoComGrupo.tsx',
    linhas: [
      IMPORTA_O_ESTADO,
      "const GRUPO_PADRAO = 'ACOLHIMENTO';",
      'const reduzir = (_estado: string, acao: string) => acao;',
      'export function EstadoComGrupo() {',
      "  const [codigo] = useState('TESOURARIA');",
      "  const [nome] = useState<string>('Tesouraria');",
      "  const [preguicoso] = useState(() => 'LEITURA');",
      "  const [reduzido] = useReducer(reduzir, 'GOVERNANCA');",
      '  const [padrao] = useState(GRUPO_PADRAO);',
      "  const [lista] = useState<readonly string[]>(['REGISTRO']);",
      '  return <p>{[codigo, nome, preguicoso, reduzido, padrao, ...lista].join()}</p>;',
      '}',
    ],
    ocorrencias: ['5|estado', '6|estado', '7|estado', '8|estado', '9|estado', '10|estado'],
  },
  {
    arquivo: 'pages/plantadas/EstadoPeloReact.tsx',
    linhas: [
      "import React from 'react';",
      'export function EstadoPeloReact() {',
      "  const [codigo] = React.useState('Administrador');",
      '  return <p>{codigo}</p>;',
      '}',
    ],
    ocorrencias: ['3|estado'],
  },
];

export const CASOS_PLANTADOS_PERMITIDOS: readonly CasoPlantadoDeNomeDeGrupo[] = [
  {
    arquivo: 'pages/plantadas/EstadoSemGrupo.tsx',
    linhas: [
      IMPORTA_O_ESTADO,
      'const reduzir = (_estado: string, acao: string) => acao;',
      "const CHAVE_PADRAO = 'acolhimento';",
      'export function EstadoSemGrupo() {',
      "  const [vazio] = useState('');",
      "  const [minusculo] = useState('tesouraria');",
      '  const [chave] = useState(CHAVE_PADRAO);',
      "  const [reduzido] = useReducer(reduzir, 'leitura');",
      "  const [grupos] = useState([{ codigo: 'TESOURARIA', nome: 'Tesouraria' }]);",
      '  return <p>{[vazio, minusculo, chave, reduzido, grupos.length].join()}</p>;',
      '}',
    ],
    ocorrencias: [],
  },
  {
    arquivo: 'pages/plantadas/semComparacao.ts',
    linhas: [
      "export const grupoDoMock = { id: 'g-1', nome: 'Tesouraria' };",
      "export const rotuloDoFiltro = (chave: string) => chave === 'leitura';",
      "export const comNulo = (codigo: string | null) => codigo === null;",
    ],
    ocorrencias: [],
  },
];
