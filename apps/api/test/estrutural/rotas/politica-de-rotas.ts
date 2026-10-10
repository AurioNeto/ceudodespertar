import type { OpcoesDeVerificacao } from './verificar-rotas.js';

export const ROTA_DE_USUARIO_ATIVO = 'GET /api/v1/eu';
export const ROTA_DE_ATIVACAO_DO_CONVITE = 'POST /api/v1/eu/ativacao';

export const ROTAS_SEM_PERMISSAO: OpcoesDeVerificacao['rotasSemPermissao'] = [
  { marca: 'apenas-usuario-ativo', metodo: 'GET', caminho: '/api/v1/eu' },
  { marca: 'apenas-identificado', metodo: 'POST', caminho: '/api/v1/eu/ativacao' },
  { marca: 'publico', metodo: 'GET', caminho: '/saude/viva' },
  { marca: 'publico', metodo: 'GET', caminho: '/saude/pronta' },
];

export const PISO_DE_ROTAS = 15;
