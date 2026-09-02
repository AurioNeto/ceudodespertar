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
    ],
  },
]);
