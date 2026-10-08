import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppShell, FaixaDeDemonstracao } from '../ds';
import { construirNav, ROTAS, rotaAtiva, type RotaId } from './navegacao';
import { useDensidade } from '../lib/useDensidade';
import { sessaoDeDemonstracaoLigada } from './demonstracao';
import { TELAS, type RegistroDeTelas } from './telas';
import { useSessao } from './sessao';
import { filaDeVerificacaoInicial } from '../mocks/verificacao';

export interface LayoutProps {
  readonly telas?: RegistroDeTelas;
}

export function Layout({ telas = TELAS }: LayoutProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const ativo = rotaAtiva(pathname);

  const { usuario } = useSessao();
  const densidade = useDensidade();

  if (!usuario) return null;

  const mostraFaixa = sessaoDeDemonstracaoLigada() || telas[ativo].fonte === 'mock';

  return (
    <AppShell
      unit="CDD"
      density={densidade}
      user={{ name: usuario.nome, group: usuario.grupoNome }}
      nav={construirNav(filaDeVerificacaoInicial.length)}
      activeId={ativo}
      onNavigate={(id) => navigate(ROTAS[id as RotaId] ?? '/')}
      onUserClick={() => navigate(ROTAS.perfil)}
    >
      {mostraFaixa ? <FaixaDeDemonstracao /> : null}
      <Outlet />
    </AppShell>
  );
}
