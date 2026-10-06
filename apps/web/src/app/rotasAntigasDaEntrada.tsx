import { Navigate } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { ROTAS_ANTIGAS_DA_ENTRADA, ROTAS_PUBLICAS } from './navegacao';

export const rotasAntigasDaEntrada: RouteObject[] = ROTAS_ANTIGAS_DA_ENTRADA.map((path) => ({
  path,
  element: <Navigate to={ROTAS_PUBLICAS.entrar} replace />,
}));
