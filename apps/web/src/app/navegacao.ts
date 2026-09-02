import type { NavEntry } from '../ds';

/**
 * O menu como ficou depois das iterações do design: "Conferência" virou
 * "Verificação de lote" dentro de Financeiro, e Pessoas ganhou seção própria.
 * Meu perfil não é item de menu — abre pelo chip do usuário no rodapé do rail.
 */
export interface Rota {
  id: string;
  caminho: string;
}

export const ROTAS = {
  painel: '/',
  registrar: '/registrar',
  meus: '/meus-registros',
  lote: '/verificacao-de-lote',
  lancamentos: '/lancamentos',
  contas: '/contas-e-fundo',
  relatorios: '/relatorios',
  fechamento: '/fechamento',
  agenda: '/agenda',
  ayahuasca: '/ayahuasca',
  pessoas: '/pessoas',
  anamnese: '/anamnese',
  perfil: '/meu-perfil',
} as const;

export type RotaId = keyof typeof ROTAS;

export const construirNav = (lotePendente: number): readonly NavEntry[] => [
  { id: 'painel', label: 'Painel', icon: 'layout-dashboard' },
  { id: 'registrar', label: 'Registrar lançamento', icon: 'circle-plus' },
  { id: 'meus', label: 'Meus registros', icon: 'receipt-text' },
  { section: 'Financeiro' },
  { id: 'lote', label: 'Verificação de lote', icon: 'sparkles', count: lotePendente },
  { id: 'lancamentos', label: 'Lançamentos', icon: 'list' },
  { id: 'contas', label: 'Contas e fundo', icon: 'landmark' },
  { id: 'relatorios', label: 'Relatórios', icon: 'chart-no-axes-column' },
  { id: 'fechamento', label: 'Fechamento', icon: 'lock' },
  { section: 'Cerimônias' },
  { id: 'agenda', label: 'Agenda', icon: 'calendar-days' },
  { id: 'ayahuasca', label: 'Ayahuasca', icon: 'flask-conical' },
  { section: 'Pessoas' },
  { id: 'pessoas', label: 'Pessoas', icon: 'users' },
  { id: 'anamnese', label: 'Anamnese', icon: 'clipboard-list' },
];

const POR_CAMINHO = new Map<string, RotaId>(
  (Object.entries(ROTAS) as [RotaId, string][]).map(([id, caminho]) => [caminho, id]),
);

export function rotaAtiva(pathname: string): RotaId {
  const exata = POR_CAMINHO.get(pathname);
  if (exata) return exata;
  const prefixo = (Object.entries(ROTAS) as [RotaId, string][])
    .filter(([, caminho]) => caminho !== '/' && pathname.startsWith(caminho))
    .sort((a, b) => b[1].length - a[1].length)[0];
  return prefixo?.[0] ?? 'painel';
}
