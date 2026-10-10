import type { NavEntry } from '../ds';
import { CAMINHO_DA_ENTRADA, CAMINHO_DE_RETORNO } from '../dados/oidc';

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
  acessos: '/acessos',
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
  entrar: CAMINHO_DA_ENTRADA,
  retorno: CAMINHO_DE_RETORNO,
  inscricaoPublica: '/i/:token',
} as const;

export const ROTAS_ANTIGAS_DA_ENTRADA: readonly string[] = ['/esqueci-a-senha', '/redefinir-senha', '/convite'];

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
  { id: 'acessos', label: 'Acessos', icon: 'key-round' },
  { id: 'auditoria', label: 'Auditoria', icon: 'scroll-text' },
];

const POR_CAMINHO = new Map<string, RotaId>(
  (Object.entries(ROTAS) as [RotaId, string][]).map(([id, caminho]) => [caminho, id]),
);

export function rotaAtiva(pathname: string): RotaId {
  const exata = POR_CAMINHO.get(pathname);
  if (exata) return exata;
  const prefixo = (Object.entries(ROTAS) as [RotaId, string][]).reduce<[RotaId, string] | null>(
    (maisLongo, atual) => {
      const [, caminho] = atual;
      if (caminho === '/' || !pathname.startsWith(caminho)) return maisLongo;
      return maisLongo === null || caminho.length > maisLongo[1].length ? atual : maisLongo;
    },
    null,
  );
  return prefixo?.[0] ?? 'painel';
}
