import { CAMINHO_DA_ENTRADA, CAMINHO_DE_RETORNO } from '@/dados';

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

export const ROTAS_PUBLICAS = {
  entrar: CAMINHO_DA_ENTRADA,
  retorno: CAMINHO_DE_RETORNO,
  inscricaoPublica: '/i/:token',
} as const;

export const ROTAS_ANTIGAS_DA_ENTRADA: readonly string[] = ['/esqueci-a-senha', '/redefinir-senha', '/convite'];
