import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './Layout';
import { ROTAS } from './navegacao';
import { PainelPage } from '../pages/painel/PainelPage';
import { RegistrarLancamentoPage } from '../pages/lancamento/RegistrarLancamentoPage';
import { MeusRegistrosPage } from '../pages/registros/MeusRegistrosPage';
import { LancamentosPage } from '../pages/registros/LancamentosPage';
import { ContasEFundoPage } from '../pages/contas/ContasEFundoPage';
import { VerificacaoLotePage } from '../pages/verificacao/VerificacaoLotePage';
import { RelatoriosPage } from '../pages/relatorios/RelatoriosPage';
import { FechamentoPage } from '../pages/fechamento/FechamentoPage';
import { AgendaPage } from '../pages/agenda/AgendaPage';
import { PessoasPage } from '../pages/pessoas/PessoasPage';
import { AnamnesePage } from '../pages/pessoas/AnamnesePage';
import { AyahuascaPage } from '../pages/ayahuasca/AyahuascaPage';
import { MeuPerfilPage } from '../pages/perfil/MeuPerfilPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: ROTAS.painel, element: <PainelPage /> },
      { path: ROTAS.registrar, element: <RegistrarLancamentoPage /> },
      { path: ROTAS.meus, element: <MeusRegistrosPage /> },
      { path: ROTAS.lancamentos, element: <LancamentosPage /> },
      { path: ROTAS.contas, element: <ContasEFundoPage /> },
      { path: ROTAS.lote, element: <VerificacaoLotePage /> },
      { path: ROTAS.relatorios, element: <RelatoriosPage /> },
      { path: ROTAS.fechamento, element: <FechamentoPage /> },
      { path: ROTAS.agenda, element: <AgendaPage /> },
      { path: ROTAS.pessoas, element: <PessoasPage /> },
      { path: ROTAS.anamnese, element: <AnamnesePage /> },
      { path: ROTAS.ayahuasca, element: <AyahuascaPage /> },
      { path: ROTAS.perfil, element: <MeuPerfilPage /> },
    ],
  },
]);
