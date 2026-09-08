import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../ds';
import { construirNav, ROTAS, rotaAtiva, type RotaId } from './navegacao';
import { useDensidade } from '../lib/useDensidade';
import { useSessao } from './sessao';
import { usuarioAtual } from '../mocks/sessao';
import { filaDeVerificacaoInicial } from '../mocks/verificacao';

export function Layout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const ativo = rotaAtiva(pathname);

  // Dentro de ExigeSessao o usuário existe; o fallback é só para o TypeScript.
  const { usuario } = useSessao();
  const quem = usuario ?? usuarioAtual;

  return (
    <AppShell
      unit="CDD"
      density={useDensidade()}
      user={{ name: quem.nome, group: quem.grupoNome }}
      nav={construirNav(filaDeVerificacaoInicial.length)}
      activeId={ativo}
      onNavigate={(id) => navigate(ROTAS[id as RotaId] ?? '/')}
      onUserClick={() => navigate(ROTAS.perfil)}
    >
      <Outlet />
    </AppShell>
  );
}
