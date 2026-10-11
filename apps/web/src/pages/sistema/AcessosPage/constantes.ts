export const AVISO_DE_VERSAO_DESATUALIZADA =
  'Outra pessoa alterou este usuário enquanto você editava. Os dados foram atualizados; revise e confirme de novo.';

export type Aba = 'usuarios' | 'grupos';

export const ROTULO_DA_ABA: Record<Aba, string> = { usuarios: 'Usuários', grupos: 'Grupos' };
