import { StrictMode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { criarFontesReais, escolherFontesDaSessao, SessaoProvider } from './app/sessao';
import { criarClienteDeConsultas } from './dados';
import { clienteHttp, credencial, servicoDeEntrada } from './dados/instancias';
import { ClienteHttpProvider } from './app/providers';
import { ClimaProvider } from './ds';
import './styles/global.css';

const clienteDeConsultas = criarClienteDeConsultas();

const fontesReais = criarFontesReais({ clienteHttp, credencial, servicoDeEntrada });

const container = document.getElementById('root');
if (!container) throw new Error('#root não encontrado');

void escolherFontesDaSessao(fontesReais).then((fontes) => {
  createRoot(container).render(
    <StrictMode>
      <ClimaProvider>
        <QueryClientProvider client={clienteDeConsultas}>
          <ClienteHttpProvider cliente={clienteHttp}>
            <SessaoProvider {...fontes}>
              <RouterProvider router={router} />
            </SessaoProvider>
          </ClienteHttpProvider>
        </QueryClientProvider>
      </ClimaProvider>
    </StrictMode>,
  );
});
