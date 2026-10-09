import type { Permissao } from '@cdd/contracts';
import type { NavEntry } from '../ds';
import type { RotaId } from './navegacao';
import type { RegistroDaTela, RegistroDeTelas } from './telas';

export type Pode = (permissao: Permissao) => boolean;

export const podeVerTela = (registro: RegistroDaTela, pode: Pode): boolean =>
  registro.acesso.length === 0 || registro.acesso.some(pode);

const ehSecao = (entrada: NavEntry): entrada is { section: string } => 'section' in entrada;

const temItemDepois = (entradas: readonly NavEntry[], indice: number): boolean => {
  const seguinte = entradas[indice + 1];
  return seguinte !== undefined && !ehSecao(seguinte);
};

export function filtrarNavPorAcesso(nav: readonly NavEntry[], telas: RegistroDeTelas, pode: Pode): readonly NavEntry[] {
  const visiveis = nav.filter((entrada) => ehSecao(entrada) || podeVerTela(telas[entrada.id as RotaId], pode));
  return visiveis.filter((entrada, indice) => !ehSecao(entrada) || temItemDepois(visiveis, indice));
}
