import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './Layout';
import { ROTAS, ROTAS_PUBLICAS } from './navegacao';
import { rotasAntigasDaEntrada } from './rotasAntigasDaEntrada';
import { ExigeSessao } from './sessao';
import { EntrarPage } from '../pages/entrada/EntrarPage';
import { RetornoPage } from '../pages/entrada/RetornoPage';
import { InscricaoPublicaPage } from '@/pages/eventos/inscricao/InscricaoPublicaPage';
import { PainelPage } from '../pages/painel/PainelPage';
import { RegistrarLancamentoPage } from '@/pages/financeiro/lancamentos/RegistrarLancamentoPage';
import { MeusRegistrosPage } from '@/pages/financeiro/lancamentos/MeusRegistrosPage';
import { LancamentosPage } from '@/pages/financeiro/lancamentos/LancamentosPage';
import { ContasEFundoPage } from '@/pages/financeiro/ContasEFundoPage';
import { FaturasPage } from '@/pages/financeiro/FaturasPage';
import { EmprestimosPage } from '@/pages/financeiro/EmprestimosPage';
import { AdiantamentosPage } from '@/pages/financeiro/AdiantamentosPage';
import { VerificacaoLotePage } from '@/pages/financeiro/lancamentos/VerificacaoLotePage';
import { RelatoriosPage } from '@/pages/financeiro/RelatoriosPage';
import { FechamentoPage } from '@/pages/financeiro/FechamentoPage';
import { PrestacaoDeContasPage } from '@/pages/financeiro/PrestacaoDeContasPage';
import { ConciliacaoPage } from '@/pages/financeiro/ConciliacaoPage';
import { ParametrosPage } from '@/pages/financeiro/ParametrosPage';
import { AgendaPage } from '@/pages/eventos/AgendaPage';
import { InscricaoPage } from '@/pages/eventos/inscricao/InscricaoPage';
import { DevolucoesPage } from '@/pages/eventos/DevolucoesPage';
import { LeitosPage } from '@/pages/eventos/LeitosPage';
import { ContratacoesPage } from '@/pages/eventos/ContratacoesPage';
import { PessoasPage } from '../pages/pessoas/PessoasPage';
import { AnamnesePage } from '../pages/pessoas/AnamnesePage';
import { AyahuascaPage } from '../pages/ayahuasca/AyahuascaPage';
import { FeitioPage } from '../pages/estoque/FeitioPage';
import { AuditoriaPage } from '../pages/auditoria/AuditoriaPage';
import { AcessosPage } from '../pages/acessos/AcessosPage';
import { MeuPerfilPage } from '../pages/perfil/MeuPerfilPage';

export const router = createBrowserRouter([
  { path: ROTAS_PUBLICAS.entrar, element: <EntrarPage /> },
  { path: ROTAS_PUBLICAS.retorno, element: <RetornoPage /> },
  ...rotasAntigasDaEntrada,
  { path: ROTAS_PUBLICAS.inscricaoPublica, element: <InscricaoPublicaPage /> },
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
      { path: ROTAS.devolucoes, element: <DevolucoesPage /> },
      { path: ROTAS.prestacao, element: <PrestacaoDeContasPage /> },
      { path: ROTAS.parametros, element: <ParametrosPage /> },
      { path: ROTAS.agenda, element: <AgendaPage /> },
      { path: ROTAS.inscricao, element: <InscricaoPage /> },
      { path: ROTAS.leitos, element: <LeitosPage /> },
      { path: ROTAS.contratacoes, element: <ContratacoesPage /> },
      { path: ROTAS.pessoas, element: <PessoasPage /> },
      { path: ROTAS.anamnese, element: <AnamnesePage /> },
      { path: ROTAS.ayahuasca, element: <AyahuascaPage /> },
      { path: ROTAS.feitio, element: <FeitioPage /> },
      { path: ROTAS.acessos, element: <AcessosPage /> },
      { path: ROTAS.auditoria, element: <AuditoriaPage /> },
      { path: ROTAS.perfil, element: <MeuPerfilPage /> },
    ],
  },
]);
