import { posix } from 'node:path';
import ts from 'typescript';

const RAIZ_VIRTUAL = '/';
const TSCONFIG_DO_WEB = 'apps/web/tsconfig.json';
const ESPECIFICADOR_RELATIVO = /^\.\.?(?:\/|$)/;
const OPCOES_PADRAO = {
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  module: ts.ModuleKind.ESNext,
  allowJs: true,
  resolveJsonModule: true,
};

const emRaizVirtual = (caminho) => `${RAIZ_VIRTUAL}${caminho}`;
const doRepositorio = (caminhoVirtual) => caminhoVirtual.slice(RAIZ_VIRTUAL.length);

function lerOpcoes(arvore) {
  const lerTexto = (caminho) => arvore.conteudoOpcional(doRepositorio(caminho))?.toString('utf8');
  const configuracao = ts.getParsedCommandLineOfConfigFile(
    emRaizVirtual(TSCONFIG_DO_WEB),
    {},
    {
      useCaseSensitiveFileNames: true,
      readDirectory: () => [],
      fileExists: (caminho) => lerTexto(caminho) !== undefined,
      readFile: lerTexto,
      getCurrentDirectory: () => RAIZ_VIRTUAL,
      onUnRecoverableConfigFileDiagnostic: () => undefined,
    },
  );

  return { ...OPCOES_PADRAO, ...configuracao?.options };
}

function criarHospedeiro(arvore) {
  const arquivos = new Set([...arvore.arquivos].map(emRaizVirtual));

  return {
    fileExists: (caminho) => arquivos.has(caminho),
    readFile: () => undefined,
    getCurrentDirectory: () => RAIZ_VIRTUAL,
    useCaseSensitiveFileNames: true,
  };
}

export function criarResolvedor(arvore) {
  const opcoes = lerOpcoes(arvore);
  const hospedeiro = criarHospedeiro(arvore);

  return (especificador, importador) => {
    const { resolvedModule } = ts.resolveModuleName(
      especificador,
      emRaizVirtual(importador),
      opcoes,
      hospedeiro,
    );

    if (resolvedModule) {
      return { arquivo: doRepositorio(resolvedModule.resolvedFileName) };
    }

    return ESPECIFICADOR_RELATIVO.test(especificador)
      ? { arquivo: posix.join(posix.dirname(importador), especificador) }
      : { externo: especificador };
  };
}
