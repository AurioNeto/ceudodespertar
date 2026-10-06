import { StrictMode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { SessaoProvider } from './app/sessao';
import { criarClienteDeConsultas } from './dados';
import './styles/global.css';

const clienteDeConsultas = criarClienteDeConsultas();

const container = document.getElementById('root');
if (!container) throw new Error('#root não encontrado');

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={clienteDeConsultas}>
      <SessaoProvider>
        <RouterProvider router={router} />
      </SessaoProvider>
    </QueryClientProvider>
  </StrictMode>,
);
