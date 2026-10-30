import type { OpcoesDeVerificacao } from './verificar-rotas.js';

export const ROTA_DE_USUARIO_ATIVO = 'GET /api/v1/eu';
export const ROTA_DE_ATIVACAO_DO_CONVITE = 'POST /api/v1/eu/ativacao';

export const ROTAS_SEM_PERMISSAO: OpcoesDeVerificacao['rotasSemPermissao'] = [
  { marca: 'apenas-usuario-ativo', metodo: 'GET', caminho: '/api/v1/eu' },
  { marca: 'apenas-identificado', metodo: 'POST', caminho: '/api/v1/eu/ativacao' },
  { marca: 'publico', metodo: 'GET', caminho: '/saude/viva' },
  { marca: 'publico', metodo: 'GET', caminho: '/saude/pronta' },
];

export const ROTAS_DOS_CADASTROS_DO_FINANCEIRO: readonly string[] = [
  'GET /api/v1/financeiro/unidades',
  'POST /api/v1/financeiro/unidades',
  'PUT /api/v1/financeiro/unidades/:id',
  'GET /api/v1/financeiro/grupos-de-custo',
  'POST /api/v1/financeiro/grupos-de-custo',
  'PUT /api/v1/financeiro/grupos-de-custo/:id',
  'GET /api/v1/financeiro/categorias',
  'POST /api/v1/financeiro/categorias',
  'PUT /api/v1/financeiro/categorias/:id',
];

export const PISO_DE_ROTAS = 24;
