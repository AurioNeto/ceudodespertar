import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppShell, useDensidade } from '@/ds';
import { filtrarNavPorAcesso, podeVerTela } from '../acesso';
import { construirNav } from '../menu';
import { ROTAS, type RotaId } from '@/app/rotas';
import { rotaAtiva } from '../rotaAtiva';
import { FaixaDeDemonstracao, sessaoDeDemonstracaoLigada } from '@/app/demonstracao';
import { TELAS, type RegistroDeTelas } from '../telas';
import { useSessao } from '@/app/sessao';
import { TelaSemAcesso } from '../components/TelaSemAcesso';
import { useContagemDoLote } from '../hooks/useContagemDoLote';
import { nomeDaTela } from '../utils/nomeDaTela';

const TEXTOS_DO_SHELL = {
  institution: 'Céu do Despertar',
  unit: 'CDD',
  brand: { lines: ['Céu do', 'Despertar'], tagline: 'Sistema de gestão' },
  userLabel: 'Meu perfil',
} as const;

export interface LayoutProps {
  readonly telas?: RegistroDeTelas;
}

export function Layout({ telas = TELAS }: LayoutProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const ativo = rotaAtiva(pathname);

  const { usuario, pode } = useSessao();
  const densidade = useDensidade();
  const contagemDoLote = useContagemDoLote();

  if (!usuario) return null;

  const nav = construirNav(contagemDoLote);
  const registro = telas[ativo];
  const liberada = podeVerTela(registro, pode);
  const mostraFaixa = liberada && (sessaoDeDemonstracaoLigada() || registro.fonte === 'mock');

  return (
    <AppShell
      {...TEXTOS_DO_SHELL}
      density={densidade}
      user={{ name: usuario.nome, group: usuario.grupoNome }}
      userActive={ativo === 'perfil'}
      nav={filtrarNavPorAcesso(nav, telas, pode)}
      activeId={ativo}
      onNavigate={(id) => navigate(ROTAS[id as RotaId] ?? '/')}
      onUserClick={() => navigate(ROTAS.perfil)}
    >
      {mostraFaixa ? <FaixaDeDemonstracao /> : null}
      {liberada ? (
        <Outlet />
      ) : (
        <TelaSemAcesso
          nomeDaTela={nomeDaTela(nav, ativo)}
          grupoNome={usuario.grupoNome}
          permissaoQueFalta={registro.acesso[0] ?? ''}
          densidade={densidade}
        />
      )}
    </AppShell>
  );
}
