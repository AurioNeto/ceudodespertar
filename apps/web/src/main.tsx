import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { SessaoProvider } from './app/sessao';
import './styles/global.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root não encontrado');

createRoot(container).render(
  <StrictMode>
    <SessaoProvider>
      <RouterProvider router={router} />
    </SessaoProvider>
  </StrictMode>,
);
