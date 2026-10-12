import { relative } from 'node:path';
import ts from 'typescript';
import { declaradoEm, estaEmPosicaoDeTipo, linhaDe, percorrer, simboloDoUso } from './motor-de-programa.js';
import type { ProgramaAnalisavel } from './motor-de-programa.js';
import {
  GLOBAIS_DE_REDE,
  MEMBRO_QUE_REQUISITA,
  METODO_DE_LEITURA,
  PROPRIEDADE_DO_METODO,
  estaNaCamadaDeDados,
} from './politica-do-web.js';

export type RegraDeRedeViolada =
  | 'rede-fora-da-camada-de-dados'
  | 'requisitar-com-escrita'
  | 'requisitar-indeterminado';

export interface ViolacaoDeRede {
  readonly arquivo: string;
  readonly linha: number;
  readonly regra: RegraDeRedeViolada;
  readonly simbolo: string;
}

export type CategoriaDeAchadoDeRede = 'rede' | 'requisitar';

export interface AchadoDeRede {
  readonly arquivo: string;
  readonly categoria: CategoriaDeAchadoDeRede;
  readonly simbolo: string;
}

export interface RelatorioDeRede {
  readonly violacoes: readonly ViolacaoDeRede[];
  readonly achados: readonly AchadoDeRede[];
}

const LIB_DO_TYPESCRIPT = /\/node_modules\/typescript\/lib\/lib\.[^/]+\.d\.ts$/;

function caminhoRelativo(raizDeSrc: string, caminho: string): string {
  return relative(raizDeSrc, caminho).split('\\').join('/');
}

function ehValor(simbolo: ts.Symbol): boolean {
  return (simbolo.flags & ts.SymbolFlags.Value) !== 0;
}

function ehGlobalDeRede(simbolo: ts.Symbol): boolean {
  return GLOBAIS_DE_REDE.has(simbolo.getName()) && ehValor(simbolo) && declaradoEm(simbolo, LIB_DO_TYPESCRIPT);
}

function chamadaQueInvoca(nome: ts.Identifier): ts.CallExpression | undefined {
  const acesso = nome.parent;
  if (!ts.isPropertyAccessExpression(acesso) || acesso.name !== nome) return undefined;
  let alvo: ts.Node = acesso;
  while (ts.isParenthesizedExpression(alvo.parent)) alvo = alvo.parent;
  const chamada = alvo.parent;
  return ts.isCallExpression(chamada) && chamada.expression === alvo ? chamada : undefined;
}

class ColetorDeRede {
  readonly violacoes: ViolacaoDeRede[] = [];
  readonly achados: AchadoDeRede[] = [];
  private readonly naCamadaDeDados: boolean;

  constructor(
    private readonly checker: ts.TypeChecker,
    private readonly arquivoDoPrograma: ts.SourceFile,
    private readonly relativo: string,
    private readonly raizDeSrc: string,
  ) {
    this.naCamadaDeDados = estaNaCamadaDeDados(relativo);
  }

  analisar(): void {
    percorrer(this.arquivoDoPrograma, (no) => {
      if (ts.isIdentifier(no) && !estaEmPosicaoDeTipo(no)) this.usoDeIdentificador(no);
      if (ts.isElementAccessExpression(no)) this.usoPorIndice(no);
    });
  }

  private violar(no: ts.Node, regra: RegraDeRedeViolada, simbolo: string): void {
    this.violacoes.push({ arquivo: this.relativo, linha: linhaDe(this.arquivoDoPrograma, no), regra, simbolo });
  }

  private achar(categoria: CategoriaDeAchadoDeRede, simbolo: string): void {
    this.achados.push({ arquivo: this.relativo, categoria, simbolo });
  }

  private usoDeIdentificador(identificador: ts.Identifier): void {
    const simbolo = simboloDoUso(this.checker, identificador);
    if (simbolo === undefined) return;
    if (ehGlobalDeRede(simbolo)) this.usoDeRede(identificador, simbolo.getName());
    if (this.ehRequisitarDaCamadaDeDados(simbolo)) this.usoDeRequisitar(identificador);
  }

  private usoPorIndice(acesso: ts.ElementAccessExpression): void {
    const tipoDoAlvo = this.checker.getTypeAtLocation(acesso.expression);
    for (const nome of this.nomesDoIndice(acesso.argumentExpression)) {
      const simbolo = tipoDoAlvo.getProperty(nome);
      if (simbolo === undefined) continue;
      if (ehGlobalDeRede(simbolo)) this.usoDeRede(acesso, nome);
      if (this.ehRequisitarDaCamadaDeDados(simbolo) && !this.naCamadaDeDados) {
        this.violar(acesso, 'requisitar-indeterminado', nome);
      }
    }
  }

  private nomesDoIndice(argumento: ts.Expression): readonly string[] {
    if (ts.isStringLiteralLike(argumento)) return [argumento.text];
    const tipo = this.checker.getTypeAtLocation(argumento);
    const possiveis = tipo.isUnion() ? tipo.types : [tipo];
    return possiveis.filter((possivel) => possivel.isStringLiteral()).map((literal) => literal.value);
  }

  private usoDeRede(no: ts.Node, nome: string): void {
    this.achar('rede', nome);
    if (!this.naCamadaDeDados) this.violar(no, 'rede-fora-da-camada-de-dados', nome);
  }

  private ehRequisitarDaCamadaDeDados(simbolo: ts.Symbol): boolean {
    return (
      simbolo.getName() === MEMBRO_QUE_REQUISITA &&
      (simbolo.declarations ?? []).some((declaracao) =>
        estaNaCamadaDeDados(caminhoRelativo(this.raizDeSrc, declaracao.getSourceFile().fileName)),
      )
    );
  }

  private usoDeRequisitar(identificador: ts.Identifier): void {
    if (this.naCamadaDeDados) return;
    const chamada = chamadaQueInvoca(identificador);
    if (chamada === undefined) {
      this.violar(identificador, 'requisitar-indeterminado', MEMBRO_QUE_REQUISITA);
      return;
    }
    const metodo = this.metodoDaChamada(chamada);
    this.achar('requisitar', metodo);
    if (metodo !== METODO_DE_LEITURA) this.violar(chamada, 'requisitar-com-escrita', metodo);
  }

  private metodoDaChamada(chamada: ts.CallExpression): string {
    const opcoes = chamada.arguments[0];
    if (opcoes === undefined) return 'sem-opcoes';
    const propriedade = this.checker.getTypeAtLocation(opcoes).getProperty(PROPRIEDADE_DO_METODO);
    if (propriedade === undefined) return 'sem-metodo';
    const tipo = this.checker.getTypeOfSymbolAtLocation(propriedade, opcoes);
    return tipo.isStringLiteral() ? tipo.value : this.checker.typeToString(tipo);
  }
}

export function detectarRedeDoWeb(programa: ProgramaAnalisavel, raizDeSrc: string): RelatorioDeRede {
  const violacoes: ViolacaoDeRede[] = [];
  const achados: AchadoDeRede[] = [];
  for (const arquivo of programa.arquivos) {
    const coletor = new ColetorDeRede(programa.checker, arquivo, caminhoRelativo(raizDeSrc, arquivo.fileName), raizDeSrc);
    coletor.analisar();
    violacoes.push(...coletor.violacoes);
    achados.push(...coletor.achados);
  }
  return { violacoes, achados };
}
