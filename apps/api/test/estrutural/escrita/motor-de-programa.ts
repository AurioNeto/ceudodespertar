import { dirname } from 'node:path';
import ts from 'typescript';

export interface ProgramaAnalisavel {
  readonly program: ts.Program;
  readonly checker: ts.TypeChecker;
  readonly arquivos: readonly ts.SourceFile[];
}

const CODIGOS_DE_MODULO_AUSENTE: ReadonlySet<number> = new Set([2307, 2792]);

function lerOpcoes(caminhoDoTsconfig: string): ts.ParsedCommandLine {
  const lido = ts.readConfigFile(caminhoDoTsconfig, ts.sys.readFile);
  if (lido.error) {
    throw new Error(ts.flattenDiagnosticMessageText(lido.error.messageText, '\n'));
  }
  return ts.parseJsonConfigFileContent(lido.config, ts.sys, dirname(caminhoDoTsconfig), undefined, caminhoDoTsconfig);
}

export function arquivosDoTsconfig(caminhoDoTsconfig: string): readonly string[] {
  return lerOpcoes(caminhoDoTsconfig).fileNames;
}

function hostComArquivosVirtuais(
  opcoes: ts.CompilerOptions,
  arquivosVirtuais: ReadonlyMap<string, string>,
): ts.CompilerHost {
  const host = ts.createCompilerHost(opcoes);
  return {
    ...host,
    fileExists: (caminho) => arquivosVirtuais.has(caminho) || host.fileExists(caminho),
    readFile: (caminho) => arquivosVirtuais.get(caminho) ?? host.readFile(caminho),
    getSourceFile: (caminho, versao, ...resto) => {
      const conteudo = arquivosVirtuais.get(caminho);
      return conteudo === undefined
        ? host.getSourceFile(caminho, versao, ...resto)
        : ts.createSourceFile(caminho, conteudo, versao, true);
    },
  };
}

export function abrirPrograma(
  caminhoDoTsconfig: string,
  arquivosRaiz: readonly string[],
  aceitaParaAnalise: (caminho: string) => boolean,
  arquivosVirtuais: ReadonlyMap<string, string> = new Map(),
): ProgramaAnalisavel {
  const configuracao = lerOpcoes(caminhoDoTsconfig);
  const program = ts.createProgram({
    rootNames: [...arquivosRaiz, ...arquivosVirtuais.keys()],
    options: configuracao.options,
    host: hostComArquivosVirtuais(configuracao.options, arquivosVirtuais),
  });
  const arquivos = program.getSourceFiles().filter((arquivo) => aceitaParaAnalise(arquivo.fileName));
  return { program, checker: program.getTypeChecker(), arquivos };
}

export function modulosNaoResolvidos(programa: ProgramaAnalisavel): readonly string[] {
  return programa.arquivos.flatMap((arquivo) =>
    programa.program
      .getSemanticDiagnostics(arquivo)
      .filter((diagnostico) => CODIGOS_DE_MODULO_AUSENTE.has(diagnostico.code))
      .map((diagnostico) => `${arquivo.fileName}: ${ts.flattenDiagnosticMessageText(diagnostico.messageText, ' ')}`),
  );
}

export function diagnosticosDeTipos(programa: ProgramaAnalisavel): readonly string[] {
  return programa.arquivos.flatMap((arquivo) =>
    ts
      .getPreEmitDiagnostics(programa.program, arquivo)
      .map(
        (diagnostico) =>
          `${arquivo.fileName}: TS${diagnostico.code} ${ts.flattenDiagnosticMessageText(diagnostico.messageText, ' ')}`,
      ),
  );
}

export function simboloResolvido(checker: ts.TypeChecker, no: ts.Node): ts.Symbol | undefined {
  const simbolo = checker.getSymbolAtLocation(no);
  if (simbolo !== undefined && (simbolo.flags & ts.SymbolFlags.Alias) !== 0) {
    return checker.getAliasedSymbol(simbolo);
  }
  return simbolo;
}

export function simboloDoUso(checker: ts.TypeChecker, identificador: ts.Identifier): ts.Symbol | undefined {
  const pai = identificador.parent;
  const ehNomeAbreviadoDeDesestruturacao =
    ts.isBindingElement(pai) &&
    pai.name === identificador &&
    pai.propertyName === undefined &&
    ts.isObjectBindingPattern(pai.parent);
  if (ehNomeAbreviadoDeDesestruturacao) {
    return checker.getTypeAtLocation(pai.parent).getProperty(identificador.text);
  }
  return simboloResolvido(checker, identificador);
}

export function declaradoEm(simbolo: ts.Symbol, padraoDoCaminho: RegExp): boolean {
  return (simbolo.declarations ?? []).some((declaracao) => padraoDoCaminho.test(declaracao.getSourceFile().fileName));
}

export function nomeDoRecipiente(simbolo: ts.Symbol): string | undefined {
  const declaracao = simbolo.declarations?.[0];
  const pai = declaracao?.parent;
  if (pai !== undefined && (ts.isInterfaceDeclaration(pai) || ts.isClassDeclaration(pai))) {
    return pai.name?.text;
  }
  return undefined;
}

export function estaEmPosicaoDeTipo(no: ts.Node): boolean {
  for (let atual: ts.Node | undefined = no.parent; atual !== undefined; atual = atual.parent) {
    if (ts.isImportDeclaration(atual) || ts.isExportDeclaration(atual) || ts.isTypeNode(atual)) return true;
    if (ts.isStatement(atual) || ts.isClassElement(atual)) return false;
  }
  return false;
}

export function percorrer(no: ts.Node, visitante: (no: ts.Node) => void): void {
  visitante(no);
  ts.forEachChild(no, (filho) => percorrer(filho, visitante));
}

export function linhaDe(arquivo: ts.SourceFile, no: ts.Node): number {
  return arquivo.getLineAndCharacterOfPosition(no.getStart(arquivo)).line + 1;
}
