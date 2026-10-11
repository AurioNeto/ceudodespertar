import ts from 'typescript';
import {
  componenteDoJsx,
  desembrulhar,
  especificadoresImportados,
  lerFonte,
  nomeDaPropriedade,
  objetoDaConstante,
  paginaDoImportDinamico,
  percorrer,
  textoLiteral,
  valorDaPropriedade,
} from './fonte.mjs';

export const ARQUIVO_DAS_ROTAS = 'app/rotas/rotas.ts';
export const ARQUIVO_DAS_TELAS = 'app/shell/telas.ts';
export const ARQUIVO_DO_ROUTER = 'app/router.tsx';

const CONSTANTE_DAS_ROTAS = 'ROTAS';
const CONSTANTE_DAS_TELAS = 'TELAS';
const PROPRIEDADE_DO_ACESSO = 'acesso';
const PROPRIEDADE_DO_CAMINHO = 'path';
const PROPRIEDADE_DO_ELEMENTO = 'element';
const PROPRIEDADE_DO_CARREGAMENTO = 'lazy';
const PROPRIEDADE_DO_COMPONENTE = 'Component';
const PAGINA_NAO_DETERMINAVEL = { componente: undefined, especificador: undefined };

const valorLiteral = (propriedade) =>
  ts.isPropertyAssignment(propriedade) ? textoLiteral(desembrulhar(propriedade.initializer)) : undefined;

export function lerRotas(arvore) {
  const objeto = objetoDaConstante(lerFonte(arvore, ARQUIVO_DAS_ROTAS), CONSTANTE_DAS_ROTAS);

  return new Map(
    objeto.properties.map((propriedade) => [nomeDaPropriedade(propriedade), valorLiteral(propriedade)]),
  );
}

function acessoDaTela(propriedade) {
  const registro = ts.isPropertyAssignment(propriedade) ? desembrulhar(propriedade.initializer) : undefined;
  const acesso =
    registro && ts.isObjectLiteralExpression(registro)
      ? valorDaPropriedade(registro, PROPRIEDADE_DO_ACESSO)
      : undefined;
  const permissoes =
    acesso && ts.isArrayLiteralExpression(acesso) ? acesso.elements.map(textoLiteral) : undefined;

  return permissoes?.every((permissao) => permissao !== undefined) ? permissoes : undefined;
}

export function lerTelas(arvore) {
  const objeto = objetoDaConstante(lerFonte(arvore, ARQUIVO_DAS_TELAS), CONSTANTE_DAS_TELAS);

  return new Map(
    objeto.properties.map((propriedade) => [nomeDaPropriedade(propriedade), acessoDaTela(propriedade)]),
  );
}

function rotaIdDoCaminho(expressao) {
  const ehMembroDasRotas =
    expressao !== undefined &&
    ts.isPropertyAccessExpression(expressao) &&
    ts.isIdentifier(expressao.expression) &&
    expressao.expression.text === CONSTANTE_DAS_ROTAS;

  return ehMembroDasRotas ? expressao.name.text : undefined;
}

function paginaDoElemento(elemento, especificadores) {
  const componente = componenteDoJsx(elemento);

  return { componente, especificador: especificadores.get(componente) };
}

function carregarDoLazy(rota) {
  const carregamento = valorDaPropriedade(rota, PROPRIEDADE_DO_CARREGAMENTO);

  return carregamento && ts.isObjectLiteralExpression(carregamento)
    ? valorDaPropriedade(carregamento, PROPRIEDADE_DO_COMPONENTE)
    : undefined;
}

function paginaDaRota(rota, especificadores) {
  const elemento = valorDaPropriedade(rota, PROPRIEDADE_DO_ELEMENTO);
  if (elemento !== undefined) return paginaDoElemento(elemento, especificadores);

  const carregar = carregarDoLazy(rota);

  return carregar && (paginaDoImportDinamico(carregar) ?? PAGINA_NAO_DETERMINAVEL);
}

export function lerPaginasDoRouter(arvore) {
  const fonte = lerFonte(arvore, ARQUIVO_DO_ROUTER);
  const especificadores = especificadoresImportados(fonte);
  const paginas = new Map();

  percorrer(fonte, (no) => {
    if (!ts.isObjectLiteralExpression(no)) return;

    const rotaId = rotaIdDoCaminho(valorDaPropriedade(no, PROPRIEDADE_DO_CAMINHO));
    if (rotaId === undefined || paginas.has(rotaId)) return;

    const pagina = paginaDaRota(no, especificadores);
    if (pagina !== undefined) paginas.set(rotaId, pagina);
  });

  return paginas;
}
