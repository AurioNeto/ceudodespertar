import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppShell, FaixaDeDemonstracao, PermissionDenied, ScreenHeader } from '../ds';
import { filtrarNavPorAcesso, podeVerTela } from './acesso';
import { construirNav, ROTAS, rotaAtiva, type RotaId } from './navegacao';
import { useDensidade } from '../lib/useDensidade';
import { sessaoDeDemonstracaoLigada } from './demonstracao';
import { TELAS, type RegistroDeTelas } from './telas';
import { useSessao } from './sessao';
import { filaDeVerificacaoInicial } from '../mocks/verificacao';

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

  if (!usuario) return null;

  const nav = construirNav(filaDeVerificacaoInicial.length);
  const registro = telas[ativo];
  const liberada = podeVerTela(registro, pode);
  const mostraFaixa = liberada && (sessaoDeDemonstracaoLigada() || registro.fonte === 'mock');
  const rotuloDaTela = nav.find((entrada) => 'id' in entrada && entrada.id === ativo);
  const nomeDaTela = rotuloDaTela && 'label' in rotuloDaTela ? rotuloDaTela.label : ativo;

  return (
    <AppShell
      {...TEXTOS_DO_SHELL}
      density={densidade}
      user={{ name: usuario.nome, group: usuario.grupoNome }}
      nav={filtrarNavPorAcesso(nav, telas, pode)}
      activeId={ativo}
      onNavigate={(id) => navigate(ROTAS[id as RotaId] ?? '/')}
      onUserClick={() => navigate(ROTAS.perfil)}
    >
      {mostraFaixa ? <FaixaDeDemonstracao /> : null}
      {liberada ? (
        <Outlet />
      ) : (
        <>
          <ScreenHeader title={nomeDaTela} density={densidade} />
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>
            <PermissionDenied screen={nomeDaTela} group={usuario.grupoNome} missing={registro.acesso[0] ?? ''} />
          </div>
        </>
      )}
    </AppShell>
  );
}
