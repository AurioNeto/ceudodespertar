import { RequestMethod } from '@nestjs/common';
import type { INestApplication, Type } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/internal';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import type { MarcaDeAcesso } from '../../../src/shared/infrastructure/autenticacao/marcas-de-acesso.js';
import { marcaEfetivaDaRota } from '../../../src/shared/infrastructure/autenticacao/marcas-de-acesso.js';
import type { ModoDeTransacao } from '../../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import { CHAVE_DO_MODO_DE_TRANSACAO } from '../../../src/shared/infrastructure/http/modo-de-transacao.decorator.js';

export interface Rota {
  readonly id: string;
  readonly metodoHttp: string;
  readonly caminho: string;
  readonly classe: Type;
  readonly handler: Function;
  readonly marcas: readonly MarcaDeAcesso[];
  readonly modo: ModoDeTransacao | undefined;
}

export interface RotaForaDoPrefixo {
  readonly path: string;
}

export interface OpcoesDeDescoberta {
  readonly prefixoGlobal: string;
  readonly foraDoPrefixo: readonly RotaForaDoPrefixo[];
}

export interface Descoberta {
  readonly rotas: readonly Rota[];
  readonly classesSemRota: readonly string[];
}

function caminhosDeclarados(caminho: string | readonly string[] | undefined): readonly string[] {
  if (caminho === undefined) return [''];
  if (typeof caminho === 'string') return [caminho];
  return caminho.length > 0 ? caminho : [''];
}

function aparar(segmento: string): string {
  return segmento.replace(/^\/+|\/+$/g, '');
}

function ficaForaDoPrefixo(caminhoRelativo: string, foraDoPrefixo: readonly RotaForaDoPrefixo[]): boolean {
  return foraDoPrefixo.some(({ path }) => {
    const [raiz = ''] = path.split('*');
    return caminhoRelativo.startsWith(`${aparar(raiz)}/`);
  });
}

function montarCaminho(classePath: string, metodoPath: string, opcoes: OpcoesDeDescoberta): string {
  const relativo = [classePath, metodoPath].map(aparar).filter((trecho) => trecho !== '').join('/');
  const prefixo = ficaForaDoPrefixo(relativo, opcoes.foraDoPrefixo) ? '' : aparar(opcoes.prefixoGlobal);
  return `/${[prefixo, relativo].filter((trecho) => trecho !== '').join('/')}`;
}

export function descobrirRotas(
  descoberta: DiscoveryService,
  scanner: MetadataScanner,
  reflector: Reflector,
  opcoes: OpcoesDeDescoberta,
): Descoberta {
  const classes = descoberta
    .getControllers()
    .flatMap((wrapper) => (typeof wrapper.metatype === 'function' ? [wrapper.metatype as Type] : []));
  const porClasse = classes.map((classe) => ({ classe, rotas: rotasDaClasse(classe, scanner, reflector, opcoes) }));
  return {
    rotas: porClasse.flatMap(({ rotas }) => rotas),
    classesSemRota: porClasse.filter(({ rotas }) => rotas.length === 0).map(({ classe }) => classe.name),
  };
}

function rotasDaClasse(
  classe: Type,
  scanner: MetadataScanner,
  reflector: Reflector,
  opcoes: OpcoesDeDescoberta,
): Rota[] {
  const prototipo = classe.prototype as Record<string, Function>;
  const caminhosDaClasse = caminhosDeclarados(Reflect.getMetadata(PATH_METADATA, classe) as string | string[] | undefined);
  return scanner.getAllMethodNames(prototipo).flatMap<Rota>((nomeDoMetodo) => {
    const handler = prototipo[nomeDoMetodo]!;
    const metodo = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod | undefined;
    if (metodo === undefined) return [];
    const caminhosDoMetodo = caminhosDeclarados(Reflect.getMetadata(PATH_METADATA, handler) as string | string[] | undefined);
    const metodoHttp = RequestMethod[metodo]!;
    const marcas = marcaEfetivaDaRota(handler, classe);
    const modo = reflector.getAllAndOverride<ModoDeTransacao | undefined>(CHAVE_DO_MODO_DE_TRANSACAO, [handler, classe]);
    return caminhosDaClasse.flatMap((classePath) =>
      caminhosDoMetodo.map((metodoPath) => {
        const caminho = montarCaminho(classePath, metodoPath, opcoes);
        return { id: `${metodoHttp} ${caminho}`, metodoHttp, caminho, classe, handler, marcas, modo };
      }),
    );
  });
}

interface CamadaDoExpress {
  readonly route?: { readonly path: string; readonly methods: Readonly<Record<string, boolean>> };
}

export function rotasRegistradasNoExpress(app: INestApplication, opcoes: OpcoesDeDescoberta): string[] {
  const curingasDosMiddlewares = new Set([
    `/${aparar(opcoes.prefixoGlobal)}{/*splat}`,
    ...opcoes.foraDoPrefixo.map(({ path }) => `/${aparar(path)}`),
  ]);
  const { router } = app.getHttpAdapter().getInstance() as { router: { stack: readonly CamadaDoExpress[] } };
  return router.stack.flatMap(({ route }) => {
    if (route === undefined || curingasDosMiddlewares.has(route.path)) return [];
    const metodos = Object.keys(route.methods);
    const metodoHttp = metodos.length === 1 ? metodos[0]!.toUpperCase() : 'ALL';
    return [`${metodoHttp} ${route.path}`];
  });
}
