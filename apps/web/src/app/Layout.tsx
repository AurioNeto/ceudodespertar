import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../ds';
import { construirNav, ROTAS, rotaAtiva, type RotaId } from './navegacao';
import { useDensidade } from '../lib/useDensidade';
import { useSessao } from './sessao';
import { filaDeVerificacaoInicial } from '../mocks/verificacao';

export function Layout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const ativo = rotaAtiva(pathname);

  const { usuario } = useSessao();
  const densidade = useDensidade();

  if (!usuario) return null;

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
      <Outlet />
    </AppShell>
  );
}
