import { alvoDoModuloResolvido } from './alvos.mjs';
import { criarMapeador } from './mapeador.mjs';

const mesmoAlvo = (alvo) => alvo;

const alvoDoModuloResolvidoPor = (resolver, mapear) => (especificador, importador) =>
  mapear(alvoDoModuloResolvido(resolver(especificador, importador)));

export function criarAlvosDosEspecificadores(resolvedores, renomeacoes) {
  const mapearParaOHead = criarMapeador(renomeacoes, []);

  return {
    alvoNaBase: alvoDoModuloResolvidoPor(resolvedores.base, mapearParaOHead),
    alvoNoHead: alvoDoModuloResolvidoPor(resolvedores.head, mesmoAlvo),
  };
}
