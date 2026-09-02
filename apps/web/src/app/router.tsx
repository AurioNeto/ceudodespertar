import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './Layout';
import { ROTAS } from './navegacao';
import { PainelPage } from '../pages/painel/PainelPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [{ path: ROTAS.painel, element: <PainelPage /> }],
  },
]);
