import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ_DO_WEB = fileURLToPath(new URL('..', import.meta.url));
export const SAIDA_PADRAO = join(RAIZ_DO_WEB, 'captura', 'saida');
export const FONTES_PADRAO = join(
  process.env.XDG_CACHE_HOME ?? join(homedir(), '.cache'),
  'cdd-captura',
  'fontes',
);

export const VARIAVEIS_DO_SERVIDOR = {
  VITE_SESSAO_DE_DEMONSTRACAO: '1',
  VITE_OIDC_EMISSOR: 'http://localhost:8080/realms/cdd',
  VITE_OIDC_CLIENTE: 'cdd-web',
};

export const DENSIDADES = [
  { nome: 'campo', viewport: { width: 390, height: 844 } },
  { nome: 'escritorio', viewport: { width: 1440, height: 900 } },
];

export const AGORA_FIXO = '2026-09-02T12:00:00-03:00';
export const FUSO = 'America/Sao_Paulo';
export const IDIOMA = 'pt-BR';

export const TOKEN_DA_INSCRICAO = 'lua-cheia-1209-7k3f';
export const MODULO_DAS_ROTAS = '/src/app/navegacao.ts';

export const CAMINHO_DA_API = '/api';
export const PREFIXO_DA_API = `${CAMINHO_DA_API}/`;
export const ORIGEM_DA_API_INEXISTENTE = 'http://127.0.0.1:9';
export const ATRIBUTO_DA_ROLAGEM_HORIZONTAL = 'data-captura-rolagem';
export const ATRIBUTO_DA_ROLAGEM_DO_PAINEL = 'data-captura-painel';

export const FAMILIAS_DE_FONTE = ['Archivo', 'Public Sans', 'IBM Plex Mono'];
export const ORIGEM_DAS_FONTES = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

export const SOSSEGO_DO_DOM_MS = 300;
export const LIMITE_DE_ESPERA_MS = 15_000;
export const ALTURA_MAXIMA_DA_PAGINA = 16_000;

export const ARGUMENTOS_DO_CHROMIUM = ['--force-color-profile=srgb', '--font-render-hinting=none'];
