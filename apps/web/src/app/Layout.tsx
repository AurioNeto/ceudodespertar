import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../ds';
import { construirNav, ROTAS, rotaAtiva, type RotaId } from './navegacao';
import { useDensidade } from '../lib/useDensidade';
import { usuarioAtual } from '../mocks/sessao';
import { filaDeVerificacao } from '../mocks/financeiro';

export function Layout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const ativo = rotaAtiva(pathname);

  return (
    <AppShell
      unit="CDD"
      density={useDensidade()}
      user={{ name: usuarioAtual.nome, group: usuarioAtual.grupoNome }}
      nav={construirNav(filaDeVerificacao.length)}
      activeId={ativo}
      onNavigate={(id) => navigate(ROTAS[id as RotaId] ?? '/')}
      onUserClick={() => navigate(ROTAS.perfil)}
    >
      <Outlet />
    </AppShell>
  );
}
