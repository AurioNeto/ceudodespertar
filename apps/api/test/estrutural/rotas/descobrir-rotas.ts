import { RequestMethod } from '@nestjs/common';
import type { Type } from '@nestjs/common';
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

function primeiroSegmento(caminho: string | readonly string[] | undefined): string {
  if (caminho === undefined) return '';
  return typeof caminho === 'string' ? caminho : (caminho[0] ?? '');
}

function aparar(segmento: string): string {
  return segmento.replace(/^\/+|\/+$/g, '');
}

function ficaForaDoPrefixo(caminhoRelativo: string, foraDoPrefixo: readonly RotaForaDoPrefixo[]): boolean {
  return foraDoPrefixo.some(({ path }) => {
    const [raiz = ''] = path.split('*');
    return caminhoRelativo.startsWith(aparar(raiz));
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
  const classePath = primeiroSegmento(Reflect.getMetadata(PATH_METADATA, classe) as string | string[] | undefined);
  return scanner.getAllMethodNames(prototipo).flatMap<Rota>((nomeDoMetodo) => {
    const handler = prototipo[nomeDoMetodo]!;
    const metodo = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod | undefined;
    if (metodo === undefined) return [];
    const metodoPath = primeiroSegmento(Reflect.getMetadata(PATH_METADATA, handler) as string | string[] | undefined);
    const metodoHttp = RequestMethod[metodo]!;
    const caminho = montarCaminho(classePath, metodoPath, opcoes);
    return [
      {
        id: `${metodoHttp} ${caminho}`,
        metodoHttp,
        caminho,
        classe,
        handler,
        marcas: marcaEfetivaDaRota(handler, classe),
        modo: reflector.getAllAndOverride<ModoDeTransacao | undefined>(CHAVE_DO_MODO_DE_TRANSACAO, [handler, classe]),
      },
    ];
  });
}
