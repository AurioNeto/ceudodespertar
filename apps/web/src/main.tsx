import { StrictMode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import type { Eu } from '@cdd/contracts';
import { router } from './app/router';
import { SessaoProvider } from './app/sessao';
import type { SessaoProviderProps } from './app/sessao';
import { carregarDemonstracao } from './app/demonstracao';
import { clienteHttp, credencial, criarClienteDeConsultas, servicoDeEntrada } from './dados';
import './styles/global.css';

const clienteDeConsultas = criarClienteDeConsultas();

type FontesDaSessao = Omit<SessaoProviderProps, 'children'>;

const fontesReais: FontesDaSessao = {
  entrada: servicoDeEntrada,
  aoEncerrar: credencial.aoEncerrar,
  buscarEu: (sinal) => clienteHttp.requisitar<Eu>({ metodo: 'GET', caminho: '/eu', sinal }),
};

async function escolherFontesDaSessao(): Promise<FontesDaSessao> {
  const demonstracao = import.meta.env.DEV
    ? await carregarDemonstracao({
        desenvolvimento: import.meta.env.DEV,
        flag: import.meta.env.VITE_SESSAO_DE_DEMONSTRACAO,
        importar: () => import('./app/sessaoDeDemonstracao'),
      })
    : null;

  if (!demonstracao) return fontesReais;
  return {
    entrada: demonstracao.criarEntradaDeDemonstracao(),
    aoEncerrar: () => () => undefined,
    buscarEu: demonstracao.buscarEuDeDemonstracao,
  };
}

const container = document.getElementById('root');
if (!container) throw new Error('#root não encontrado');

void escolherFontesDaSessao().then((fontes) => {
  createRoot(container).render(
    <StrictMode>
      <QueryClientProvider client={clienteDeConsultas}>
        <SessaoProvider {...fontes}>
          <RouterProvider router={router} />
        </SessaoProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
});
