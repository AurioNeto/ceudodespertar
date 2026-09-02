import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './Layout';
import { ROTAS } from './navegacao';
import { PainelPage } from '../pages/painel/PainelPage';
import { RegistrarLancamentoPage } from '../pages/lancamento/RegistrarLancamentoPage';
import { MeusRegistrosPage } from '../pages/registros/MeusRegistrosPage';
import { LancamentosPage } from '../pages/registros/LancamentosPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: ROTAS.painel, element: <PainelPage /> },
      { path: ROTAS.registrar, element: <RegistrarLancamentoPage /> },
      { path: ROTAS.meus, element: <MeusRegistrosPage /> },
      { path: ROTAS.lancamentos, element: <LancamentosPage /> },
    ],
  },
]);
