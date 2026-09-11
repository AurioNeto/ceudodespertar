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
  faturas: '/faturas',
  emprestimos: '/emprestimos',
  adiantamentos: '/adiantamentos',
  relatorios: '/relatorios',
  fechamento: '/fechamento',
  prestacao: '/prestacao-de-contas',
  devolucoes: '/devolucoes',
  conciliacao: '/conciliacao',
  parametros: '/parametros',
  agenda: '/agenda',
  inscricao: '/inscricao',
  leitos: '/leitos',
  contratacoes: '/contratacoes',
  ayahuasca: '/ayahuasca',
  feitio: '/feitio',
  pessoas: '/pessoas',
  anamnese: '/anamnese',
  auditoria: '/auditoria',
  perfil: '/meu-perfil',
} as const;

export type RotaId = keyof typeof ROTAS;

/**
 * As telas de entrada ficam fora de `ROTAS` de propósito: elas não têm item de
 * menu, não entram no cálculo de rota ativa e não moram dentro do AppShell.
 *
 * `inscricaoPublica` é a única delas que não é do time da casa: é o link da
 * cerimônia, gerado quando a cerimônia é criada e mandado pela recepção no
 * WhatsApp. Caminho curto de propósito — ele vai ser colado numa conversa.
 */
export const ROTAS_PUBLICAS = {
  entrar: '/entrar',
  esqueci: '/esqueci-a-senha',
  redefinir: '/redefinir-senha',
  convite: '/convite',
  inscricaoPublica: '/i/:token',
} as const;

export const construirNav = (lotePendente: number): readonly NavEntry[] => [
  { id: 'painel', label: 'Painel', icon: 'layout-dashboard' },
  { id: 'registrar', label: 'Registrar lançamento', icon: 'circle-plus' },
  { id: 'meus', label: 'Meus registros', icon: 'receipt-text' },
  { section: 'Financeiro' },
  { id: 'lote', label: 'Verificação de lote', icon: 'sparkles', count: lotePendente },
  { id: 'lancamentos', label: 'Lançamentos', icon: 'list' },
  { id: 'contas', label: 'Contas e fundo', icon: 'landmark' },
  { id: 'faturas', label: 'Faturas de cartão', icon: 'credit-card' },
  { id: 'emprestimos', label: 'Empréstimos', icon: 'arrow-left-right' },
  { id: 'adiantamentos', label: 'Adiantamentos', icon: 'shield-half' },
  { id: 'relatorios', label: 'Relatórios', icon: 'chart-no-axes-column' },
  { id: 'fechamento', label: 'Fechamento', icon: 'lock' },
  { id: 'conciliacao', label: 'Conciliação', icon: 'scale' },
  { id: 'devolucoes', label: 'Devoluções a pagar', icon: 'undo-2' },
  { id: 'prestacao', label: 'Prestação de contas', icon: 'file-down' },
  { id: 'parametros', label: 'Parâmetros', icon: 'settings-2' },
  { section: 'Cerimônias' },
  { id: 'agenda', label: 'Agenda', icon: 'calendar-days' },
  { id: 'inscricao', label: 'Inscrição', icon: 'user-plus' },
  { id: 'leitos', label: 'Leitos', icon: 'sheet' },
  { id: 'contratacoes', label: 'Contratações', icon: 'send' },
  { id: 'ayahuasca', label: 'Ayahuasca', icon: 'flask-conical' },
  { id: 'feitio', label: 'Feitio', icon: 'rotate-cw' },
  { section: 'Pessoas' },
  { id: 'pessoas', label: 'Pessoas', icon: 'users' },
  { id: 'anamnese', label: 'Anamnese', icon: 'clipboard-list' },
  { section: 'Sistema' },
  { id: 'auditoria', label: 'Auditoria', icon: 'scroll-text' },
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
