import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './Layout';
import { ROTAS, ROTAS_PUBLICAS } from './navegacao';
import { ExigeSessao } from './sessao';
import { EntrarPage } from '../pages/entrada/EntrarPage';
import { EsqueciSenhaPage } from '../pages/entrada/EsqueciSenhaPage';
import { RedefinirSenhaPage } from '../pages/entrada/RedefinirSenhaPage';
import { ConvitePage } from '../pages/entrada/ConvitePage';
import { PainelPage } from '../pages/painel/PainelPage';
import { RegistrarLancamentoPage } from '../pages/lancamento/RegistrarLancamentoPage';
import { MeusRegistrosPage } from '../pages/registros/MeusRegistrosPage';
import { LancamentosPage } from '../pages/registros/LancamentosPage';
import { ContasEFundoPage } from '../pages/contas/ContasEFundoPage';
import { FaturasPage } from '../pages/faturas/FaturasPage';
import { EmprestimosPage } from '../pages/emprestimos/EmprestimosPage';
import { AdiantamentosPage } from '../pages/adiantamentos/AdiantamentosPage';
import { VerificacaoLotePage } from '../pages/verificacao/VerificacaoLotePage';
import { RelatoriosPage } from '../pages/relatorios/RelatoriosPage';
import { FechamentoPage } from '../pages/fechamento/FechamentoPage';
import { PrestacaoDeContasPage } from '../pages/prestacao/PrestacaoDeContasPage';
import { ConciliacaoPage } from '../pages/conciliacao/ConciliacaoPage';
import { ParametrosPage } from '../pages/parametros/ParametrosPage';
import { AgendaPage } from '../pages/agenda/AgendaPage';
import { PessoasPage } from '../pages/pessoas/PessoasPage';
import { AnamnesePage } from '../pages/pessoas/AnamnesePage';
import { AyahuascaPage } from '../pages/ayahuasca/AyahuascaPage';
import { AuditoriaPage } from '../pages/auditoria/AuditoriaPage';
import { MeuPerfilPage } from '../pages/perfil/MeuPerfilPage';

export const router = createBrowserRouter([
  { path: ROTAS_PUBLICAS.entrar, element: <EntrarPage /> },
  { path: ROTAS_PUBLICAS.esqueci, element: <EsqueciSenhaPage /> },
  { path: ROTAS_PUBLICAS.redefinir, element: <RedefinirSenhaPage /> },
  { path: ROTAS_PUBLICAS.convite, element: <ConvitePage /> },
  {
    path: '/',
    element: (
      <ExigeSessao>
        <Layout />
      </ExigeSessao>
    ),
    children: [
      { path: ROTAS.painel, element: <PainelPage /> },
      { path: ROTAS.registrar, element: <RegistrarLancamentoPage /> },
      { path: ROTAS.meus, element: <MeusRegistrosPage /> },
      { path: ROTAS.lancamentos, element: <LancamentosPage /> },
      { path: ROTAS.contas, element: <ContasEFundoPage /> },
      { path: ROTAS.faturas, element: <FaturasPage /> },
      { path: ROTAS.emprestimos, element: <EmprestimosPage /> },
      { path: ROTAS.adiantamentos, element: <AdiantamentosPage /> },
      { path: ROTAS.lote, element: <VerificacaoLotePage /> },
      { path: ROTAS.relatorios, element: <RelatoriosPage /> },
      { path: ROTAS.fechamento, element: <FechamentoPage /> },
      { path: ROTAS.conciliacao, element: <ConciliacaoPage /> },
      { path: ROTAS.prestacao, element: <PrestacaoDeContasPage /> },
      { path: ROTAS.parametros, element: <ParametrosPage /> },
      { path: ROTAS.agenda, element: <AgendaPage /> },
      { path: ROTAS.pessoas, element: <PessoasPage /> },
      { path: ROTAS.anamnese, element: <AnamnesePage /> },
      { path: ROTAS.ayahuasca, element: <AyahuascaPage /> },
      { path: ROTAS.auditoria, element: <AuditoriaPage /> },
      { path: ROTAS.perfil, element: <MeuPerfilPage /> },
    ],
  },
]);
