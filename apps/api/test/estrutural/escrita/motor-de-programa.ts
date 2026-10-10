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
  return ts.parseJsonConfigFileContent(lido.config, ts.sys, dirname(caminhoDoTsconfig));
}

export function arquivosDoTsconfig(caminhoDoTsconfig: string): readonly string[] {
  return lerOpcoes(caminhoDoTsconfig).fileNames;
}

export function abrirPrograma(
  caminhoDoTsconfig: string,
  arquivosRaiz: readonly string[],
  aceitaParaAnalise: (caminho: string) => boolean,
): ProgramaAnalisavel {
  const configuracao = lerOpcoes(caminhoDoTsconfig);
  const program = ts.createProgram({ rootNames: [...arquivosRaiz], options: configuracao.options });
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
