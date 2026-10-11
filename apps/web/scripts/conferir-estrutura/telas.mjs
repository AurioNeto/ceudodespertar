import { posix } from 'node:path';
import { aviso, erro } from './ocorrencias.mjs';
import {
  ARQUIVO_DAS_ROTAS,
  ARQUIVO_DAS_TELAS,
  ARQUIVO_DO_ROUTER,
  lerPaginasDoRouter,
  lerRotas,
  lerTelas,
} from './registros.mjs';

const MODULO_SEM_PERMISSAO = 'transversal';
const PASTA_DAS_PAGINAS = 'pages';
const ALIAS_DO_SRC = '@/';
const ESPECIFICADOR_RELATIVO = /^\.\.?\//;
const SEPARADOR_DA_PERMISSAO = '.';
const INICIO_DO_CAMINHO = '/';

const moduloDoAcesso = (acesso) =>
  acesso.length === 0 ? MODULO_SEM_PERMISSAO : acesso[0].split(SEPARADOR_DA_PERMISSAO)[0];

function pastaDoEspecificador(especificador) {
  if (especificador?.startsWith(ALIAS_DO_SRC)) return especificador.slice(ALIAS_DO_SRC.length);

  return especificador !== undefined && ESPECIFICADOR_RELATIVO.test(especificador)
    ? posix.join(posix.dirname(ARQUIVO_DO_ROUTER), especificador)
    : undefined;
}

function moduloDaPasta(pasta) {
  const [raiz, modulo] = pasta?.split('/') ?? [];

  return raiz === PASTA_DAS_PAGINAS ? modulo : undefined;
}

function conferirRegistros(rotaId, caminho, telas, paginas) {
  return [
    ...(caminho?.startsWith(INICIO_DO_CAMINHO)
      ? []
      : [erro(ARQUIVO_DAS_ROTAS, `RotaId ${rotaId} sem caminho literal em ROTAS`)]),
    ...(telas.has(rotaId) ? [] : [erro(ARQUIVO_DAS_TELAS, `RotaId ${rotaId} sem item em TELAS`)]),
    ...(paginas.has(rotaId) ? [] : [erro(ARQUIVO_DO_ROUTER, `RotaId ${rotaId} sem página no router`)]),
  ];
}

function conferirModulo(rotaId, acesso, pagina) {
  if (acesso === undefined) {
    return [aviso(ARQUIVO_DAS_TELAS, `tela ${rotaId}: primeira permissão não determinável`)];
  }

  const pasta = pastaDoEspecificador(pagina.especificador);
  const moduloDaPagina = moduloDaPasta(pasta);

  if (moduloDaPagina === undefined) {
    return [aviso(ARQUIVO_DO_ROUTER, `tela ${rotaId}: pasta da página não determinável`)];
  }

  const moduloEsperado = moduloDoAcesso(acesso);

  return moduloDaPagina === moduloEsperado
    ? []
    : [
        erro(
          ARQUIVO_DAS_TELAS,
          `tela ${rotaId}: o módulo da primeira permissão é ${moduloEsperado}, mas a página ${pagina.componente} está em ${pasta}`,
        ),
      ];
}

export function conferirTelas(arvore) {
  const rotas = lerRotas(arvore);
  const telas = lerTelas(arvore);
  const paginas = lerPaginasDoRouter(arvore);
  const telasNoRouter = [...telas].filter(([rotaId]) => paginas.has(rotaId));

  return {
    rotas: rotas.size,
    telas: telas.size,
    ocorrencias: [
      ...[...rotas].flatMap(([rotaId, caminho]) => conferirRegistros(rotaId, caminho, telas, paginas)),
      ...telasNoRouter.flatMap(([rotaId, acesso]) =>
        conferirModulo(rotaId, acesso, paginas.get(rotaId)),
      ),
    ],
  };
}
