export interface CasoPlantado {
  readonly arquivo: string;
  readonly conteudo: string;
  readonly violacoes: readonly string[];
  readonly achados?: readonly string[];
}

const IMPORTA_O_CLIENTE = "import type { ClienteHttp } from '@/dados';";
const IMPORTA_OS_TIPOS_DA_REQUISICAO = "import type { MetodoHttp, OpcoesDeRequisicao } from '@/dados/clienteHttp';";

export const CASOS_PLANTADOS_COM_VIOLACAO: readonly CasoPlantado[] = [
  {
    arquivo: 'pages/plantadas/fetchDireto.ts',
    conteudo: "export const enviar = () => fetch('/api/v1/x', { method: 'POST' });",
    violacoes: ['rede-fora-da-camada-de-dados|fetch'],
  },
  {
    arquivo: 'pages/plantadas/fetchPelosGlobais.ts',
    conteudo: [
      "export const pelaJanela = () => window.fetch('/api/v1/x', { method: 'DELETE' });",
      "export const porIndice = () => globalThis['fetch']('/api/v1/x');",
      'export const comoReferencia = [fetch];',
    ].join('\n'),
    violacoes: [
      'rede-fora-da-camada-de-dados|fetch',
      'rede-fora-da-camada-de-dados|fetch',
      'rede-fora-da-camada-de-dados|fetch',
    ],
  },
  {
    arquivo: 'pages/plantadas/fetchDesestruturado.ts',
    conteudo: [
      'const { fetch: buscar } = window;',
      "export const enviar = () => buscar('/api/v1/x', { method: 'PUT' });",
    ].join('\n'),
    violacoes: ['rede-fora-da-camada-de-dados|fetch'],
  },
  {
    arquivo: 'pages/plantadas/xhr.ts',
    conteudo: "export const abrir = () => { const xhr = new XMLHttpRequest(); xhr.open('POST', '/api/v1/x'); return xhr; };",
    violacoes: ['rede-fora-da-camada-de-dados|XMLHttpRequest'],
  },
  {
    arquivo: 'components/plantadas/Sinalizador.tsx',
    conteudo: [
      'export function Sinalizador() {',
      "  return <button onClick={() => navigator.sendBeacon('/api/v1/x', 'corpo')}>enviar</button>;",
      '}',
    ].join('\n'),
    violacoes: ['rede-fora-da-camada-de-dados|sendBeacon'],
  },
  {
    arquivo: 'pages/plantadas/requisitarComPost.ts',
    conteudo: [
      IMPORTA_O_CLIENTE,
      "export const criar = (cliente: ClienteHttp) => cliente.requisitar({ metodo: 'POST', caminho: '/x', corpo: {} });",
    ].join('\n'),
    violacoes: ['requisitar-com-escrita|POST'],
  },
  {
    arquivo: 'pages/plantadas/requisitarComMetodoVariavel.ts',
    conteudo: [
      IMPORTA_O_CLIENTE,
      IMPORTA_OS_TIPOS_DA_REQUISICAO,
      'export const qualquer = (cliente: ClienteHttp, metodo: MetodoHttp) => cliente.requisitar({ metodo, caminho: "/x" });',
      'export const repassado = (cliente: ClienteHttp, opcoes: OpcoesDeRequisicao) => cliente.requisitar({ ...opcoes });',
      'export const semOpcoes = (cliente: ClienteHttp, opcoes: OpcoesDeRequisicao) => cliente.requisitar(opcoes);',
    ].join('\n'),
    violacoes: [
      'requisitar-com-escrita|MetodoHttp',
      'requisitar-com-escrita|MetodoHttp',
      'requisitar-com-escrita|MetodoHttp',
    ],
  },
  {
    arquivo: 'pages/plantadas/requisitarSemChamar.ts',
    conteudo: [
      IMPORTA_O_CLIENTE,
      'export const referencia = (cliente: ClienteHttp) => cliente.requisitar;',
      'export const desestruturado = (cliente: ClienteHttp) => { const { requisitar } = cliente; return requisitar; };',
      "export const porIndice = (cliente: ClienteHttp) => cliente['requisitar'];",
    ].join('\n'),
    violacoes: [
      'requisitar-indeterminado|requisitar',
      'requisitar-indeterminado|requisitar',
      'requisitar-indeterminado|requisitar',
    ],
  },
  {
    arquivo: 'pages/plantadas/indiceComChaveNaoLiteral.ts',
    conteudo: [
      IMPORTA_O_CLIENTE,
      "const k = 'fetch';",
      "export const f = () => window[k]('/x', { method: 'POST' });",
      "const m = 'requisitar';",
      "export const g = (cliente: ClienteHttp) => cliente[m]({ metodo: 'POST', caminho: '/x' });",
      "export const h = (cliente: ClienteHttp, chave: 'requisitar' | 'toString') => cliente[chave];",
    ].join('\n'),
    violacoes: [
      'rede-fora-da-camada-de-dados|fetch',
      'requisitar-indeterminado|requisitar',
      'requisitar-indeterminado|requisitar',
    ],
  },
];

export const CASOS_PLANTADOS_PERMITIDOS: readonly CasoPlantado[] = [
  {
    arquivo: 'pages/plantadas/requisitarComGet.ts',
    conteudo: [
      IMPORTA_O_CLIENTE,
      "export const ler = (cliente: ClienteHttp) => cliente.requisitar({ metodo: 'GET', caminho: '/x' });",
      "export const lerOpcional = (cliente?: ClienteHttp) => cliente?.requisitar({ metodo: 'GET', caminho: '/x' });",
    ].join('\n'),
    violacoes: [],
    achados: ['requisitar:GET', 'requisitar:GET'],
  },
  {
    arquivo: 'pages/plantadas/homonimosESoTipos.ts',
    conteudo: [
      'const fetch = (caminho: string) => caminho;',
      'export const local = fetch("/x");',
      'export const sinal = { sendBeacon: () => true };',
      'export const usado = sinal.sendBeacon();',
      'export type Buscar = typeof globalThis.fetch;',
      'export type Requisicao = XMLHttpRequest | undefined;',
    ].join('\n'),
    violacoes: [],
  },
  {
    arquivo: 'dados/plantadas/redeNaCamadaDeDados.ts',
    conteudo: [
      IMPORTA_O_CLIENTE,
      "export const enviar = () => fetch('/api/v1/x', { method: 'POST' });",
      "export const sinalizar = () => navigator.sendBeacon('/api/v1/x');",
      "export const escrever = (cliente: ClienteHttp) => cliente.requisitar({ metodo: 'PATCH', caminho: '/x' });",
    ].join('\n'),
    violacoes: [],
    achados: ['rede:fetch', 'rede:sendBeacon'],
  },
];
