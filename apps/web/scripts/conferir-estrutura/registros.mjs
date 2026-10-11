import ts from 'typescript';
import {
  componenteDoJsx,
  desembrulhar,
  especificadoresImportados,
  lerFonte,
  nomeDaPropriedade,
  objetoDaConstante,
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

export function lerElementosDoRouter(arvore) {
  const fonte = lerFonte(arvore, ARQUIVO_DO_ROUTER);
  const especificadores = especificadoresImportados(fonte);
  const elementos = new Map();

  percorrer(fonte, (no) => {
    if (!ts.isObjectLiteralExpression(no)) return;

    const rotaId = rotaIdDoCaminho(valorDaPropriedade(no, PROPRIEDADE_DO_CAMINHO));
    const elemento = valorDaPropriedade(no, PROPRIEDADE_DO_ELEMENTO);

    if (rotaId === undefined || elemento === undefined || elementos.has(rotaId)) return;

    const componente = componenteDoJsx(elemento);
    elementos.set(rotaId, { componente, especificador: especificadores.get(componente) });
  });

  return elementos;
}
