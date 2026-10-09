export type CasoDeFronteira = {
  severidade: 'error' | 'warn';
  acusa: readonly string[];
  permite: readonly string[];
};

const FATURAS = 'pages/financeiro/FaturasPage';
const DETALHE = `${FATURAS}/components/DetalheDaFatura`;
const TABELA = `${DETALHE}/components/TabelaDeCompras`;
const CARTAO = `${FATURAS}/components/CartaoDoTopo`;
const EMPRESTIMOS = 'pages/financeiro/EmprestimosPage';
const DEVOLUCOES = 'pages/eventos/DevolucoesPage';
const LANCAMENTOS = 'pages/financeiro/lancamentos';
const INSCRICAO = 'pages/eventos/inscricao/InscricaoPublicaPage';
const PASSO = `${INSCRICAO}/components/PassoAnamnese`;
const HERDADAS = `${PASSO}/components/Herdadas`;
const RESPOSTA = `${PASSO}/components/BlocoDePergunta/components/Resposta`;
const NIVEL5 = `${RESPOSTA}/components/Nivel5`;
const NIVEL6 = `${NIVEL5}/components/Nivel6`;
const NIVEL7 = `${NIVEL6}/components/Nivel7`;
const ACESSOS = 'pages/sistema/AcessosPage';
const PAINEL = 'pages/transversal/PainelPage';
const ENTRADA = 'pages/transversal/entrada';
const ENTRAR = `${ENTRADA}/EntrarPage`;
const RECIBO = `${LANCAMENTOS}/utils/recibo.ts`;
const RESERVA_DE_EVENTOS = 'pages/eventos/utils/reserva.ts';
const SALDO_DE_ESTOQUE = 'pages/estoque/utils/saldo.ts';
const CADASTRO_DE_PESSOAS = 'pages/pessoas/utils/cadastro.ts';
const PERMISSAO_DE_SISTEMA = 'pages/sistema/utils/permissao.ts';
const NAVEGACAO_TRANSVERSAL = 'pages/transversal/utils/navegacao.ts';

export const CASOS_DAS_FRONTEIRAS = {
  'web-sem-ciclo': {
    severidade: 'warn',
    acusa: [
      'dados/credencialOidc.ts -> dados/oidc.ts',
      `${FATURAS}/utils/ciclo.ts -> ${FATURAS}/utils/fatura.ts`,
    ],
    permite: [
      `${FATURAS}/utils/fatura.ts -> ${FATURAS}/utils/formatoDaFatura.ts`,
      `${FATURAS}/utils/formatoDaFatura.ts -> pages/utils/formato.ts`,
    ],
  },
  'lib-e-folha': {
    severidade: 'warn',
    acusa: [
      'lib/impuro.ts -> react',
      'lib/impuro.ts -> ds/index.ts',
      'lib/impuro.ts -> mocks/ids.ts',
      'lib/impuro.ts -> app/sessao/index.ts',
      'lib/impuro.ts -> components/Rodape/index.ts',
      'lib/impuro.ts -> dados/index.ts',
      `lib/impuro.ts -> ${RECIBO}`,
    ],
    permite: ['lib/formato.test.ts -> testes/fabricas.ts', 'lib/formato.ts -> lib/numero.ts'],
  },
  'dados-sem-ui': {
    severidade: 'error',
    acusa: [
      'dados/clienteHttp.ts -> ds/index.ts',
      'dados/demonstracao.ts -> pages/mocks/relogio.ts',
      'dados/x.ts -> react',
      'dados/x.ts -> app/sessao/index.ts',
      'dados/x.ts -> components/Rodape/index.ts',
      'dados/x.ts -> mocks/ids.ts',
    ],
    permite: ['dados/erros.test.ts -> testes/fabricas.ts', 'dados/clienteHttp.ts -> lib/formato.ts'],
  },
  'ds-autonomo': {
    severidade: 'error',
    acusa: [
      'ds/templates/Portao/Portao.tsx -> react-router-dom',
      'ds/templates/Portao/Portao.tsx -> app/sessao/index.ts',
      'ds/templates/Portao/Portao.tsx -> components/Rodape/index.ts',
      'ds/templates/Portao/Portao.tsx -> dados/index.ts',
      'ds/templates/Portao/Portao.tsx -> mocks/ids.ts',
      `ds/templates/Portao/Portao.tsx -> ${RECIBO}`,
    ],
    permite: [
      'ds/atoms/Button/Button.dom.test.tsx -> testes/configurarDom.ts',
      'ds/atoms/Button/Button.tsx -> lib/formato.ts',
    ],
  },
  'ds-so-pelo-barrel': {
    severidade: 'error',
    acusa: [`${FATURAS}/FaturasPage.tsx -> ds/atoms/Button/index.ts`],
    permite: [`${FATURAS}/FaturasPage.tsx -> ds/index.ts`, 'ds/index.ts -> ds/atoms/Button/index.ts'],
  },
  'ds-base-nao-sobe': {
    severidade: 'error',
    acusa: [
      'ds/fundacao/ruim.ts -> ds/atoms/Button/index.ts',
      'ds/fundacao/ruim.ts -> ds/molecules/TextField/index.ts',
      'ds/fundacao/ruim.ts -> ds/templates/Portao/index.ts',
      'ds/providers/RegimeVocabulary/RegimeVocabulary.tsx -> ds/organisms/PainelDeAcao/index.ts',
    ],
    permite: ['ds/providers/RegimeVocabulary/RegimeVocabulary.tsx -> ds/fundacao/densidade.ts'],
  },
  'ds-atomo-nao-sobe': {
    severidade: 'error',
    acusa: [
      'ds/atoms/Button/Button.tsx -> ds/molecules/TextField/index.ts',
      'ds/atoms/Button/Button.tsx -> ds/organisms/PainelDeAcao/index.ts',
      'ds/atoms/Button/Button.tsx -> ds/templates/Portao/index.ts',
    ],
    permite: ['ds/atoms/Button/Button.tsx -> ds/atoms/Icon/index.ts'],
  },
  'ds-molecula-nao-sobe': {
    severidade: 'error',
    acusa: [
      'ds/molecules/TextField/TextField.tsx -> ds/organisms/PainelDeAcao/index.ts',
      'ds/molecules/TextField/TextField.tsx -> ds/templates/Portao/index.ts',
    ],
    permite: ['ds/molecules/TextField/TextField.tsx -> ds/atoms/Icon/index.ts'],
  },
  'ds-organismo-nao-sobe': {
    severidade: 'error',
    acusa: ['ds/organisms/PainelDeAcao/PainelDeAcao.tsx -> ds/templates/Portao/index.ts'],
    permite: ['ds/organisms/PainelDeAcao/PainelDeAcao.tsx -> ds/molecules/TextField/index.ts'],
  },
  'dados-so-pelo-barrel': {
    severidade: 'warn',
    acusa: [`${FATURAS}/FaturasPage.tsx -> dados/erros.ts`],
    permite: [
      'app/sessao/SessaoProvider.tsx -> dados/index.ts',
      'silencioso.ts -> dados/index.ts',
      'main.tsx -> dados/instancias.ts',
    ],
  },
  'instancias-so-no-main': {
    severidade: 'error',
    acusa: ['silencioso.ts -> dados/instancias.ts'],
    permite: ['main.tsx -> dados/instancias.ts'],
  },
  'app-nao-conhece-paginas': {
    severidade: 'warn',
    acusa: [`app/sessao/SessaoProvider.tsx -> ${ENTRAR}/index.ts`],
    permite: [
      `app/sessao/SessaoProvider.dom.test.tsx -> ${ENTRAR}/index.ts`,
      `app/router.tsx -> ${FATURAS}/index.ts`,
    ],
  },
  'roteador-so-pelo-index-da-pagina': {
    severidade: 'warn',
    acusa: [`app/router.tsx -> ${FATURAS}/FaturasPage.tsx`],
    permite: [
      `app/router.tsx -> ${FATURAS}/index.ts`,
      `app/router.tsx -> ${ACESSOS}/index.ts`,
      `app/router.tsx -> ${ENTRAR}/index.ts`,
    ],
  },
  'paginas-so-pela-api-publica-do-app': {
    severidade: 'warn',
    acusa: [
      `${FATURAS}/FaturasPage.tsx -> app/shell/Layout.tsx`,
      `${ENTRAR}/EntrarPage.tsx -> app/sessao/SessaoProvider.tsx`,
    ],
    permite: [
      `${FATURAS}/FaturasPage.tsx -> app/sessao/index.ts`,
      `${ACESSOS}/AcessosPage.tsx -> app/rotas/index.ts`,
      `${ACESSOS}/AcessosPage.tsx -> app/providers/index.ts`,
      `${PAINEL}/PainelPage.tsx -> app/demonstracao/index.ts`,
    ],
  },
  'pagina-nao-importa-pagina': {
    severidade: 'error',
    acusa: [
      `${FATURAS}/FaturasPage.tsx -> ${EMPRESTIMOS}/index.ts`,
      `${FATURAS}/FaturasPage.tsx -> ${DEVOLUCOES}/index.ts`,
      `${TABELA}/TabelaDeCompras.tsx -> ${EMPRESTIMOS}/components/X/index.ts`,
      `${PAINEL}/PainelPage.tsx -> ${FATURAS}/index.ts`,
    ],
    permite: [
      `${FATURAS}/FaturasPage.tsx -> ${DETALHE}/index.ts`,
      `${FATURAS}/FaturasPage.tsx -> ${FATURAS}/utils/fatura.ts`,
    ],
  },
  'modulo-nao-importa-modulo': {
    severidade: 'error',
    acusa: [
      `${FATURAS}/FaturasPage.tsx -> ${DEVOLUCOES}/index.ts`,
      `${PAINEL}/PainelPage.tsx -> ${FATURAS}/index.ts`,
      `${RESERVA_DE_EVENTOS} -> ${SALDO_DE_ESTOQUE}`,
      `${SALDO_DE_ESTOQUE} -> ${CADASTRO_DE_PESSOAS}`,
      `${CADASTRO_DE_PESSOAS} -> ${PERMISSAO_DE_SISTEMA}`,
      `${PERMISSAO_DE_SISTEMA} -> ${NAVEGACAO_TRANSVERSAL}`,
    ],
    permite: [
      `${LANCAMENTOS}/RegistrarLancamentoPage/RegistrarLancamentoPage.tsx -> ${RECIBO}`,
      `${DEVOLUCOES}/DevolucoesPage.tsx -> pages/mocks/relogio.ts`,
      `${FATURAS}/FaturasPage.tsx -> pages/components/CartazSlot/index.ts`,
    ],
  },
  'compartilhado-nao-importa-tela': {
    severidade: 'error',
    acusa: [
      `${RECIBO} -> ${LANCAMENTOS}/RegistrarLancamentoPage/index.ts`,
      `pages/components/CartazSlot/CartazSlot.tsx -> ${PAINEL}/index.ts`,
      `pages/mocks/relogio.ts -> ${FATURAS}/index.ts`,
    ],
    permite: [
      `${RECIBO} -> ${LANCAMENTOS}/components/Paginacao/index.ts`,
      'pages/components/CartazSlot/CartazSlot.tsx -> pages/utils/formato.ts',
    ],
  },
  'compartilhado-de-pages-nao-importa-modulo': {
    severidade: 'error',
    acusa: [
      `pages/components/CartazSlot/CartazSlot.tsx -> ${PAINEL}/index.ts`,
      `pages/mocks/relogio.ts -> ${FATURAS}/index.ts`,
      `pages/hooks/useReserva.ts -> ${RESERVA_DE_EVENTOS}`,
      `pages/utils/permissoes.ts -> ${SALDO_DE_ESTOQUE}`,
      `pages/utils/permissoes.ts -> ${CADASTRO_DE_PESSOAS}`,
      `pages/utils/permissoes.ts -> ${PERMISSAO_DE_SISTEMA}`,
    ],
    permite: [
      `${DEVOLUCOES}/DevolucoesPage.tsx -> pages/mocks/relogio.ts`,
      'pages/components/CartazSlot/CartazSlot.tsx -> pages/utils/formato.ts',
    ],
  },
  'unidade-so-pelo-index-0': {
    severidade: 'error',
    acusa: [`app/router.tsx -> ${FATURAS}/FaturasPage.tsx`],
    permite: [`app/router.tsx -> ${FATURAS}/index.ts`, 'ds/index.ts -> ds/atoms/Button/index.ts'],
  },
  'unidade-so-pelo-index-1': {
    severidade: 'error',
    acusa: [
      'ds/molecules/TextField/TextField.tsx -> ds/atoms/Icon/registro.ts',
      `${FATURAS}/FaturasPage.tsx -> ${TABELA}/index.ts`,
      'ds/atoms/Aviso/Aviso.tsx -> ds/atoms/Avisos/registro.ts',
    ],
    permite: [
      `${FATURAS}/FaturasPage.tsx -> ${DETALHE}/index.ts`,
      'ds/molecules/TextField/TextField.tsx -> ds/atoms/Icon/index.ts',
      'ds/atoms/Aviso/Aviso.tsx -> ds/atoms/Avisos/index.ts',
    ],
  },
  'unidade-so-pelo-index-2': {
    severidade: 'error',
    acusa: [`${DETALHE}/DetalheDaFatura.tsx -> ${CARTAO}/utils/x.ts`],
    permite: [
      `${DETALHE}/DetalheDaFatura.tsx -> ${CARTAO}/index.ts`,
      `${DETALHE}/DetalheDaFatura.tsx -> ${FATURAS}/utils/fatura.ts`,
      `${DETALHE}/DetalheDaFatura.tsx -> ${TABELA}/index.ts`,
    ],
  },
  'unidade-so-pelo-index-3': {
    severidade: 'error',
    acusa: [
      `${TABELA}/TabelaDeCompras.tsx -> ${CARTAO}/CartaoDoTopo.tsx`,
      `${TABELA}/TabelaDeCompras.tsx -> ${EMPRESTIMOS}/components/X/index.ts`,
    ],
    permite: [
      `${TABELA}/TabelaDeCompras.tsx -> ${CARTAO}/index.ts`,
      `${TABELA}/TabelaDeCompras.tsx -> ${FATURAS}/utils/fatura.ts`,
    ],
  },
  'unidade-so-pelo-index-4': {
    severidade: 'error',
    acusa: [`${RESPOSTA}/Resposta.tsx -> ${HERDADAS}/components/Item/index.ts`],
    permite: [
      `${RESPOSTA}/Resposta.tsx -> ${HERDADAS}/index.ts`,
      `${RESPOSTA}/Resposta.tsx -> ${INSCRICAO}/utils/regraDeAlerta.ts`,
    ],
  },
  'unidade-so-pelo-index-5': {
    severidade: 'error',
    acusa: [`${NIVEL5}/Nivel5.tsx -> ${HERDADAS}/Herdadas.tsx`],
    permite: [
      `${NIVEL5}/Nivel5.tsx -> ${HERDADAS}/index.ts`,
      `${NIVEL5}/Nivel5.tsx -> ${RESPOSTA}/index.ts`,
      `${NIVEL5}/Nivel5.tsx -> ${NIVEL6}/index.ts`,
    ],
  },
  'unidade-so-pelo-index-6': {
    severidade: 'error',
    acusa: [`${NIVEL6}/Nivel6.tsx -> ${HERDADAS}/components/Item/index.ts`],
    permite: [
      `${NIVEL6}/Nivel6.tsx -> ${HERDADAS}/index.ts`,
      `${NIVEL6}/Nivel6.tsx -> ${RESPOSTA}/Resposta.tsx`,
    ],
  },
  'unidade-ate-6-niveis': {
    severidade: 'error',
    acusa: [`${NIVEL7}/Nivel7.tsx -> react`, `${NIVEL7}/Nivel7.tsx -> ${NIVEL7}/utils/nivel.ts`],
    permite: [
      `${NIVEL6}/Nivel6.tsx -> ${HERDADAS}/index.ts`,
      `${NIVEL6}/Nivel6.tsx -> ${RESPOSTA}/Resposta.tsx`,
    ],
  },
  'pasta-camel-case': {
    severidade: 'error',
    acusa: ['pages/financeiro/meuGrupo/total.ts -> react', 'meuAgrupamento/total.ts -> mocks/ids.ts'],
    permite: [
      `${RECIBO} -> ${LANCAMENTOS}/components/Paginacao/index.ts`,
      `${FATURAS}/FaturasPage.dom.test.tsx -> ${FATURAS}/apoioDeTeste.tsx`,
      'testes/sessaoDeTeste.tsx -> app/sessao/index.ts',
    ],
  },
  'producao-global-sem-mock': {
    severidade: 'warn',
    acusa: [
      'lib/impuro.ts -> mocks/ids.ts',
      'dados/demonstracao.ts -> pages/mocks/relogio.ts',
      'dados/x.ts -> mocks/ids.ts',
      'ds/templates/Portao/Portao.tsx -> mocks/ids.ts',
    ],
    permite: ['app/shell/Layout.tsx -> mocks/filaDeVerificacao.ts'],
  },
  'mock-global-so-dados': {
    severidade: 'warn',
    acusa: [
      'mocks/filaDeVerificacao.ts -> ds/index.ts',
      'mocks/filaDeVerificacao.ts -> app/sessao/index.ts',
      'mocks/filaDeVerificacao.ts -> components/Rodape/index.ts',
      'mocks/filaDeVerificacao.ts -> dados/index.ts',
      `mocks/filaDeVerificacao.ts -> ${RECIBO}`,
      'mocks/filaDeVerificacao.ts -> testes/sessaoDeTeste.tsx',
    ],
    permite: ['mocks/filaDeVerificacao.ts -> mocks/ids.ts', 'mocks/filaDeVerificacao.ts -> lib/formato.ts'],
  },
  'tela-de-api-sem-mock': {
    severidade: 'error',
    acusa: [
      `${ACESSOS}/AcessosPage.tsx -> ${ACESSOS}/mocks/x.ts`,
      `${ACESSOS}/AcessosPage.tsx -> mocks/ids.ts`,
      'pages/acessos/legado.tsx -> mocks/ids.ts',
      'pages/perfil/legado.tsx -> mocks/ids.ts',
      'pages/entrada/legado.tsx -> mocks/ids.ts',
      `${ENTRADA}/constantes.ts -> mocks/ids.ts`,
      'pages/transversal/MeuPerfilPage/MeuPerfilPage.tsx -> mocks/ids.ts',
    ],
    permite: [
      `${ACESSOS}/AcessosPage.tsx -> ${ACESSOS}/utils/abas.ts`,
      `${ENTRAR}/EntrarPage.tsx -> app/sessao/index.ts`,
      `${ENTRADA}/constantes.ts -> lib/formato.ts`,
    ],
  },
  'apoio-de-teste-so-em-teste': {
    severidade: 'error',
    acusa: [
      `${FATURAS}/FaturasPage.tsx -> ${FATURAS}/apoioDeTeste.tsx`,
      'app/shell/Layout.tsx -> testes/sessaoDeTeste.tsx',
      'app/shell/Layout.tsx -> vitest',
      'app/shell/Layout.tsx -> @vitest/expect',
      'mocks/filaDeVerificacao.ts -> testes/sessaoDeTeste.tsx',
    ],
    permite: [
      `${FATURAS}/FaturasPage.dom.test.tsx -> ${FATURAS}/apoioDeTeste.tsx`,
      `${FATURAS}/FaturasPage.dom.test.tsx -> testes/sessaoDeTeste.tsx`,
      `${FATURAS}/apoioDeTeste.tsx -> vitest`,
      'testes/configurarDom.ts -> vitest',
    ],
  },
  'camada-cruzada-por-alias': {
    severidade: 'warn',
    acusa: [
      `${FATURAS}/FaturasPage.tsx -> app/sessao/index.ts`,
      `${DEVOLUCOES}/DevolucoesPage.tsx -> pages/mocks/relogio.ts`,
    ],
    permite: [
      `${FATURAS}/FaturasPage.tsx -> app/sessao/index.ts`,
      `${DEVOLUCOES}/DevolucoesPage.tsx -> pages/mocks/relogio.ts`,
      `${FATURAS}/FaturasPage.tsx -> ds/index.ts`,
      'app/sessao/SessaoProvider.tsx -> dados/index.ts',
      `app/router.tsx -> ${ACESSOS}/index.ts`,
      `${DETALHE}/DetalheDaFatura.tsx -> ${FATURAS}/utils/fatura.ts`,
    ],
  },
} as const satisfies Record<string, CasoDeFronteira>;

export type NomeDaRegra = keyof typeof CASOS_DAS_FRONTEIRAS;
