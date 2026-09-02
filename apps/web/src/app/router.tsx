import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './Layout';
import { ROTAS } from './navegacao';
import { PainelPage } from '../pages/painel/PainelPage';
import { RegistrarLancamentoPage } from '../pages/lancamento/RegistrarLancamentoPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: ROTAS.painel, element: <PainelPage /> },
      { path: ROTAS.registrar, element: <RegistrarLancamentoPage /> },
    ],
  },
]);
