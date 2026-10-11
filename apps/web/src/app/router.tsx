import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './shell';
import { ROTAS, ROTAS_PUBLICAS } from './rotas';
import { rotasAntigasDaEntrada } from './rotas';
import { ExigeSessao } from './sessao';

const TelaEmBranco = () => null;

export const router = createBrowserRouter([
  {
    path: ROTAS_PUBLICAS.entrar,
    HydrateFallback: TelaEmBranco,
    lazy: { Component: async () => (await import('@/pages/transversal/entrada/EntrarPage')).EntrarPage },
  },
  {
    path: ROTAS_PUBLICAS.retorno,
    HydrateFallback: TelaEmBranco,
    lazy: { Component: async () => (await import('@/pages/transversal/entrada/RetornoPage')).RetornoPage },
  },
  ...rotasAntigasDaEntrada,
  {
    path: ROTAS_PUBLICAS.inscricaoPublica,
    HydrateFallback: TelaEmBranco,
    lazy: {
      Component: async () => (await import('@/pages/eventos/inscricao/InscricaoPublicaPage')).InscricaoPublicaPage,
    },
  },
  {
    path: '/',
    HydrateFallback: TelaEmBranco,
    element: (
      <ExigeSessao>
        <Layout />
      </ExigeSessao>
    ),
    children: [
      {
        path: ROTAS.painel,
        lazy: { Component: async () => (await import('@/pages/transversal/PainelPage')).PainelPage },
      },
      {
        path: ROTAS.registrar,
        lazy: {
          Component: async () =>
            (await import('@/pages/financeiro/lancamentos/RegistrarLancamentoPage')).RegistrarLancamentoPage,
        },
      },
      {
        path: ROTAS.meus,
        lazy: {
          Component: async () => (await import('@/pages/financeiro/lancamentos/MeusRegistrosPage')).MeusRegistrosPage,
        },
      },
      {
        path: ROTAS.lancamentos,
        lazy: {
          Component: async () => (await import('@/pages/financeiro/lancamentos/LancamentosPage')).LancamentosPage,
        },
      },
      {
        path: ROTAS.contas,
        lazy: { Component: async () => (await import('@/pages/financeiro/ContasEFundoPage')).ContasEFundoPage },
      },
      {
        path: ROTAS.faturas,
        lazy: { Component: async () => (await import('@/pages/financeiro/FaturasPage')).FaturasPage },
      },
      {
        path: ROTAS.emprestimos,
        lazy: { Component: async () => (await import('@/pages/financeiro/EmprestimosPage')).EmprestimosPage },
      },
      {
        path: ROTAS.adiantamentos,
        lazy: { Component: async () => (await import('@/pages/financeiro/AdiantamentosPage')).AdiantamentosPage },
      },
      {
        path: ROTAS.lote,
        lazy: {
          Component: async () =>
            (await import('@/pages/financeiro/lancamentos/VerificacaoLotePage')).VerificacaoLotePage,
        },
      },
      {
        path: ROTAS.relatorios,
        lazy: { Component: async () => (await import('@/pages/financeiro/RelatoriosPage')).RelatoriosPage },
      },
      {
        path: ROTAS.fechamento,
        lazy: { Component: async () => (await import('@/pages/financeiro/FechamentoPage')).FechamentoPage },
      },
      {
        path: ROTAS.conciliacao,
        lazy: { Component: async () => (await import('@/pages/financeiro/ConciliacaoPage')).ConciliacaoPage },
      },
      {
        path: ROTAS.devolucoes,
        lazy: { Component: async () => (await import('@/pages/eventos/DevolucoesPage')).DevolucoesPage },
      },
      {
        path: ROTAS.prestacao,
        lazy: {
          Component: async () => (await import('@/pages/financeiro/PrestacaoDeContasPage')).PrestacaoDeContasPage,
        },
      },
      {
        path: ROTAS.parametros,
        lazy: { Component: async () => (await import('@/pages/financeiro/ParametrosPage')).ParametrosPage },
      },
      {
        path: ROTAS.agenda,
        lazy: { Component: async () => (await import('@/pages/eventos/AgendaPage')).AgendaPage },
      },
      {
        path: ROTAS.inscricao,
        lazy: { Component: async () => (await import('@/pages/eventos/inscricao/InscricaoPage')).InscricaoPage },
      },
      {
        path: ROTAS.leitos,
        lazy: { Component: async () => (await import('@/pages/eventos/LeitosPage')).LeitosPage },
      },
      {
        path: ROTAS.contratacoes,
        lazy: { Component: async () => (await import('@/pages/eventos/ContratacoesPage')).ContratacoesPage },
      },
      {
        path: ROTAS.pessoas,
        lazy: { Component: async () => (await import('@/pages/pessoas/PessoasPage')).PessoasPage },
      },
      {
        path: ROTAS.anamnese,
        lazy: { Component: async () => (await import('@/pages/pessoas/AnamnesePage')).AnamnesePage },
      },
      {
        path: ROTAS.ayahuasca,
        lazy: { Component: async () => (await import('@/pages/estoque/AyahuascaPage')).AyahuascaPage },
      },
      {
        path: ROTAS.feitio,
        lazy: { Component: async () => (await import('@/pages/estoque/FeitioPage')).FeitioPage },
      },
      {
        path: ROTAS.acessos,
        lazy: { Component: async () => (await import('@/pages/sistema/AcessosPage')).AcessosPage },
      },
      {
        path: ROTAS.auditoria,
        lazy: { Component: async () => (await import('@/pages/sistema/AuditoriaPage')).AuditoriaPage },
      },
      {
        path: ROTAS.perfil,
        lazy: { Component: async () => (await import('@/pages/transversal/MeuPerfilPage')).MeuPerfilPage },
      },
    ],
  },
]);
