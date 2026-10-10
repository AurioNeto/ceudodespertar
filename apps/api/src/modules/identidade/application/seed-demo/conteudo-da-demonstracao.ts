import type { CodigoGrupo } from '@cdd/contracts';

export const ID_DA_INSTITUICAO_DE_DEMONSTRACAO = '01900000-0000-7000-8000-00000c0dd000';
export const NOME_DA_INSTITUICAO_DE_DEMONSTRACAO = 'Casa de Demonstração CDD';
export const USERNAME_DO_DEV = 'dev@cdd.local';
export const MOTIVO_DA_SUSPENSAO_DE_DEMONSTRACAO = 'Usuário fictício suspenso para demonstração';

export type SituacaoDeSemeadura = 'ATIVO' | 'CONVITE_PENDENTE' | 'SUSPENSO';

export interface UsuarioFicticio {
  readonly slug: string;
  readonly nome: string;
  readonly grupo: CodigoGrupo;
  readonly situacao: SituacaoDeSemeadura;
}

const DOMINIO_DOS_FICTICIOS = 'demo.cdd.invalid';

export const USUARIOS_FICTICIOS: readonly UsuarioFicticio[] = [
  { slug: 'administrador', nome: 'Administrador de Demonstração', grupo: 'ADMINISTRADOR', situacao: 'ATIVO' },
  { slug: 'governanca', nome: 'Governança de Demonstração', grupo: 'GOVERNANCA', situacao: 'ATIVO' },
  { slug: 'tesouraria', nome: 'Tesouraria de Demonstração', grupo: 'TESOURARIA', situacao: 'ATIVO' },
  { slug: 'acolhimento', nome: 'Acolhimento de Demonstração', grupo: 'ACOLHIMENTO', situacao: 'ATIVO' },
  { slug: 'registro', nome: 'Registro de Demonstração', grupo: 'REGISTRO', situacao: 'ATIVO' },
  { slug: 'leitura', nome: 'Leitura de Demonstração', grupo: 'LEITURA', situacao: 'ATIVO' },
  { slug: 'convidado', nome: 'Convidado de Demonstração', grupo: 'LEITURA', situacao: 'CONVITE_PENDENTE' },
  { slug: 'suspenso', nome: 'Suspenso de Demonstração', grupo: 'REGISTRO', situacao: 'SUSPENSO' },
];

export const emailDoFicticio = (slug: string): string => `${slug}@${DOMINIO_DOS_FICTICIOS}`;
export const subDoFicticio = (slug: string): string => `demo:${slug}`;
